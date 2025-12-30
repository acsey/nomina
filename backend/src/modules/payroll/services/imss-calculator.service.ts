import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { FiscalValuesService } from '@/common/fiscal/fiscal-values.service';

/**
 * ImssCalculatorService - Calculadora de cuotas IMSS
 *
 * Este servicio calcula las cuotas obrero-patronales del IMSS
 * utilizando valores fiscales dinámicos de la base de datos.
 *
 * Cuotas calculadas:
 * - Enfermedad y Maternidad (prestaciones en especie y dinero)
 * - Invalidez y Vida
 * - Cesantía y Vejez
 * - Riesgos de Trabajo
 * - Guarderías y Prestaciones Sociales
 * - INFONAVIT
 */
@Injectable()
export class ImssCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalValues: FiscalValuesService,
  ) {}

  /**
   * Calcula la cuota IMSS del trabajador
   */
  async calculateEmployeeQuota(employee: any, period: any): Promise<number> {
    const sbc = employee.salarioDiarioIntegrado || await this.calculateSBC(employee);
    const periodDays = this.getPeriodDays(period.periodType);
    const year = period.year || new Date().getFullYear();

    // Obtener valores fiscales del año
    const smgDaily = await this.fiscalValues.getSmgDaily(year);

    let totalQuota = 0;

    // Enfermedad y Maternidad - Prestaciones en especie
    // Excedente de 3 SMGDF: 0.40% trabajador
    const tresSMG = smgDaily * 3;
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

  /**
   * Calcula la cuota IMSS del patrón
   */
  async calculateEmployerQuota(employee: any, period: any): Promise<number> {
    const sbc = employee.salarioDiarioIntegrado || await this.calculateSBC(employee);
    const periodDays = this.getPeriodDays(period.periodType);
    const year = period.year || new Date().getFullYear();

    // Obtener valores fiscales del año
    const [umaDaily, smgDaily] = await Promise.all([
      this.fiscalValues.getUmaDaily(year),
      this.fiscalValues.getSmgDaily(year),
    ]);

    let totalQuota = 0;

    // Enfermedad y Maternidad - Cuota fija
    // 20.40% de 1 UMA
    totalQuota += umaDaily * periodDays * 0.204;

    // Enfermedad y Maternidad - Excedente
    const tresSMG = smgDaily * 3;
    if (sbc > tresSMG) {
      const excedente = sbc - tresSMG;
      totalQuota += excedente * periodDays * 0.011;
    }

    // Enfermedad y Maternidad - Prestaciones en dinero
    totalQuota += sbc * periodDays * 0.007;

    // Enfermedad y Maternidad - Gastos médicos pensionados
    totalQuota += sbc * periodDays * 0.0105;

    // Riesgos de Trabajo (según clase de riesgo)
    const riskRate = await this.getRiskRate(employee.jobPosition?.riskLevel, year);
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

  /**
   * Calcula el Salario Base de Cotización (SBC)
   */
  private async calculateSBC(employee: any): Promise<number> {
    const dailySalary = Number(employee.baseSalary) / 30;
    const year = new Date().getFullYear();

    // Obtener días de aguinaldo y prima vacacional configurados
    const fiscalData = await this.fiscalValues.getValuesForYear(year);
    const aguinaldoDays = fiscalData.aguinaldoDays;
    const vacationPremiumPercent = fiscalData.vacationPremiumPercent;

    // Factor de integración según antigüedad
    // Días de vacaciones según tabla LFT (mínimo 12 días primer año)
    const hireDate = new Date(employee.hireDate);
    const now = new Date();
    const yearsWorked = Math.floor(
      (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    const vacationDays = this.getVacationDaysByYears(yearsWorked);

    // Factor de integración = 1 + (aguinaldo/365) + (vacaciones * prima/365)
    const factorIntegracion = 1 + (aguinaldoDays / 365) + (vacationDays * vacationPremiumPercent / 365);

    return dailySalary * factorIntegracion;
  }

  /**
   * Obtiene la tasa de riesgo de trabajo
   */
  private async getRiskRate(riskLevel?: string, year?: number): Promise<number> {
    const riskClass = riskLevel || 'CLASE_I';
    return this.fiscalValues.getRiskRate(riskClass);
  }

  /**
   * Calcula días del período
   */
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

  /**
   * Obtiene días de vacaciones según años trabajados (LFT)
   */
  private getVacationDaysByYears(years: number): number {
    const vacationTable = [
      { years: 1, days: 12 },
      { years: 2, days: 14 },
      { years: 3, days: 16 },
      { years: 4, days: 18 },
      { years: 5, days: 20 },
      { years: 6, days: 22 },
      { years: 10, days: 24 },
      { years: 15, days: 26 },
      { years: 20, days: 28 },
      { years: 25, days: 30 },
      { years: 30, days: 32 },
    ];

    if (years < 1) return 12; // Mínimo 12 días

    for (let i = vacationTable.length - 1; i >= 0; i--) {
      if (years >= vacationTable[i].years) {
        return vacationTable[i].days;
      }
    }

    return 12;
  }

  /**
   * Calcula el desglose completo de cuotas IMSS
   */
  async calculateFullBreakdown(employee: any, period: any): Promise<{
    employee: {
      enfermedadMaternidad: number;
      invalidezVida: number;
      cesantiaVejez: number;
      total: number;
    };
    employer: {
      cuotaFija: number;
      enfermedadMaternidadExcedente: number;
      enfermedadMaternidadDinero: number;
      gastosMedicosPensionados: number;
      riesgosTrabajo: number;
      invalidezVida: number;
      guarderias: number;
      cesantiaVejez: number;
      infonavit: number;
      total: number;
    };
    sbc: number;
    periodDays: number;
  }> {
    const sbc = employee.salarioDiarioIntegrado || await this.calculateSBC(employee);
    const periodDays = this.getPeriodDays(period.periodType);
    const year = period.year || new Date().getFullYear();

    const [umaDaily, smgDaily] = await Promise.all([
      this.fiscalValues.getUmaDaily(year),
      this.fiscalValues.getSmgDaily(year),
    ]);

    const tresSMG = smgDaily * 3;
    const excedente = sbc > tresSMG ? sbc - tresSMG : 0;

    // Cuotas trabajador
    const empEnfermedadMaternidad = (excedente * periodDays * 0.004) + (sbc * periodDays * 0.0025);
    const empInvalidezVida = sbc * periodDays * 0.00625;
    const empCesantiaVejez = sbc * periodDays * 0.01125;
    const employeeTotal = empEnfermedadMaternidad + empInvalidezVida + empCesantiaVejez;

    // Cuotas patrón
    const cuotaFija = umaDaily * periodDays * 0.204;
    const enfermedadMaternidadExcedente = excedente * periodDays * 0.011;
    const enfermedadMaternidadDinero = sbc * periodDays * 0.007;
    const gastosMedicosPensionados = sbc * periodDays * 0.0105;
    const riskRate = await this.getRiskRate(employee.jobPosition?.riskLevel, year);
    const riesgosTrabajo = sbc * periodDays * riskRate;
    const patronInvalidezVida = sbc * periodDays * 0.0175;
    const guarderias = sbc * periodDays * 0.01;
    const patronCesantiaVejez = sbc * periodDays * 0.03150;
    const infonavit = sbc * periodDays * 0.05;
    const employerTotal = cuotaFija + enfermedadMaternidadExcedente + enfermedadMaternidadDinero +
      gastosMedicosPensionados + riesgosTrabajo + patronInvalidezVida + guarderias +
      patronCesantiaVejez + infonavit;

    return {
      employee: {
        enfermedadMaternidad: Math.round(empEnfermedadMaternidad * 100) / 100,
        invalidezVida: Math.round(empInvalidezVida * 100) / 100,
        cesantiaVejez: Math.round(empCesantiaVejez * 100) / 100,
        total: Math.round(employeeTotal * 100) / 100,
      },
      employer: {
        cuotaFija: Math.round(cuotaFija * 100) / 100,
        enfermedadMaternidadExcedente: Math.round(enfermedadMaternidadExcedente * 100) / 100,
        enfermedadMaternidadDinero: Math.round(enfermedadMaternidadDinero * 100) / 100,
        gastosMedicosPensionados: Math.round(gastosMedicosPensionados * 100) / 100,
        riesgosTrabajo: Math.round(riesgosTrabajo * 100) / 100,
        invalidezVida: Math.round(patronInvalidezVida * 100) / 100,
        guarderias: Math.round(guarderias * 100) / 100,
        cesantiaVejez: Math.round(patronCesantiaVejez * 100) / 100,
        infonavit: Math.round(infonavit * 100) / 100,
        total: Math.round(employerTotal * 100) / 100,
      },
      sbc: Math.round(sbc * 100) / 100,
      periodDays,
    };
  }
}
