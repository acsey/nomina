import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService, CriticalAction } from '@/common/security/audit.service';
import { Prisma } from '@prisma/client';

/**
 * Estados que permiten recálculo
 */
const RECALCULABLE_STATUSES = ['PENDING', 'CALCULATED', 'STAMP_ERROR'];

/**
 * Estados inmutables - nunca modificar directamente
 * HARDENING: STAMP_OK es estrictamente inmutable (debe cancelarse primero)
 */
const IMMUTABLE_STATUSES = ['STAMP_OK', 'PAID', 'CANCELLED', 'SUPERSEDED'];

/**
 * Motivos de creación de versión
 */
export enum VersionReason {
  INITIAL = 'INITIAL',
  RECALCULATION = 'RECALCULATION',
  CORRECTION = 'CORRECTION',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * PayrollVersioningService - Gestión de versiones de recibos de nómina
 *
 * Cumple con: Documento de Requerimientos - Sección 4
 * - Versionar recibos: ningún recálculo debe sobrescribir información previa
 * - STAMP_OK es estrictamente inmutable
 */
@Injectable()
export class PayrollVersioningService {
  private readonly logger = new Logger(PayrollVersioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Verifica si un recibo puede ser modificado
   * STAMP_OK es estrictamente inmutable
   */
  async canModify(payrollDetailId: string): Promise<{
    canModify: boolean;
    reason?: string;
    currentStatus?: string;
    hasCfdi?: boolean;
  }> {
    const detail = await this.prisma.payrollDetail.findUnique({
      where: { id: payrollDetailId },
      select: {
        status: true,
        cfdiNomina: {
          select: { status: true, uuid: true },
        },
      },
    });

    if (!detail) {
      return { canModify: false, reason: 'Recibo no encontrado' };
    }

    const status = detail.status;
    const cfdiStatus = detail.cfdiNomina?.status;

    // CFDI timbrado = inmutable absoluto
    if (cfdiStatus === 'STAMPED') {
      return {
        canModify: false,
        reason: `Recibo con CFDI timbrado (UUID: ${detail.cfdiNomina?.uuid}). Es fiscalmente inmutable.`,
        currentStatus: status,
        hasCfdi: true,
      };
    }

    // Verificar estados inmutables
    if (IMMUTABLE_STATUSES.includes(status)) {
      return {
        canModify: false,
        reason: `Estado "${status}" es inmutable. Use ajustes en período posterior.`,
        currentStatus: status,
        hasCfdi: !!detail.cfdiNomina,
      };
    }

    return { canModify: true, currentStatus: status, hasCfdi: !!detail.cfdiNomina };
  }

  /**
   * HARDENING: Flujo de recálculo con Ledger Fiscal
   *
   * REGLA DE ORO: NUNCA usa UPDATE para cambiar montos de un recibo existente.
   *
   * Flujo:
   * 1. Verifica que el recibo NO tenga status STAMP_OK (debe cancelarse primero)
   * 2. Usa transacción para atomicidad
   * 3. Marca recibo actual: active=false, status=SUPERSEDED, supersededAt=now
   * 4. Crea NUEVO recibo: version+1, parentReceiptId=ID anterior, active=true
   *
   * @param payrollDetailId - ID del recibo a superseder
   * @param newCalculation - Nuevos valores calculados
   * @param userId - Usuario que realiza el recálculo
   * @param reason - Motivo del recálculo
   * @returns El nuevo recibo creado
   */
  async recalculateWithLedger(
    payrollDetailId: string,
    newCalculation: {
      workedDays: number;
      totalPerceptions: number;
      totalDeductions: number;
      netPay: number;
      perceptions: Array<{
        conceptId: string;
        amount: number;
        taxableAmount: number;
        exemptAmount: number;
        formulaId?: string;
        formulaVersion?: number;
      }>;
      deductions: Array<{
        conceptId: string;
        amount: number;
        formulaId?: string;
        formulaVersion?: number;
      }>;
    },
    userId?: string,
    reason: VersionReason = VersionReason.RECALCULATION,
  ) {
    // Obtener recibo actual con todas sus relaciones
    const currentReceipt = await this.prisma.payrollDetail.findUnique({
      where: { id: payrollDetailId },
      include: {
        cfdiNomina: { select: { status: true, uuid: true } },
      },
    });

    if (!currentReceipt) {
      throw new BadRequestException('Recibo no encontrado');
    }

    // HARDENING: Verificar que NO esté timbrado
    if (currentReceipt.status === 'STAMP_OK') {
      throw new ForbiddenException(
        `HARDENING: Recibo con status STAMP_OK es fiscalmente inmutable. ` +
        `Debe cancelar el CFDI primero antes de recalcular. ` +
        `UUID CFDI: ${currentReceipt.cfdiNomina?.uuid || 'N/A'}`
      );
    }

    // Verificar que no esté ya supersedido
    if (currentReceipt.status === 'SUPERSEDED' || !currentReceipt.active) {
      throw new ForbiddenException(
        `HARDENING: Recibo ya fue reemplazado por versión posterior. ` +
        `Use el recibo activo más reciente.`
      );
    }

    // Verificar estados permitidos para recálculo
    if (!RECALCULABLE_STATUSES.includes(currentReceipt.status)) {
      throw new ForbiddenException(
        `HARDENING: Estado "${currentReceipt.status}" no permite recálculo directo. ` +
        `Estados permitidos: ${RECALCULABLE_STATUSES.join(', ')}`
      );
    }

    const currentVersion = currentReceipt.version;
    const newVersion = currentVersion + 1;
    const now = new Date();

    this.logger.log(
      `HARDENING: Iniciando recálculo con Ledger. Recibo ${payrollDetailId} v${currentVersion} -> v${newVersion}`
    );

    // Ejecutar en transacción para atomicidad
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Crear snapshot de versión histórica (PayrollDetailVersion)
      await tx.payrollDetailVersion.create({
        data: {
          payrollDetailId,
          version: currentVersion,
          workedDays: currentReceipt.workedDays,
          totalPerceptions: currentReceipt.totalPerceptions,
          totalDeductions: currentReceipt.totalDeductions,
          netPay: currentReceipt.netPay,
          status: currentReceipt.status,
          perceptionsSnapshot: [], // Se llena por trigger o separadamente
          deductionsSnapshot: [],
          createdBy: userId,
          createdReason: `SUPERSEDED_BY_V${newVersion}`,
          cfdiUuid: currentReceipt.cfdiNomina?.uuid,
          cfdiStatus: currentReceipt.cfdiNomina?.status,
        },
      });

      // 2. Marcar recibo actual como SUPERSEDED
      await tx.payrollDetail.update({
        where: { id: payrollDetailId },
        data: {
          active: false,
          status: 'SUPERSEDED',
          supersededAt: now,
        },
      });

      // 3. Crear NUEVO recibo con los nuevos cálculos
      const newReceipt = await tx.payrollDetail.create({
        data: {
          payrollPeriodId: currentReceipt.payrollPeriodId,
          employeeId: currentReceipt.employeeId,
          workedDays: newCalculation.workedDays,
          totalPerceptions: newCalculation.totalPerceptions,
          totalDeductions: newCalculation.totalDeductions,
          netPay: newCalculation.netPay,
          status: 'CALCULATED',
          version: newVersion,
          parentReceiptId: payrollDetailId,
          active: true,
        },
      });

      // 4. Crear percepciones del nuevo recibo
      if (newCalculation.perceptions.length > 0) {
        await tx.payrollPerception.createMany({
          data: newCalculation.perceptions.map((p) => ({
            payrollDetailId: newReceipt.id,
            conceptId: p.conceptId,
            amount: p.amount,
            taxableAmount: p.taxableAmount,
            exemptAmount: p.exemptAmount,
            formulaId: p.formulaId,
            formulaVersion: p.formulaVersion,
          })),
        });
      }

      // 5. Crear deducciones del nuevo recibo
      if (newCalculation.deductions.length > 0) {
        await tx.payrollDeduction.createMany({
          data: newCalculation.deductions.map((d) => ({
            payrollDetailId: newReceipt.id,
            conceptId: d.conceptId,
            amount: d.amount,
            formulaId: d.formulaId,
            formulaVersion: d.formulaVersion,
          })),
        });
      }

      return newReceipt;
    });

    this.logger.log(
      `HARDENING: Recálculo completado. Nuevo recibo ${result.id} v${newVersion} creado`
    );

    // Auditar la acción crítica
    await this.audit.logCriticalAction({
      userId: userId || 'SYSTEM',
      action: CriticalAction.PAYROLL_RECALCULATE,
      entity: 'PayrollDetail',
      entityId: result.id,
      previousValues: {
        id: payrollDetailId,
        version: currentVersion,
        netPay: Number(currentReceipt.netPay),
      },
      newValues: {
        id: result.id,
        version: newVersion,
        netPay: newCalculation.netPay,
        parentReceiptId: payrollDetailId,
      },
      details: {
        description: `Ledger: v${currentVersion} supersedido, v${newVersion} creado`,
        reason,
        netPayDiff: newCalculation.netPay - Number(currentReceipt.netPay),
      },
    });

    return result;
  }

  /**
   * HARDENING: Obtiene el recibo activo más reciente para un empleado en un período
   *
   * Siempre filtra por active=true para obtener solo recibos válidos
   */
  async getActiveReceipt(payrollPeriodId: string, employeeId: string) {
    return this.prisma.payrollDetail.findFirst({
      where: {
        payrollPeriodId,
        employeeId,
        active: true,
      },
      include: {
        perceptions: { include: { concept: true } },
        deductions: { include: { concept: true } },
        cfdiNomina: true,
      },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * HARDENING: Obtiene la cadena completa de versiones de un recibo
   *
   * Desde la versión original hasta la actual
   */
  async getVersionChain(payrollDetailId: string) {
    const chain: any[] = [];

    // Obtener recibo actual
    let current = await this.prisma.payrollDetail.findUnique({
      where: { id: payrollDetailId },
      select: {
        id: true,
        version: true,
        status: true,
        active: true,
        netPay: true,
        parentReceiptId: true,
        supersededAt: true,
        createdAt: true,
      },
    });

    while (current) {
      chain.unshift(current); // Agregar al inicio

      if (current.parentReceiptId) {
        current = await this.prisma.payrollDetail.findUnique({
          where: { id: current.parentReceiptId },
          select: {
            id: true,
            version: true,
            status: true,
            active: true,
            netPay: true,
            parentReceiptId: true,
            supersededAt: true,
            createdAt: true,
          },
        });
      } else {
        current = null;
      }
    }

    return {
      totalVersions: chain.length,
      currentVersion: chain[chain.length - 1],
      originalVersion: chain[0],
      chain,
    };
  }

  /**
   * Crea una versión del recibo antes de modificarlo
   * SIEMPRE debe llamarse antes de recalcular
   */
  async createVersion(
    payrollDetailId: string,
    reason: VersionReason,
    userId?: string,
  ): Promise<any> {
    // Verificar si se puede modificar
    const check = await this.canModify(payrollDetailId);
    if (!check.canModify) {
      throw new ForbiddenException(check.reason);
    }

    // Obtener detalle actual con percepciones y deducciones
    const detail = await this.prisma.payrollDetail.findUnique({
      where: { id: payrollDetailId },
      include: {
        perceptions: {
          include: { concept: true },
        },
        deductions: {
          include: { concept: true },
        },
        cfdiNomina: {
          select: { uuid: true, status: true },
        },
      },
    });

    if (!detail) {
      throw new BadRequestException('Detalle de nómina no encontrado');
    }

    // Obtener número de versión actual
    const lastVersion = await this.prisma.payrollDetailVersion.findFirst({
      where: { payrollDetailId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    // Crear snapshot
    const perceptionsSnapshot = detail.perceptions.map((p: any) => ({
      conceptId: p.conceptId,
      conceptCode: p.concept.code,
      conceptName: p.concept.name,
      amount: Number(p.amount),
      taxableAmount: Number(p.taxableAmount),
      exemptAmount: Number(p.exemptAmount),
    }));

    const deductionsSnapshot = detail.deductions.map((d: any) => ({
      conceptId: d.conceptId,
      conceptCode: d.concept.code,
      conceptName: d.concept.name,
      amount: Number(d.amount),
    }));

    // Crear versión
    const version = await this.prisma.payrollDetailVersion.create({
      data: {
        payrollDetailId,
        version: nextVersion,
        workedDays: detail.workedDays,
        totalPerceptions: detail.totalPerceptions,
        totalDeductions: detail.totalDeductions,
        netPay: detail.netPay,
        status: detail.status,
        perceptionsSnapshot: perceptionsSnapshot as any,
        deductionsSnapshot: deductionsSnapshot as any,
        createdBy: userId,
        createdReason: reason,
        cfdiUuid: detail.cfdiNomina?.uuid,
        cfdiStatus: detail.cfdiNomina?.status,
      },
    });

    this.logger.log(
      `Versión ${nextVersion} creada para recibo ${payrollDetailId} (${reason})`
    );

    // Auditar
    await this.audit.logCriticalAction({
      userId: userId || 'SYSTEM',
      action: CriticalAction.PAYROLL_RECALCULATE,
      entity: 'PayrollDetailVersion',
      entityId: version.id,
      newValues: {
        payrollDetailId,
        version: nextVersion,
        reason,
      },
      details: {
        description: `Versión ${nextVersion} creada antes de ${reason}`,
        previousNetPay: Number(detail.netPay),
      },
    });

    return version;
  }

  /**
   * Obtiene el historial de versiones de un recibo
   */
  async getVersionHistory(payrollDetailId: string) {
    return this.prisma.payrollDetailVersion.findMany({
      where: { payrollDetailId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Obtiene una versión específica
   */
  async getVersion(payrollDetailId: string, versionNumber: number) {
    return this.prisma.payrollDetailVersion.findFirst({
      where: {
        payrollDetailId,
        version: versionNumber,
      },
    });
  }

  /**
   * Compara dos versiones de un recibo
   */
  async compareVersions(
    payrollDetailId: string,
    versionA: number,
    versionB: number,
  ) {
    const [a, b] = await Promise.all([
      this.getVersion(payrollDetailId, versionA),
      this.getVersion(payrollDetailId, versionB),
    ]);

    if (!a || !b) {
      throw new BadRequestException('Una o ambas versiones no existen');
    }

    const perceptionsA = a.perceptionsSnapshot as any[];
    const perceptionsB = b.perceptionsSnapshot as any[];
    const deductionsA = a.deductionsSnapshot as any[];
    const deductionsB = b.deductionsSnapshot as any[];

    // Comparar percepciones
    const perceptionsDiff: any[] = [];
    const allPerceptionCodes = new Set([
      ...perceptionsA.map((p: any) => p.conceptCode),
      ...perceptionsB.map((p: any) => p.conceptCode),
    ]);

    for (const code of allPerceptionCodes) {
      const pA = perceptionsA.find((p: any) => p.conceptCode === code);
      const pB = perceptionsB.find((p: any) => p.conceptCode === code);

      if (!pA && pB) {
        perceptionsDiff.push({
          type: 'ADDED',
          conceptCode: code,
          conceptName: pB.conceptName,
          amountB: pB.amount,
        });
      } else if (pA && !pB) {
        perceptionsDiff.push({
          type: 'REMOVED',
          conceptCode: code,
          conceptName: pA.conceptName,
          amountA: pA.amount,
        });
      } else if (pA && pB && pA.amount !== pB.amount) {
        perceptionsDiff.push({
          type: 'CHANGED',
          conceptCode: code,
          conceptName: pA.conceptName,
          amountA: pA.amount,
          amountB: pB.amount,
          difference: pB.amount - pA.amount,
        });
      }
    }

    // Comparar deducciones
    const deductionsDiff: any[] = [];
    const allDeductionCodes = new Set([
      ...deductionsA.map((d: any) => d.conceptCode),
      ...deductionsB.map((d: any) => d.conceptCode),
    ]);

    for (const code of allDeductionCodes) {
      const dA = deductionsA.find((d: any) => d.conceptCode === code);
      const dB = deductionsB.find((d: any) => d.conceptCode === code);

      if (!dA && dB) {
        deductionsDiff.push({
          type: 'ADDED',
          conceptCode: code,
          conceptName: dB.conceptName,
          amountB: dB.amount,
        });
      } else if (dA && !dB) {
        deductionsDiff.push({
          type: 'REMOVED',
          conceptCode: code,
          conceptName: dA.conceptName,
          amountA: dA.amount,
        });
      } else if (dA && dB && dA.amount !== dB.amount) {
        deductionsDiff.push({
          type: 'CHANGED',
          conceptCode: code,
          conceptName: dA.conceptName,
          amountA: dA.amount,
          amountB: dB.amount,
          difference: dB.amount - dA.amount,
        });
      }
    }

    return {
      versionA: {
        version: versionA,
        netPay: Number(a.netPay),
        totalPerceptions: Number(a.totalPerceptions),
        totalDeductions: Number(a.totalDeductions),
        createdAt: a.createdAt,
        reason: a.createdReason,
      },
      versionB: {
        version: versionB,
        netPay: Number(b.netPay),
        totalPerceptions: Number(b.totalPerceptions),
        totalDeductions: Number(b.totalDeductions),
        createdAt: b.createdAt,
        reason: b.createdReason,
      },
      netPayDifference: Number(b.netPay) - Number(a.netPay),
      perceptionsDiff,
      deductionsDiff,
    };
  }

  /**
   * Verifica si un período tiene recibos con CFDI timbrado
   * Útil antes de permitir cambios masivos
   */
  async periodHasStampedReceipts(periodId: string): Promise<{
    hasStamped: boolean;
    stampedCount: number;
    totalCount: number;
  }> {
    const [stamped, total] = await Promise.all([
      this.prisma.payrollDetail.count({
        where: {
          payrollPeriodId: periodId,
          cfdiNomina: { status: 'STAMPED' },
        },
      }),
      this.prisma.payrollDetail.count({
        where: { payrollPeriodId: periodId },
      }),
    ]);

    return {
      hasStamped: stamped > 0,
      stampedCount: stamped,
      totalCount: total,
    };
  }
}
