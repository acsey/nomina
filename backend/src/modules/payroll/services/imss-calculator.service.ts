import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ImssCalculatorService {
  // UMA 2024
  private readonly UMA_DIARIA = 108.57;
  private readonly SALARIO_MINIMO = 248.93;

  constructor(private readonly prisma: PrismaService) {}

  async calculateEmployeeQuota(employee: any, period: any): Promise<number> {
    const sbc = employee.salarioDiarioIntegrado || this.calculateSBC(employee);
    const periodDays = this.getPeriodDays(period.periodType);

    // Cuotas IMSS del trabajador
    let totalQuota = 0;

    // Enfermedad y Maternidad - Prestaciones en especie
    // Excedente de 3 SMGDF: 0.40% trabajador
    const tresSMG = this.SALARIO_MINIMO * 3;
    if (sbc > tresSMG) {
      const excedente = sbc - tresSMG;
      totalQuota += excedente * periodDays * 0.004;
    }

    // Enfermedad y Maternidad - Prestaciones en dinero
    // 0.25% trabajador
    totalQuota += sbc * periodDays * 0.0025;

    // Invalidez y Vida
    // 0.625% trabajador
    totalQuota += sbc * periodDays * 0.00625;

    // Cesantía y Vejez
    // 1.125% trabajador
    totalQuota += sbc * periodDays * 0.01125;

    return Math.round(totalQuota * 100) / 100;
  }

  async calculateEmployerQuota(employee: any, period: any): Promise<number> {
    const sbc = employee.salarioDiarioIntegrado || this.calculateSBC(employee);
    const periodDays = this.getPeriodDays(period.periodType);

    let totalQuota = 0;

    // Enfermedad y Maternidad - Cuota fija
    // 20.40% de 1 UMA
    totalQuota += this.UMA_DIARIA * periodDays * 0.204;

    // Enfermedad y Maternidad - Excedente
    const tresSMG = this.SALARIO_MINIMO * 3;
    if (sbc > tresSMG) {
      const excedente = sbc - tresSMG;
      totalQuota += excedente * periodDays * 0.011;
    }

    // Enfermedad y Maternidad - Prestaciones en dinero
    totalQuota += sbc * periodDays * 0.007;

    // Enfermedad y Maternidad - Gastos médicos pensionados
    totalQuota += sbc * periodDays * 0.0105;

    // Riesgos de Trabajo (según clase de riesgo)
    const riskRate = this.getRiskRate(employee.jobPosition?.riskLevel);
    totalQuota += sbc * periodDays * riskRate;

    // Invalidez y Vida
    totalQuota += sbc * periodDays * 0.0175;

    // Guarderías y Prestaciones Sociales
    totalQuota += sbc * periodDays * 0.01;

    // Cesantía y Vejez
    totalQuota += sbc * periodDays * 0.03150;

    // INFONAVIT (5%)
    totalQuota += sbc * periodDays * 0.05;

    return Math.round(totalQuota * 100) / 100;
  }

  private calculateSBC(employee: any): number {
    // Salario Diario Integrado simplificado
    const dailySalary = Number(employee.baseSalary) / 30;

    // Factor de integración básico (aguinaldo + vacaciones + prima)
    // 15 días aguinaldo + 12 días vacaciones * 25% prima
    const factorIntegracion = 1 + (15 / 365) + (12 * 0.25 / 365);

    return dailySalary * factorIntegracion;
  }

  private getRiskRate(riskLevel?: string): number {
    const rates: Record<string, number> = {
      CLASE_I: 0.0054355,
      CLASE_II: 0.0113065,
      CLASE_III: 0.0259840,
      CLASE_IV: 0.0465325,
      CLASE_V: 0.0758875,
    };

    return rates[riskLevel || 'CLASE_I'] || 0.0054355;
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
}
