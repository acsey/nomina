import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PayrollCalculatorService } from './services/payroll-calculator.service';
import { CfdiService } from '../cfdi/cfdi.service';
import { Prisma, PayrollStatus, PeriodType } from '@prisma/client';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: PayrollCalculatorService,
    private readonly cfdiService: CfdiService,
  ) {}

  async createPeriod(data: {
    companyId: string;
    periodType: PeriodType;
    periodNumber: number;
    year: number;
    startDate: string | Date;
    endDate: string | Date;
    paymentDate: string | Date;
  }) {
    const existing = await this.prisma.payrollPeriod.findUnique({
      where: {
        companyId_periodType_periodNumber_year: {
          companyId: data.companyId,
          periodType: data.periodType,
          periodNumber: data.periodNumber,
          year: data.year,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un período de nómina con estos datos');
    }

    // Convert date strings to Date objects
    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate;
    const paymentDate = typeof data.paymentDate === 'string' ? new Date(data.paymentDate) : data.paymentDate;

    return this.prisma.payrollPeriod.create({
      data: {
        companyId: data.companyId,
        periodType: data.periodType,
        periodNumber: data.periodNumber,
        year: data.year,
        startDate,
        endDate,
        paymentDate,
        status: PayrollStatus.DRAFT,
      },
    });
  }

  async findAllPeriods(companyId: string, year?: number) {
    return this.prisma.payrollPeriod.findMany({
      where: {
        companyId,
        ...(year && { year }),
      },
      orderBy: [{ year: 'desc' }, { periodNumber: 'desc' }],
      include: {
        _count: {
          select: { payrollDetails: true },
        },
      },
    });
  }

  async findPeriod(id: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        company: true,
        payrollDetails: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
                department: true,
              },
            },
            perceptions: {
              include: { concept: true },
            },
            deductions: {
              include: { concept: true },
            },
          },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Período de nómina no encontrado');
    }

    return period;
  }

  // Preview payroll without saving - shows what will be calculated
  async previewPayroll(periodId: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden previsualizar períodos en estado borrador');
    }

    // Obtener todos los empleados activos de la empresa
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: period.companyId,
        status: 'ACTIVE',
        isActive: true,
      },
      include: {
        department: true,
        benefits: {
          where: { isActive: true },
          include: { benefit: true },
        },
        infonavitCredits: {
          where: { isActive: true },
        },
        pensionAlimenticia: {
          where: { isActive: true },
        },
      },
    });

    // Calculate preview for each employee
    const employeeDetails = [];
    let totalPerceptions = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    for (const employee of employees) {
      const preview = await this.calculator.previewForEmployee(period, employee);
      employeeDetails.push(preview);
      totalPerceptions += preview.totalPerceptions;
      totalDeductions += preview.totalDeductions;
      totalNetPay += preview.netPay;
    }

    return {
      period: {
        id: period.id,
        periodType: period.periodType,
        periodNumber: period.periodNumber,
        year: period.year,
        startDate: period.startDate,
        endDate: period.endDate,
        paymentDate: period.paymentDate,
      },
      employeeCount: employees.length,
      totals: {
        perceptions: totalPerceptions,
        deductions: totalDeductions,
        netPay: totalNetPay,
      },
      employees: employeeDetails,
    };
  }

  async calculatePayroll(periodId: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden calcular períodos en estado borrador');
    }

    // Obtener todos los empleados activos de la empresa
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: period.companyId,
        status: 'ACTIVE',
        isActive: true,
      },
      include: {
        benefits: {
          where: { isActive: true },
          include: { benefit: true },
        },
        infonavitCredits: {
          where: { isActive: true },
        },
        pensionAlimenticia: {
          where: { isActive: true },
        },
      },
    });

    // Calcular nómina para cada empleado
    for (const employee of employees) {
      await this.calculator.calculateForEmployee(period, employee);
    }

    // Actualizar totales del período
    const totals = await this.prisma.payrollDetail.aggregate({
      where: { payrollPeriodId: periodId },
      _sum: {
        totalPerceptions: true,
        totalDeductions: true,
        netPay: true,
      },
    });

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollStatus.CALCULATED,
        totalPerceptions: totals._sum.totalPerceptions || 0,
        totalDeductions: totals._sum.totalDeductions || 0,
        totalNet: totals._sum.netPay || 0,
        processedAt: new Date(),
      },
    });
  }

  async approvePayroll(periodId: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.CALCULATED) {
      throw new BadRequestException('Solo se pueden aprobar períodos calculados');
    }

    // Obtener todos los detalles de nómina del período
    const payrollDetails = await this.prisma.payrollDetail.findMany({
      where: { payrollPeriodId: periodId },
      select: { id: true },
    });

    // Generar y timbrar CFDI para cada detalle de nómina
    const stampingResults = {
      total: payrollDetails.length,
      success: 0,
      failed: 0,
      errors: [] as { detailId: string; error: string }[],
    };

    this.logger.log(`Iniciando timbrado automático para ${payrollDetails.length} recibos del período ${periodId}`);

    for (const detail of payrollDetails) {
      try {
        // Generar CFDI XML
        await this.cfdiService.generateCfdi(detail.id);

        // Obtener el CFDI generado
        const cfdi = await this.cfdiService.getCfdiByPayrollDetail(detail.id);

        if (cfdi) {
          // Timbrar el CFDI
          await this.cfdiService.stampCfdi(cfdi.id);
          stampingResults.success++;
          this.logger.log(`CFDI timbrado exitosamente para detalle ${detail.id}`);
        }
      } catch (error: any) {
        stampingResults.failed++;
        stampingResults.errors.push({
          detailId: detail.id,
          error: error.message || 'Error desconocido',
        });
        this.logger.error(`Error al timbrar CFDI para detalle ${detail.id}: ${error.message}`);
      }
    }

    this.logger.log(`Timbrado completado: ${stampingResults.success} exitosos, ${stampingResults.failed} fallidos`);

    // Actualizar el período a APPROVED
    const updatedPeriod = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollStatus.APPROVED,
      },
    });

    return {
      period: updatedPeriod,
      stamping: stampingResults,
    };
  }

  async closePayroll(periodId: string) {
    const period = await this.findPeriod(periodId);

    if (period.status !== PayrollStatus.PAID) {
      throw new BadRequestException('Solo se pueden cerrar períodos pagados');
    }

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }

  async getEmployeePayrollHistory(employeeId: string, limit = 12) {
    return this.prisma.payrollDetail.findMany({
      where: { employeeId },
      include: {
        payrollPeriod: true,
        perceptions: {
          include: { concept: true },
        },
        deductions: {
          include: { concept: true },
        },
      },
      orderBy: {
        payrollPeriod: {
          paymentDate: 'desc',
        },
      },
      take: limit,
    });
  }
}
