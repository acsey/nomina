import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Tipos de conceptos fiscales auditables
 */
export enum FiscalConceptType {
  ISR = 'ISR',
  ISR_SUBSIDIO = 'ISR_SUBSIDIO',
  IMSS_EMPLOYEE = 'IMSS_EMPLOYEE',
  IMSS_EMPLOYER = 'IMSS_EMPLOYER',
  INFONAVIT = 'INFONAVIT',
  PENSION_ALIMENTICIA = 'PENSION_ALIMENTICIA',
  ISN = 'ISN', // Impuesto Sobre Nómina
}

/**
 * DTO para registro de auditoría fiscal
 */
export interface FiscalAuditEntry {
  payrollDetailId: string;
  conceptType: FiscalConceptType;
  conceptCode: string;
  inputValues: Record<string, unknown>;
  ruleApplied?: string;
  ruleVersion?: string;
  tableUsed?: string;
  calculationBase: number;
  limitInferior?: number;
  excedente?: number;
  impuestoMarginal?: number;
  cuotaFija?: number;
  resultAmount: number;
  fiscalYear: number;
  periodType: string;
  calculatedBy?: string;
}

/**
 * FiscalAuditService - Auditoría de cálculos fiscales por concepto
 *
 * Cumple con: Documento de Requerimientos - Sección 7. Auditoría
 * - Registrar cada cálculo fiscal
 * - Guardar valores antes y después
 * - Registrar regla aplicada
 * - Mantener trazabilidad completa
 */
@Injectable()
export class FiscalAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un cálculo de ISR con todos los detalles
   */
  async logIsrCalculation(
    payrollDetailId: string,
    input: {
      baseGravable: number;
      periodType: string;
      fiscalYear: number;
    },
    result: {
      limitInferior: number;
      excedente: number;
      tasaMarginal: number;
      impuestoMarginal: number;
      cuotaFija: number;
      isrBruto: number;
      subsidio?: number;
      isrNeto: number;
    },
    calculatedBy?: string,
  ) {
    return this.createAuditEntry({
      payrollDetailId,
      conceptType: FiscalConceptType.ISR,
      conceptCode: 'D002', // Código SAT
      inputValues: {
        baseGravable: input.baseGravable,
        periodType: input.periodType,
      },
      ruleApplied: 'ISR_LISR_ART_96',
      ruleVersion: `${input.fiscalYear}`,
      tableUsed: `ISR_${input.periodType}_${input.fiscalYear}`,
      calculationBase: input.baseGravable,
      limitInferior: result.limitInferior,
      excedente: result.excedente,
      impuestoMarginal: result.impuestoMarginal,
      cuotaFija: result.cuotaFija,
      resultAmount: result.isrNeto,
      fiscalYear: input.fiscalYear,
      periodType: input.periodType,
      calculatedBy,
    });
  }

  /**
   * Registra un cálculo de Subsidio al Empleo
   */
  async logSubsidioCalculation(
    payrollDetailId: string,
    input: {
      baseGravable: number;
      periodType: string;
      fiscalYear: number;
    },
    result: {
      limitInferior: number;
      limitSuperior: number;
      subsidio: number;
    },
    calculatedBy?: string,
  ) {
    return this.createAuditEntry({
      payrollDetailId,
      conceptType: FiscalConceptType.ISR_SUBSIDIO,
      conceptCode: 'P048', // Subsidio para el empleo
      inputValues: {
        baseGravable: input.baseGravable,
        periodType: input.periodType,
      },
      ruleApplied: 'SUBSIDIO_EMPLEO_LISR',
      ruleVersion: `${input.fiscalYear}`,
      tableUsed: `SUBSIDIO_${input.periodType}_${input.fiscalYear}`,
      calculationBase: input.baseGravable,
      limitInferior: result.limitInferior,
      resultAmount: result.subsidio,
      fiscalYear: input.fiscalYear,
      periodType: input.periodType,
      calculatedBy,
    });
  }

  /**
   * Registra un cálculo de IMSS empleado
   */
  async logImssEmployeeCalculation(
    payrollDetailId: string,
    input: {
      sbc: number; // Salario Base de Cotización
      diasCotizados: number;
      fiscalYear: number;
    },
    result: {
      enfermedadMaternidad: number;
      invalidezVida: number;
      cesantiaVejez: number;
      total: number;
    },
    calculatedBy?: string,
  ) {
    return this.createAuditEntry({
      payrollDetailId,
      conceptType: FiscalConceptType.IMSS_EMPLOYEE,
      conceptCode: 'D001', // Seguridad social
      inputValues: {
        sbc: input.sbc,
        diasCotizados: input.diasCotizados,
        desglose: result,
      },
      ruleApplied: 'IMSS_LSS_ART_15',
      ruleVersion: `${input.fiscalYear}`,
      tableUsed: `IMSS_TASAS_${input.fiscalYear}`,
      calculationBase: input.sbc * input.diasCotizados,
      resultAmount: result.total,
      fiscalYear: input.fiscalYear,
      periodType: 'MONTHLY', // IMSS siempre mensual
      calculatedBy,
    });
  }

  /**
   * Registra un cálculo de IMSS patronal
   */
  async logImssEmployerCalculation(
    payrollDetailId: string,
    input: {
      sbc: number;
      diasCotizados: number;
      fiscalYear: number;
    },
    result: {
      riesgoTrabajo: number;
      enfermedadMaternidad: number;
      invalidezVida: number;
      cesantiaVejez: number;
      guarderias: number;
      infonavit: number;
      total: number;
    },
    calculatedBy?: string,
  ) {
    return this.createAuditEntry({
      payrollDetailId,
      conceptType: FiscalConceptType.IMSS_EMPLOYER,
      conceptCode: 'IMSS_PATRON',
      inputValues: {
        sbc: input.sbc,
        diasCotizados: input.diasCotizados,
        desglose: result,
      },
      ruleApplied: 'IMSS_LSS_PATRONAL',
      ruleVersion: `${input.fiscalYear}`,
      tableUsed: `IMSS_TASAS_PATRON_${input.fiscalYear}`,
      calculationBase: input.sbc * input.diasCotizados,
      resultAmount: result.total,
      fiscalYear: input.fiscalYear,
      periodType: 'MONTHLY',
      calculatedBy,
    });
  }

  /**
   * Registra un cálculo de ISN (Impuesto Sobre Nómina)
   */
  async logIsnCalculation(
    payrollDetailId: string,
    input: {
      baseGravable: number;
      state: string;
      rate: number;
      fiscalYear: number;
      periodType: string;
    },
    result: {
      impuesto: number;
    },
    calculatedBy?: string,
  ) {
    return this.createAuditEntry({
      payrollDetailId,
      conceptType: FiscalConceptType.ISN,
      conceptCode: 'ISN',
      inputValues: {
        baseGravable: input.baseGravable,
        state: input.state,
        rate: input.rate,
      },
      ruleApplied: `ISN_${input.state}`,
      ruleVersion: `${input.fiscalYear}`,
      tableUsed: `ISN_TASAS_${input.fiscalYear}`,
      calculationBase: input.baseGravable,
      resultAmount: result.impuesto,
      fiscalYear: input.fiscalYear,
      periodType: input.periodType,
      calculatedBy,
    });
  }

  /**
   * Crea una entrada de auditoría genérica
   */
  private async createAuditEntry(entry: FiscalAuditEntry) {
    return this.prisma.fiscalCalculationAudit.create({
      data: {
        payrollDetailId: entry.payrollDetailId,
        conceptType: entry.conceptType,
        conceptCode: entry.conceptCode,
        inputValues: entry.inputValues as Prisma.InputJsonValue,
        ruleApplied: entry.ruleApplied,
        ruleVersion: entry.ruleVersion,
        tableUsed: entry.tableUsed,
        calculationBase: entry.calculationBase,
        limitInferior: entry.limitInferior,
        excedente: entry.excedente,
        impuestoMarginal: entry.impuestoMarginal,
        cuotaFija: entry.cuotaFija,
        resultAmount: entry.resultAmount,
        fiscalYear: entry.fiscalYear,
        periodType: entry.periodType,
        calculatedBy: entry.calculatedBy,
      },
    });
  }

  /**
   * Obtiene la auditoría fiscal de un recibo de nómina
   */
  async getReceiptFiscalAudit(payrollDetailId: string) {
    return this.prisma.fiscalCalculationAudit.findMany({
      where: { payrollDetailId },
      orderBy: { calculatedAt: 'asc' },
    });
  }

  /**
   * Obtiene la auditoría fiscal de un período completo
   */
  async getPeriodFiscalAudit(periodId: string) {
    const details = await this.prisma.payrollDetail.findMany({
      where: { payrollPeriodId: periodId },
      select: { id: true },
    });

    const detailIds = details.map(d => d.id);

    return this.prisma.fiscalCalculationAudit.findMany({
      where: {
        payrollDetailId: { in: detailIds },
      },
      include: {
        payrollDetail: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
                rfc: true,
              },
            },
          },
        },
      },
      orderBy: [{ conceptType: 'asc' }, { calculatedAt: 'asc' }],
    });
  }

  /**
   * Genera un resumen de auditoría por concepto fiscal
   */
  async getAuditSummaryByPeriod(periodId: string) {
    const audit = await this.getPeriodFiscalAudit(periodId);

    const summary: Record<string, {
      count: number;
      totalBase: number;
      totalResult: number;
      tableUsed: string[];
    }> = {};

    for (const entry of audit) {
      if (!summary[entry.conceptType]) {
        summary[entry.conceptType] = {
          count: 0,
          totalBase: 0,
          totalResult: 0,
          tableUsed: [],
        };
      }

      summary[entry.conceptType].count++;
      summary[entry.conceptType].totalBase += Number(entry.calculationBase);
      summary[entry.conceptType].totalResult += Number(entry.resultAmount);

      if (entry.tableUsed && !summary[entry.conceptType].tableUsed.includes(entry.tableUsed)) {
        summary[entry.conceptType].tableUsed.push(entry.tableUsed);
      }
    }

    return {
      periodId,
      generatedAt: new Date(),
      totalEntries: audit.length,
      summary,
    };
  }
}
