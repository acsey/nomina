import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Servicio para gestionar snapshots de reglas de cálculo de recibos de nómina.
 *
 * Garantiza que cada recibo sea reproducible incluso si cambian las reglas futuras,
 * almacenando el contexto completo de cálculo: fórmulas, valores UMA/SMG, tablas ISR, etc.
 */
@Injectable()
export class RulesetSnapshotService {
  private readonly logger = new Logger(RulesetSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Captura y almacena el snapshot de todas las reglas usadas en un cálculo
   */
  async captureSnapshot(
    payrollDetailId: string,
    calculationContext: CaptureSnapshotDto,
    userId?: string,
  ): Promise<ReceiptRulesetSnapshotResult> {
    const detail = await this.prisma.payrollDetail.findUnique({
      where: { id: payrollDetailId },
      include: {
        payrollPeriod: true,
        rulesetSnapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    }) as any;

    if (!detail) {
      throw new NotFoundException(`PayrollDetail ${payrollDetailId} no encontrado`);
    }

    const nextVersion = detail.rulesetSnapshots.length > 0
      ? detail.rulesetSnapshots[0].version + 1
      : 1;

    const snapshot = await this.prisma.receiptRulesetSnapshot.create({
      data: {
        payrollDetailId,
        version: nextVersion,
        formulasUsed: (calculationContext.formulas || []) as any,
        umaDaily: calculationContext.umaDaily,
        umaMonthly: calculationContext.umaMonthly,
        smgDaily: calculationContext.smgDaily,
        smgZfnDaily: calculationContext.smgZfnDaily,
        roundingMode: calculationContext.roundingMode || 'HALF_UP',
        decimalScale: calculationContext.decimalScale || 2,
        isrTableVersion: calculationContext.isrTableVersion,
        subsidioTableVersion: calculationContext.subsidioTableVersion,
        imssRatesVersion: calculationContext.imssRatesVersion,
        fiscalYear: calculationContext.fiscalYear || detail.payrollPeriod.year,
        periodType: calculationContext.periodType || detail.payrollPeriod.type,
        calculationParams: (calculationContext.additionalParams || {}) as any,
        createdBy: userId,
      },
    });

    this.logger.log(
      `Snapshot v${nextVersion} capturado para recibo ${payrollDetailId}`,
    );

    return {
      id: snapshot.id,
      payrollDetailId,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
    };
  }

  /**
   * Obtiene el snapshot más reciente de un recibo
   */
  async getLatestSnapshot(
    payrollDetailId: string,
  ): Promise<RulesetSnapshotDto | null> {
    const snapshot = await this.prisma.receiptRulesetSnapshot.findFirst({
      where: { payrollDetailId },
      orderBy: { version: 'desc' },
    });

    if (!snapshot) {
      return null;
    }

    return this.mapToDto(snapshot);
  }

  /**
   * Obtiene un snapshot específico por versión
   */
  async getSnapshotByVersion(
    payrollDetailId: string,
    version: number,
  ): Promise<RulesetSnapshotDto | null> {
    const snapshot = await this.prisma.receiptRulesetSnapshot.findUnique({
      where: {
        payrollDetailId_version: {
          payrollDetailId,
          version,
        },
      },
    });

    if (!snapshot) {
      return null;
    }

    return this.mapToDto(snapshot);
  }

  /**
   * Lista todos los snapshots de un recibo
   */
  async getAllSnapshots(payrollDetailId: string): Promise<RulesetSnapshotDto[]> {
    const snapshots = await this.prisma.receiptRulesetSnapshot.findMany({
      where: { payrollDetailId },
      orderBy: { version: 'desc' },
    });

    return snapshots.map((s: any) => this.mapToDto(s));
  }

  /**
   * Compara dos snapshots y detecta cambios en las reglas
   */
  async compareSnapshots(
    payrollDetailId: string,
    versionA: number,
    versionB: number,
  ): Promise<SnapshotComparisonResult> {
    const [snapshotA, snapshotB] = await Promise.all([
      this.getSnapshotByVersion(payrollDetailId, versionA),
      this.getSnapshotByVersion(payrollDetailId, versionB),
    ]);

    if (!snapshotA || !snapshotB) {
      throw new NotFoundException(
        `Una o ambas versiones no existen para el recibo ${payrollDetailId}`,
      );
    }

    const differences: SnapshotDifference[] = [];

    // Comparar valores fiscales
    if (snapshotA.umaDaily !== snapshotB.umaDaily) {
      differences.push({
        field: 'umaDaily',
        type: 'FISCAL_VALUE',
        oldValue: snapshotA.umaDaily,
        newValue: snapshotB.umaDaily,
        impact: 'Puede afectar límites exentos y cálculos ISR',
      });
    }

    if (snapshotA.umaMonthly !== snapshotB.umaMonthly) {
      differences.push({
        field: 'umaMonthly',
        type: 'FISCAL_VALUE',
        oldValue: snapshotA.umaMonthly,
        newValue: snapshotB.umaMonthly,
        impact: 'Puede afectar límites exentos mensuales',
      });
    }

    if (snapshotA.smgDaily !== snapshotB.smgDaily) {
      differences.push({
        field: 'smgDaily',
        type: 'FISCAL_VALUE',
        oldValue: snapshotA.smgDaily,
        newValue: snapshotB.smgDaily,
        impact: 'Puede afectar cálculos IMSS y bases salariales',
      });
    }

    // Comparar tablas ISR
    if (snapshotA.isrTableVersion !== snapshotB.isrTableVersion) {
      differences.push({
        field: 'isrTableVersion',
        type: 'TABLE_VERSION',
        oldValue: snapshotA.isrTableVersion,
        newValue: snapshotB.isrTableVersion,
        impact: 'Cambio en tasas marginales de ISR',
      });
    }

    if (snapshotA.subsidioTableVersion !== snapshotB.subsidioTableVersion) {
      differences.push({
        field: 'subsidioTableVersion',
        type: 'TABLE_VERSION',
        oldValue: snapshotA.subsidioTableVersion,
        newValue: snapshotB.subsidioTableVersion,
        impact: 'Cambio en montos de subsidio al empleo',
      });
    }

    if (snapshotA.imssRatesVersion !== snapshotB.imssRatesVersion) {
      differences.push({
        field: 'imssRatesVersion',
        type: 'TABLE_VERSION',
        oldValue: snapshotA.imssRatesVersion,
        newValue: snapshotB.imssRatesVersion,
        impact: 'Cambio en cuotas IMSS obrero-patronales',
      });
    }

    // Comparar fórmulas
    const formulasDiff = this.compareFormulas(
      snapshotA.formulasUsed,
      snapshotB.formulasUsed,
    );

    for (const diff of formulasDiff) {
      differences.push({
        field: `formula:${diff.conceptCode}`,
        type: 'FORMULA',
        oldValue: diff.oldFormula,
        newValue: diff.newFormula,
        impact: `Cambio en cálculo de ${diff.conceptCode}`,
      });
    }

    // Comparar configuración de redondeo
    if (
      snapshotA.roundingMode !== snapshotB.roundingMode ||
      snapshotA.decimalScale !== snapshotB.decimalScale
    ) {
      differences.push({
        field: 'rounding',
        type: 'CONFIGURATION',
        oldValue: `${snapshotA.roundingMode}:${snapshotA.decimalScale}`,
        newValue: `${snapshotB.roundingMode}:${snapshotB.decimalScale}`,
        impact: 'Puede generar diferencias de centavos en cálculos',
      });
    }

    return {
      payrollDetailId,
      versionA,
      versionB,
      hasDifferences: differences.length > 0,
      differences,
      fiscalImpactLevel: this.calculateFiscalImpactLevel(differences),
    };
  }

  /**
   * Verifica la integridad del snapshot contra los valores actuales
   */
  async verifySnapshotIntegrity(
    payrollDetailId: string,
    version?: number,
  ): Promise<SnapshotIntegrityResult> {
    const snapshot = version
      ? await this.getSnapshotByVersion(payrollDetailId, version)
      : await this.getLatestSnapshot(payrollDetailId);

    if (!snapshot) {
      throw new NotFoundException(
        `Snapshot no encontrado para recibo ${payrollDetailId}`,
      );
    }

    // Obtener valores fiscales actuales
    const currentFiscalValues = await this.getCurrentFiscalValues(
      snapshot.fiscalYear,
    );

    const discrepancies: IntegrityDiscrepancy[] = [];

    // Verificar si los valores actuales difieren del snapshot
    if (
      currentFiscalValues.umaDaily.toNumber() !==
      parseFloat(snapshot.umaDaily)
    ) {
      discrepancies.push({
        field: 'umaDaily',
        snapshotValue: snapshot.umaDaily,
        currentValue: currentFiscalValues.umaDaily.toString(),
        message: 'UMA diaria ha cambiado desde el cálculo original',
      });
    }

    if (
      currentFiscalValues.smgDaily.toNumber() !==
      parseFloat(snapshot.smgDaily)
    ) {
      discrepancies.push({
        field: 'smgDaily',
        snapshotValue: snapshot.smgDaily,
        currentValue: currentFiscalValues.smgDaily.toString(),
        message: 'SMG diario ha cambiado desde el cálculo original',
      });
    }

    return {
      payrollDetailId,
      snapshotVersion: snapshot.version,
      isConsistent: discrepancies.length === 0,
      discrepancies,
      snapshotDate: snapshot.createdAt,
      verifiedAt: new Date(),
    };
  }

  /**
   * Obtiene contexto de cálculo para reproducir un recibo
   */
  async getCalculationContext(
    payrollDetailId: string,
    version?: number,
  ): Promise<CalculationContext | null> {
    const snapshot = version
      ? await this.getSnapshotByVersion(payrollDetailId, version)
      : await this.getLatestSnapshot(payrollDetailId);

    if (!snapshot) {
      return null;
    }

    return {
      fiscalValues: {
        umaDaily: parseFloat(snapshot.umaDaily),
        umaMonthly: parseFloat(snapshot.umaMonthly),
        smgDaily: parseFloat(snapshot.smgDaily),
        smgZfnDaily: snapshot.smgZfnDaily
          ? parseFloat(snapshot.smgZfnDaily)
          : null,
      },
      tables: {
        isrVersion: snapshot.isrTableVersion,
        subsidioVersion: snapshot.subsidioTableVersion,
        imssRatesVersion: snapshot.imssRatesVersion,
      },
      formulas: snapshot.formulasUsed,
      configuration: {
        roundingMode: snapshot.roundingMode,
        decimalScale: snapshot.decimalScale,
        fiscalYear: snapshot.fiscalYear,
        periodType: snapshot.periodType,
      },
      additionalParams: snapshot.calculationParams,
    };
  }

  // === Private Methods ===

  private mapToDto(snapshot: any): RulesetSnapshotDto {
    return {
      id: snapshot.id,
      payrollDetailId: snapshot.payrollDetailId,
      version: snapshot.version,
      formulasUsed: snapshot.formulasUsed as FormulaSnapshot[],
      umaDaily: snapshot.umaDaily.toString(),
      umaMonthly: snapshot.umaMonthly.toString(),
      smgDaily: snapshot.smgDaily.toString(),
      smgZfnDaily: snapshot.smgZfnDaily?.toString() || null,
      roundingMode: snapshot.roundingMode,
      decimalScale: snapshot.decimalScale,
      isrTableVersion: snapshot.isrTableVersion,
      subsidioTableVersion: snapshot.subsidioTableVersion,
      imssRatesVersion: snapshot.imssRatesVersion,
      fiscalYear: snapshot.fiscalYear,
      periodType: snapshot.periodType,
      calculationParams: snapshot.calculationParams as Record<string, any>,
      createdAt: snapshot.createdAt,
      createdBy: snapshot.createdBy,
    };
  }

  private compareFormulas(
    formulasA: FormulaSnapshot[],
    formulasB: FormulaSnapshot[],
  ): FormulaComparison[] {
    const differences: FormulaComparison[] = [];

    const mapA = new Map(formulasA.map((f: any) => [f.conceptCode, f]));
    const mapB = new Map(formulasB.map((f: any) => [f.conceptCode, f]));

    // Fórmulas modificadas o eliminadas
    for (const [code, formulaA] of mapA) {
      const formulaB = mapB.get(code);
      if (!formulaB) {
        differences.push({
          conceptCode: code,
          oldFormula: formulaA.expression,
          newFormula: null,
          changeType: 'REMOVED',
        });
      } else if (formulaA.expression !== formulaB.expression) {
        differences.push({
          conceptCode: code,
          oldFormula: formulaA.expression,
          newFormula: formulaB.expression,
          changeType: 'MODIFIED',
        });
      }
    }

    // Fórmulas agregadas
    for (const [code, formulaB] of mapB) {
      if (!mapA.has(code)) {
        differences.push({
          conceptCode: code,
          oldFormula: null,
          newFormula: formulaB.expression,
          changeType: 'ADDED',
        });
      }
    }

    return differences;
  }

  private calculateFiscalImpactLevel(
    differences: SnapshotDifference[],
  ): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (differences.length === 0) return 'NONE';

    const hasFiscalValueChanges = differences.some(
      (d) => d.type === 'FISCAL_VALUE',
    );
    const hasTableVersionChanges = differences.some(
      (d) => d.type === 'TABLE_VERSION',
    );
    const hasFormulaChanges = differences.some((d) => d.type === 'FORMULA');

    if (hasFiscalValueChanges && hasFormulaChanges) return 'CRITICAL';
    if (hasTableVersionChanges || hasFiscalValueChanges) return 'HIGH';
    if (hasFormulaChanges) return 'MEDIUM';
    return 'LOW';
  }

  private async getCurrentFiscalValues(
    fiscalYear: number,
  ): Promise<{ umaDaily: Decimal; smgDaily: Decimal }> {
    // Buscar en SystemConfig los valores actuales
    const umaConfig = await this.prisma.systemConfig.findUnique({
      where: { key: `uma_daily_${fiscalYear}` },
    });

    const smgConfig = await this.prisma.systemConfig.findUnique({
      where: { key: `smg_daily_${fiscalYear}` },
    });

    return {
      umaDaily: new Decimal(umaConfig?.value || '113.14'),
      smgDaily: new Decimal(smgConfig?.value || '278.80'),
    };
  }
}

// === DTOs e Interfaces ===

export interface CaptureSnapshotDto {
  formulas?: FormulaSnapshot[];
  umaDaily: Decimal | number;
  umaMonthly: Decimal | number;
  smgDaily: Decimal | number;
  smgZfnDaily?: Decimal | number | null;
  roundingMode?: string;
  decimalScale?: number;
  isrTableVersion?: string;
  subsidioTableVersion?: string;
  imssRatesVersion?: string;
  fiscalYear?: number;
  periodType?: string;
  additionalParams?: Record<string, any>;
}

export interface FormulaSnapshot {
  conceptCode: string;
  conceptName: string;
  expression: string;
  version: number;
  fiscalYear?: number;
}

export interface RulesetSnapshotDto {
  id: string;
  payrollDetailId: string;
  version: number;
  formulasUsed: FormulaSnapshot[];
  umaDaily: string;
  umaMonthly: string;
  smgDaily: string;
  smgZfnDaily: string | null;
  roundingMode: string;
  decimalScale: number;
  isrTableVersion: string | null;
  subsidioTableVersion: string | null;
  imssRatesVersion: string | null;
  fiscalYear: number;
  periodType: string;
  calculationParams: Record<string, any>;
  createdAt: Date;
  createdBy: string | null;
}

export interface ReceiptRulesetSnapshotResult {
  id: string;
  payrollDetailId: string;
  version: number;
  createdAt: Date;
}

export interface SnapshotComparisonResult {
  payrollDetailId: string;
  versionA: number;
  versionB: number;
  hasDifferences: boolean;
  differences: SnapshotDifference[];
  fiscalImpactLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SnapshotDifference {
  field: string;
  type: 'FISCAL_VALUE' | 'TABLE_VERSION' | 'FORMULA' | 'CONFIGURATION';
  oldValue: any;
  newValue: any;
  impact: string;
}

export interface FormulaComparison {
  conceptCode: string;
  oldFormula: string | null;
  newFormula: string | null;
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED';
}

export interface SnapshotIntegrityResult {
  payrollDetailId: string;
  snapshotVersion: number;
  isConsistent: boolean;
  discrepancies: IntegrityDiscrepancy[];
  snapshotDate: Date;
  verifiedAt: Date;
}

export interface IntegrityDiscrepancy {
  field: string;
  snapshotValue: string;
  currentValue: string;
  message: string;
}

export interface CalculationContext {
  fiscalValues: {
    umaDaily: number;
    umaMonthly: number;
    smgDaily: number;
    smgZfnDaily: number | null;
  };
  tables: {
    isrVersion: string | null;
    subsidioVersion: string | null;
    imssRatesVersion: string | null;
  };
  formulas: FormulaSnapshot[];
  configuration: {
    roundingMode: string;
    decimalScale: number;
    fiscalYear: number;
    periodType: string;
  };
  additionalParams: Record<string, any>;
}
