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
const RECALCULABLE_STATUSES = ['PENDING', 'CALCULATED', 'ERROR'];

/**
 * Estados inmutables - nunca modificar
 */
const IMMUTABLE_STATUSES = ['STAMPED', 'PAID', 'CLOSED'];

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
