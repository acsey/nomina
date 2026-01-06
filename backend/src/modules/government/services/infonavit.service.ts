import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class InfonavitService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(companyId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    const credits = await this.prisma.infonavitCredit.findMany({
      where: {
        isActive: true,
        employee: {
          companyId,
          status: 'ACTIVE',
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            nss: true,
            rfc: true,
            baseSalary: true,
            salarioDiarioIntegrado: true,
            payrollDetails: {
              where: { payrollPeriodId: periodId },
              include: {
                deductions: {
                  include: { concept: true },
                },
              },
            },
          },
        },
      },
    });

    const report = credits.map((credit: any) => {
      const emp = credit.employee;
      const baseSalary = Number(emp.baseSalary);

      let discountAmount = 0;

      switch (credit.discountType) {
        case 'PERCENTAGE':
          discountAmount = baseSalary * (Number(credit.discountValue) / 100);
          break;
        case 'FIXED_AMOUNT':
          discountAmount = Number(credit.discountValue);
          break;
        case 'VSM':
          // Veces Salario Mínimo
          const salarioMinimo = 248.93; // 2024
          discountAmount = salarioMinimo * Number(credit.discountValue);
          break;
      }

      return {
        creditNumber: credit.creditNumber,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        nss: emp.nss,
        rfc: emp.rfc,
        discountType: credit.discountType,
        discountValue: Number(credit.discountValue),
        discountAmount,
        startDate: credit.startDate,
      };
    });

    return {
      period,
      credits: report,
      totals: {
        totalCredits: report.length,
        totalDiscount: report.reduce((sum: number, c: any) => sum + c.discountAmount, 0),
      },
    };
  }

  async getInfonavitFile(companyId: string, periodId: string): Promise<string> {
    const report = await this.generateReport(companyId, periodId);

    // Formato de archivo para envío a INFONAVIT
    const lines = report.credits.map((credit: any) => {
      return [
        credit.nss?.padEnd(11, ' ') || ''.padEnd(11, ' '),
        credit.rfc?.padEnd(13, ' ') || ''.padEnd(13, ' '),
        credit.creditNumber.padEnd(12, ' '),
        credit.discountAmount.toFixed(2).padStart(10, '0'),
        credit.discountType.padEnd(10, ' '),
      ].join('|');
    });

    return lines.join('\n');
  }
}
