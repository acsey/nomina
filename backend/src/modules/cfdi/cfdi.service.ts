import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { XmlBuilderService } from './services/xml-builder.service';
import { StampingService } from './services/stamping.service';
import { CfdiStatus } from '@prisma/client';

@Injectable()
export class CfdiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlBuilder: XmlBuilderService,
    private readonly stampingService: StampingService,
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

  async stampCfdi(cfdiId: string) {
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: cfdiId },
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

    try {
      // Enviar a timbrar al PAC
      const stampingResult = await this.stampingService.stamp(cfdi.xmlOriginal);

      // Actualizar con datos del timbrado
      return this.prisma.cfdiNomina.update({
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

  async cancelCfdi(cfdiId: string, reason: string) {
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: cfdiId },
    });

    if (!cfdi) {
      throw new NotFoundException('CFDI no encontrado');
    }

    if (cfdi.status !== 'STAMPED') {
      throw new BadRequestException('Solo se pueden cancelar CFDIs timbrados');
    }

    try {
      // Cancelar en el PAC
      await this.stampingService.cancel(cfdi.uuid!, reason);

      return this.prisma.cfdiNomina.update({
        where: { id: cfdiId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });
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
