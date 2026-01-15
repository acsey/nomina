import { Injectable, NotFoundException, BadRequestException, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { XmlBuilderService } from './services/xml-builder.service';
import { StampingService } from './services/stamping.service';
import { SecretsService } from '@/common/security/secrets.service';
import { AuditService } from '@/common/security/audit.service';
import { QueueService } from '@/common/queues/services/queue.service';
import { CfdiStatus } from '@/common/types/prisma-enums';

/**
 * Modo de timbrado CFDI
 * - sync: Timbrado síncrono directo (desarrollo/pruebas)
 * - async: Timbrado asíncrono via cola (staging/producción)
 */
export type CfdiStampMode = 'sync' | 'async';

@Injectable()
export class CfdiService {
  private readonly logger = new Logger(CfdiService.name);
  private readonly stampMode: CfdiStampMode;

  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlBuilder: XmlBuilderService,
    private readonly stampingService: StampingService,
    private readonly secretsService: SecretsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @Optional() @Inject(QueueService) private readonly queueService?: QueueService,
  ) {
    // Determine stamp mode from environment
    const mode = this.configService.get<string>('CFDI_STAMP_MODE', 'sync').toLowerCase();
    this.stampMode = (mode === 'async' ? 'async' : 'sync') as CfdiStampMode;
    this.logger.log(`CfdiService inicializado en modo: ${this.stampMode}`);
  }

  async generateCfdi(payrollDetailId: string) {
    const payrollDetail = await this.prisma.payrollDetail.findUnique({
      where: { id: payrollDetailId },
      include: {
        employee: {
          include: {
            company: true,
            jobPosition: true,
            department: true,
          },
        },
        payrollPeriod: true,
        perceptions: {
          include: { concept: true },
        },
        deductions: {
          include: { concept: true },
        },
      },
    });

    if (!payrollDetail) {
      throw new NotFoundException('Detalle de nómina no encontrado');
    }

    // Construir XML
    const xmlOriginal = await this.xmlBuilder.buildNominaXml(payrollDetail);

    // Crear registro CFDI
    const cfdi = await this.prisma.cfdiNomina.upsert({
      where: { payrollDetailId },
      create: {
        payrollDetailId,
        employeeId: payrollDetail.employeeId,
        xmlOriginal,
        status: 'PENDING',
      },
      update: {
        xmlOriginal,
        status: 'PENDING',
      },
    });

    return cfdi;
  }

  /**
   * Timbrar un CFDI individual
   *
   * En modo SYNC: Timbra directamente y retorna el CFDI actualizado
   * En modo ASYNC: Encola el job y retorna el CFDI con status QUEUED
   *
   * @param options.forceSync - Forzar modo síncrono ignorando configuración
   */
  async stampCfdi(
    cfdiId: string,
    userId?: string,
    options?: { forceSync?: boolean; payrollDetailId?: string },
  ) {
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: cfdiId },
      include: {
        employee: {
          include: {
            company: true,
          },
        },
        payrollDetail: {
          select: { id: true },
        },
      },
    });

    if (!cfdi) {
      throw new NotFoundException('CFDI no encontrado');
    }

    if (cfdi.status === 'STAMPED') {
      throw new BadRequestException('El CFDI ya está timbrado');
    }

    if (!cfdi.xmlOriginal) {
      throw new BadRequestException('El CFDI no tiene XML original');
    }

    const companyId = cfdi.employee.company.id;
    const payrollDetailId = options?.payrollDetailId || cfdi.payrollDetail?.id;

    // Determine effective mode
    const useAsync = !options?.forceSync && this.stampMode === 'async' && this.queueService;

    if (useAsync) {
      // ASYNC MODE: Queue the stamping job
      return this.stampCfdiAsync(cfdiId, companyId, userId, payrollDetailId);
    }

    // SYNC MODE: Stamp directly
    return this.stampCfdiSync(cfdiId, companyId, cfdi.xmlOriginal, cfdi.employeeId, userId);
  }

  /**
   * Timbrado síncrono - espera el resultado
   */
  private async stampCfdiSync(
    cfdiId: string,
    companyId: string,
    xmlOriginal: string,
    employeeId: string,
    userId?: string,
  ) {
    // Obtener secretos descifrados de forma segura
    const [certificates, pacCredentials] = await Promise.all([
      this.secretsService.getCompanyCertificates(companyId),
      this.secretsService.getPacCredentials(companyId),
    ]);

    const companyConfig = {
      pacProvider: pacCredentials.pacProvider || undefined,
      pacUser: pacCredentials.pacUser || undefined,
      pacPassword: pacCredentials.pacPassword || undefined,
      pacMode: pacCredentials.pacMode || undefined,
      certificadoCer: certificates.certificadoCer || undefined,
      certificadoKey: certificates.certificadoKey || undefined,
      certificadoPassword: certificates.certificadoPassword || undefined,
      noCertificado: certificates.noCertificado || undefined,
    };

    try {
      // Enviar a timbrar al PAC con configuración de la empresa
      const stampingResult = await this.stampingService.stamp(xmlOriginal, companyConfig);

      // Actualizar con datos del timbrado
      const updatedCfdi = await this.prisma.cfdiNomina.update({
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
        userId || 'SYSTEM',
        cfdiId,
        stampingResult.uuid,
        employeeId,
      );

      return updatedCfdi;
    } catch (error: any) {
      await this.prisma.cfdiNomina.update({
        where: { id: cfdiId },
        data: {
          status: 'ERROR',
          pacResponse: { error: error.message },
        },
      });
      throw error;
    }
  }

  /**
   * Timbrado asíncrono - encola y retorna inmediatamente
   */
  private async stampCfdiAsync(
    cfdiId: string,
    companyId: string,
    userId?: string,
    payrollDetailId?: string,
  ) {
    if (!this.queueService) {
      throw new BadRequestException('QueueService no disponible para modo async');
    }

    // Mark as QUEUED
    const queuedCfdi = await this.prisma.cfdiNomina.update({
      where: { id: cfdiId },
      data: {
        status: 'PENDING', // Will be updated to STAMPED by processor
      },
    });

    // Queue the stamping job
    const jobId = await this.queueService.queueCfdiForStamping(cfdiId, {
      userId,
      companyId,
      payrollDetailId,
      priority: 'normal',
    });

    this.logger.log(`CFDI ${cfdiId} encolado para timbrado (job: ${jobId})`);

    return {
      ...queuedCfdi,
      queued: true,
      jobId,
    };
  }

  async cancelCfdi(cfdiId: string, reason: string, userId?: string) {
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
      throw new NotFoundException('CFDI no encontrado');
    }

    if (cfdi.status !== 'STAMPED') {
      throw new BadRequestException('Solo se pueden cancelar CFDIs timbrados');
    }

    const companyId = cfdi.employee.company.id;

    // Obtener credenciales PAC descifradas
    const pacCredentials = await this.secretsService.getPacCredentials(companyId);

    const companyConfig = {
      pacProvider: pacCredentials.pacProvider || undefined,
      pacUser: pacCredentials.pacUser || undefined,
      pacPassword: pacCredentials.pacPassword || undefined,
      pacMode: pacCredentials.pacMode || undefined,
    };

    try {
      // Cancelar en el PAC
      await this.stampingService.cancel(cfdi.uuid!, reason, companyConfig);

      const updatedCfdi = await this.prisma.cfdiNomina.update({
        where: { id: cfdiId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      // Registrar en auditoría
      await this.auditService.logCfdiCancel(
        userId || 'SYSTEM',
        cfdiId,
        cfdi.uuid!,
        reason,
      );

      return updatedCfdi;
    } catch (error) {
      throw new BadRequestException(`Error al cancelar CFDI: ${error.message}`);
    }
  }

  async getCfdi(id: string) {
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            rfc: true,
          },
        },
        payrollDetail: {
          include: {
            payrollPeriod: true,
          },
        },
      },
    });

    if (!cfdi) {
      throw new NotFoundException('CFDI no encontrado');
    }

    return cfdi;
  }

  async getCfdiByPayrollDetail(payrollDetailId: string) {
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { payrollDetailId },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            rfc: true,
          },
        },
        payrollDetail: {
          include: {
            payrollPeriod: true,
          },
        },
      },
    });

    return cfdi; // Puede ser null si no existe
  }

  async getCfdisByPeriod(periodId: string) {
    return this.prisma.cfdiNomina.findMany({
      where: {
        payrollDetail: {
          payrollPeriodId: periodId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        employee: {
          lastName: 'asc',
        },
      },
    });
  }

  /**
   * Timbrar todos los CFDIs de un período
   *
   * En modo SYNC: Timbra secuencialmente (bloqueante)
   * En modo ASYNC: Encola todo el batch y retorna inmediatamente
   */
  async stampAllPeriod(periodId: string, userId?: string) {
    // Get period to obtain companyId
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      select: { companyId: true },
    });

    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    const cfdis = await this.prisma.cfdiNomina.findMany({
      where: {
        status: 'PENDING',
        payrollDetail: {
          payrollPeriodId: periodId,
        },
      },
      include: {
        payrollDetail: {
          select: { id: true },
        },
      },
    });

    if (cfdis.length === 0) {
      return {
        mode: this.stampMode,
        total: 0,
        success: 0,
        failed: 0,
        errors: [] as string[],
      };
    }

    // ASYNC MODE: Use batch queuing with companyId and periodId
    if (this.stampMode === 'async' && this.queueService) {
      const cfdiIds = cfdis.map((c) => c.id);
      const { batchId, jobIds } = await this.queueService.queueBatchCfdiStamping(cfdiIds, {
        userId,
        priority: 'normal',
        companyId: period.companyId,
        periodId,
      });

      this.logger.log(`Batch ${batchId} creado con ${cfdis.length} CFDIs para período ${periodId}`);

      return {
        mode: 'async' as const,
        total: cfdis.length,
        batchId,
        jobIds,
        message: `${cfdis.length} CFDIs encolados para timbrado`,
      };
    }

    // SYNC MODE: Process sequentially
    const results = {
      mode: 'sync' as const,
      total: cfdis.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const cfdi of cfdis) {
      try {
        await this.stampCfdi(cfdi.id, userId, {
          forceSync: true,
          payrollDetailId: cfdi.payrollDetail?.id,
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${cfdi.id}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Obtiene el estado de un batch de timbrado
   */
  async getBatchStatus(batchId: string) {
    if (!this.queueService) {
      return null;
    }
    return this.queueService.getBatchStatus(batchId);
  }

  /**
   * Obtiene el modo de timbrado actual
   */
  getStampMode(): CfdiStampMode {
    return this.stampMode;
  }
}
