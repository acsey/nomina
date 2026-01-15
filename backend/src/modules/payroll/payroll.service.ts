import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PayrollCalculatorService } from './services/payroll-calculator.service';
import { CfdiService } from '../cfdi/cfdi.service';
import { Prisma } from '@prisma/client';
import { PayrollStatus, PeriodType, ExtraordinaryType } from '@/common/types/prisma-enums';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: PayrollCalculatorService,
    private readonly cfdiService: CfdiService,
  ) {}

  async createPeriod(data: {
    companyId: string;
    periodType: PeriodType;
    extraordinaryType?: ExtraordinaryType;
    description?: string;
    periodNumber: number;
    year: number;
    startDate: string | Date;
    endDate: string | Date;
    paymentDate: string | Date;
    incidentDeadline?: string | Date;
  }) {
    const existing = await this.prisma.payrollPeriod.findUnique({
      where: {
        companyId_periodType_periodNumber_year: {
          companyId: data.companyId,
          periodType: data.periodType,
          periodNumber: data.periodNumber,
          year: data.year,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un período de nómina con estos datos');
    }

    // Convert date strings to Date objects
    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate;
    const paymentDate = typeof data.paymentDate === 'string' ? new Date(data.paymentDate) : data.paymentDate;

    // Fecha límite de incidencias: por defecto 2 días antes del fin del período
    let incidentDeadline: Date | null = null;
    if (data.incidentDeadline) {
      incidentDeadline = typeof data.incidentDeadline === 'string'
        ? new Date(data.incidentDeadline)
        : data.incidentDeadline;
    } else {
      // Default: 2 días antes del fin del período
      incidentDeadline = new Date(endDate);
      incidentDeadline.setDate(incidentDeadline.getDate() - 2);
    }

    return this.prisma.payrollPeriod.create({
      data: {
        companyId: data.companyId,
        periodType: data.periodType,
        extraordinaryType: data.extraordinaryType,
        description: data.description,
        periodNumber: data.periodNumber,
        year: data.year,
        startDate,
        endDate,
        paymentDate,
        incidentDeadline,
        status: PayrollStatus.DRAFT,
      },
    });
  }

  async findAllPeriods(companyId: string, year?: number) {
    return this.prisma.payrollPeriod.findMany({
      where: {
        companyId,
        ...(year && { year }),
      },
      orderBy: [{ year: 'desc' }, { periodNumber: 'desc' }],
      include: {
        _count: {
          select: { payrollDetails: true },
        },
      },
    });
  }

  async findPeriod(id: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        company: true,
        payrollDetails: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
                department: true,
              },
            },
            perceptions: {
              include: { concept: true },
            },
            deductions: {
              include: { concept: true },
            },
          },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Período de nómina no encontrado');
    }

    return period;
  }

  // Preview payroll without saving - shows what will be calculated
  async previewPayroll(periodId: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden previsualizar períodos en estado borrador');
    }

    // Obtener todos los empleados activos de la empresa
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: period.companyId,
        status: 'ACTIVE',
        isActive: true,
      },
      include: {
        department: true,
        benefits: {
          where: { isActive: true },
          include: { benefit: true },
        },
        infonavitCredits: {
          where: { isActive: true },
        },
        pensionAlimenticia: {
          where: { isActive: true },
        },
      },
    });

    // Calculate preview for each employee
    const employeeDetails = [];
    let totalPerceptions = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let totalIncidents = 0;
    let totalRetroactiveIncidents = 0;

    for (const employee of employees) {
      const preview = await this.calculator.previewForEmployee(period, employee);
      employeeDetails.push(preview);
      totalPerceptions += preview.totalPerceptions;
      totalDeductions += preview.totalDeductions;
      totalNetPay += preview.netPay;

      // Contar incidencias
      if (preview.incidents) {
        totalIncidents += preview.incidents.length;
        totalRetroactiveIncidents += preview.incidents.filter((i: any) => i.isRetroactive).length;
      }
    }

    return {
      period: {
        id: period.id,
        periodType: period.periodType,
        extraordinaryType: period.extraordinaryType,
        description: period.description,
        periodNumber: period.periodNumber,
        year: period.year,
        startDate: period.startDate,
        endDate: period.endDate,
        paymentDate: period.paymentDate,
        incidentDeadline: period.incidentDeadline,
      },
      employeeCount: employees.length,
      totals: {
        perceptions: totalPerceptions,
        deductions: totalDeductions,
        netPay: totalNetPay,
        totalIncidents,
        totalRetroactiveIncidents,
      },
      employees: employeeDetails,
    };
  }

  async calculatePayroll(periodId: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden calcular períodos en estado borrador');
    }

    // Obtener todos los empleados activos de la empresa
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: period.companyId,
        status: 'ACTIVE',
        isActive: true,
      },
      include: {
        benefits: {
          where: { isActive: true },
          include: { benefit: true },
        },
        infonavitCredits: {
          where: { isActive: true },
        },
        pensionAlimenticia: {
          where: { isActive: true },
        },
      },
    });

    // Calcular nómina para cada empleado
    for (const employee of employees) {
      await this.calculator.calculateForEmployee(period, employee);
    }

    // Actualizar totales del período
    const totals = await this.prisma.payrollDetail.aggregate({
      where: { payrollPeriodId: periodId },
      _sum: {
        totalPerceptions: true,
        totalDeductions: true,
        netPay: true,
      },
    });

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollStatus.CALCULATED,
        totalPerceptions: totals._sum.totalPerceptions || 0,
        totalDeductions: totals._sum.totalDeductions || 0,
        totalNet: totals._sum.netPay || 0,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Aprobar nómina y procesar timbrado
   *
   * FLUJO MEJORADO:
   * 1. Generar CFDIs para todos los empleados (sync - rápido)
   * 2. Iniciar timbrado según modo configurado:
   *    - SYNC: Timbra todos secuencialmente y actualiza a APPROVED
   *    - ASYNC: Encola batch y actualiza a STAMPING, retorna batchId
   *
   * En modo ASYNC el frontend debe:
   * - Mostrar progreso via polling /api/payroll/:id/stamping-status
   * - El período pasa a APPROVED cuando el batch completa
   */
  async approvePayroll(periodId: string, userId?: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.CALCULATED) {
      throw new BadRequestException('Solo se pueden aprobar períodos calculados');
    }

    // Obtener todos los detalles de nómina del período
    const payrollDetails = await this.prisma.payrollDetail.findMany({
      where: { payrollPeriodId: periodId },
      select: { id: true },
    });

    if (payrollDetails.length === 0) {
      throw new BadRequestException('No hay recibos para aprobar en este período');
    }

    this.logger.log(`Iniciando aprobación de nómina para ${payrollDetails.length} recibos del período ${periodId}`);

    // ========================================
    // PASO 1: Generar CFDIs (sync - rápido)
    // ========================================
    const generationResults = {
      generated: 0,
      skipped: 0,
      errors: [] as { detailId: string; error: string }[],
    };

    for (const detail of payrollDetails) {
      try {
        // Check if CFDI already exists
        const existing = await this.cfdiService.getCfdiByPayrollDetail(detail.id);
        if (existing && existing.status === 'STAMPED') {
          generationResults.skipped++;
          continue;
        }

        // Generate CFDI XML
        await this.cfdiService.generateCfdi(detail.id);
        generationResults.generated++;
      } catch (error: any) {
        generationResults.errors.push({
          detailId: detail.id,
          error: error.message || 'Error al generar CFDI',
        });
        this.logger.error(`Error generando CFDI para detalle ${detail.id}: ${error.message}`);
      }
    }

    this.logger.log(`CFDIs generados: ${generationResults.generated}, omitidos: ${generationResults.skipped}`);

    // ========================================
    // PASO 2: Iniciar timbrado según modo
    // ========================================
    const stampingResult = await this.cfdiService.stampAllPeriod(periodId, userId);

    // Determine final status and response based on mode
    if (stampingResult.mode === 'async' && 'batchId' in stampingResult) {
      // ASYNC MODE: Update to PROCESSING status and return batchId
      // The period will be auto-finalized to APPROVED by the processor
      // when all CFDIs are stamped (via Period Finalizer)
      const updatedPeriod = await this.prisma.payrollPeriod.update({
        where: { id: periodId },
        data: {
          status: PayrollStatus.PROCESSING,
        },
      });

      this.logger.log(`Modo ASYNC: Batch ${stampingResult.batchId} creado para período ${periodId} (status: PROCESSING)`);

      return {
        period: updatedPeriod,
        mode: 'async' as const,
        generation: generationResults,
        stamping: {
          total: stampingResult.total,
          batchId: stampingResult.batchId,
          message: stampingResult.message,
          status: 'processing',
        },
      };
    }

    // SYNC MODE: Stamping already completed
    const updatedPeriod = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollStatus.APPROVED,
      },
    });

    this.logger.log(`Modo SYNC: Timbrado completado para período ${periodId}`);

    return {
      period: updatedPeriod,
      mode: 'sync' as const,
      generation: generationResults,
      stamping: {
        total: stampingResult.total,
        success: 'success' in stampingResult ? stampingResult.success : 0,
        failed: 'failed' in stampingResult ? stampingResult.failed : 0,
        errors: 'errors' in stampingResult ? stampingResult.errors : [],
        status: 'completed',
      },
    };
  }

  /**
   * Obtiene el estado del timbrado de un período
   */
  async getStampingStatus(periodId: string) {
    const period = await this.findPeriod(periodId);

    // Get CFDI stats for this period
    const stats = await this.prisma.cfdiNomina.groupBy({
      by: ['status'],
      where: {
        payrollDetail: {
          payrollPeriodId: periodId,
        },
      },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    for (const s of stats) {
      statusCounts[s.status] = s._count;
    }

    let total = 0;
    for (const count of Object.values(statusCounts)) {
      total += count;
    }
    const stamped = statusCounts['STAMPED'] || 0;
    const pending = statusCounts['PENDING'] || 0;
    const errorCount = statusCounts['ERROR'] || 0;

    return {
      periodId,
      periodStatus: period.status,
      stamping: {
        total,
        stamped,
        pending,
        error: errorCount,
        progress: total > 0 ? Math.round((stamped / total) * 100) : 0,
        isComplete: pending === 0 && total > 0,
      },
    };
  }

  async closePayroll(periodId: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.PAID) {
      throw new BadRequestException('Solo se pueden cerrar períodos pagados');
    }

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }

  async deletePeriod(periodId: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden eliminar períodos en estado borrador');
    }

    // Delete any payroll details first (cascade should handle this, but being explicit)
    await this.prisma.payrollDetail.deleteMany({
      where: { payrollPeriodId: periodId },
    });

    return this.prisma.payrollPeriod.delete({
      where: { id: periodId },
    });
  }

  async updatePeriod(periodId: string, data: { extraordinaryType?: ExtraordinaryType; description?: string }) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden actualizar períodos en estado borrador');
    }

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        extraordinaryType: data.extraordinaryType,
        description: data.description,
      },
    });
  }

  async getEmployeePayrollHistory(employeeId: string, limit = 12) {
    return this.prisma.payrollDetail.findMany({
      where: { employeeId },
      include: {
        payrollPeriod: true,
        perceptions: {
          include: { concept: true },
        },
        deductions: {
          include: { concept: true },
        },
      },
      orderBy: {
        payrollPeriod: {
          paymentDate: 'desc',
        },
      },
      take: limit,
    });
  }
}
