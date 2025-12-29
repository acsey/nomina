import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Tipos de redondeo soportados
 */
export enum RoundingMethod {
  ROUND = 'ROUND',       // Redondeo estándar (bancario)
  FLOOR = 'FLOOR',       // Truncar (siempre hacia abajo)
  CEIL = 'CEIL',         // Siempre hacia arriba
  HALF_UP = 'HALF_UP',   // Redondeo comercial (0.5 hacia arriba)
  HALF_EVEN = 'HALF_EVEN', // Redondeo bancario (0.5 al par más cercano)
}

/**
 * Precisiones estándar para montos fiscales mexicanos
 */
export const PRECISION = {
  CURRENCY: 2,      // Pesos y centavos
  PERCENTAGE: 4,    // Tasas de impuestos
  DAYS: 2,          // Días trabajados
  HOURS: 2,         // Horas trabajadas
  SALARY_DAILY: 4,  // Salario diario integrado
  UMA: 4,           // Unidad de Medida y Actualización
} as const;

/**
 * Interfaz para resultados de cálculo con trazabilidad
 */
export interface RoundedResult {
  value: number;
  originalValue: number;
  precision: number;
  method: RoundingMethod;
  adjustment: number; // Diferencia por redondeo
}

/**
 * Servicio centralizado de redondeos
 *
 * Cumple con: Documento de Requerimientos - Sección 4. Cálculo de Nómina
 * - Usar exclusivamente tipos decimales para montos
 * - Centralizar redondeos en un módulo único
 */
@Injectable()
export class RoundingService {
  private defaultMethod: RoundingMethod = RoundingMethod.ROUND;
  private companyMethods: Map<string, RoundingMethod> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Carga el método de redondeo configurado para una empresa
   */
  async loadCompanyRoundingMethod(companyId: string): Promise<RoundingMethod> {
    if (this.companyMethods.has(companyId)) {
      return this.companyMethods.get(companyId)!;
    }

    const config = await this.prisma.companyPayrollConfig.findUnique({
      where: { companyId },
      select: { roundingMethod: true },
    });

    const method = (config?.roundingMethod as RoundingMethod) || this.defaultMethod;
    this.companyMethods.set(companyId, method);
    return method;
  }

  /**
   * Redondea un valor monetario (pesos)
   * Usa 2 decimales por defecto
   */
  roundCurrency(
    value: number | Decimal,
    method?: RoundingMethod,
    precision: number = PRECISION.CURRENCY,
  ): number {
    return this.round(Number(value), precision, method);
  }

  /**
   * Redondea un valor monetario y retorna resultado con trazabilidad
   */
  roundCurrencyWithTrace(
    value: number | Decimal,
    method?: RoundingMethod,
    precision: number = PRECISION.CURRENCY,
  ): RoundedResult {
    const originalValue = Number(value);
    const roundedValue = this.round(originalValue, precision, method);

    return {
      value: roundedValue,
      originalValue,
      precision,
      method: method || this.defaultMethod,
      adjustment: roundedValue - originalValue,
    };
  }

  /**
   * Redondea un porcentaje/tasa
   * Usa 4 decimales por defecto
   */
  roundPercentage(
    value: number | Decimal,
    method?: RoundingMethod,
  ): number {
    return this.round(Number(value), PRECISION.PERCENTAGE, method);
  }

  /**
   * Redondea días trabajados
   */
  roundDays(
    value: number | Decimal,
    method?: RoundingMethod,
  ): number {
    return this.round(Number(value), PRECISION.DAYS, method);
  }

  /**
   * Redondea horas trabajadas
   */
  roundHours(
    value: number | Decimal,
    method?: RoundingMethod,
  ): number {
    return this.round(Number(value), PRECISION.HOURS, method);
  }

  /**
   * Redondea salario diario
   */
  roundDailySalary(
    value: number | Decimal,
    method?: RoundingMethod,
  ): number {
    return this.round(Number(value), PRECISION.SALARY_DAILY, method);
  }

  /**
   * Redondea usando UMA
   */
  roundUma(
    value: number | Decimal,
    method?: RoundingMethod,
  ): number {
    return this.round(Number(value), PRECISION.UMA, method);
  }

  /**
   * Función principal de redondeo
   */
  round(
    value: number,
    precision: number = PRECISION.CURRENCY,
    method: RoundingMethod = this.defaultMethod,
  ): number {
    if (isNaN(value) || !isFinite(value)) {
      return 0;
    }

    const multiplier = Math.pow(10, precision);
    const shiftedValue = value * multiplier;

    let result: number;

    switch (method) {
      case RoundingMethod.FLOOR:
        result = Math.floor(shiftedValue) / multiplier;
        break;

      case RoundingMethod.CEIL:
        result = Math.ceil(shiftedValue) / multiplier;
        break;

      case RoundingMethod.HALF_UP:
        // Redondeo comercial: 0.5 siempre hacia arriba
        result = Math.floor(shiftedValue + 0.5) / multiplier;
        break;

      case RoundingMethod.HALF_EVEN:
        // Redondeo bancario: 0.5 al par más cercano
        result = this.roundHalfEven(shiftedValue) / multiplier;
        break;

      case RoundingMethod.ROUND:
      default:
        // Redondeo estándar de JavaScript
        result = Math.round(shiftedValue) / multiplier;
        break;
    }

    // Evitar errores de punto flotante
    return Number(result.toFixed(precision));
  }

  /**
   * Redondeo bancario (half to even)
   * Cuando el valor es exactamente 0.5, redondea al par más cercano
   */
  private roundHalfEven(value: number): number {
    const floor = Math.floor(value);
    const decimal = value - floor;

    if (Math.abs(decimal - 0.5) < Number.EPSILON) {
      // Es exactamente 0.5, ir al par más cercano
      return floor % 2 === 0 ? floor : floor + 1;
    }

    return Math.round(value);
  }

  /**
   * Suma múltiples valores y redondea el resultado
   * Evita acumulación de errores de redondeo
   */
  sumAndRound(
    values: (number | Decimal)[],
    precision: number = PRECISION.CURRENCY,
    method?: RoundingMethod,
  ): number {
    // Sumar con máxima precisión
    const sum: number = values.reduce<number>((acc, val) => acc + Number(val), 0);
    // Redondear solo el resultado final
    return this.round(sum, precision, method);
  }

  /**
   * Calcula un porcentaje y redondea
   */
  calculatePercentage(
    base: number | Decimal,
    percentage: number | Decimal,
    precision: number = PRECISION.CURRENCY,
    method?: RoundingMethod,
  ): number {
    const result = Number(base) * (Number(percentage) / 100);
    return this.round(result, precision, method);
  }

  /**
   * Distribuye un monto total entre partes iguales
   * Ajusta el último valor para que la suma sea exacta
   */
  distribute(
    total: number | Decimal,
    parts: number,
    precision: number = PRECISION.CURRENCY,
    method?: RoundingMethod,
  ): number[] {
    if (parts <= 0) return [];

    const totalValue = Number(total);
    const partValue = this.round(totalValue / parts, precision, method);
    const result = new Array(parts).fill(partValue);

    // Ajustar el último valor para que la suma sea exacta
    const currentSum = partValue * parts;
    const difference = this.round(totalValue - currentSum, precision, method);

    if (difference !== 0) {
      result[parts - 1] = this.round(result[parts - 1] + difference, precision, method);
    }

    return result;
  }

  /**
   * Valida que un valor tenga la precisión correcta
   */
  validatePrecision(
    value: number,
    precision: number = PRECISION.CURRENCY,
  ): boolean {
    const multiplier = Math.pow(10, precision);
    const shifted = value * multiplier;
    return Math.abs(shifted - Math.round(shifted)) < Number.EPSILON;
  }

  /**
   * Configura el método de redondeo por defecto
   */
  setDefaultMethod(method: RoundingMethod): void {
    this.defaultMethod = method;
  }

  /**
   * Configura el método de redondeo para una empresa específica
   */
  setCompanyMethod(companyId: string, method: RoundingMethod): void {
    this.companyMethods.set(companyId, method);
  }

  /**
   * Obtiene el método de redondeo actual para una empresa
   */
  getCompanyMethod(companyId: string): RoundingMethod {
    return this.companyMethods.get(companyId) || this.defaultMethod;
  }

  /**
   * Limpia la caché de métodos por empresa
   */
  clearCache(): void {
    this.companyMethods.clear();
  }
}
