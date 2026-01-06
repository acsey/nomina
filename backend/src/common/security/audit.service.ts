import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { createHash } from 'crypto';

/**
 * P0.3 - Auditoría Tamper-Evident
 *
 * Implementación de hash encadenado para garantizar inmutabilidad de logs.
 * Cada entrada incluye el hash de la entrada anterior, formando una cadena.
 * Cualquier modificación rompe la cadena y es detectable.
 */

/**
 * Tipos de acciones críticas que requieren auditoría especial
 */
export enum CriticalAction {
  // Certificados y PAC
  CERTIFICATE_UPDATE = 'CERTIFICATE_UPDATE',
  CERTIFICATE_ACCESS = 'CERTIFICATE_ACCESS',
  PAC_CREDENTIALS_UPDATE = 'PAC_CREDENTIALS_UPDATE',

  // CFDI
  CFDI_STAMP = 'CFDI_STAMP',
  CFDI_CANCEL = 'CFDI_CANCEL',
  CFDI_ACCESS = 'CFDI_ACCESS',

  // Nómina
  PAYROLL_APPROVE = 'PAYROLL_APPROVE',
  PAYROLL_RECALCULATE = 'PAYROLL_RECALCULATE',
  PAYROLL_DELETE_ATTEMPT = 'PAYROLL_DELETE_ATTEMPT',

  // Empleados - Fiscal
  EMPLOYEE_RFC_CHANGE = 'EMPLOYEE_RFC_CHANGE',
  EMPLOYEE_SALARY_CHANGE = 'EMPLOYEE_SALARY_CHANGE',
  EMPLOYEE_TERMINATION = 'EMPLOYEE_TERMINATION',

  // Sistema
  ROLE_PERMISSION_CHANGE = 'ROLE_PERMISSION_CHANGE',
  USER_ROLE_CHANGE = 'USER_ROLE_CHANGE',
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  FISCAL_DELETE_ATTEMPT = 'FISCAL_DELETE_ATTEMPT',

  // Acceso
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
}

export interface AuditLogEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Servicio de auditoría para acciones críticas
 *
 * Cumple con: Documento de Requerimientos - Sección 7. Auditoría
 * - Registrar cada cálculo fiscal
 * - Guardar valores antes y después
 * - Registrar usuario, fecha y regla aplicada
 * - Mantener evidencia XML, PDF y acuses
 *
 * Y Sección 6. Seguridad:
 * - Auditoría de accesos y acciones críticas
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * P0.3 - Calcula el hash SHA-256 de los datos de una entrada de auditoría
   */
  private calculateEntryHash(data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: any;
    newValues?: any;
    createdAt: Date;
    previousEntryHash?: string;
    sequenceNumber: number;
  }): string {
    const hashContent = JSON.stringify({
      userId: data.userId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId || null,
      oldValues: data.oldValues || null,
      newValues: data.newValues || null,
      createdAt: data.createdAt.toISOString(),
      previousEntryHash: data.previousEntryHash || 'GENESIS',
      sequenceNumber: data.sequenceNumber,
    });

    return createHash('sha256').update(hashContent).digest('hex');
  }

  /**
   * P0.3 - Obtiene la última entrada de auditoría para encadenar
   */
  private async getLastAuditEntry(): Promise<{
    entryHash: string | null;
    sequenceNumber: number;
  }> {
    const lastEntry = await this.prisma.auditLog.findFirst({
      where: {
        entryHash: { not: null },
      },
      orderBy: {
        sequenceNumber: 'desc',
      },
      select: {
        entryHash: true,
        sequenceNumber: true,
      },
    });

    return {
      entryHash: lastEntry?.entryHash || null,
      sequenceNumber: lastEntry?.sequenceNumber || 0,
    };
  }

  /**
   * Registra una acción crítica en el log de auditoría
   * P0.3 - Con hash encadenado para detección de manipulación
   */
  async logCriticalAction(entry: AuditLogEntry) {
    // P0.3 - Obtener última entrada para encadenar hash
    const lastEntry = await this.getLastAuditEntry();
    const sequenceNumber = lastEntry.sequenceNumber + 1;
    const createdAt = new Date();

    const newValues = {
      ...entry.newValues,
      ...entry.details,
      timestamp: createdAt.toISOString(),
    };

    // P0.3 - Calcular hash de esta entrada incluyendo referencia al anterior
    const entryHash = this.calculateEntryHash({
      userId: entry.userId || 'SYSTEM',
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      oldValues: entry.oldValues,
      newValues,
      createdAt,
      previousEntryHash: lastEntry.entryHash || undefined,
      sequenceNumber,
    });

    // Crear entrada con hash encadenado
    const auditEntry = await this.prisma.auditLog.create({
      data: {
        userId: entry.userId || 'SYSTEM',
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValues: entry.oldValues || null,
        newValues: newValues as any,
        ipAddress: entry.ipAddress,
        createdAt,
        // P0.3 - Campos de hash encadenado
        entryHash,
        previousEntryHash: lastEntry.entryHash,
        sequenceNumber,
      },
    });

    this.logger.debug(`Audit entry created: ${auditEntry.id} [seq: ${sequenceNumber}]`);
    return auditEntry;
  }

  /**
   * Registra un intento de eliminación de información fiscal (PROHIBIDO)
   */
  async logFiscalDeleteAttempt(
    userId: string,
    entity: string,
    entityId: string,
    details?: Record<string, unknown>,
  ) {
    return this.logCriticalAction({
      userId,
      action: CriticalAction.FISCAL_DELETE_ATTEMPT,
      entity,
      entityId,
      details: {
        ...details,
        severity: 'CRITICAL',
        message: 'Intento de eliminación de información fiscal bloqueado',
      },
    });
  }

  /**
   * Registra acceso a certificados (para seguimiento)
   */
  async logCertificateAccess(
    userId: string,
    companyId: string,
    purpose: string,
  ) {
    return this.logCriticalAction({
      userId,
      action: CriticalAction.CERTIFICATE_ACCESS,
      entity: 'Company',
      entityId: companyId,
      details: { purpose },
    });
  }

  /**
   * Registra operación de timbrado CFDI
   */
  async logCfdiStamp(
    userId: string,
    cfdiId: string,
    uuid: string,
    employeeId: string,
  ) {
    return this.logCriticalAction({
      userId,
      action: CriticalAction.CFDI_STAMP,
      entity: 'CfdiNomina',
      entityId: cfdiId,
      details: {
        uuid,
        employeeId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra cancelación de CFDI
   */
  async logCfdiCancel(
    userId: string,
    cfdiId: string,
    uuid: string,
    reason: string,
  ) {
    return this.logCriticalAction({
      userId,
      action: CriticalAction.CFDI_CANCEL,
      entity: 'CfdiNomina',
      entityId: cfdiId,
      details: {
        uuid,
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra aprobación de nómina
   */
  async logPayrollApproval(
    userId: string,
    periodId: string,
    details: {
      totalEmployees: number;
      totalNet: number;
    },
  ) {
    return this.logCriticalAction({
      userId,
      action: CriticalAction.PAYROLL_APPROVE,
      entity: 'PayrollPeriod',
      entityId: periodId,
      details,
    });
  }

  /**
   * Registra cambio de salario de empleado
   */
  async logSalaryChange(
    userId: string,
    employeeId: string,
    oldSalary: number,
    newSalary: number,
    reason?: string,
  ) {
    return this.logCriticalAction({
      userId,
      action: CriticalAction.EMPLOYEE_SALARY_CHANGE,
      entity: 'Employee',
      entityId: employeeId,
      oldValues: { baseSalary: oldSalary },
      newValues: { baseSalary: newSalary },
      details: { reason },
    });
  }

  /**
   * Obtiene el historial de auditoría para una entidad
   */
  async getEntityAuditHistory(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Obtiene auditoría de acciones críticas en un rango de fechas
   */
  async getCriticalActionsReport(
    startDate: Date,
    endDate: Date,
    actions?: CriticalAction[],
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(actions && {
          action: {
            in: actions,
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Obtiene intentos de acceso no autorizado
   */
  async getSecurityIncidents(startDate: Date, endDate: Date) {
    return this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        action: {
          in: [
            CriticalAction.UNAUTHORIZED_ACCESS,
            CriticalAction.LOGIN_FAILED,
            CriticalAction.FISCAL_DELETE_ATTEMPT,
            CriticalAction.PAYROLL_DELETE_ATTEMPT,
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================
  // P0.3 - Métodos de verificación de integridad
  // ============================================

  /**
   * P0.3 - Verifica la integridad de una entrada individual
   * Recalcula el hash y compara con el almacenado
   */
  async verifyEntryIntegrity(entryId: string): Promise<{
    valid: boolean;
    entry: any;
    expectedHash: string;
    actualHash: string | null;
    error?: string;
  }> {
    const entry = await this.prisma.auditLog.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return {
        valid: false,
        entry: null,
        expectedHash: '',
        actualHash: null,
        error: 'Entrada no encontrada',
      };
    }

    // Si la entrada no tiene hash (entrada antigua), no se puede verificar
    if (!entry.entryHash) {
      return {
        valid: true,
        entry,
        expectedHash: 'N/A (entrada pre-hash)',
        actualHash: null,
        error: 'Entrada creada antes de implementar hash encadenado',
      };
    }

    // Recalcular hash
    const recalculatedHash = this.calculateEntryHash({
      userId: entry.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId || undefined,
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      createdAt: entry.createdAt,
      previousEntryHash: entry.previousEntryHash || undefined,
      sequenceNumber: entry.sequenceNumber || 0,
    });

    const valid = recalculatedHash === entry.entryHash;

    if (!valid) {
      this.logger.error(`TAMPER DETECTED: Entry ${entryId} hash mismatch!`);
      this.logger.error(`Expected: ${entry.entryHash}, Calculated: ${recalculatedHash}`);
    }

    return {
      valid,
      entry,
      expectedHash: recalculatedHash,
      actualHash: entry.entryHash,
    };
  }

  /**
   * P0.3 - Verifica la integridad de la cadena de auditoría
   * Verifica que los hashes estén correctamente encadenados
   */
  async verifyChainIntegrity(options?: {
    startSequence?: number;
    endSequence?: number;
    limit?: number;
  }): Promise<{
    valid: boolean;
    totalChecked: number;
    errors: Array<{
      sequenceNumber: number;
      entryId: string;
      type: 'hash_mismatch' | 'chain_break' | 'missing_sequence';
      details: string;
    }>;
  }> {
    const { startSequence = 1, endSequence, limit = 1000 } = options || {};

    const entries = await this.prisma.auditLog.findMany({
      where: {
        sequenceNumber: {
          gte: startSequence,
          ...(endSequence && { lte: endSequence }),
        },
        entryHash: { not: null },
      },
      orderBy: { sequenceNumber: 'asc' },
      take: limit,
    });

    const errors: Array<{
      sequenceNumber: number;
      entryId: string;
      type: 'hash_mismatch' | 'chain_break' | 'missing_sequence';
      details: string;
    }> = [];

    let previousHash: string | null = null;
    let expectedSequence = startSequence;

    for (const entry of entries) {
      // Verificar secuencia
      if (entry.sequenceNumber !== expectedSequence && expectedSequence !== startSequence) {
        errors.push({
          sequenceNumber: expectedSequence,
          entryId: 'N/A',
          type: 'missing_sequence',
          details: `Falta entrada con secuencia ${expectedSequence}`,
        });
      }

      // Verificar que previousEntryHash coincide con el hash de la entrada anterior
      if (previousHash !== null && entry.previousEntryHash !== previousHash) {
        errors.push({
          sequenceNumber: entry.sequenceNumber || 0,
          entryId: entry.id,
          type: 'chain_break',
          details: `previousEntryHash no coincide. Esperado: ${previousHash}, Encontrado: ${entry.previousEntryHash}`,
        });
      }

      // Verificar hash de la entrada
      const recalculatedHash = this.calculateEntryHash({
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || undefined,
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        createdAt: entry.createdAt,
        previousEntryHash: entry.previousEntryHash || undefined,
        sequenceNumber: entry.sequenceNumber || 0,
      });

      if (recalculatedHash !== entry.entryHash) {
        errors.push({
          sequenceNumber: entry.sequenceNumber || 0,
          entryId: entry.id,
          type: 'hash_mismatch',
          details: `Hash no coincide. Esperado: ${recalculatedHash}, Almacenado: ${entry.entryHash}`,
        });
      }

      previousHash = entry.entryHash;
      expectedSequence = (entry.sequenceNumber || 0) + 1;
    }

    const valid = errors.length === 0;

    if (!valid) {
      this.logger.error(`AUDIT CHAIN INTEGRITY CHECK FAILED: ${errors.length} errors found`);
      errors.forEach(e => this.logger.error(`  - Seq ${e.sequenceNumber}: ${e.type} - ${e.details}`));
    } else {
      this.logger.log(`Audit chain integrity verified: ${entries.length} entries checked, all valid`);
    }

    return {
      valid,
      totalChecked: entries.length,
      errors,
    };
  }

  /**
   * P0.3 - Genera reporte de integridad de auditoría
   */
  async generateIntegrityReport(): Promise<{
    timestamp: string;
    totalEntries: number;
    entriesWithHash: number;
    entriesWithoutHash: number;
    chainIntegrity: {
      valid: boolean;
      errors: number;
    };
    lastVerifiedSequence: number;
    recommendations: string[];
  }> {
    const [totalEntries, entriesWithHash] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: { entryHash: { not: null } },
      }),
    ]);

    const chainVerification = await this.verifyChainIntegrity({ limit: 10000 });

    const lastEntry = await this.getLastAuditEntry();

    const recommendations: string[] = [];

    if (entriesWithHash < totalEntries) {
      recommendations.push(
        `${totalEntries - entriesWithHash} entradas sin hash (creadas antes de P0.3). Considere migración de datos históricos.`,
      );
    }

    if (!chainVerification.valid) {
      recommendations.push(
        `Se detectaron ${chainVerification.errors.length} problemas de integridad. Investigar inmediatamente.`,
      );
    }

    return {
      timestamp: new Date().toISOString(),
      totalEntries,
      entriesWithHash,
      entriesWithoutHash: totalEntries - entriesWithHash,
      chainIntegrity: {
        valid: chainVerification.valid,
        errors: chainVerification.errors.length,
      },
      lastVerifiedSequence: lastEntry.sequenceNumber,
      recommendations,
    };
  }
}
