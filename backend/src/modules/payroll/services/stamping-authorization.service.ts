import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';

/**
 * Servicio para gestionar la autorización de timbrado de nóminas.
 *
 * Implementa separación entre cálculo y timbrado:
 * - Los recibos se calculan primero
 * - Un usuario con permisos autoriza el período para timbrado
 * - Solo después de autorizado se puede iniciar el proceso de timbrado
 */
@Injectable()
export class StampingAuthorizationService {
  private readonly logger = new Logger(StampingAuthorizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Autoriza un período para timbrado
   */
  async authorizePeriod(
    periodId: string,
    userId: string,
    details?: AuthorizationDetails,
  ): Promise<AuthorizationResult> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        payrollDetails: {
          include: {
            cfdiNomina: true,
          },
        },
        stampingAuthorizations: {
          where: { isActive: true },
        },
      },
    }) as any;

    if (!period) {
      throw new NotFoundException(`Período ${periodId} no encontrado`);
    }

    // Validar estado del período
    if (period.status !== 'CALCULATED' && period.status !== 'APPROVED') {
      throw new ForbiddenException(
        `El período debe estar en estado CALCULATED o APPROVED para autorizar timbrado. Estado actual: ${period.status}`,
      );
    }

    // Verificar si ya tiene autorización activa
    if (period.stampingAuthorizations.length > 0) {
      throw new ConflictException(
        'El período ya tiene una autorización de timbrado activa',
      );
    }

    // Validar que todos los recibos estén calculados
    const uncalculatedReceipts = period.payrollDetails.filter(
      (d: any) => d.status !== 'CALCULATED' && d.status !== 'PENDING',
    );

    if (uncalculatedReceipts.length > 0) {
      throw new ForbiddenException(
        `Hay ${uncalculatedReceipts.length} recibos sin calcular. Todos los recibos deben estar calculados antes de autorizar el timbrado.`,
      );
    }

    // Validar que no haya recibos ya timbrados
    const alreadyStamped = period.payrollDetails.filter(
      (d: any) => d.cfdiNomina?.status === 'STAMPED',
    );

    if (alreadyStamped.length > 0) {
      throw new ConflictException(
        `Hay ${alreadyStamped.length} recibos ya timbrados. No se puede autorizar un período con recibos timbrados.`,
      );
    }

    // Crear autorización y actualizar período en transacción
    const result = await this.prisma.$transaction(async (tx: any) => {
      const authorization = await tx.stampingAuthorization.create({
        data: {
          periodId,
          authorizedBy: userId,
          details: (details || {}) as any,
        },
      });

      await tx.payrollPeriod.update({
        where: { id: periodId },
        data: {
          authorizedForStamping: true,
          authorizedAt: new Date(),
          authorizedBy: userId,
        },
      });

      return authorization;
    });

    // Auditoría
    await this.auditService.logCriticalAction({
      userId,
      action: 'AUTHORIZE_STAMPING',
      entity: 'PayrollPeriod',
      entityId: periodId,
      details: {
        authorizationId: result.id,
        receiptsCount: period.payrollDetails.length,
        totalNetPay: period.payrollDetails.reduce(
          (sum: number, d: any) => sum + parseFloat(d.netPay?.toString() || '0'),
          0,
        ),
        ...details,
      },
    });

    this.logger.log(
      `Período ${periodId} autorizado para timbrado por usuario ${userId}`,
    );

    return {
      authorizationId: result.id,
      periodId,
      authorizedBy: userId,
      authorizedAt: result.authorizedAt,
      receiptsCount: period.payrollDetails.length,
      canStartStamping: true,
    };
  }

  /**
   * Revoca la autorización de timbrado de un período
   */
  async revokeAuthorization(
    periodId: string,
    userId: string,
    reason: string,
  ): Promise<RevokeResult> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        payrollDetails: {
          include: {
            cfdiNomina: true,
          },
        },
        stampingAuthorizations: {
          where: { isActive: true },
        },
      },
    }) as any;

    if (!period) {
      throw new NotFoundException(`Período ${periodId} no encontrado`);
    }

    const activeAuth = period.stampingAuthorizations[0];
    if (!activeAuth) {
      throw new NotFoundException(
        'El período no tiene una autorización activa',
      );
    }

    // Verificar si hay recibos ya timbrados
    const stampedReceipts = period.payrollDetails.filter(
      (d: any) => d.cfdiNomina?.status === 'STAMPED',
    );

    if (stampedReceipts.length > 0) {
      throw new ForbiddenException(
        `No se puede revocar la autorización. Hay ${stampedReceipts.length} recibos ya timbrados.`,
      );
    }

    // Revocar autorización
    await this.prisma.$transaction(async (tx: any) => {
      await tx.stampingAuthorization.update({
        where: { id: activeAuth.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedBy: userId,
          revokeReason: reason,
        },
      });

      await tx.payrollPeriod.update({
        where: { id: periodId },
        data: {
          authorizedForStamping: false,
          authorizedAt: null,
          authorizedBy: null,
        },
      });
    });

    // Auditoría
    await this.auditService.logCriticalAction({
      userId,
      action: 'REVOKE_STAMPING_AUTHORIZATION',
      entity: 'PayrollPeriod',
      entityId: periodId,
      details: {
        authorizationId: activeAuth.id,
        reason,
      },
    });

    this.logger.log(
      `Autorización de timbrado revocada para período ${periodId} por usuario ${userId}`,
    );

    return {
      periodId,
      authorizationId: activeAuth.id,
      revokedBy: userId,
      revokedAt: new Date(),
      reason,
    };
  }

  /**
   * Verifica si un período puede ser timbrado
   */
  async canStamp(periodId: string): Promise<StampingEligibility> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        company: {
          select: {
            pacProvider: true,
            pacMode: true,
            certificadoVigenciaFin: true,
          },
        },
        stampingAuthorizations: {
          where: { isActive: true },
        },
        payrollDetails: {
          include: {
            cfdiNomina: true,
          },
        },
      },
    }) as any;

    if (!period) {
      throw new NotFoundException(`Período ${periodId} no encontrado`);
    }

    const issues: StampingIssue[] = [];

    // Verificar autorización
    if (!period.authorizedForStamping) {
      issues.push({
        code: 'NOT_AUTHORIZED',
        severity: 'CRITICAL',
        message: 'El período no está autorizado para timbrado',
        resolution: 'Solicitar autorización de timbrado a un usuario con permisos',
      });
    }

    // Verificar PAC configurado
    if (!period.company.pacProvider) {
      issues.push({
        code: 'NO_PAC',
        severity: 'CRITICAL',
        message: 'No hay proveedor PAC configurado para la empresa',
        resolution: 'Configurar un PAC en la configuración de la empresa',
      });
    }

    // Verificar vigencia de certificado
    if (period.company.certificadoVigenciaFin) {
      const now = new Date();
      if (period.company.certificadoVigenciaFin < now) {
        issues.push({
          code: 'CERTIFICATE_EXPIRED',
          severity: 'CRITICAL',
          message: 'El certificado de sello digital ha expirado',
          resolution: 'Actualizar el certificado de sello digital',
        });
      }
    }

    // Verificar estado del período
    if (period.status !== 'CALCULATED' && period.status !== 'APPROVED') {
      issues.push({
        code: 'INVALID_STATUS',
        severity: 'CRITICAL',
        message: `El período está en estado ${period.status}`,
        resolution: 'El período debe estar en estado CALCULATED o APPROVED',
      });
    }

    // Contar recibos pendientes de timbrado
    const pendingReceipts = period.payrollDetails.filter(
      (d: any) => !d.cfdiNomina || d.cfdiNomina.status === 'PENDING',
    );

    const stampedReceipts = period.payrollDetails.filter(
      (d: any) => d.cfdiNomina?.status === 'STAMPED',
    );

    const failedReceipts = period.payrollDetails.filter(
      (d: any) => d.cfdiNomina?.status === 'ERROR',
    );

    return {
      periodId,
      canStamp: issues.filter((i) => i.severity === 'CRITICAL').length === 0,
      isAuthorized: period.authorizedForStamping,
      authorization: period.stampingAuthorizations[0]
        ? {
            id: period.stampingAuthorizations[0].id,
            authorizedBy: period.stampingAuthorizations[0].authorizedBy,
            authorizedAt: period.stampingAuthorizations[0].authorizedAt,
          }
        : null,
      receiptsStatus: {
        total: period.payrollDetails.length,
        pending: pendingReceipts.length,
        stamped: stampedReceipts.length,
        failed: failedReceipts.length,
      },
      issues,
      pacConfiguration: {
        provider: period.company.pacProvider,
        mode: period.company.pacMode,
      },
    };
  }

  /**
   * Obtiene el historial de autorizaciones de un período
   */
  async getAuthorizationHistory(
    periodId: string,
  ): Promise<AuthorizationHistory[]> {
    const authorizations = await this.prisma.stampingAuthorization.findMany({
      where: { periodId },
      orderBy: { authorizedAt: 'desc' },
    });

    return authorizations.map((auth: any) => ({
      id: auth.id,
      periodId: auth.periodId,
      authorizedBy: auth.authorizedBy,
      authorizedAt: auth.authorizedAt,
      isActive: auth.isActive,
      revokedAt: auth.revokedAt,
      revokedBy: auth.revokedBy,
      revokeReason: auth.revokeReason,
      details: auth.details as Record<string, any>,
    }));
  }

  /**
   * Verifica si un usuario puede autorizar timbrado
   */
  async canUserAuthorize(
    userId: string,
    periodId: string,
  ): Promise<UserAuthorizationCheck> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${userId} no encontrado`);
    }

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      select: { companyId: true },
    });

    if (!period) {
      throw new NotFoundException(`Período ${periodId} no encontrado`);
    }

    // Verificar permisos del rol
    const permissions = user.role.permissions as string[];
    const hasPermission =
      permissions.includes('PAYROLL_AUTHORIZE_STAMPING') ||
      permissions.includes('PAYROLL_FULL_ACCESS') ||
      permissions.includes('*');

    // Verificar que el usuario pertenece a la empresa
    const belongsToCompany =
      user.companyId === period.companyId || user.role.name === 'admin';

    return {
      userId,
      periodId,
      canAuthorize: hasPermission && belongsToCompany,
      reasons: {
        hasPermission,
        belongsToCompany,
        roleName: user.role.name,
      },
    };
  }
}

// === DTOs e Interfaces ===

export interface AuthorizationDetails {
  notes?: string;
  approvedCalculations?: boolean;
  verifiedEmployeeData?: boolean;
  reviewedExceptions?: boolean;
}

export interface AuthorizationResult {
  authorizationId: string;
  periodId: string;
  authorizedBy: string;
  authorizedAt: Date;
  receiptsCount: number;
  canStartStamping: boolean;
}

export interface RevokeResult {
  periodId: string;
  authorizationId: string;
  revokedBy: string;
  revokedAt: Date;
  reason: string;
}

export interface StampingEligibility {
  periodId: string;
  canStamp: boolean;
  isAuthorized: boolean;
  authorization: {
    id: string;
    authorizedBy: string;
    authorizedAt: Date;
  } | null;
  receiptsStatus: {
    total: number;
    pending: number;
    stamped: number;
    failed: number;
  };
  issues: StampingIssue[];
  pacConfiguration: {
    provider: string | null;
    mode: string | null;
  };
}

export interface StampingIssue {
  code: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  resolution: string;
}

export interface AuthorizationHistory {
  id: string;
  periodId: string;
  authorizedBy: string;
  authorizedAt: Date;
  isActive: boolean;
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
  details: Record<string, any>;
}

export interface UserAuthorizationCheck {
  userId: string;
  periodId: string;
  canAuthorize: boolean;
  reasons: {
    hasPermission: boolean;
    belongsToCompany: boolean;
    roleName: string;
  };
}
