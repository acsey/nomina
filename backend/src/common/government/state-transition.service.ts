/**
 * Servicio de Control de Transiciones de Estado
 * Cumplimiento: Gobierno MX - Control formal de cambios de estado
 *
 * Garantiza que:
 * - Solo transiciones válidas son permitidas
 * - Solo roles autorizados pueden ejecutar transiciones
 * - Transiciones críticas requieren justificación
 * - Todas las transiciones (válidas e inválidas) se registran
 */

import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EntityType = 'PAYROLL_PERIOD' | 'PAYROLL_DETAIL' | 'CFDI_NOMINA';

export interface TransitionContext {
  userId: string;
  userEmail?: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  justification?: string;
  metadata?: Record<string, any>;
}

export interface TransitionResult {
  allowed: boolean;
  transitionRuleId?: string;
  requiresJustification: boolean;
  requiresDualControl: boolean;
  isCritical: boolean;
  rejectionReason?: string;
}

export interface TransitionValidation {
  isValid: boolean;
  rule?: any;
  errors: string[];
}

@Injectable()
export class StateTransitionService {
  private readonly logger = new Logger(StateTransitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida si una transición de estado es permitida
   */
  async validateTransition(
    entityType: EntityType,
    fromState: string,
    toState: string,
    action: string,
    userRole: string,
  ): Promise<TransitionValidation> {
    const errors: string[] = [];

    // Buscar regla de transición
    const rule = await this.prisma.stateTransitionRule.findFirst({
      where: {
        entityType,
        fromState,
        toState,
        action,
        isActive: true,
      },
    });

    if (!rule) {
      errors.push(
        `Transición no permitida: ${entityType} de "${fromState}" a "${toState}" con acción "${action}"`,
      );
      return { isValid: false, errors };
    }

    // Verificar rol
    const allowedRoles = rule.allowedRoles as string[];
    if (!allowedRoles.includes(userRole) && !allowedRoles.includes('ADMIN')) {
      errors.push(
        `Rol "${userRole}" no autorizado para esta transición. Roles permitidos: ${allowedRoles.join(', ')}`,
      );
      return { isValid: false, rule, errors };
    }

    return { isValid: true, rule, errors: [] };
  }

  /**
   * Ejecuta una transición de estado con validación completa
   */
  async executeTransition(
    entityType: EntityType,
    entityId: string,
    fromState: string,
    toState: string,
    action: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Validar transición
    const validation = await this.validateTransition(
      entityType,
      fromState,
      toState,
      action,
      context.userRole,
    );

    // Si no es válida, registrar intento y rechazar
    if (!validation.isValid) {
      await this.logTransition({
        entityType,
        entityId,
        fromState,
        toState,
        action,
        transitionRuleId: validation.rule?.id,
        userId: context.userId,
        userEmail: context.userEmail,
        userRole: context.userRole,
        justification: context.justification,
        isValid: false,
        rejectionReason: validation.errors.join('; '),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: context.metadata || {},
      });

      this.logger.warn(
        `Transición rechazada: ${entityType}/${entityId} ${fromState} -> ${toState} por ${context.userEmail}. Motivo: ${validation.errors.join('; ')}`,
      );

      throw new ForbiddenException(validation.errors.join('; '));
    }

    const rule = validation.rule;

    // Verificar si requiere justificación
    if (rule.requiresJustification && !context.justification) {
      const error = 'Esta acción requiere justificación obligatoria';
      await this.logTransition({
        entityType,
        entityId,
        fromState,
        toState,
        action,
        transitionRuleId: rule.id,
        userId: context.userId,
        userEmail: context.userEmail,
        userRole: context.userRole,
        isValid: false,
        rejectionReason: error,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: context.metadata || {},
      });

      throw new BadRequestException(error);
    }

    // Verificar si requiere doble control
    if (rule.requiresDualControl) {
      // Crear solicitud de acción pendiente
      await this.createPendingAction({
        actionType: action,
        entityType,
        entityId,
        requestedBy: context.userId,
        justification: context.justification || '',
        actionData: {
          fromState,
          toState,
          context,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      });

      this.logger.log(
        `Acción pendiente de confirmación: ${action} en ${entityType}/${entityId} por ${context.userEmail}`,
      );

      return {
        allowed: false,
        transitionRuleId: rule.id,
        requiresJustification: rule.requiresJustification,
        requiresDualControl: true,
        isCritical: rule.isCritical,
        rejectionReason: 'Acción requiere confirmación por segundo usuario',
      };
    }

    // Registrar transición exitosa
    await this.logTransition({
      entityType,
      entityId,
      fromState,
      toState,
      action,
      transitionRuleId: rule.id,
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole,
      justification: context.justification,
      isValid: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: context.metadata || {},
    });

    this.logger.log(
      `Transición ejecutada: ${entityType}/${entityId} ${fromState} -> ${toState} por ${context.userEmail}`,
    );

    return {
      allowed: true,
      transitionRuleId: rule.id,
      requiresJustification: rule.requiresJustification,
      requiresDualControl: false,
      isCritical: rule.isCritical,
    };
  }

  /**
   * Confirma una acción pendiente (doble control)
   */
  async confirmPendingAction(
    actionId: string,
    confirmedBy: string,
    confirmedByEmail: string,
  ): Promise<{ action: any; canExecute: boolean }> {
    const action = await this.prisma.pendingCriticalAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new BadRequestException('Acción pendiente no encontrada');
    }

    if (action.status !== 'PENDING') {
      throw new BadRequestException(`La acción ya fue ${action.status.toLowerCase()}`);
    }

    if (action.requestedBy === confirmedBy) {
      throw new ForbiddenException('No puede confirmar su propia acción (separación de funciones)');
    }

    if (action.expiresAt && new Date() > action.expiresAt) {
      await this.prisma.pendingCriticalAction.update({
        where: { id: actionId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('La acción ha expirado');
    }

    // Marcar como confirmada
    const updated = await this.prisma.pendingCriticalAction.update({
      where: { id: actionId },
      data: {
        status: 'CONFIRMED',
        confirmedBy,
        confirmedAt: new Date(),
      },
    });

    this.logger.log(
      `Acción ${action.actionType} confirmada por ${confirmedByEmail} para ${action.entityType}/${action.entityId}`,
    );

    return { action: updated, canExecute: true };
  }

  /**
   * Rechaza una acción pendiente
   */
  async rejectPendingAction(
    actionId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<void> {
    const action = await this.prisma.pendingCriticalAction.findUnique({
      where: { id: actionId },
    });

    if (!action || action.status !== 'PENDING') {
      throw new BadRequestException('Acción pendiente no encontrada o ya procesada');
    }

    await this.prisma.pendingCriticalAction.update({
      where: { id: actionId },
      data: {
        status: 'REJECTED',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    this.logger.log(`Acción ${action.actionType} rechazada para ${action.entityType}/${action.entityId}`);
  }

  /**
   * Obtiene acciones pendientes por entidad
   */
  async getPendingActions(entityType?: string, entityId?: string): Promise<any[]> {
    const where: any = { status: 'PENDING' };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    return this.prisma.pendingCriticalAction.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
    });
  }

  /**
   * Obtiene reglas de transición por tipo de entidad
   */
  async getTransitionRules(entityType?: EntityType): Promise<any[]> {
    const where: any = { isActive: true };
    if (entityType) where.entityType = entityType;

    return this.prisma.stateTransitionRule.findMany({
      where,
      orderBy: [{ entityType: 'asc' }, { fromState: 'asc' }, { toState: 'asc' }],
    });
  }

  /**
   * Obtiene historial de transiciones por entidad
   */
  async getTransitionHistory(
    entityType: EntityType,
    entityId: string,
    options?: { limit?: number; includeInvalid?: boolean },
  ): Promise<any[]> {
    const where: any = { entityType, entityId };
    if (!options?.includeInvalid) {
      where.isValid = true;
    }

    return this.prisma.stateTransitionLog.findMany({
      where,
      include: { transitionRule: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Registra una transición en el log
   */
  private async logTransition(data: {
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    action: string;
    transitionRuleId?: string;
    userId: string;
    userEmail?: string;
    userRole?: string;
    justification?: string;
    isValid: boolean;
    rejectionReason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    await this.prisma.stateTransitionLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        fromState: data.fromState,
        toState: data.toState,
        action: data.action,
        transitionRuleId: data.transitionRuleId,
        userId: data.userId,
        userEmail: data.userEmail,
        userRole: data.userRole,
        justification: data.justification,
        isValid: data.isValid,
        rejectionReason: data.rejectionReason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Crea una acción pendiente de confirmación
   */
  private async createPendingAction(data: {
    actionType: string;
    entityType: string;
    entityId: string;
    requestedBy: string;
    justification: string;
    actionData: Record<string, any>;
    expiresAt?: Date;
  }): Promise<any> {
    return this.prisma.pendingCriticalAction.create({
      data: {
        actionType: data.actionType,
        entityType: data.entityType,
        entityId: data.entityId,
        requestedBy: data.requestedBy,
        justification: data.justification,
        actionData: data.actionData,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Limpia acciones expiradas
   */
  async cleanupExpiredActions(): Promise<number> {
    const result = await this.prisma.pendingCriticalAction.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Limpiadas ${result.count} acciones expiradas`);
    }

    return result.count;
  }
}
