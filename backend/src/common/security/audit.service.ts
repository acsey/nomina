import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una acción crítica en el log de auditoría
   */
  async logCriticalAction(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({
      data: {
        userId: entry.userId || 'SYSTEM',
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValues: entry.oldValues
          ? (entry.oldValues as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        newValues: {
          ...entry.newValues,
          ...entry.details,
          timestamp: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress,
      },
    });
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
}
