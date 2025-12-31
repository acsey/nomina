import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SecretsService } from '@/common/security/secrets.service';
import { AuditService } from '@/common/security/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES } from '../queue.constants';

/**
 * Datos del job de timbrado
 */
export interface CfdiStampingJobData {
  cfdiId: string;
  userId?: string;
  priority?: 'high' | 'normal' | 'low';
  batchId?: string; // Para timbrado masivo
}

/**
 * Resultado del job de timbrado
 */
export interface CfdiStampingJobResult {
  success: boolean;
  cfdiId: string;
  uuid?: string;
  error?: string;
  errorType?: PacErrorType;
  attemptNumber: number;
  processingTime: number;
  nextRetryAt?: Date;
}

/**
 * MEJORA: Clasificación de errores PAC
 * - TEMPORARY: Errores de red, timeouts, PAC no disponible
 * - PERMANENT: XML inválido, certificado vencido, RFC incorrecto
 * - VALIDATION: Errores de validación del SAT
 */
export enum PacErrorType {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
  VALIDATION = 'VALIDATION',
}

/**
 * MEJORA: Patrones de errores conocidos para clasificación
 */
const ERROR_PATTERNS = {
  TEMPORARY: [
    /timeout/i,
    /ECONNREFUSED/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /network/i,
    /temporarily unavailable/i,
    /service unavailable/i,
    /503/,
    /502/,
    /504/,
    /429/, // Rate limit
  ],
  PERMANENT: [
    /certificado.*vencido/i,
    /certificado.*inválido/i,
    /RFC.*inválido/i,
    /sello.*inválido/i,
    /xml.*inválido/i,
    /firma.*inválida/i,
    /401/, // Auth error
    /403/, // Forbidden
  ],
  VALIDATION: [
    /CCE\d+/i, // Códigos de error SAT
    /CFDI\d+/i,
    /validación/i,
    /estructura.*inválida/i,
  ],
};

/**
 * Eventos emitidos por el procesador
 */
export const CFDI_EVENTS = {
  STAMPED: 'cfdi.stamped',
  STAMP_FAILED: 'cfdi.stamp.failed',
  STAMP_RETRY: 'cfdi.stamp.retry',
  BATCH_COMPLETED: 'cfdi.batch.completed',
};

/**
 * Procesador de timbrado CFDI
 *
 * Cumple con: Documento de Requerimientos - Sección 9. Escalabilidad
 * - Colas de timbrado
 * - Workers independientes
 * - Reintentos automáticos controlados
 *
 * MEJORA: Backoff exponencial y clasificación de errores
 */
@Processor(QUEUE_NAMES.CFDI_STAMPING, {
  concurrency: 5, // Procesar hasta 5 CFDIs en paralelo
})
@Injectable()
export class CfdiStampingProcessor extends WorkerHost {
  private readonly logger = new Logger(CfdiStampingProcessor.name);

  // MEJORA: Configuración de reintentos con backoff exponencial
  private readonly BACKOFF_CONFIG = {
    baseDelayMs: 2000,      // 2 segundos base
    maxDelayMs: 300000,     // 5 minutos máximo
    multiplier: 2,          // Duplicar cada intento
    jitterPercent: 0.2,     // 20% de variación aleatoria
    maxAttempts: 5,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly secretsService: SecretsService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * MEJORA: Clasifica el tipo de error para decidir si reintentar
   */
  private classifyError(errorMessage: string): PacErrorType {
    // Verificar errores permanentes primero (no reintentar)
    for (const pattern of ERROR_PATTERNS.PERMANENT) {
      if (pattern.test(errorMessage)) {
        return PacErrorType.PERMANENT;
      }
    }

    // Verificar errores de validación (no reintentar)
    for (const pattern of ERROR_PATTERNS.VALIDATION) {
      if (pattern.test(errorMessage)) {
        return PacErrorType.VALIDATION;
      }
    }

    // Verificar errores temporales (reintentar)
    for (const pattern of ERROR_PATTERNS.TEMPORARY) {
      if (pattern.test(errorMessage)) {
        return PacErrorType.TEMPORARY;
      }
    }

    // Por defecto, tratar como temporal y reintentar
    return PacErrorType.TEMPORARY;
  }

  /**
   * MEJORA: Calcula el delay con backoff exponencial y jitter
   */
  private calculateBackoffDelay(attemptNumber: number): number {
    const { baseDelayMs, maxDelayMs, multiplier, jitterPercent } = this.BACKOFF_CONFIG;

    // Backoff exponencial: base * (multiplier ^ attempt)
    let delay = baseDelayMs * Math.pow(multiplier, attemptNumber - 1);

    // Aplicar límite máximo
    delay = Math.min(delay, maxDelayMs);

    // Agregar jitter para evitar thundering herd
    const jitter = delay * jitterPercent * (Math.random() * 2 - 1);
    delay = Math.floor(delay + jitter);

    return Math.max(delay, baseDelayMs);
  }

  /**
   * MEJORA: Determina si se debe reintentar basado en tipo de error
   */
  private shouldRetry(errorType: PacErrorType, attemptNumber: number): boolean {
    if (attemptNumber >= this.BACKOFF_CONFIG.maxAttempts) {
      return false;
    }

    // Solo reintentar errores temporales
    return errorType === PacErrorType.TEMPORARY;
  }

  async process(job: Job<CfdiStampingJobData>): Promise<CfdiStampingJobResult> {
    const startTime = Date.now();
    const { cfdiId, userId, batchId } = job.data;

    this.logger.log(`Procesando timbrado CFDI ${cfdiId} (intento ${job.attemptsMade + 1})`);

    try {
      // Obtener CFDI con datos necesarios
      const cfdi = await this.prisma.cfdiNomina.findUnique({
        where: { id: cfdiId },
        include: {
          employee: {
            include: {
              company: true,
            },
          },
        },
      });

      if (!cfdi) {
        throw new Error(`CFDI ${cfdiId} no encontrado`);
      }

      if (cfdi.status === 'STAMPED') {
        this.logger.warn(`CFDI ${cfdiId} ya está timbrado, saltando`);
        return {
          success: true,
          cfdiId,
          uuid: cfdi.uuid || undefined,
          attemptNumber: job.attemptsMade + 1,
          processingTime: Date.now() - startTime,
        };
      }

      if (!cfdi.xmlOriginal) {
        throw new Error('El CFDI no tiene XML original');
      }

      const companyId = cfdi.employee.company.id;

      // Obtener secretos descifrados
      const [certificates, pacCredentials] = await Promise.all([
        this.secretsService.getCompanyCertificates(companyId),
        this.secretsService.getPacCredentials(companyId),
      ]);

      // Actualizar progreso
      await job.updateProgress(30);

      // Simular llamada al PAC (en producción, esto llamaría al servicio real)
      const stampingResult = await this.callPacService(
        cfdi.xmlOriginal,
        {
          pacProvider: pacCredentials.pacProvider,
          pacUser: pacCredentials.pacUser,
          pacPassword: pacCredentials.pacPassword,
          pacMode: pacCredentials.pacMode,
          certificadoCer: certificates.certificadoCer,
          certificadoKey: certificates.certificadoKey,
          certificadoPassword: certificates.certificadoPassword,
          noCertificado: certificates.noCertificado,
        },
      );

      await job.updateProgress(80);

      // Actualizar CFDI con resultado
      await this.prisma.cfdiNomina.update({
        where: { id: cfdiId },
        data: {
          uuid: stampingResult.uuid,
          fechaTimbrado: stampingResult.fechaTimbrado,
          noCertificadoSat: stampingResult.noCertificadoSat,
          selloDigitalSat: stampingResult.selloDigitalSat,
          xmlTimbrado: stampingResult.xmlTimbrado,
          cadenaOriginal: stampingResult.cadenaOriginal,
          status: 'STAMPED',
          pacResponse: stampingResult.pacResponse,
        },
      });

      // Registrar en auditoría
      await this.auditService.logCfdiStamp(
        userId || 'SYSTEM_WORKER',
        cfdiId,
        stampingResult.uuid,
        cfdi.employeeId,
      );

      await job.updateProgress(100);

      // Emitir evento de éxito
      this.eventEmitter.emit(CFDI_EVENTS.STAMPED, {
        cfdiId,
        uuid: stampingResult.uuid,
        employeeId: cfdi.employeeId,
        batchId,
      });

      const result: CfdiStampingJobResult = {
        success: true,
        cfdiId,
        uuid: stampingResult.uuid,
        attemptNumber: job.attemptsMade + 1,
        processingTime: Date.now() - startTime,
      };

      this.logger.log(
        `CFDI ${cfdiId} timbrado exitosamente. UUID: ${stampingResult.uuid} (${result.processingTime}ms)`
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const attemptNumber = job.attemptsMade + 1;

      // MEJORA: Clasificar el error
      const errorType = this.classifyError(errorMessage);
      const canRetry = this.shouldRetry(errorType, attemptNumber);
      const backoffDelay = this.calculateBackoffDelay(attemptNumber);
      const nextRetryAt = canRetry ? new Date(Date.now() + backoffDelay) : undefined;

      // MEJORA: Logging estructurado
      this.logger.error({
        message: `Error al timbrar CFDI`,
        cfdiId,
        attempt: attemptNumber,
        errorType,
        errorMessage,
        canRetry,
        backoffDelay: canRetry ? backoffDelay : null,
        nextRetryAt: nextRetryAt?.toISOString(),
      });

      // MEJORA: Actualizar CFDI con clasificación de error
      const updateData: any = {
        retryCount: attemptNumber,
        lastRetryAt: new Date(),
        errorCode: errorType,
        errorType,
        pacResponse: {
          error: errorMessage,
          errorType,
          lastAttempt: new Date().toISOString(),
          attempts: attemptNumber,
          canRetry,
        },
      };

      // Si es error permanente o último intento, marcar como ERROR
      if (!canRetry || attemptNumber >= this.BACKOFF_CONFIG.maxAttempts) {
        updateData.status = 'ERROR';
        updateData.nextRetryAt = null;

        await this.prisma.cfdiNomina.update({
          where: { id: cfdiId },
          data: updateData,
        });

        // Emitir evento de fallo permanente
        this.eventEmitter.emit(CFDI_EVENTS.STAMP_FAILED, {
          cfdiId,
          error: errorMessage,
          errorType,
          attempts: attemptNumber,
          permanent: errorType !== PacErrorType.TEMPORARY,
          batchId,
        });

        // No relanzar para errores permanentes
        if (errorType !== PacErrorType.TEMPORARY) {
          return {
            success: false,
            cfdiId,
            error: errorMessage,
            errorType,
            attemptNumber,
            processingTime: Date.now() - startTime,
          };
        }
      } else {
        // Programar siguiente intento
        updateData.nextRetryAt = nextRetryAt;

        await this.prisma.cfdiNomina.update({
          where: { id: cfdiId },
          data: updateData,
        });

        // Emitir evento de reintento programado
        this.eventEmitter.emit(CFDI_EVENTS.STAMP_RETRY, {
          cfdiId,
          error: errorMessage,
          errorType,
          attempt: attemptNumber,
          nextAttempt: attemptNumber + 1,
          nextRetryAt: nextRetryAt?.toISOString(),
          backoffDelay,
          batchId,
        });
      }

      throw error; // Re-lanzar para que BullMQ maneje el reintento con backoff
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<CfdiStampingJobData>) {
    this.logger.debug(`Job ${job.id} completado para CFDI ${job.data.cfdiId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<CfdiStampingJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} falló para CFDI ${job.data.cfdiId}: ${error.message}`
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<CfdiStampingJobData>, progress: number) {
    this.logger.debug(`Job ${job.id} progreso: ${progress}%`);
  }

  /**
   * Simula la llamada al PAC
   * En producción, esto se conectaría al servicio real de timbrado
   */
  private async callPacService(
    xmlOriginal: string,
    config: {
      pacProvider?: string | null;
      pacUser?: string | null;
      pacPassword?: string | null;
      pacMode?: string | null;
      certificadoCer?: string | null;
      certificadoKey?: string | null;
      certificadoPassword?: string | null;
      noCertificado?: string | null;
    },
  ): Promise<{
    uuid: string;
    fechaTimbrado: Date;
    noCertificadoSat: string;
    selloDigitalSat: string;
    xmlTimbrado: string;
    cadenaOriginal: string;
    pacResponse: any;
  }> {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // En modo sandbox, simular respuesta
    if (config.pacMode === 'sandbox' || !config.pacProvider) {
      const uuid = this.generateUUID();
      const fechaTimbrado = new Date();

      return {
        uuid,
        fechaTimbrado,
        noCertificadoSat: '00001000000504465028',
        selloDigitalSat: 'SELLO_SIMULADO_SAT_' + uuid,
        xmlTimbrado: this.insertTfdIntoXml(xmlOriginal, uuid, fechaTimbrado),
        cadenaOriginal: `||1.1|${uuid}|${fechaTimbrado.toISOString()}||`,
        pacResponse: {
          status: 'success',
          mode: 'sandbox',
          timestamp: fechaTimbrado.toISOString(),
        },
      };
    }

    // En producción, aquí iría la integración real con FINKOK, SW, etc.
    throw new Error(
      `Integración con PAC ${config.pacProvider} no implementada. Use modo sandbox para pruebas.`
    );
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16).toUpperCase();
    });
  }

  private insertTfdIntoXml(xml: string, uuid: string, fechaTimbrado: Date): string {
    // Simplificado - en producción usar librería XML
    const tfd = `<tfd:TimbreFiscalDigital
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="${uuid}"
      FechaTimbrado="${fechaTimbrado.toISOString()}"
      RfcProvCertif="SAT970701NN3"
      SelloCFD="SELLO_CFDI"
      NoCertificadoSAT="00001000000504465028"
      SelloSAT="SELLO_SAT_SIMULADO"/>`;

    return xml.replace('</cfdi:Complemento>', `${tfd}</cfdi:Complemento>`);
  }
}
