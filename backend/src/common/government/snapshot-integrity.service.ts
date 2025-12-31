/**
 * Servicio de Integridad de Snapshots
 * Cumplimiento: Gobierno MX - Verificación de integridad de datos fiscales
 *
 * Funcionalidades:
 * - Calcular hash SHA256 de snapshots
 * - Verificar integridad de snapshots existentes
 * - Detectar y alertar corrupción de datos
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface SnapshotData {
  formulasUsed: any;
  umaDaily: number;
  umaMonthly: number;
  smgDaily: number;
  smgZfnDaily?: number;
  roundingMode: string;
  decimalScale: number;
  isrTableVersion?: string;
  subsidioTableVersion?: string;
  imssRatesVersion?: string;
  fiscalYear: number;
  periodType: string;
  calculationParams: any;
}

export interface IntegrityCheckResult {
  snapshotId: string;
  isValid: boolean;
  expectedHash?: string;
  actualHash: string;
  checkedAt: Date;
  details?: string;
}

@Injectable()
export class SnapshotIntegrityService {
  private readonly logger = new Logger(SnapshotIntegrityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula el hash SHA256 de los datos de un snapshot
   */
  calculateHash(data: SnapshotData): string {
    // Ordenar las propiedades para consistencia
    const orderedData = {
      calculationParams: data.calculationParams,
      decimalScale: data.decimalScale,
      fiscalYear: data.fiscalYear,
      formulasUsed: data.formulasUsed,
      imssRatesVersion: data.imssRatesVersion,
      isrTableVersion: data.isrTableVersion,
      periodType: data.periodType,
      roundingMode: data.roundingMode,
      smgDaily: data.smgDaily,
      smgZfnDaily: data.smgZfnDaily,
      subsidioTableVersion: data.subsidioTableVersion,
      umaDaily: data.umaDaily,
      umaMonthly: data.umaMonthly,
    };

    const jsonString = JSON.stringify(orderedData);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Genera y guarda el hash para un snapshot recién creado
   */
  async generateAndSaveHash(snapshotId: string): Promise<string> {
    const snapshot = await this.prisma.receiptRulesetSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} no encontrado`);
    }

    const data: SnapshotData = {
      formulasUsed: snapshot.formulasUsed,
      umaDaily: Number(snapshot.umaDaily),
      umaMonthly: Number(snapshot.umaMonthly),
      smgDaily: Number(snapshot.smgDaily),
      smgZfnDaily: snapshot.smgZfnDaily ? Number(snapshot.smgZfnDaily) : undefined,
      roundingMode: snapshot.roundingMode,
      decimalScale: snapshot.decimalScale,
      isrTableVersion: snapshot.isrTableVersion || undefined,
      subsidioTableVersion: snapshot.subsidioTableVersion || undefined,
      imssRatesVersion: snapshot.imssRatesVersion || undefined,
      fiscalYear: snapshot.fiscalYear,
      periodType: snapshot.periodType,
      calculationParams: snapshot.calculationParams,
    };

    const hash = this.calculateHash(data);

    await this.prisma.receiptRulesetSnapshot.update({
      where: { id: snapshotId },
      data: {
        snapshotHash: hash,
        integrityStatus: 'VERIFIED',
        hashVerifiedAt: new Date(),
      },
    });

    this.logger.log(`Hash generado para snapshot ${snapshotId}: ${hash.substring(0, 16)}...`);

    return hash;
  }

  /**
   * Verifica la integridad de un snapshot
   */
  async verifySnapshot(snapshotId: string, userId?: string): Promise<IntegrityCheckResult> {
    const snapshot = await this.prisma.receiptRulesetSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} no encontrado`);
    }

    const data: SnapshotData = {
      formulasUsed: snapshot.formulasUsed,
      umaDaily: Number(snapshot.umaDaily),
      umaMonthly: Number(snapshot.umaMonthly),
      smgDaily: Number(snapshot.smgDaily),
      smgZfnDaily: snapshot.smgZfnDaily ? Number(snapshot.smgZfnDaily) : undefined,
      roundingMode: snapshot.roundingMode,
      decimalScale: snapshot.decimalScale,
      isrTableVersion: snapshot.isrTableVersion || undefined,
      subsidioTableVersion: snapshot.subsidioTableVersion || undefined,
      imssRatesVersion: snapshot.imssRatesVersion || undefined,
      fiscalYear: snapshot.fiscalYear,
      periodType: snapshot.periodType,
      calculationParams: snapshot.calculationParams,
    };

    const actualHash = this.calculateHash(data);
    const expectedHash = snapshot.snapshotHash;
    const isValid = expectedHash === actualHash;

    const result: IntegrityCheckResult = {
      snapshotId,
      isValid,
      expectedHash: expectedHash || undefined,
      actualHash,
      checkedAt: new Date(),
    };

    // Actualizar estado de integridad
    const newStatus = isValid ? 'VERIFIED' : 'CORRUPTED';

    await this.prisma.receiptRulesetSnapshot.update({
      where: { id: snapshotId },
      data: {
        integrityStatus: newStatus,
        hashVerifiedAt: new Date(),
        hashVerifiedBy: userId,
      },
    });

    // Si hay corrupción, crear alerta
    if (!isValid) {
      await this.createIntegrityAlert(snapshotId, expectedHash, actualHash);
      this.logger.error(
        `¡ALERTA! Integridad comprometida en snapshot ${snapshotId}. Hash esperado: ${expectedHash}, Hash actual: ${actualHash}`,
      );
    }

    return result;
  }

  /**
   * Verifica la integridad de todos los snapshots de un período
   */
  async verifyPeriodSnapshots(
    periodId: string,
    userId?: string,
  ): Promise<{ total: number; valid: number; invalid: number; results: IntegrityCheckResult[] }> {
    const snapshots = await this.prisma.receiptRulesetSnapshot.findMany({
      where: {
        payrollDetail: {
          payrollPeriodId: periodId,
        },
      },
    });

    const results: IntegrityCheckResult[] = [];
    let valid = 0;
    let invalid = 0;

    for (const snapshot of snapshots) {
      try {
        const result = await this.verifySnapshot(snapshot.id, userId);
        results.push(result);
        if (result.isValid) {
          valid++;
        } else {
          invalid++;
        }
      } catch (error) {
        this.logger.error(`Error verificando snapshot ${snapshot.id}:`, error);
        invalid++;
      }
    }

    this.logger.log(
      `Verificación de período ${periodId}: ${valid} válidos, ${invalid} inválidos de ${snapshots.length} total`,
    );

    return {
      total: snapshots.length,
      valid,
      invalid,
      results,
    };
  }

  /**
   * Genera hashes para snapshots que no tienen
   */
  async generateMissingHashes(): Promise<number> {
    const snapshots = await this.prisma.receiptRulesetSnapshot.findMany({
      where: {
        OR: [{ snapshotHash: null }, { snapshotHash: '' }],
      },
    });

    let count = 0;
    for (const snapshot of snapshots) {
      try {
        await this.generateAndSaveHash(snapshot.id);
        count++;
      } catch (error) {
        this.logger.error(`Error generando hash para snapshot ${snapshot.id}:`, error);
      }
    }

    this.logger.log(`Generados ${count} hashes para snapshots pendientes`);
    return count;
  }

  /**
   * Obtiene estadísticas de integridad
   */
  async getIntegrityStats(): Promise<{
    total: number;
    verified: number;
    pending: number;
    corrupted: number;
  }> {
    const [total, verified, pending, corrupted] = await Promise.all([
      this.prisma.receiptRulesetSnapshot.count(),
      this.prisma.receiptRulesetSnapshot.count({ where: { integrityStatus: 'VERIFIED' } }),
      this.prisma.receiptRulesetSnapshot.count({ where: { integrityStatus: 'PENDING' } }),
      this.prisma.receiptRulesetSnapshot.count({ where: { integrityStatus: 'CORRUPTED' } }),
    ]);

    return { total, verified, pending, corrupted };
  }

  /**
   * Crea una alerta de integridad
   */
  private async createIntegrityAlert(
    snapshotId: string,
    expectedHash: string | null,
    actualHash: string,
  ): Promise<void> {
    await this.prisma.integrityAlert.create({
      data: {
        alertType: 'HASH_MISMATCH',
        severity: 'CRITICAL',
        entityType: 'RECEIPT_RULESET_SNAPSHOT',
        entityId: snapshotId,
        description: `El hash de integridad del snapshot no coincide. Posible corrupción o alteración de datos.`,
        expectedValue: expectedHash,
        actualValue: actualHash,
        detectedBy: 'SYSTEM',
      },
    });
  }

  /**
   * Obtiene alertas de integridad pendientes
   */
  async getPendingAlerts(): Promise<any[]> {
    return this.prisma.integrityAlert.findMany({
      where: { isResolved: false },
      orderBy: [{ severity: 'asc' }, { detectedAt: 'desc' }],
    });
  }

  /**
   * Marca una alerta como resuelta
   */
  async resolveAlert(alertId: string, userId: string, notes: string): Promise<void> {
    await this.prisma.integrityAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        resolutionNotes: notes,
      },
    });
  }
}
