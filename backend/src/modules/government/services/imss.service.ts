import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as dayjs from 'dayjs';

@Injectable()
export class ImssService {
  private readonly UMA_DIARIA = 108.57;
  private readonly SALARIO_MINIMO = 248.93;

  constructor(private readonly prisma: PrismaService) {}

  async generateReport(companyId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        nss: { not: null },
      },
      include: {
        jobPosition: true,
        payrollDetails: {
          where: { payrollPeriodId: periodId },
        },
      },
    });

    const report = employees.map((emp: any) => {
      const sbc = Number(emp.salarioDiarioIntegrado) || this.calculateSBC(emp);
      const periodDays = this.getPeriodDays(period?.periodType || 'BIWEEKLY');

      return {
        nss: emp.nss,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        sbc,
        periodDays,
        quotas: this.calculateQuotas(sbc, periodDays, emp.jobPosition?.riskLevel),
      };
    });

    const totals = report.reduce(
      (acc: any, emp: any) => ({
        employerTotal: acc.employerTotal + emp.quotas.employer.total,
        employeeTotal: acc.employeeTotal + emp.quotas.employee.total,
        grandTotal: acc.grandTotal + emp.quotas.employer.total + emp.quotas.employee.total,
      }),
      { employerTotal: 0, employeeTotal: 0, grandTotal: 0 },
    );

    return {
      period,
      employees: report,
      totals,
    };
  }

  async calculateEmployerQuotas(companyId: string, periodId: string) {
    const report = await this.generateReport(companyId, periodId);

    return {
      period: report.period,
      summary: {
        cuotaFijaPatron: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.cuotaFija,
          0,
        ),
        excedente: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.excedente,
          0,
        ),
        prestacionesDinero: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.prestacionesDinero,
          0,
        ),
        gastosMedicosPensionados: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.gastosMedicosPensionados,
          0,
        ),
        riesgoTrabajo: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.riesgoTrabajo,
          0,
        ),
        invalidezVida: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.invalidezVida,
          0,
        ),
        guarderias: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.guarderias,
          0,
        ),
        cesantiaVejez: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.cesantiaVejez,
          0,
        ),
        infonavit: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.infonavit,
          0,
        ),
        total: report.totals.employerTotal,
      },
    };
  }

  async generateSuaFile(companyId: string, periodId: string): Promise<string> {
    const report = await this.generateReport(companyId, periodId);

    // Formato SUA simplificado
    const lines: string[] = [];

    for (const emp of report.employees) {
      const line = [
        emp.nss?.padEnd(11, ' '),
        emp.name.substring(0, 50).padEnd(50, ' '),
        emp.sbc.toFixed(2).padStart(10, '0'),
        emp.periodDays.toString().padStart(2, '0'),
        emp.quotas.employer.total.toFixed(2).padStart(12, '0'),
        emp.quotas.employee.total.toFixed(2).padStart(12, '0'),
      ].join('|');

      lines.push(line);
    }

    return lines.join('\n');
  }

  async getIdseMovements(companyId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Altas
    const altas = await this.prisma.employee.findMany({
      where: {
        companyId,
        hireDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        nss: true,
        curp: true,
        hireDate: true,
        salarioDiarioIntegrado: true,
        baseSalary: true,
      },
    });

    // Bajas
    const bajas = await this.prisma.employee.findMany({
      where: {
        companyId,
        terminationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        nss: true,
        terminationDate: true,
      },
    });

    // Modificaciones de salario
    const modificaciones = await this.prisma.salaryHistory.findMany({
      where: {
        employee: { companyId },
        effectiveDate: {
          gte: startDate,
          lte: endDate,
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
          },
        },
      },
    });

    return {
      period: { month, year },
      altas: altas.map((e: any) => ({
        ...e,
        movementType: 'ALTA',
        sbc: Number(e.salarioDiarioIntegrado) || Number(e.baseSalary) / 30,
      })),
      bajas: bajas.map((e: any) => ({
        ...e,
        movementType: 'BAJA',
      })),
      modificaciones: modificaciones.map((m: any) => ({
        ...m.employee,
        movementType: 'MODIFICACION_SALARIO',
        oldSalary: m.oldSalary,
        newSalary: m.newSalary,
        effectiveDate: m.effectiveDate,
      })),
    };
  }

  async registerMovement(data: {
    employeeId: string;
    movementType: 'ALTA' | 'BAJA' | 'MODIFICACION_SALARIO';
    effectiveDate: Date;
    sbc?: number;
    reason?: string;
  }) {
    // Registrar movimiento para IDSE
    // En producción, esto generaría el archivo de movimientos IDSE
    return {
      success: true,
      movementType: data.movementType,
      effectiveDate: data.effectiveDate,
      message: 'Movimiento registrado correctamente',
    };
  }

  private calculateSBC(employee: any): number {
    const dailySalary = Number(employee.baseSalary) / 30;
    const factorIntegracion = 1 + (15 / 365) + (12 * 0.25 / 365);
    return dailySalary * factorIntegracion;
  }

  private getPeriodDays(periodType: string): number {
    switch (periodType) {
      case 'WEEKLY':
        return 7;
      case 'BIWEEKLY':
        return 15;
      case 'MONTHLY':
        return 30;
      default:
        return 15;
    }
  }

  private calculateQuotas(sbc: number, days: number, riskLevel?: string) {
    const tresSMG = this.SALARIO_MINIMO * 3;

    // Cuotas del patrón
    const employer = {
      cuotaFija: this.UMA_DIARIA * days * 0.204,
      excedente: sbc > tresSMG ? (sbc - tresSMG) * days * 0.011 : 0,
      prestacionesDinero: sbc * days * 0.007,
      gastosMedicosPensionados: sbc * days * 0.0105,
      riesgoTrabajo: sbc * days * this.getRiskRate(riskLevel),
      invalidezVida: sbc * days * 0.0175,
      guarderias: sbc * days * 0.01,
      cesantiaVejez: sbc * days * 0.0315,
      infonavit: sbc * days * 0.05,
      total: 0,
    };
    employer.total = Object.values(employer).reduce((a, b) => a + b, 0);

    // Cuotas del trabajador
    const employee = {
      excedente: sbc > tresSMG ? (sbc - tresSMG) * days * 0.004 : 0,
      prestacionesDinero: sbc * days * 0.0025,
      invalidezVida: sbc * days * 0.00625,
      cesantiaVejez: sbc * days * 0.01125,
      total: 0,
    };
    employee.total = Object.values(employee).reduce((a, b) => a + b, 0);

    return { employer, employee };
  }

  private getRiskRate(riskLevel?: string): number {
    const rates: Record<string, number> = {
      CLASE_I: 0.0054355,
      CLASE_II: 0.0113065,
      CLASE_III: 0.025984,
      CLASE_IV: 0.0465325,
      CLASE_V: 0.0758875,
    };
    return rates[riskLevel || 'CLASE_I'] || 0.0054355;
  }
}
