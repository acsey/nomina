import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StampingService } from '../services/stamping.service';
import {
  StampingIdempotencyService,
  StampingErrorType,
} from '../services/stamping-idempotency.service';
import { AuditService } from '@/common/security/audit.service';
import { QUEUE_NAMES } from '@/common/queues/queue.constants';

/**
 * Nombre de la cola de timbrado (usar constante centralizada)
 * @deprecated Use QUEUE_NAMES.CFDI_STAMPING instead
 */
export const STAMPING_QUEUE = QUEUE_NAMES.CFDI_STAMPING;

/**
 * Datos del job de timbrado
 * Compatible con timbrado individual y masivo (batch)
 */
export interface StampingJobData {
  cfdiId: string;
  payrollDetailId?: string; // Optional for direct CFDI stamping
  receiptVersion?: number;  // Optional, defaults to 1
  companyId?: string;       // Can be inferred from CFDI if not provided
  userId?: string;
  priority?: 'normal' | 'high' | 'low';
  retryCount?: number;
  batchId?: string;         // For batch/bulk stamping tracking
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
}

/**
 * HARDENING: Worker de Timbrado Asíncrono con Idempotencia y Robustez
 *
 * Implementa:
 * - Pre-check: Verifica si ya está timbrado antes de procesar
 * - Idempotencia: Usa receipt.uuid interno como Idempotency-Key
 * - Manejo de errores diferenciado:
 *   - Errores de conexión/timeout -> Reintento con backoff exponencial
 *   - Errores de validación fiscal -> Marcar como ERROR, no reintentar
 * - Auditoría completa de cada intento
 */
@Processor(QUEUE_NAMES.CFDI_STAMPING)
@Injectable()
export class StampingProcessor extends WorkerHost {
  private readonly logger = new Logger(StampingProcessor.name);
  private readonly workerId = `worker-${process.pid}-${Date.now()}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stampingService: StampingService,
    private readonly idempotencyService: StampingIdempotencyService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  /**
   * Procesa un job de timbrado
   */
  async process(job: Job<StampingJobData>): Promise<StampingJobResult> {
    const { cfdiId, payrollDetailId, receiptVersion = 1, companyId, userId, batchId } = job.data;
    const attemptNumber = (job.attemptsMade || 0) + 1;

    this.logger.log(
      `[${job.id}] Iniciando timbrado CFDI ${cfdiId} (intento ${attemptNumber})${batchId ? ` [batch: ${batchId}]` : ''}`,
    );

    // ========================================
    // HARDENING: Pre-Check - Verificar si ya está timbrado
    // ========================================
    const preCheck = await this.preCheckStamping(cfdiId, payrollDetailId);
    if (preCheck.alreadyStamped) {
      this.logger.log(
        `[${job.id}] CFDI ${cfdiId} ya está timbrado (UUID: ${preCheck.uuid}). Terminando job exitosamente.`,
      );
      return {
        success: true,
        cfdiId,
        uuid: preCheck.uuid,
        fechaTimbrado: preCheck.fechaTimbrado,
        attemptNumber,
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
      const { cfdi, company, xml } = await this.prepareStampingData(
        cfdiId,
        companyId,
      );

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
      await this.prisma.$transaction(async (tx) => {
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
        payrollDetailId || cfdiId, // Use cfdiId as fallback for audit reference
      );

      return {
        success: true,
        cfdiId,
        uuid: stampResult.uuid,
        fechaTimbrado: stampResult.fechaTimbrado,
        attemptNumber,
      };

    } catch (error) {
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
  private async prepareStampingData(cfdiId: string, companyId?: string) {
    // First get CFDI with employee to infer companyId if needed
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: cfdiId },
      select: {
        xmlOriginal: true,
        employee: {
          select: { companyId: true },
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
    };
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
    await this.prisma.$transaction(async (tx) => {
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
    this.logger.log(
      `[${job.id}] Completado: ${result.success ? 'SUCCESS' : 'FAILED'} - UUID: ${result.uuid || 'N/A'}`,
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
