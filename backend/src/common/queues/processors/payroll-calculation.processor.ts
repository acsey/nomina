import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES } from '../queue.constants';

/**
 * Datos del job de cálculo de nómina
 */
export interface PayrollCalculationJobData {
  periodId: string;
  employeeIds?: string[]; // Si está vacío, calcular todos
  userId?: string;
  recalculate?: boolean;
}

/**
 * Resultado del job de cálculo
 */
export interface PayrollCalculationJobResult {
  success: boolean;
  periodId: string;
  employeesProcessed: number;
  employeesFailed: number;
  errors: { employeeId: string; error: string }[];
  processingTime: number;
  totals: {
    perceptions: number;
    deductions: number;
    netPay: number;
  };
}

/**
 * Eventos emitidos
 */
export const PAYROLL_EVENTS = {
  CALCULATION_STARTED: 'payroll.calculation.started',
  CALCULATION_PROGRESS: 'payroll.calculation.progress',
  CALCULATION_COMPLETED: 'payroll.calculation.completed',
  CALCULATION_FAILED: 'payroll.calculation.failed',
  EMPLOYEE_CALCULATED: 'payroll.employee.calculated',
};

/**
 * Procesador de cálculo de nómina
 *
 * Permite calcular nómina de múltiples empleados en background
 * sin bloquear la interfaz del usuario
 */
@Processor(QUEUE_NAMES.PAYROLL_CALCULATION, {
  concurrency: 2, // Máximo 2 cálculos de período en paralelo
})
@Injectable()
export class PayrollCalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollCalculationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<PayrollCalculationJobData>): Promise<PayrollCalculationJobResult> {
    const startTime = Date.now();
    const { periodId, employeeIds, userId, recalculate } = job.data;

    this.logger.log(`Iniciando cálculo de nómina para período ${periodId}`);

    // Emitir evento de inicio
    this.eventEmitter.emit(PAYROLL_EVENTS.CALCULATION_STARTED, {
      periodId,
      userId,
      timestamp: new Date(),
    });

    try {
      // Obtener período
      const period = await this.prisma.payrollPeriod.findUnique({
        where: { id: periodId },
        include: { company: true },
      });

      if (!period) {
        throw new Error(`Período ${periodId} no encontrado`);
      }

      // Obtener empleados a procesar
      const employees = await this.prisma.employee.findMany({
        where: {
          companyId: period.companyId,
          status: 'ACTIVE',
          ...(employeeIds?.length && { id: { in: employeeIds } }),
        },
        include: {
          department: true,
          jobPosition: true,
          benefits: { include: { benefit: true }, where: { isActive: true } },
          infonavitCredits: { where: { isActive: true } },
          pensionAlimenticia: { where: { isActive: true } },
        },
      });

      const totalEmployees = employees.length;
      let processed = 0;
      let failed = 0;
      const errors: { employeeId: string; error: string }[] = [];

      let totalPerceptions = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;

      // Obtener conceptos de nómina
      const concepts = await this.prisma.payrollConcept.findMany({
        where: { isActive: true },
      });

      // Procesar cada empleado
      for (const employee of employees) {
        try {
          const result = await this.calculateForEmployee(period, employee, concepts, recalculate);

          totalPerceptions += result.totalPerceptions;
          totalDeductions += result.totalDeductions;
          totalNetPay += result.netPay;

          processed++;

          // Emitir progreso
          const progress = Math.round((processed / totalEmployees) * 100);
          await job.updateProgress(progress);

          this.eventEmitter.emit(PAYROLL_EVENTS.EMPLOYEE_CALCULATED, {
            periodId,
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            netPay: result.netPay,
            progress,
          });
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          errors.push({ employeeId: employee.id, error: errorMessage });

          this.logger.error(
            `Error calculando nómina de ${employee.firstName} ${employee.lastName}: ${errorMessage}`
          );
        }
      }

      // Actualizar totales del período
      await this.prisma.payrollPeriod.update({
        where: { id: periodId },
        data: {
          totalPerceptions,
          totalDeductions,
          totalNet: totalNetPay,
          status: failed === 0 ? 'CALCULATED' : 'DRAFT',
          processedAt: new Date(),
        },
      });

      const result: PayrollCalculationJobResult = {
        success: failed === 0,
        periodId,
        employeesProcessed: processed,
        employeesFailed: failed,
        errors,
        processingTime: Date.now() - startTime,
        totals: {
          perceptions: totalPerceptions,
          deductions: totalDeductions,
          netPay: totalNetPay,
        },
      };

      // Emitir evento de completado
      this.eventEmitter.emit(PAYROLL_EVENTS.CALCULATION_COMPLETED, {
        ...result,
        userId,
        timestamp: new Date(),
      });

      this.logger.log(
        `Cálculo completado: ${processed}/${totalEmployees} empleados (${result.processingTime}ms)`
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      this.eventEmitter.emit(PAYROLL_EVENTS.CALCULATION_FAILED, {
        periodId,
        error: errorMessage,
        userId,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Calcula la nómina para un empleado individual
   */
  private async calculateForEmployee(
    period: any,
    employee: any,
    concepts: any[],
    recalculate?: boolean,
  ): Promise<{ totalPerceptions: number; totalDeductions: number; netPay: number }> {
    // Verificar si ya existe cálculo (HARDENING: buscar recibo activo)
    const existingDetail = await this.prisma.payrollDetail.findFirst({
      where: {
        payrollPeriodId: period.id,
        employeeId: employee.id,
        active: true,
      },
    });

    if (existingDetail && !recalculate) {
      return {
        totalPerceptions: Number(existingDetail.totalPerceptions),
        totalDeductions: Number(existingDetail.totalDeductions),
        netPay: Number(existingDetail.netPay),
      };
    }

    // Cálculo simplificado - en producción usar PayrollCalculatorService
    const monthlySalary = Number(employee.baseSalary);
    const dailySalary = monthlySalary / 30;
    const periodDays = this.getPeriodDays(period.periodType);
    const workedDays = periodDays;

    // Percepciones base
    const basePay = this.round(dailySalary * workedDays);
    let totalPerceptions = basePay;

    // Deducciones simplificadas
    const isrEstimate = this.round(basePay * 0.1); // 10% estimado
    const imssEstimate = this.round(basePay * 0.03); // 3% estimado
    let totalDeductions = isrEstimate + imssEstimate;

    // Procesar INFONAVIT
    for (const credit of employee.infonavitCredits || []) {
      if (credit.discountType === 'PERCENTAGE') {
        totalDeductions += this.round(basePay * (Number(credit.discountValue) / 100));
      } else {
        totalDeductions += Number(credit.discountValue);
      }
    }

    // Procesar pensión alimenticia
    for (const pension of employee.pensionAlimenticia || []) {
      if (pension.discountType === 'PERCENTAGE') {
        totalDeductions += this.round(basePay * (Number(pension.discountValue) / 100));
      } else {
        totalDeductions += Number(pension.discountValue);
      }
    }

    const netPay = this.round(totalPerceptions - totalDeductions);

    // Crear o actualizar detalle (HARDENING: manejar versionado)
    let payrollDetail;
    if (existingDetail) {
      payrollDetail = await this.prisma.payrollDetail.update({
        where: { id: existingDetail.id },
        data: {
          workedDays,
          totalPerceptions,
          totalDeductions,
          netPay,
          status: 'CALCULATED',
        },
      });
    } else {
      payrollDetail = await this.prisma.payrollDetail.create({
        data: {
          payrollPeriodId: period.id,
          employeeId: employee.id,
          workedDays,
          totalPerceptions,
          totalDeductions,
          netPay,
          status: 'CALCULATED',
          version: 1,
          active: true,
        },
      });
    }

    // Crear percepciones
    const salaryConcept = concepts.find((c: any) => c.code === 'P001');
    if (salaryConcept) {
      await this.prisma.payrollPerception.upsert({
        where: {
          id: `${payrollDetail.id}-${salaryConcept.id}`,
        },
        create: {
          id: `${payrollDetail.id}-${salaryConcept.id}`,
          payrollDetailId: payrollDetail.id,
          conceptId: salaryConcept.id,
          amount: basePay,
          taxableAmount: basePay,
          exemptAmount: 0,
        },
        update: {
          amount: basePay,
          taxableAmount: basePay,
          exemptAmount: 0,
        },
      });
    }

    return { totalPerceptions, totalDeductions, netPay };
  }

  private getPeriodDays(periodType: string): number {
    switch (periodType) {
      case 'WEEKLY': return 7;
      case 'BIWEEKLY': return 15;
      case 'MONTHLY': return 30;
      default: return 15;
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<PayrollCalculationJobData>) {
    this.logger.debug(`Job ${job.id} completado para período ${job.data.periodId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PayrollCalculationJobData>, error: Error) {
    this.logger.error(`Job ${job.id} falló para período ${job.data.periodId}: ${error.message}`);
  }
}
