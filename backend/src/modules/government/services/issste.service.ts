import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class IssstService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(companyId: string, periodId: string) {
    // Reporte para empleados afiliados al ISSSTE (sector público)
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        isssteNumber: { not: null },
      },
      include: {
        payrollDetails: {
          where: { payrollPeriodId: periodId },
          include: {
            deductions: {
              include: { concept: true },
            },
          },
        },
      },
    });

    const report = employees.map((emp) => {
      const baseSalary = Number(emp.baseSalary);

      // Cuotas ISSSTE
      const quotas = {
        // Fondo de pensiones: 6.125% trabajador
        pension: baseSalary * 0.06125,
        // Seguro de salud: 2.75% trabajador
        salud: baseSalary * 0.0275,
        // Fondo de vivienda: 5% trabajador
        vivienda: baseSalary * 0.05,
        // Servicios sociales y culturales: 0.5%
        serviciosSociales: baseSalary * 0.005,
        total: 0,
      };
      quotas.total = Object.values(quotas).reduce((a, b) => a + b, 0) - quotas.total;

      return {
        isssteNumber: emp.isssteNumber,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        baseSalary,
        quotas,
      };
    });

    return {
      period: periodId,
      employees: report,
      totals: {
        pension: report.reduce((sum, e) => sum + e.quotas.pension, 0),
        salud: report.reduce((sum, e) => sum + e.quotas.salud, 0),
        vivienda: report.reduce((sum, e) => sum + e.quotas.vivienda, 0),
        serviciosSociales: report.reduce((sum, e) => sum + e.quotas.serviciosSociales, 0),
        total: report.reduce((sum, e) => sum + e.quotas.total, 0),
      },
    };
  }
}
