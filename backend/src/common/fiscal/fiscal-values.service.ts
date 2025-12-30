import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface FiscalValuesData {
  year: number;
  umaDaily: number;
  umaMonthly: number;
  umaYearly: number;
  smgDaily: number;
  smgZfnDaily: number;
  aguinaldoDays: number;
  vacationPremiumPercent: number;
}

export interface WorkRiskRates {
  CLASE_I: number;
  CLASE_II: number;
  CLASE_III: number;
  CLASE_IV: number;
  CLASE_V: number;
}

export interface OvertimeConfig {
  doubleAfterHours: number;
  tripleAfterHours: number;
  maxWeeklyHours: number;
  doubleMultiplier: number;
  tripleMultiplier: number;
}

/**
 * FiscalValuesService - Servicio centralizado para valores fiscales
 *
 * Este servicio proporciona acceso a todos los valores fiscales configurables:
 * - UMA (Unidad de Medida y Actualización)
 * - SMG (Salario Mínimo General)
 * - Tasas de riesgo de trabajo
 * - Configuración de tiempo extra
 * - Días de aguinaldo y prima vacacional
 *
 * Los valores se obtienen de la base de datos y se cachean para mejor rendimiento.
 */
@Injectable()
export class FiscalValuesService implements OnModuleInit {
  private cachedValues: Map<number, FiscalValuesData> = new Map();
  private cachedRiskRates: WorkRiskRates | null = null;
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  // Valores por defecto (2025) - Solo se usan si no hay datos en BD
  private readonly DEFAULT_VALUES: FiscalValuesData = {
    year: 2025,
    umaDaily: 113.14,
    umaMonthly: 3439.46,
    umaYearly: 41273.52,
    smgDaily: 278.80,
    smgZfnDaily: 419.88,
    aguinaldoDays: 15,
    vacationPremiumPercent: 0.25,
  };

  // Tasas de riesgo de trabajo por defecto (2025)
  private readonly DEFAULT_RISK_RATES: WorkRiskRates = {
    CLASE_I: 0.0054355,
    CLASE_II: 0.0113065,
    CLASE_III: 0.0259840,
    CLASE_IV: 0.0465325,
    CLASE_V: 0.0758875,
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Pre-cargar valores del año actual al iniciar
    await this.loadValuesForYear(new Date().getFullYear());
    await this.loadRiskRates();
  }

  /**
   * Obtiene los valores fiscales para un año específico
   */
  async getValuesForYear(year: number): Promise<FiscalValuesData> {
    // Verificar cache
    if (this.isCacheValid() && this.cachedValues.has(year)) {
      return this.cachedValues.get(year)!;
    }

    return this.loadValuesForYear(year);
  }

  /**
   * Obtiene los valores fiscales del año actual
   */
  async getCurrentValues(): Promise<FiscalValuesData> {
    return this.getValuesForYear(new Date().getFullYear());
  }

  /**
   * Obtiene el valor diario de UMA para un año
   */
  async getUmaDaily(year?: number): Promise<number> {
    const values = await this.getValuesForYear(year || new Date().getFullYear());
    return values.umaDaily;
  }

  /**
   * Obtiene el valor mensual de UMA para un año
   */
  async getUmaMonthly(year?: number): Promise<number> {
    const values = await this.getValuesForYear(year || new Date().getFullYear());
    return values.umaMonthly;
  }

  /**
   * Obtiene el salario mínimo diario para un año
   */
  async getSmgDaily(year?: number): Promise<number> {
    const values = await this.getValuesForYear(year || new Date().getFullYear());
    return values.smgDaily;
  }

  /**
   * Obtiene el salario mínimo diario de zona fronteriza
   */
  async getSmgZfnDaily(year?: number): Promise<number> {
    const values = await this.getValuesForYear(year || new Date().getFullYear());
    return values.smgZfnDaily;
  }

  /**
   * Obtiene los días de aguinaldo configurados
   */
  async getAguinaldoDays(year?: number): Promise<number> {
    const values = await this.getValuesForYear(year || new Date().getFullYear());
    return values.aguinaldoDays;
  }

  /**
   * Obtiene el porcentaje de prima vacacional
   */
  async getVacationPremiumPercent(year?: number): Promise<number> {
    const values = await this.getValuesForYear(year || new Date().getFullYear());
    return values.vacationPremiumPercent;
  }

  /**
   * Obtiene las tasas de riesgo de trabajo
   */
  async getRiskRates(): Promise<WorkRiskRates> {
    if (this.isCacheValid() && this.cachedRiskRates) {
      return this.cachedRiskRates;
    }
    return this.loadRiskRates();
  }

  /**
   * Obtiene la tasa de riesgo para una clase específica
   */
  async getRiskRate(riskClass: string): Promise<number> {
    const rates = await this.getRiskRates();
    const classKey = riskClass as keyof WorkRiskRates;
    return rates[classKey] || rates.CLASE_I;
  }

  /**
   * Obtiene la configuración de tiempo extra para una empresa
   */
  async getOvertimeConfig(companyId: string): Promise<OvertimeConfig> {
    const config = await this.prisma.companyPayrollConfig.findUnique({
      where: { companyId },
      select: {
        overtimeDoubleAfter: true,
        overtimeTripleAfter: true,
        maxOvertimeHoursWeek: true,
      },
    });

    return {
      doubleAfterHours: config?.overtimeDoubleAfter || 9,
      tripleAfterHours: config?.overtimeTripleAfter || 3,
      maxWeeklyHours: config?.maxOvertimeHoursWeek || 9,
      doubleMultiplier: 2, // Por ley
      tripleMultiplier: 3, // Por ley
    };
  }

  /**
   * Calcula el límite exento para un concepto basado en UMAs
   * @param umaMultiplier Número de UMAs (ej: 30 para aguinaldo)
   * @param year Año para obtener el valor de UMA
   */
  async getExemptLimit(umaMultiplier: number, year?: number): Promise<number> {
    const umaDaily = await this.getUmaDaily(year);
    return umaDaily * umaMultiplier;
  }

  /**
   * Invalida el cache para forzar recarga
   */
  invalidateCache(): void {
    this.cachedValues.clear();
    this.cachedRiskRates = null;
    this.lastCacheUpdate = null;
  }

  // ============================================
  // Métodos privados
  // ============================================

  private async loadValuesForYear(year: number): Promise<FiscalValuesData> {
    try {
      // Buscar valores para el año específico
      let dbValues = await this.prisma.fiscalValues.findUnique({
        where: { year },
      });

      // Si no existe, buscar el año más reciente
      if (!dbValues) {
        dbValues = await this.prisma.fiscalValues.findFirst({
          where: { year: { lte: year } },
          orderBy: { year: 'desc' },
        });
      }

      if (dbValues) {
        const values: FiscalValuesData = {
          year: dbValues.year,
          umaDaily: Number(dbValues.umaDaily),
          umaMonthly: Number(dbValues.umaMonthly),
          umaYearly: Number(dbValues.umaYearly),
          smgDaily: Number(dbValues.smgDaily),
          smgZfnDaily: Number(dbValues.smgZfnDaily || dbValues.smgDaily * 1.5),
          aguinaldoDays: dbValues.aguinaldoDays,
          vacationPremiumPercent: Number(dbValues.vacationPremiumPercent),
        };

        this.cachedValues.set(year, values);
        this.lastCacheUpdate = new Date();
        return values;
      }

      // Si no hay datos en BD, usar valores por defecto
      console.warn(`FiscalValuesService: No values found for year ${year}, using defaults`);
      this.cachedValues.set(year, this.DEFAULT_VALUES);
      return this.DEFAULT_VALUES;
    } catch (error) {
      console.error('FiscalValuesService: Error loading values', error);
      return this.DEFAULT_VALUES;
    }
  }

  private async loadRiskRates(): Promise<WorkRiskRates> {
    try {
      const currentYear = new Date().getFullYear();

      // Buscar tasas de riesgo en la tabla de configuración
      const riskRates = await this.prisma.workRiskRate.findMany({
        where: { year: currentYear, isActive: true },
      });

      if (riskRates.length > 0) {
        const rates: WorkRiskRates = {
          CLASE_I: this.DEFAULT_RISK_RATES.CLASE_I,
          CLASE_II: this.DEFAULT_RISK_RATES.CLASE_II,
          CLASE_III: this.DEFAULT_RISK_RATES.CLASE_III,
          CLASE_IV: this.DEFAULT_RISK_RATES.CLASE_IV,
          CLASE_V: this.DEFAULT_RISK_RATES.CLASE_V,
        };

        for (const rate of riskRates) {
          const classKey = rate.riskClass as keyof WorkRiskRates;
          if (classKey in rates) {
            rates[classKey] = Number(rate.rate);
          }
        }

        this.cachedRiskRates = rates;
        this.lastCacheUpdate = new Date();
        return rates;
      }

      // Si no hay datos en BD, usar valores por defecto
      this.cachedRiskRates = this.DEFAULT_RISK_RATES;
      return this.DEFAULT_RISK_RATES;
    } catch (error) {
      // La tabla puede no existir aún, usar valores por defecto
      this.cachedRiskRates = this.DEFAULT_RISK_RATES;
      return this.DEFAULT_RISK_RATES;
    }
  }

  private isCacheValid(): boolean {
    if (!this.lastCacheUpdate) return false;
    const now = new Date();
    return now.getTime() - this.lastCacheUpdate.getTime() < this.CACHE_TTL_MS;
  }
}
