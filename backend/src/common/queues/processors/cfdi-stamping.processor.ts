import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SecretsService } from '@/common/security/secrets.service';
import { AuditService } from '@/common/security/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES } from '../queues.module';

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
  attemptNumber: number;
  processingTime: number;
}

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
 */
@Processor(QUEUE_NAMES.CFDI_STAMPING, {
  concurrency: 5, // Procesar hasta 5 CFDIs en paralelo
})
@Injectable()
export class CfdiStampingProcessor extends WorkerHost {
  private readonly logger = new Logger(CfdiStampingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly secretsService: SecretsService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
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

      this.logger.error(
        `Error al timbrar CFDI ${cfdiId} (intento ${job.attemptsMade + 1}): ${errorMessage}`
      );

      // Actualizar CFDI con error si es el último intento
      if (job.attemptsMade + 1 >= (job.opts.attempts || 5)) {
        await this.prisma.cfdiNomina.update({
          where: { id: cfdiId },
          data: {
            status: 'ERROR',
            pacResponse: {
              error: errorMessage,
              lastAttempt: new Date().toISOString(),
              attempts: job.attemptsMade + 1,
            },
          },
        });

        // Emitir evento de fallo
        this.eventEmitter.emit(CFDI_EVENTS.STAMP_FAILED, {
          cfdiId,
          error: errorMessage,
          attempts: job.attemptsMade + 1,
          batchId,
        });
      } else {
        // Emitir evento de reintento
        this.eventEmitter.emit(CFDI_EVENTS.STAMP_RETRY, {
          cfdiId,
          error: errorMessage,
          attempt: job.attemptsMade + 1,
          nextAttempt: job.attemptsMade + 2,
          batchId,
        });
      }

      throw error; // Re-lanzar para que BullMQ maneje el reintento
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
