import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { StampingJobData } from '../processors/cfdi-stamping.processor';
import { PayrollCalculationJobData } from '../processors/payroll-calculation.processor';
import { QueueEventsService } from './queue-events.service';

/**
 * Servicio de colas
 *
 * Proporciona una interfaz simplificada para encolar trabajos
 * desde cualquier parte de la aplicación
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.CFDI_STAMPING)
    private cfdiStampingQueue: Queue<StampingJobData>,

    @InjectQueue(QUEUE_NAMES.PAYROLL_CALCULATION)
    private payrollCalculationQueue: Queue<PayrollCalculationJobData>,

    @InjectQueue(QUEUE_NAMES.REPORTS_GENERATION)
    private reportsQueue: Queue,

    private readonly eventsService: QueueEventsService,
  ) {}

  // ========== TIMBRADO CFDI ==========

  /**
   * Encola un CFDI para timbrado
   *
   * @param cfdiId - ID del CFDI a timbrar
   * @param options.companyId - ID de empresa (tenant isolation)
   * @param options.periodId - ID del período (period finalizer)
   * @param options.payrollDetailId - ID del detalle de nómina
   */
  async queueCfdiForStamping(
    cfdiId: string,
    options?: {
      userId?: string;
      priority?: 'high' | 'normal' | 'low';
      batchId?: string;
      payrollDetailId?: string;
      companyId?: string;
      periodId?: string;
    },
  ): Promise<string> {
    const jobData: StampingJobData = {
      cfdiId,
      userId: options?.userId,
      priority: options?.priority,
      batchId: options?.batchId,
      payrollDetailId: options?.payrollDetailId,
      companyId: options?.companyId,
      periodId: options?.periodId,
    };

    const jobOptions: JobsOptions = {
      priority: options?.priority === 'high' ? 1 : options?.priority === 'low' ? 3 : 2,
    };

    const job = await this.cfdiStampingQueue.add('stamp', jobData, jobOptions);
    this.logger.log(`CFDI ${cfdiId} encolado para timbrado. Job ID: ${job.id}`);

    return job.id || '';
  }

  /**
   * Encola múltiples CFDIs para timbrado masivo
   *
   * @param cfdiIds - Array de IDs de CFDIs a timbrar
   * @param options - Opciones de encolado
   * @param options.companyId - ID de empresa (recomendado para tenant isolation)
   * @param options.periodId - ID del período (para period finalizer)
   */
  async queueBatchCfdiStamping(
    cfdiIds: string[],
    options?: {
      userId?: string;
      priority?: 'high' | 'normal' | 'low';
      companyId?: string;
      periodId?: string;
    },
  ): Promise<{ batchId: string; jobIds: string[] }> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Inicializar contador de batch
    this.eventsService.initBatchCounter(batchId, cfdiIds.length);

    const jobIds: string[] = [];

    for (const cfdiId of cfdiIds) {
      const jobId = await this.queueCfdiForStamping(cfdiId, {
        userId: options?.userId,
        priority: options?.priority,
        companyId: options?.companyId,
        batchId,
      });
      jobIds.push(jobId);
    }

    this.logger.log(`Batch ${batchId} creado con ${cfdiIds.length} CFDIs`);

    return { batchId, jobIds };
  }

  // ========== CÁLCULO DE NÓMINA ==========

  /**
   * Encola un período para cálculo de nómina
   */
  async queuePayrollCalculation(
    periodId: string,
    options?: {
      employeeIds?: string[];
      userId?: string;
      recalculate?: boolean;
    },
  ): Promise<string> {
    const jobData: PayrollCalculationJobData = {
      periodId,
      employeeIds: options?.employeeIds,
      userId: options?.userId,
      recalculate: options?.recalculate,
    };

    const job = await this.payrollCalculationQueue.add('calculate', jobData);
    this.logger.log(`Cálculo de nómina encolado para período ${periodId}. Job ID: ${job.id}`);

    return job.id || '';
  }

  // ========== REPORTES ==========

  /**
   * Encola generación de reporte
   */
  async queueReportGeneration(
    reportType: string,
    params: Record<string, any>,
    userId?: string,
  ): Promise<string> {
    const job = await this.reportsQueue.add('generate', {
      reportType,
      params,
      userId,
    });

    this.logger.log(`Reporte ${reportType} encolado. Job ID: ${job.id}`);
    return job.id || '';
  }

  // ========== ESTADO DE JOBS ==========

  /**
   * Obtiene el estado de un job de timbrado
   */
  async getCfdiStampingJobStatus(jobId: string) {
    const job = await this.cfdiStampingQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      data: job.data,
      returnValue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Obtiene el estado de un job de cálculo
   */
  async getPayrollCalculationJobStatus(jobId: string) {
    const job = await this.payrollCalculationQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      data: job.data,
      returnValue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Obtiene estadísticas de las colas
   */
  async getQueueStats() {
    const [cfdiStats, payrollStats, reportsStats] = await Promise.all([
      this.getQueueCounts(this.cfdiStampingQueue),
      this.getQueueCounts(this.payrollCalculationQueue),
      this.getQueueCounts(this.reportsQueue),
    ]);

    return {
      cfdiStamping: cfdiStats,
      payrollCalculation: payrollStats,
      reportsGeneration: reportsStats,
    };
  }

  private async getQueueCounts(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Obtiene el estado de un batch de timbrado
   */
  getBatchStatus(batchId: string) {
    return this.eventsService.getBatchStatus(batchId);
  }
}
