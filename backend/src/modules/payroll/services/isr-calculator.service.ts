import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class IsrCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(
    taxableIncome: number,
    periodType: string,
    year: number,
  ): Promise<number> {
    const result = await this.calculateWithSubsidy(taxableIncome, periodType, year);
    return result.netIsr;
  }

  /**
   * Calcula ISR con desglose de subsidio al empleo
   */
  async calculateWithSubsidy(
    taxableIncome: number,
    periodType: string,
    year: number,
  ): Promise<{ grossIsr: number; subsidio: number; netIsr: number }> {
    // Obtener tabla de ISR
    const isrTable = await this.prisma.isrTable.findMany({
      where: {
        year,
        periodType: periodType as any,
      },
      orderBy: { lowerLimit: 'asc' },
    });

    let grossIsr = 0;

    if (isrTable.length === 0) {
      // Usar tabla por defecto si no hay configurada
      grossIsr = this.calculateWithDefaultTable(taxableIncome, periodType);
    } else {
      // Encontrar el rango aplicable
      const range = isrTable.find(
        (r: any) =>
          taxableIncome >= Number(r.lowerLimit) &&
          taxableIncome <= Number(r.upperLimit),
      );

      if (range) {
        // Calcular ISR
        const excedent = taxableIncome - Number(range.lowerLimit);
        const marginalTax = excedent * Number(range.rateOnExcess);
        grossIsr = Number(range.fixedFee) + marginalTax;
      }
    }

    // Obtener subsidio al empleo
    const subsidio = await this.getSubsidy(taxableIncome, periodType, year);
    const netIsr = Math.max(0, grossIsr - subsidio);

    return { grossIsr, subsidio, netIsr };
  }

  private async getSubsidy(
    taxableIncome: number,
    periodType: string,
    year: number,
  ): Promise<number> {
    const subsidyTable = await this.prisma.subsidioEmpleoTable.findMany({
      where: {
        year,
        periodType: periodType as any,
      },
      orderBy: { lowerLimit: 'asc' },
    });

    if (subsidyTable.length === 0) {
      return 0;
    }

    const range = subsidyTable.find(
      (r: { lowerLimit: any; upperLimit: any }) =>
        taxableIncome >= Number(r.lowerLimit) &&
        taxableIncome <= Number(r.upperLimit),
    );

    return range ? Number(range.subsidyAmount) : 0;
  }

  private calculateWithDefaultTable(
    taxableIncome: number,
    periodType: string,
  ): number {
    // Tabla quincenal 2024 simplificada
    const biweeklyTable = [
      { lower: 0.01, upper: 368.1, fixed: 0, rate: 1.92 },
      { lower: 368.11, upper: 3124.35, fixed: 7.05, rate: 6.4 },
      { lower: 3124.36, upper: 5490.75, fixed: 183.45, rate: 10.88 },
      { lower: 5490.76, upper: 6382.8, fixed: 440.85, rate: 16.0 },
      { lower: 6382.81, upper: 7641.9, fixed: 583.5, rate: 17.92 },
      { lower: 7641.91, upper: 15412.8, fixed: 809.25, rate: 21.36 },
      { lower: 15412.81, upper: 24292.65, fixed: 2469.15, rate: 23.52 },
      { lower: 24292.66, upper: 46378.5, fixed: 4557.6, rate: 30.0 },
      { lower: 46378.51, upper: 61838.1, fixed: 11183.4, rate: 32.0 },
      { lower: 61838.11, upper: 185514.3, fixed: 16130.55, rate: 34.0 },
      { lower: 185514.31, upper: Infinity, fixed: 58180.5, rate: 35.0 },
    ];

    // Ajustar según tipo de período
    const factor = this.getPeriodFactor(periodType);
    const adjustedIncome = taxableIncome * factor;

    const range = biweeklyTable.find(
      (r) => adjustedIncome >= r.lower && adjustedIncome <= r.upper,
    );

    if (!range) {
      return 0;
    }

    const excedent = adjustedIncome - range.lower;
    const marginalTax = excedent * (range.rate / 100);
    const isr = (range.fixed + marginalTax) / factor;

    return Math.max(0, isr);
  }

  private getPeriodFactor(periodType: string): number {
    switch (periodType) {
      case 'WEEKLY':
        return 2; // Convertir a quincenal
      case 'MONTHLY':
        return 0.5; // Convertir a quincenal
      default:
        return 1;
    }
  }
}
