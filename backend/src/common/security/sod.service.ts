/**
 * P0.2 - Segregación de Funciones (Separation of Duties - SoD)
 *
 * Implementación de controles de segregación de funciones para cumplimiento
 * con regulaciones gubernamentales y mejores prácticas de seguridad.
 *
 * Principios implementados:
 * 1. Conflicto de roles: Un usuario no puede tener roles conflictivos
 * 2. Dual control (Maker-Checker): Operaciones críticas requieren aprobación de otro usuario
 * 3. Auto-aprobación prohibida: Un usuario no puede aprobar sus propias operaciones
 * 4. Separación de funciones fiscales: Quien calcula no puede aprobar/timbrar
 */

import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService, CriticalAction } from './audit.service';

/**
 * Definición de permisos del sistema
 */
export enum Permission {
  // Nómina
  PAYROLL_CREATE = 'payroll:create',
  PAYROLL_CALCULATE = 'payroll:calculate',
  PAYROLL_APPROVE = 'payroll:approve',
  PAYROLL_PAY = 'payroll:pay',
  PAYROLL_VIEW = 'payroll:view',

  // CFDI
  CFDI_STAMP = 'cfdi:stamp',
  CFDI_CANCEL = 'cfdi:cancel',
  CFDI_VIEW = 'cfdi:view',

  // Empleados
  EMPLOYEE_CREATE = 'employee:create',
  EMPLOYEE_UPDATE = 'employee:update',
  EMPLOYEE_DELETE = 'employee:delete',
  EMPLOYEE_VIEW = 'employee:view',
  EMPLOYEE_SALARY_UPDATE = 'employee:salary:update',

  // Usuarios y Roles
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  ROLE_MANAGE = 'role:manage',

  // Certificados y PAC
  CERTIFICATE_MANAGE = 'certificate:manage',
  PAC_MANAGE = 'pac:manage',

  // Configuración
  SYSTEM_CONFIG = 'system:config',
  COMPANY_CONFIG = 'company:config',

  // Reportes
  REPORTS_FISCAL = 'reports:fiscal',
  REPORTS_PAYROLL = 'reports:payroll',
  REPORTS_AUDIT = 'reports:audit',
}

/**
 * Definición de conflictos de segregación de funciones
 * Si un usuario tiene el primer permiso, no puede tener el segundo
 */
export const SOD_CONFLICTS: Array<{
  permission1: Permission;
  permission2: Permission;
  reason: string;
  severity: 'HIGH' | 'CRITICAL';
}> = [
  // Nómina: quien calcula no puede aprobar
  {
    permission1: Permission.PAYROLL_CALCULATE,
    permission2: Permission.PAYROLL_APPROVE,
    reason: 'Segregación de funciones: El calculador de nómina no puede aprobarla',
    severity: 'CRITICAL',
  },
  // Nómina: quien aprueba no puede pagar
  {
    permission1: Permission.PAYROLL_APPROVE,
    permission2: Permission.PAYROLL_PAY,
    reason: 'Segregación de funciones: El aprobador de nómina no puede ejecutar el pago',
    severity: 'HIGH',
  },
  // CFDI: quien timbra no puede cancelar
  {
    permission1: Permission.CFDI_STAMP,
    permission2: Permission.CFDI_CANCEL,
    reason: 'Segregación de funciones: Quien timbra CFDI no puede cancelarlos',
    severity: 'CRITICAL',
  },
  // Usuarios: quien crea usuarios no puede asignar roles privilegiados
  {
    permission1: Permission.USER_CREATE,
    permission2: Permission.ROLE_MANAGE,
    reason: 'Segregación de funciones: Separar creación de usuarios de asignación de roles',
    severity: 'HIGH',
  },
  // Certificados: separar gestión de certificados de timbrado
  {
    permission1: Permission.CERTIFICATE_MANAGE,
    permission2: Permission.CFDI_STAMP,
    reason: 'Segregación de funciones: Quien gestiona certificados no debe timbrar',
    severity: 'CRITICAL',
  },
];

/**
 * Operaciones que requieren dual control (Maker-Checker)
 */
export interface DualControlOperation {
  operation: string;
  entity: string;
  requiredPermission: Permission;
  approverPermission: Permission;
  expirationMinutes: number;
  description: string;
}

export const DUAL_CONTROL_OPERATIONS: DualControlOperation[] = [
  {
    operation: 'PAYROLL_APPROVE',
    entity: 'PayrollPeriod',
    requiredPermission: Permission.PAYROLL_CALCULATE,
    approverPermission: Permission.PAYROLL_APPROVE,
    expirationMinutes: 1440, // 24 horas
    description: 'Aprobación de período de nómina',
  },
  {
    operation: 'CFDI_CANCEL',
    entity: 'CfdiNomina',
    requiredPermission: Permission.CFDI_VIEW,
    approverPermission: Permission.CFDI_CANCEL,
    expirationMinutes: 60,
    description: 'Cancelación de CFDI timbrado',
  },
  {
    operation: 'SALARY_CHANGE',
    entity: 'Employee',
    requiredPermission: Permission.EMPLOYEE_UPDATE,
    approverPermission: Permission.EMPLOYEE_SALARY_UPDATE,
    expirationMinutes: 1440,
    description: 'Cambio de salario de empleado',
  },
  {
    operation: 'CERTIFICATE_UPDATE',
    entity: 'Company',
    requiredPermission: Permission.COMPANY_CONFIG,
    approverPermission: Permission.CERTIFICATE_MANAGE,
    expirationMinutes: 60,
    description: 'Actualización de certificado CSD',
  },
];

/**
 * Estado de solicitud de dual control
 */
export enum DualControlStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Injectable()
export class SodService {
  private readonly logger = new Logger(SodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Verifica si un usuario tiene permisos conflictivos
   */
  async checkUserSodConflicts(userId: string): Promise<{
    hasConflicts: boolean;
    conflicts: Array<{
      permission1: Permission;
      permission2: Permission;
      reason: string;
      severity: 'HIGH' | 'CRITICAL';
    }>;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.role) {
      return { hasConflicts: false, conflicts: [] };
    }

    const userPermissions = (user.role.permissions as string[]) || [];
    const conflicts: typeof SOD_CONFLICTS = [];

    for (const conflict of SOD_CONFLICTS) {
      if (
        userPermissions.includes(conflict.permission1) &&
        userPermissions.includes(conflict.permission2)
      ) {
        conflicts.push(conflict);
      }
    }

    if (conflicts.length > 0) {
      this.logger.warn(
        `SoD conflicts detected for user ${userId}: ${conflicts.length} conflicts`,
      );
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Valida que un rol no tenga permisos conflictivos antes de asignarlo
   */
  validateRolePermissions(permissions: string[]): {
    valid: boolean;
    conflicts: Array<{
      permission1: Permission;
      permission2: Permission;
      reason: string;
    }>;
  } {
    const conflicts: Array<{
      permission1: Permission;
      permission2: Permission;
      reason: string;
    }> = [];

    for (const conflict of SOD_CONFLICTS) {
      if (
        permissions.includes(conflict.permission1) &&
        permissions.includes(conflict.permission2)
      ) {
        conflicts.push({
          permission1: conflict.permission1,
          permission2: conflict.permission2,
          reason: conflict.reason,
        });
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Verifica si una operación requiere dual control
   */
  requiresDualControl(operation: string): DualControlOperation | null {
    return DUAL_CONTROL_OPERATIONS.find(op => op.operation === operation) || null;
  }

  /**
   * Crea una solicitud de dual control (maker)
   */
  async createDualControlRequest(data: {
    requesterId: string;
    operation: string;
    entity: string;
    entityId: string;
    details: Record<string, any>;
    justification: string;
  }): Promise<any> {
    const operationConfig = this.requiresDualControl(data.operation);

    if (!operationConfig) {
      throw new BadRequestException(`Operación ${data.operation} no requiere dual control`);
    }

    // Verificar que el solicitante no tenga permiso de aprobación (SoD)
    const requester = await this.prisma.user.findUnique({
      where: { id: data.requesterId },
      include: { role: true },
    });

    const requesterPermissions = (requester?.role?.permissions as string[]) || [];

    if (requesterPermissions.includes(operationConfig.approverPermission)) {
      // Registrar intento de auto-aprobación
      await this.auditService.logCriticalAction({
        userId: data.requesterId,
        action: CriticalAction.UNAUTHORIZED_ACCESS,
        entity: data.entity,
        entityId: data.entityId,
        details: {
          type: 'SELF_APPROVAL_ATTEMPT',
          operation: data.operation,
          message: 'Intento de crear solicitud con permiso de auto-aprobación',
        },
      });

      throw new ForbiddenException(
        'No puede crear una solicitud para una operación que usted mismo puede aprobar (SoD)',
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + operationConfig.expirationMinutes);

    // Crear solicitud usando Prisma
    const request = await this.prisma.dualControlRequest.create({
      data: {
        requesterId: data.requesterId,
        operation: data.operation,
        entity: data.entity,
        entityId: data.entityId,
        details: data.details,
        justification: data.justification,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        requester: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Auditar la solicitud
    await this.auditService.logCriticalAction({
      userId: data.requesterId,
      action: 'DUAL_CONTROL_REQUEST_CREATED',
      entity: data.entity,
      entityId: data.entityId,
      details: {
        operation: data.operation,
        justification: data.justification,
        expiresAt: expiresAt.toISOString(),
      },
    });

    this.logger.log(
      `Dual control request created: ${data.operation} for ${data.entity}:${data.entityId}`,
    );

    return request;
  }

  /**
   * Aprueba una solicitud de dual control (checker)
   */
  async approveDualControlRequest(
    requestId: string,
    approverId: string,
    comments?: string,
  ): Promise<any> {
    // Obtener la solicitud usando Prisma
    const request = await this.prisma.dualControlRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new BadRequestException('Solicitud no encontrada');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Solicitud ya fue procesada: ${request.status}`);
    }

    if (new Date() > new Date(request.expiresAt)) {
      // Marcar como expirada
      await this.prisma.dualControlRequest.update({
        where: { id: requestId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Solicitud expirada');
    }

    // Verificar que el aprobador no sea el mismo que el solicitante (auto-aprobación)
    if (request.requesterId === approverId) {
      await this.auditService.logCriticalAction({
        userId: approverId,
        action: CriticalAction.UNAUTHORIZED_ACCESS,
        entity: request.entity,
        entityId: request.entityId,
        details: {
          type: 'SELF_APPROVAL_ATTEMPT',
          requestId,
          message: 'Intento de auto-aprobación de solicitud dual control',
        },
      });

      throw new ForbiddenException(
        'No puede aprobar una solicitud que usted mismo creó (SoD - Auto-aprobación prohibida)',
      );
    }

    // Verificar que el aprobador tenga el permiso correcto
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
      include: { role: true },
    });

    const operationConfig = this.requiresDualControl(request.operation);
    const approverPermissions = (approver?.role?.permissions as string[]) || [];

    if (!approverPermissions.includes(operationConfig?.approverPermission || '')) {
      throw new ForbiddenException(
        `No tiene permiso para aprobar operaciones de tipo ${request.operation}`,
      );
    }

    // Aprobar la solicitud usando Prisma
    const updatedRequest = await this.prisma.dualControlRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approverId,
        approvedAt: new Date(),
        approverComments: comments,
      },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
        approver: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Auditar la aprobación
    await this.auditService.logCriticalAction({
      userId: approverId,
      action: 'DUAL_CONTROL_APPROVED',
      entity: request.entity,
      entityId: request.entityId,
      details: {
        operation: request.operation,
        requestId,
        requesterId: request.requesterId,
        comments,
      },
    });

    this.logger.log(
      `Dual control request approved: ${requestId} by ${approverId}`,
    );

    return updatedRequest;
  }

  /**
   * Rechaza una solicitud de dual control
   */
  async rejectDualControlRequest(
    requestId: string,
    rejecterId: string,
    reason: string,
  ): Promise<any> {
    const request = await this.prisma.dualControlRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new BadRequestException('Solicitud no encontrada');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Solicitud ya fue procesada: ${request.status}`);
    }

    // Rechazar la solicitud usando Prisma
    const updatedRequest = await this.prisma.dualControlRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approverId: rejecterId,
        approvedAt: new Date(),
        approverComments: reason,
      },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
        approver: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Auditar el rechazo
    await this.auditService.logCriticalAction({
      userId: rejecterId,
      action: 'DUAL_CONTROL_REJECTED',
      entity: request.entity,
      entityId: request.entityId,
      details: {
        operation: request.operation,
        requestId,
        requesterId: request.requesterId,
        reason,
      },
    });

    this.logger.log(
      `Dual control request rejected: ${requestId} by ${rejecterId}`,
    );

    return updatedRequest;
  }

  /**
   * Verifica si una operación tiene aprobación dual válida
   */
  async hasValidDualControlApproval(
    operation: string,
    entity: string,
    entityId: string,
  ): Promise<{
    approved: boolean;
    request?: any;
  }> {
    const request = await this.prisma.dualControlRequest.findFirst({
      where: {
        operation,
        entity,
        entityId,
        status: 'APPROVED',
        expiresAt: { gt: new Date() },
      },
      orderBy: { approvedAt: 'desc' },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
        approver: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return {
      approved: !!request,
      request,
    };
  }

  /**
   * Obtiene solicitudes pendientes para un aprobador
   */
  async getPendingRequestsForApprover(approverId: string): Promise<any[]> {
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
      include: { role: true },
    });

    const approverPermissions = (approver?.role?.permissions as string[]) || [];

    // Encontrar operaciones que este usuario puede aprobar
    const approvableOperations = DUAL_CONTROL_OPERATIONS
      .filter(op => approverPermissions.includes(op.approverPermission))
      .map(op => op.operation);

    if (approvableOperations.length === 0) {
      return [];
    }

    const requests = await this.prisma.dualControlRequest.findMany({
      where: {
        operation: { in: approvableOperations },
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        requesterId: { not: approverId }, // Excluir propias solicitudes
      },
      orderBy: { createdAt: 'asc' },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return requests;
  }

  /**
   * Genera reporte de cumplimiento de SoD
   */
  async generateSodComplianceReport(): Promise<{
    timestamp: string;
    totalUsers: number;
    usersWithConflicts: number;
    conflictDetails: Array<{
      userId: string;
      userEmail: string;
      conflicts: Array<{
        permission1: Permission;
        permission2: Permission;
        reason: string;
        severity: 'HIGH' | 'CRITICAL';
      }>;
    }>;
    dualControlStats: {
      pending: number;
      approvedLast30Days: number;
      rejectedLast30Days: number;
      expiredLast30Days: number;
    };
    recommendations: string[];
  }> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
    });

    const usersWithConflicts: Array<{
      userId: string;
      userEmail: string;
      conflicts: Array<{
        permission1: Permission;
        permission2: Permission;
        reason: string;
        severity: 'HIGH' | 'CRITICAL';
      }>;
    }> = [];

    for (const user of users) {
      const { hasConflicts, conflicts } = await this.checkUserSodConflicts(user.id);
      if (hasConflicts) {
        usersWithConflicts.push({
          userId: user.id,
          userEmail: user.email,
          conflicts,
        });
      }
    }

    // Estadísticas de dual control
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let dualControlStats = {
      pending: 0,
      approvedLast30Days: 0,
      rejectedLast30Days: 0,
      expiredLast30Days: 0,
    };

    try {
      // Usar Prisma para estadísticas
      const [pending, approved, rejected, expired] = await Promise.all([
        this.prisma.dualControlRequest.count({
          where: { status: 'PENDING', expiresAt: { gt: new Date() } },
        }),
        this.prisma.dualControlRequest.count({
          where: { status: 'APPROVED', approvedAt: { gt: thirtyDaysAgo } },
        }),
        this.prisma.dualControlRequest.count({
          where: { status: 'REJECTED', approvedAt: { gt: thirtyDaysAgo } },
        }),
        this.prisma.dualControlRequest.count({
          where: { status: 'EXPIRED', expiresAt: { gt: thirtyDaysAgo } },
        }),
      ]);

      dualControlStats = {
        pending,
        approvedLast30Days: approved,
        rejectedLast30Days: rejected,
        expiredLast30Days: expired,
      };
    } catch (error) {
      // Tabla puede no existir aún
      this.logger.warn('dual_control_requests table may not exist yet');
    }

    const recommendations: string[] = [];

    if (usersWithConflicts.length > 0) {
      recommendations.push(
        `${usersWithConflicts.length} usuarios tienen conflictos de SoD. Revisar y corregir asignaciones de roles.`,
      );
    }

    const criticalConflicts = usersWithConflicts.filter(u =>
      u.conflicts.some(c => c.severity === 'CRITICAL'),
    );
    if (criticalConflicts.length > 0) {
      recommendations.push(
        `URGENTE: ${criticalConflicts.length} usuarios tienen conflictos CRÍTICOS de SoD que deben resolverse inmediatamente.`,
      );
    }

    if (dualControlStats.expiredLast30Days > dualControlStats.approvedLast30Days * 0.1) {
      recommendations.push(
        'Alto número de solicitudes expiradas. Considere aumentar tiempos de expiración o mejorar proceso de aprobación.',
      );
    }

    return {
      timestamp: new Date().toISOString(),
      totalUsers: users.length,
      usersWithConflicts: usersWithConflicts.length,
      conflictDetails: usersWithConflicts,
      dualControlStats,
      recommendations,
    };
  }
}
