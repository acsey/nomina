import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { XmlBuilderService } from './services/xml-builder.service';
import { StampingService } from './services/stamping.service';
import { SecretsService } from '@/common/security/secrets.service';
import { AuditService } from '@/common/security/audit.service';
import { CfdiStatus } from '@/common/types/prisma-enums';

@Injectable()
export class CfdiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlBuilder: XmlBuilderService,
    private readonly stampingService: StampingService,
    private readonly secretsService: SecretsService,
    private readonly auditService: AuditService,
  ) {}

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

  async stampCfdi(cfdiId: string, userId?: string) {
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

    if (cfdi.status === 'STAMPED') {
      throw new BadRequestException('El CFDI ya está timbrado');
    }

    if (!cfdi.xmlOriginal) {
      throw new BadRequestException('El CFDI no tiene XML original');
    }

    const companyId = cfdi.employee.company.id;

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
      const stampingResult = await this.stampingService.stamp(cfdi.xmlOriginal, companyConfig);

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
        cfdi.employeeId,
      );

      return updatedCfdi;
    } catch (error) {
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

  async stampAllPeriod(periodId: string) {
    const cfdis = await this.prisma.cfdiNomina.findMany({
      where: {
        status: 'PENDING',
        payrollDetail: {
          payrollPeriodId: periodId,
        },
      },
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const cfdi of cfdis) {
      try {
        await this.stampCfdi(cfdi.id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${cfdi.id}: ${error.message}`);
      }
    }

    return results;
  }
}
