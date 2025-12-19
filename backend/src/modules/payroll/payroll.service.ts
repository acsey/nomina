import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PayrollCalculatorService } from './services/payroll-calculator.service';
import { Prisma, PayrollStatus, PeriodType } from '@prisma/client';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: PayrollCalculatorService,
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

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollStatus.APPROVED },
    });
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
