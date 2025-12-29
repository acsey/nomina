import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QUEUE_NAMES } from '../queues.module';
import { CFDI_EVENTS } from '../processors/cfdi-stamping.processor';
import { PAYROLL_EVENTS } from '../processors/payroll-calculation.processor';

/**
 * Tipos de notificación
 */
export enum NotificationType {
  CFDI_STAMPED = 'CFDI_STAMPED',
  CFDI_STAMP_FAILED = 'CFDI_STAMP_FAILED',
  CFDI_BATCH_COMPLETED = 'CFDI_BATCH_COMPLETED',
  PAYROLL_CALCULATION_STARTED = 'PAYROLL_CALCULATION_STARTED',
  PAYROLL_CALCULATION_COMPLETED = 'PAYROLL_CALCULATION_COMPLETED',
  PAYROLL_CALCULATION_FAILED = 'PAYROLL_CALCULATION_FAILED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

/**
 * Datos de notificación
 */
export interface NotificationData {
  type: NotificationType;
  userId?: string;
  companyId?: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Servicio de eventos para colas
 *
 * Escucha eventos emitidos por los procesadores y realiza acciones:
 * - Enviar notificaciones
 * - Actualizar contadores de batch
 * - Registrar métricas
 */
@Injectable()
export class QueueEventsService implements OnModuleInit {
  private readonly logger = new Logger(QueueEventsService.name);
  private batchCounters: Map<string, { total: number; completed: number; failed: number }> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private notificationsQueue: Queue,
  ) {}

  onModuleInit() {
    this.logger.log('QueueEventsService inicializado');
  }

  // ========== EVENTOS DE CFDI ==========

  @OnEvent(CFDI_EVENTS.STAMPED)
  async handleCfdiStamped(payload: {
    cfdiId: string;
    uuid: string;
    employeeId: string;
    batchId?: string;
  }) {
    this.logger.log(`CFDI ${payload.cfdiId} timbrado: ${payload.uuid}`);

    // Actualizar contador de batch si aplica
    if (payload.batchId) {
      this.updateBatchCounter(payload.batchId, 'completed');
      await this.checkBatchCompletion(payload.batchId);
    }

    // Obtener información del empleado para notificación
    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.employeeId },
      select: {
        firstName: true,
        lastName: true,
        companyId: true,
      },
    });

    if (employee) {
      await this.queueNotification({
        type: NotificationType.CFDI_STAMPED,
        companyId: employee.companyId,
        title: 'CFDI Timbrado',
        message: `Recibo de ${employee.firstName} ${employee.lastName} timbrado exitosamente. UUID: ${payload.uuid}`,
        metadata: {
          cfdiId: payload.cfdiId,
          uuid: payload.uuid,
          employeeId: payload.employeeId,
        },
        priority: 'normal',
      });
    }
  }

  @OnEvent(CFDI_EVENTS.STAMP_FAILED)
  async handleCfdiStampFailed(payload: {
    cfdiId: string;
    error: string;
    attempts: number;
    batchId?: string;
  }) {
    this.logger.error(`CFDI ${payload.cfdiId} falló después de ${payload.attempts} intentos: ${payload.error}`);

    // Actualizar contador de batch si aplica
    if (payload.batchId) {
      this.updateBatchCounter(payload.batchId, 'failed');
      await this.checkBatchCompletion(payload.batchId);
    }

    // Obtener información del CFDI
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: payload.cfdiId },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            companyId: true,
          },
        },
      },
    });

    if (cfdi) {
      await this.queueNotification({
        type: NotificationType.CFDI_STAMP_FAILED,
        companyId: cfdi.employee.companyId,
        title: 'Error de Timbrado',
        message: `Error al timbrar recibo de ${cfdi.employee.firstName} ${cfdi.employee.lastName}: ${payload.error}`,
        metadata: {
          cfdiId: payload.cfdiId,
          error: payload.error,
          attempts: payload.attempts,
        },
        priority: 'high',
      });
    }
  }

  @OnEvent(CFDI_EVENTS.STAMP_RETRY)
  handleCfdiStampRetry(payload: {
    cfdiId: string;
    error: string;
    attempt: number;
    nextAttempt: number;
    batchId?: string;
  }) {
    this.logger.warn(
      `CFDI ${payload.cfdiId} reintentando (intento ${payload.attempt} → ${payload.nextAttempt}): ${payload.error}`
    );
  }

  // ========== EVENTOS DE NÓMINA ==========

  @OnEvent(PAYROLL_EVENTS.CALCULATION_STARTED)
  async handlePayrollStarted(payload: {
    periodId: string;
    userId?: string;
    timestamp: Date;
  }) {
    this.logger.log(`Cálculo de nómina iniciado para período ${payload.periodId}`);

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: payload.periodId },
      select: {
        name: true,
        companyId: true,
      },
    });

    if (period) {
      await this.queueNotification({
        type: NotificationType.PAYROLL_CALCULATION_STARTED,
        userId: payload.userId,
        companyId: period.companyId,
        title: 'Cálculo de Nómina Iniciado',
        message: `Se ha iniciado el cálculo de nómina para el período: ${period.name}`,
        metadata: {
          periodId: payload.periodId,
        },
        priority: 'normal',
      });
    }
  }

  @OnEvent(PAYROLL_EVENTS.CALCULATION_COMPLETED)
  async handlePayrollCompleted(payload: {
    success: boolean;
    periodId: string;
    employeesProcessed: number;
    employeesFailed: number;
    processingTime: number;
    totals: {
      perceptions: number;
      deductions: number;
      netPay: number;
    };
    userId?: string;
    timestamp: Date;
  }) {
    this.logger.log(
      `Cálculo de nómina completado: ${payload.employeesProcessed} empleados en ${payload.processingTime}ms`
    );

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: payload.periodId },
      select: {
        name: true,
        companyId: true,
      },
    });

    if (period) {
      const statusMessage = payload.success
        ? `completado exitosamente`
        : `completado con ${payload.employeesFailed} errores`;

      await this.queueNotification({
        type: NotificationType.PAYROLL_CALCULATION_COMPLETED,
        userId: payload.userId,
        companyId: period.companyId,
        title: 'Cálculo de Nómina Completado',
        message: `Período "${period.name}" ${statusMessage}. ${payload.employeesProcessed} empleados procesados. Neto total: $${payload.totals.netPay.toLocaleString()}`,
        metadata: {
          periodId: payload.periodId,
          employeesProcessed: payload.employeesProcessed,
          employeesFailed: payload.employeesFailed,
          processingTime: payload.processingTime,
          totals: payload.totals,
        },
        priority: payload.success ? 'normal' : 'high',
      });
    }
  }

  @OnEvent(PAYROLL_EVENTS.CALCULATION_FAILED)
  async handlePayrollFailed(payload: {
    periodId: string;
    error: string;
    userId?: string;
    timestamp: Date;
  }) {
    this.logger.error(`Cálculo de nómina falló para período ${payload.periodId}: ${payload.error}`);

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: payload.periodId },
      select: {
        name: true,
        companyId: true,
      },
    });

    if (period) {
      await this.queueNotification({
        type: NotificationType.PAYROLL_CALCULATION_FAILED,
        userId: payload.userId,
        companyId: period.companyId,
        title: 'Error en Cálculo de Nómina',
        message: `Error al calcular período "${period.name}": ${payload.error}`,
        metadata: {
          periodId: payload.periodId,
          error: payload.error,
        },
        priority: 'high',
      });
    }
  }

  @OnEvent(PAYROLL_EVENTS.EMPLOYEE_CALCULATED)
  handleEmployeeCalculated(payload: {
    periodId: string;
    employeeId: string;
    employeeName: string;
    netPay: number;
    progress: number;
  }) {
    // Solo log de debug, no notificación individual
    this.logger.debug(
      `Empleado ${payload.employeeName} calculado: $${payload.netPay} (${payload.progress}%)`
    );
  }

  // ========== MÉTODOS AUXILIARES ==========

  /**
   * Inicializa un contador de batch
   */
  initBatchCounter(batchId: string, total: number) {
    this.batchCounters.set(batchId, { total, completed: 0, failed: 0 });
    this.logger.log(`Batch ${batchId} inicializado con ${total} elementos`);
  }

  /**
   * Actualiza el contador de un batch
   */
  private updateBatchCounter(batchId: string, result: 'completed' | 'failed') {
    const counter = this.batchCounters.get(batchId);
    if (counter) {
      if (result === 'completed') {
        counter.completed++;
      } else {
        counter.failed++;
      }
    }
  }

  /**
   * Verifica si un batch se completó
   */
  private async checkBatchCompletion(batchId: string) {
    const counter = this.batchCounters.get(batchId);
    if (!counter) return;

    const processed = counter.completed + counter.failed;
    if (processed >= counter.total) {
      this.logger.log(
        `Batch ${batchId} completado: ${counter.completed}/${counter.total} exitosos, ${counter.failed} fallidos`
      );

      // Emitir evento de batch completado (se podría usar para otras acciones)
      await this.queueNotification({
        type: NotificationType.CFDI_BATCH_COMPLETED,
        title: 'Timbrado Masivo Completado',
        message: `Se procesaron ${counter.total} CFDIs: ${counter.completed} exitosos, ${counter.failed} con error`,
        metadata: {
          batchId,
          total: counter.total,
          completed: counter.completed,
          failed: counter.failed,
        },
        priority: counter.failed > 0 ? 'high' : 'normal',
      });

      // Limpiar contador
      this.batchCounters.delete(batchId);
    }
  }

  /**
   * Encola una notificación para procesamiento asíncrono
   */
  private async queueNotification(data: NotificationData) {
    try {
      await this.notificationsQueue.add('send-notification', data, {
        priority: data.priority === 'high' ? 1 : data.priority === 'low' ? 3 : 2,
        removeOnComplete: 100,
        removeOnFail: 50,
      });
    } catch (error) {
      this.logger.error(`Error al encolar notificación: ${error}`);
    }
  }

  /**
   * Obtiene el estado de un batch
   */
  getBatchStatus(batchId: string) {
    return this.batchCounters.get(batchId);
  }
}
