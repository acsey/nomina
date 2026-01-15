import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StampingService } from '@/modules/cfdi/services/stamping.service';
import {
  StampingIdempotencyService,
  StampingErrorType,
} from '@/modules/cfdi/services/stamping-idempotency.service';
import { AuditService } from '@/common/security/audit.service';
import { TenantContextService } from '@/common/tenant/tenant-context.service';
import { QUEUE_NAMES } from '../queue.constants';
import { PayrollStatus } from '@/common/types/prisma-enums';

/**
 * Datos del job de timbrado
 * Compatible con timbrado individual y masivo (batch)
 */
export interface StampingJobData {
  cfdiId: string;
  payrollDetailId?: string;
  periodId?: string;           // For period finalizer
  receiptVersion?: number;
  companyId?: string;
  userId?: string;
  priority?: 'normal' | 'high' | 'low';
  retryCount?: number;
  batchId?: string;
}

/**
 * Resultado del job de timbrado
 */
export interface StampingJobResult {
  success: boolean;
  cfdiId: string;
  uuid?: string;
  fechaTimbrado?: Date;
  errorType?: StampingErrorType;
  errorMessage?: string;
  attemptNumber: number;
  periodFinalized?: boolean;
}

/**
 * HARDENING: Worker de Timbrado Asíncrono con Idempotencia y Period Finalizer
 *
 * Ubicación canónica: backend/src/common/queues/processors/cfdi-stamping.processor.ts
 * Cola: QUEUE_NAMES.CFDI_STAMPING ('cfdi-stamping')
 *
 * Implementa:
 * - Pre-check: Verifica si ya está timbrado antes de procesar
 * - Idempotencia: Usa receipt.uuid interno como Idempotency-Key
 * - Manejo de errores diferenciado:
 *   - Errores de conexión/timeout -> Reintento con backoff exponencial
 *   - Errores de validación fiscal -> Marcar como ERROR, no reintentar
 * - Period Finalizer: Auto-cierra período cuando todos los CFDIs están timbrados
 * - Auditoría completa de cada intento
 */
@Processor(QUEUE_NAMES.CFDI_STAMPING)
@Injectable()
export class CfdiStampingProcessor extends WorkerHost {
  private readonly logger = new Logger(CfdiStampingProcessor.name);
  private readonly workerId = `worker-${process.pid}-${Date.now()}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stampingService: StampingService,
    private readonly idempotencyService: StampingIdempotencyService,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
    this.logger.log(`CfdiStampingProcessor inicializado (worker: ${this.workerId})`);
  }

  /**
   * Procesa un job de timbrado
   *
   * IMPORTANT: Job data MUST include companyId for proper tenant isolation.
   * The processor wraps all operations in tenant context.
   */
  async process(job: Job<StampingJobData>): Promise<StampingJobResult> {
    const {
      cfdiId,
      payrollDetailId,
      periodId,
      receiptVersion = 1,
      companyId,
      userId,
      batchId,
    } = job.data;
    const attemptNumber = (job.attemptsMade || 0) + 1;

    this.logger.log(
      `[${job.id}] Iniciando timbrado CFDI ${cfdiId} (intento ${attemptNumber})${batchId ? ` [batch: ${batchId}]` : ''}`,
    );

    // ========================================
    // TENANT CONTEXT: Initialize for this job
    // ========================================
    const tenantCtx = this.tenantContext.createJobContext({
      companyId: companyId,
      userId: userId,
    });

    // Run the entire job within tenant context
    return this.tenantContext.runWithContextAsync(tenantCtx, async () => {
      return this.processWithinContext(job, attemptNumber);
    });
  }

  /**
   * Internal processing method - runs within tenant context
   */
  private async processWithinContext(
    job: Job<StampingJobData>,
    attemptNumber: number,
  ): Promise<StampingJobResult> {
    const {
      cfdiId,
      payrollDetailId,
      periodId,
      receiptVersion = 1,
      companyId,
      userId,
      batchId,
    } = job.data;

    // ========================================
    // HARDENING: Pre-Check - Verificar si ya está timbrado
    // ========================================
    const preCheck = await this.preCheckStamping(cfdiId, payrollDetailId);
    if (preCheck.alreadyStamped) {
      this.logger.log(
        `[${job.id}] CFDI ${cfdiId} ya está timbrado (UUID: ${preCheck.uuid}). Terminando job exitosamente.`,
      );

      // Even if already stamped, check period finalization
      const periodFinalized = await this.checkAndFinalizePeriod(cfdiId, payrollDetailId, periodId);

      return {
        success: true,
        cfdiId,
        uuid: preCheck.uuid,
        fechaTimbrado: preCheck.fechaTimbrado,
        attemptNumber,
        periodFinalized,
      };
    }

    // ========================================
    // HARDENING: Adquirir lock exclusivo
    // ========================================
    const lockResult = await this.idempotencyService.acquireLock(
      cfdiId,
      receiptVersion,
      this.workerId,
    );

    if (!lockResult.acquired) {
      if (lockResult.reason === 'ALREADY_STAMPED') {
        this.logger.log(`[${job.id}] CFDI ya timbrado durante lock check`);
        return {
          success: true,
          cfdiId,
          uuid: lockResult.existingAttempt?.cfdi?.uuid,
          attemptNumber,
        };
      }

      if (lockResult.reason === 'IN_PROGRESS') {
        // Otro worker está procesando, esperar y reintentar
        throw new Error(
          `CFDI ${cfdiId} está siendo procesado por otro worker. Reintentando...`,
        );
      }

      throw new Error(`No se pudo adquirir lock: ${lockResult.reason}`);
    }

    try {
      // ========================================
      // Obtener datos necesarios para timbrado
      // ========================================
      const { cfdi, company, xml, detectedPeriodId } = await this.prepareStampingData(
        cfdiId,
        companyId,
        payrollDetailId,
      );

      // Use detected periodId if not provided
      const effectivePeriodId = periodId || detectedPeriodId;

      // ========================================
      // HARDENING: Llamar al PAC con idempotency key
      // ========================================
      const stampResult = await this.stampingService.stamp(xml, {
        pacProvider: company.pacProvider ?? undefined,
        pacUser: company.pacUser ?? undefined,
        pacPassword: company.pacPassword ?? undefined,
        pacMode: company.pacMode ?? undefined,
        certificadoCer: company.certificadoCer ?? undefined,
        certificadoKey: company.certificadoKey ?? undefined,
        certificadoPassword: company.certificadoPassword ?? undefined,
        noCertificado: company.noCertificado ?? undefined,
      });

      // ========================================
      // Actualizar CFDI con resultado exitoso
      // ========================================
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Actualizar CFDI
        await tx.cfdiNomina.update({
          where: { id: cfdiId },
          data: {
            uuid: stampResult.uuid,
            fechaTimbrado: stampResult.fechaTimbrado,
            noCertificadoSat: stampResult.noCertificadoSat,
            selloDigitalSat: stampResult.selloDigitalSat,
            cadenaOriginal: stampResult.cadenaOriginal,
            xmlTimbrado: stampResult.xmlTimbrado,
            status: 'STAMPED',
          },
        });

        // Actualizar PayrollDetail (if provided)
        if (payrollDetailId) {
          await tx.payrollDetail.update({
            where: { id: payrollDetailId },
            data: {
              status: 'STAMP_OK',
            },
          });
        }
      });

      // Liberar lock con éxito
      await this.idempotencyService.releaseLock(cfdiId, lockResult.attemptId!, {
        success: true,
        pacResponse: stampResult.pacResponse,
      });

      this.logger.log(
        `[${job.id}] Timbrado exitoso. UUID: ${stampResult.uuid}`,
      );

      // Auditar
      await this.auditService.logCfdiStamp(
        userId || 'SYSTEM',
        cfdiId,
        stampResult.uuid,
        payrollDetailId || cfdiId,
      );

      // ========================================
      // PERIOD FINALIZER: Verificar si cerrar período
      // ========================================
      const periodFinalized = await this.checkAndFinalizePeriod(cfdiId, payrollDetailId, effectivePeriodId);

      return {
        success: true,
        cfdiId,
        uuid: stampResult.uuid,
        fechaTimbrado: stampResult.fechaTimbrado,
        attemptNumber,
        periodFinalized,
      };
    } catch (error: any) {
      // ========================================
      // HARDENING: Clasificar error para decidir reintento
      // ========================================
      const errorClassification = this.classifyError(error);

      this.logger.error(
        `[${job.id}] Error en timbrado: ${error.message} (tipo: ${errorClassification.type})`,
      );

      // Liberar lock con error
      await this.idempotencyService.releaseLock(cfdiId, lockResult.attemptId!, {
        success: false,
        errorType: errorClassification.type,
        errorMessage: error.message,
      });

      // ========================================
      // Decisión de reintento basada en tipo de error
      // ========================================
      if (errorClassification.isRetryable) {
        // Error temporal - lanzar para que BullMQ reintente con backoff
        throw error;
      } else {
        // Error permanente - marcar como ERROR y no reintentar
        await this.markAsPermanentError(payrollDetailId, cfdiId, error.message);

        return {
          success: false,
          cfdiId,
          errorType: errorClassification.type,
          errorMessage: error.message,
          attemptNumber,
        };
      }
    }
  }

  /**
   * HARDENING: Pre-check para evitar procesamiento innecesario
   */
  private async preCheckStamping(
    cfdiId: string,
    payrollDetailId?: string,
  ): Promise<{
    alreadyStamped: boolean;
    uuid?: string;
    fechaTimbrado?: Date;
  }> {
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: cfdiId },
      select: { status: true, uuid: true, fechaTimbrado: true },
    });

    // Check CFDI status
    if (cfdi?.status === 'STAMPED') {
      return {
        alreadyStamped: true,
        uuid: cfdi?.uuid || undefined,
        fechaTimbrado: cfdi?.fechaTimbrado || undefined,
      };
    }

    // Also check PayrollDetail if provided
    if (payrollDetailId) {
      const payrollDetail = await this.prisma.payrollDetail.findUnique({
        where: { id: payrollDetailId },
        select: { status: true },
      });
      if (payrollDetail?.status === 'STAMP_OK') {
        return {
          alreadyStamped: true,
          uuid: cfdi?.uuid || undefined,
          fechaTimbrado: cfdi?.fechaTimbrado || undefined,
        };
      }
    }

    return { alreadyStamped: false };
  }

  /**
   * Prepara datos necesarios para el timbrado
   * Si companyId no se proporciona, lo infiere desde el CFDI
   */
  private async prepareStampingData(
    cfdiId: string,
    companyId?: string,
    payrollDetailId?: string,
  ) {
    // First get CFDI with employee to infer companyId if needed
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: cfdiId },
      select: {
        xmlOriginal: true,
        employee: {
          select: { companyId: true },
        },
        payrollDetail: {
          select: {
            id: true,
            payrollPeriodId: true,
          },
        },
      },
    });

    if (!cfdi?.xmlOriginal) {
      throw new Error('XML original no encontrado');
    }

    // Use provided companyId or infer from CFDI's employee
    const effectiveCompanyId = companyId || cfdi.employee?.companyId;
    if (!effectiveCompanyId) {
      throw new Error('No se pudo determinar la empresa para el timbrado');
    }

    // Get period ID from CFDI if not provided
    const detectedPeriodId = cfdi.payrollDetail?.payrollPeriodId;

    const company = await this.prisma.company.findUnique({
      where: { id: effectiveCompanyId },
      select: {
        pacProvider: true,
        pacUser: true,
        pacPassword: true,
        pacMode: true,
        certificadoCer: true,
        certificadoKey: true,
        certificadoPassword: true,
        noCertificado: true,
      },
    });

    if (!company) {
      throw new Error('Empresa no encontrada');
    }

    return {
      cfdi,
      company,
      xml: cfdi.xmlOriginal,
      detectedPeriodId,
    };
  }

  /**
   * PERIOD FINALIZER: Verifica y cierra el período si todos los CFDIs están timbrados
   *
   * Lógica:
   * 1. Si no hay periodId, intentar obtenerlo del PayrollDetail
   * 2. Contar PayrollDetails del período en estado != STAMP_OK
   * 3. Si todos están en STAMP_OK, cambiar PayrollPeriod.status a APPROVED
   */
  private async checkAndFinalizePeriod(
    cfdiId: string,
    payrollDetailId?: string,
    periodId?: string,
  ): Promise<boolean> {
    try {
      // If no periodId, try to get it from PayrollDetail
      let effectivePeriodId = periodId;

      if (!effectivePeriodId && payrollDetailId) {
        const detail = await this.prisma.payrollDetail.findUnique({
          where: { id: payrollDetailId },
          select: { payrollPeriodId: true },
        });
        effectivePeriodId = detail?.payrollPeriodId;
      }

      // If still no periodId, try to get it from CFDI
      if (!effectivePeriodId) {
        const cfdi = await this.prisma.cfdiNomina.findUnique({
          where: { id: cfdiId },
          select: {
            payrollDetail: {
              select: { payrollPeriodId: true },
            },
          },
        });
        effectivePeriodId = cfdi?.payrollDetail?.payrollPeriodId;
      }

      if (!effectivePeriodId) {
        this.logger.debug(`No se pudo determinar periodId para CFDI ${cfdiId}`);
        return false;
      }

      // Check if period is in PROCESSING state
      const period = await this.prisma.payrollPeriod.findUnique({
        where: { id: effectivePeriodId },
        select: { id: true, status: true },
      });

      if (!period || period.status !== PayrollStatus.PROCESSING) {
        this.logger.debug(
          `Período ${effectivePeriodId} no está en PROCESSING (estado: ${period?.status}), no se finalizará`,
        );
        return false;
      }

      // Count PayrollDetails that are NOT STAMP_OK
      const pendingCount = await this.prisma.payrollDetail.count({
        where: {
          payrollPeriodId: effectivePeriodId,
          status: { not: 'STAMP_OK' },
        },
      });

      if (pendingCount > 0) {
        this.logger.debug(
          `Período ${effectivePeriodId} tiene ${pendingCount} recibos pendientes de timbrar`,
        );
        return false;
      }

      // All PayrollDetails are STAMP_OK - finalize period
      await this.prisma.payrollPeriod.update({
        where: { id: effectivePeriodId },
        data: {
          status: PayrollStatus.APPROVED,
        },
      });

      this.logger.log(
        `✅ PERIOD FINALIZER: Período ${effectivePeriodId} finalizado automáticamente (todos los CFDIs timbrados)`,
      );

      return true;
    } catch (error: any) {
      this.logger.error(
        `Error en period finalizer para CFDI ${cfdiId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * HARDENING: Clasifica el error para decidir si reintentar
   */
  private classifyError(error: any): {
    type: StampingErrorType;
    isRetryable: boolean;
  } {
    const message = error.message?.toLowerCase() || '';

    // Errores de red/conexión - REINTENTAR
    if (
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('network') ||
      message.includes('connection')
    ) {
      return { type: StampingErrorType.NETWORK, isRetryable: true };
    }

    // Errores temporales del PAC - REINTENTAR
    if (
      message.includes('503') ||
      message.includes('502') ||
      message.includes('429') ||
      message.includes('busy') ||
      message.includes('temporary')
    ) {
      return { type: StampingErrorType.PAC_TEMPORARY, isRetryable: true };
    }

    // Errores de validación fiscal - NO REINTENTAR
    if (
      message.includes('rfc') ||
      message.includes('validación') ||
      message.includes('invalid') ||
      message.includes('schema') ||
      message.includes('301') || // CFDI mal formado
      message.includes('302') || // Certificado no vigente
      message.includes('303') || // Sello no corresponde
      message.includes('305')    // Fecha fuera de rango
    ) {
      return { type: StampingErrorType.VALIDATION, isRetryable: false };
    }

    // Errores de certificado - NO REINTENTAR
    if (
      message.includes('certificado') ||
      message.includes('certificate') ||
      message.includes('firma') ||
      message.includes('sello')
    ) {
      return { type: StampingErrorType.CERTIFICATE, isRetryable: false };
    }

    // Duplicado - NO REINTENTAR
    if (message.includes('duplicado') || message.includes('duplicate')) {
      return { type: StampingErrorType.DUPLICATE, isRetryable: false };
    }

    // Error del PAC permanente - NO REINTENTAR
    if (message.includes('400') || message.includes('401')) {
      return { type: StampingErrorType.PAC_PERMANENT, isRetryable: false };
    }

    // Por defecto, errores desconocidos son reintentables una vez
    return { type: StampingErrorType.UNKNOWN, isRetryable: true };
  }

  /**
   * Marca el recibo como error permanente
   */
  private async markAsPermanentError(
    payrollDetailId: string | undefined,
    cfdiId: string,
    errorMessage: string,
  ) {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update PayrollDetail if provided
      if (payrollDetailId) {
        await tx.payrollDetail.update({
          where: { id: payrollDetailId },
          data: { status: 'STAMP_ERROR' },
        });
      }

      // Always update CFDI
      await tx.cfdiNomina.update({
        where: { id: cfdiId },
        data: {
          status: 'ERROR',
          pacResponse: {
            error: true,
            errorMessage: errorMessage.substring(0, 500),
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    this.logger.warn(
      `CFDI ${cfdiId}${payrollDetailId ? ` (recibo ${payrollDetailId})` : ''} marcado como ERROR: ${errorMessage}`,
    );
  }

  // ========================================
  // Event handlers para logging
  // ========================================

  @OnWorkerEvent('completed')
  onCompleted(job: Job<StampingJobData>, result: StampingJobResult) {
    const finalizerMsg = result.periodFinalized ? ' [PERÍODO FINALIZADO]' : '';
    this.logger.log(
      `[${job.id}] Completado: ${result.success ? 'SUCCESS' : 'FAILED'} - UUID: ${result.uuid || 'N/A'}${finalizerMsg}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<StampingJobData>, error: Error) {
    this.logger.error(
      `[${job.id}] Fallido (intento ${job.attemptsMade}): ${error.message}`,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`Error en worker: ${error.message}`);
  }
}

/**
 * Configuración recomendada para la cola de timbrado
 */
export const STAMPING_QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 5, // Máximo 5 intentos
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s, 16s, 32s
    },
    removeOnComplete: {
      count: 1000, // Mantener últimos 1000 jobs completados
    },
    removeOnFail: {
      count: 5000, // Mantener últimos 5000 jobs fallidos
    },
  },
};
