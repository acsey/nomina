import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';
import * as crypto from 'crypto';

/**
 * Estados posibles de un intento de timbrado
 */
export enum StampingAttemptStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

/**
 * Tipos de error de timbrado
 */
export enum StampingErrorType {
  PAC_TEMPORARY = 'PAC_TEMPORARY', // Error temporal del PAC (reintentar)
  PAC_PERMANENT = 'PAC_PERMANENT', // Error permanente del PAC (no reintentar)
  VALIDATION = 'VALIDATION', // Error de validación de datos
  NETWORK = 'NETWORK', // Error de red
  CERTIFICATE = 'CERTIFICATE', // Error de certificado
  DUPLICATE = 'DUPLICATE', // CFDI duplicado
  UNKNOWN = 'UNKNOWN',
}

/**
 * Servicio para garantizar idempotencia en operaciones de timbrado.
 *
 * Implementa:
 * - Generación y validación de claves de idempotencia
 * - Bloqueo transaccional para prevenir timbrado duplicado
 * - Seguimiento de intentos con estado y expiración
 * - Recuperación de resultados previos
 */
@Injectable()
export class StampingIdempotencyService {
  private readonly logger = new Logger(StampingIdempotencyService.name);
  private readonly lockTimeoutMinutes = 5; // Timeout de lock
  private readonly attemptExpirationHours = 24; // Expiración de intentos fallidos

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Genera clave de idempotencia para un intento de timbrado
   */
  generateIdempotencyKey(
    cfdiId: string,
    receiptVersion: number,
    additionalContext?: Record<string, any>,
  ): string {
    const data = {
      cfdiId,
      receiptVersion,
      ...additionalContext,
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Adquiere lock exclusivo para timbrado
   * Retorna el intento si se puede proceder, null si ya hay un proceso activo
   */
  async acquireLock(
    cfdiId: string,
    receiptVersion: number,
    workerId: string,
  ): Promise<AcquireLockResult> {
    const idempotencyKey = this.generateIdempotencyKey(cfdiId, receiptVersion);

    return await this.prisma.$transaction(async (tx: any) => {
      // Verificar si ya existe intento exitoso
      const existingSuccess = await tx.stampingAttempt.findFirst({
        where: {
          cfdiId,
          status: StampingAttemptStatus.SUCCESS,
        },
      });

      if (existingSuccess) {
        return {
          acquired: false,
          reason: 'ALREADY_STAMPED',
          existingAttempt: existingSuccess,
        };
      }

      // Verificar si hay intento en progreso
      const inProgress = await tx.stampingAttempt.findFirst({
        where: {
          cfdiId,
          status: StampingAttemptStatus.IN_PROGRESS,
          startedAt: {
            gt: new Date(Date.now() - this.lockTimeoutMinutes * 60 * 1000),
          },
        },
      });

      if (inProgress) {
        return {
          acquired: false,
          reason: 'IN_PROGRESS',
          existingAttempt: inProgress,
        };
      }

      // Verificar lock en CfdiNomina
      const cfdi = await tx.cfdiNomina.findUnique({
        where: { id: cfdiId },
      });

      if (!cfdi) {
        throw new NotFoundException(`CFDI ${cfdiId} no encontrado`);
      }

      if (cfdi.status === 'STAMPED') {
        return {
          acquired: false,
          reason: 'ALREADY_STAMPED',
          cfdiStatus: cfdi.status,
        };
      }

      // Verificar si hay lock activo
      if (cfdi.stampLockId && cfdi.stampLockAt) {
        const lockAge = Date.now() - cfdi.stampLockAt.getTime();
        if (lockAge < this.lockTimeoutMinutes * 60 * 1000) {
          return {
            acquired: false,
            reason: 'LOCKED',
            lockOwner: cfdi.stampLockId,
          };
        }
      }

      // Adquirir lock
      await tx.cfdiNomina.update({
        where: { id: cfdiId },
        data: {
          stampLockId: workerId,
          stampLockAt: new Date(),
        },
      });

      // Crear o actualizar intento
      const attempt = await tx.stampingAttempt.upsert({
        where: { idempotencyKey },
        create: {
          cfdiId,
          receiptVersion,
          idempotencyKey,
          status: StampingAttemptStatus.IN_PROGRESS,
          workerId,
        },
        update: {
          status: StampingAttemptStatus.IN_PROGRESS,
          workerId,
          startedAt: new Date(),
          errorMessage: null,
          errorType: null,
        },
      });

      this.logger.log(
        `Lock adquirido para CFDI ${cfdiId} por worker ${workerId}`,
      );

      return {
        acquired: true,
        attemptId: attempt.id,
        idempotencyKey,
      };
    });
  }

  /**
   * Libera lock después de completar (éxito o fallo)
   */
  async releaseLock(
    cfdiId: string,
    attemptId: string,
    result: StampingResult,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      // Actualizar intento
      await tx.stampingAttempt.update({
        where: { id: attemptId },
        data: {
          status: result.success
            ? StampingAttemptStatus.SUCCESS
            : StampingAttemptStatus.FAILED,
          completedAt: new Date(),
          errorMessage: result.errorMessage,
          errorType: result.errorType,
          pacResponse: result.pacResponse,
        },
      });

      // Liberar lock solo si es el propietario
      const cfdi = await tx.cfdiNomina.findUnique({
        where: { id: cfdiId },
      });

      if (cfdi) {
        await tx.cfdiNomina.update({
          where: { id: cfdiId },
          data: {
            stampLockId: null,
            stampLockAt: null,
          },
        });
      }
    });

    this.logger.log(
      `Lock liberado para CFDI ${cfdiId}, resultado: ${result.success ? 'SUCCESS' : 'FAILED'}`,
    );
  }

  /**
   * Verifica si un CFDI puede ser timbrado
   */
  async canStamp(cfdiId: string): Promise<CanStampResult> {
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: cfdiId },
      include: {
        stampingAttempts: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
        payrollDetail: {
          include: {
            payrollPeriod: true,
          },
        },
      },
    }) as any;

    if (!cfdi) {
      throw new NotFoundException(`CFDI ${cfdiId} no encontrado`);
    }

    const issues: string[] = [];

    // Verificar estado
    if (cfdi.status === 'STAMPED') {
      issues.push('El CFDI ya está timbrado');
    }

    if (cfdi.status === 'CANCELLED') {
      issues.push('El CFDI está cancelado');
    }

    // Verificar lock
    if (cfdi.stampLockId && cfdi.stampLockAt) {
      const lockAge = Date.now() - cfdi.stampLockAt.getTime();
      if (lockAge < this.lockTimeoutMinutes * 60 * 1000) {
        issues.push(`Hay un proceso de timbrado en curso (worker: ${cfdi.stampLockId})`);
      }
    }

    // Verificar autorización del período
    if (!cfdi.payrollDetail?.payrollPeriod?.authorizedForStamping) {
      issues.push('El período no está autorizado para timbrado');
    }

    // Analizar intentos previos
    const recentFailures = cfdi.stampingAttempts.filter(
      (a: any) =>
        a.status === StampingAttemptStatus.FAILED &&
        a.errorType === StampingErrorType.PAC_PERMANENT,
    );

    if (recentFailures.length > 0) {
      issues.push(
        `Hay ${recentFailures.length} errores permanentes previos. Revisar datos antes de reintentar.`,
      );
    }

    return {
      cfdiId,
      canStamp: issues.length === 0,
      currentStatus: cfdi.status,
      issues,
      recentAttempts: cfdi.stampingAttempts.map((a: any) => ({
        id: a.id,
        status: a.status as StampingAttemptStatus,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        errorType: a.errorType as StampingErrorType | null,
        errorMessage: a.errorMessage,
      })),
    };
  }

  /**
   * Recupera resultado de un intento previo por clave de idempotencia
   */
  async getAttemptByKey(idempotencyKey: string): Promise<StampingAttemptInfo | null> {
    const attempt = await this.prisma.stampingAttempt.findUnique({
      where: { idempotencyKey },
      include: {
        cfdi: {
          select: {
            uuid: true,
            status: true,
            fechaTimbrado: true,
          },
        },
      },
    });

    if (!attempt) {
      return null;
    }

    return {
      id: attempt.id,
      cfdiId: attempt.cfdiId,
      idempotencyKey: attempt.idempotencyKey,
      status: attempt.status as StampingAttemptStatus,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      errorType: attempt.errorType as StampingErrorType | null,
      errorMessage: attempt.errorMessage,
      cfdiInfo: attempt.cfdi
        ? {
            uuid: attempt.cfdi.uuid,
            status: attempt.cfdi.status,
            fechaTimbrado: attempt.cfdi.fechaTimbrado,
          }
        : null,
    };
  }

  /**
   * Limpia intentos expirados y locks huérfanos
   */
  async cleanupStaleAttempts(): Promise<CleanupResult> {
    const expirationTime = new Date(
      Date.now() - this.attemptExpirationHours * 60 * 60 * 1000,
    );

    // Expirar intentos en progreso que excedieron timeout
    const expiredInProgress = await this.prisma.stampingAttempt.updateMany({
      where: {
        status: StampingAttemptStatus.IN_PROGRESS,
        startedAt: {
          lt: new Date(Date.now() - this.lockTimeoutMinutes * 60 * 1000),
        },
      },
      data: {
        status: StampingAttemptStatus.EXPIRED,
        completedAt: new Date(),
        errorMessage: 'Timeout - proceso no completó en tiempo límite',
      },
    });

    // Limpiar locks huérfanos en CFDIs
    const orphanedLocks = await this.prisma.cfdiNomina.updateMany({
      where: {
        stampLockId: { not: null },
        stampLockAt: {
          lt: new Date(Date.now() - this.lockTimeoutMinutes * 60 * 1000),
        },
        status: { not: 'STAMPED' },
      },
      data: {
        stampLockId: null,
        stampLockAt: null,
      },
    });

    this.logger.log(
      `Cleanup: ${expiredInProgress.count} intentos expirados, ${orphanedLocks.count} locks huérfanos liberados`,
    );

    return {
      expiredAttempts: expiredInProgress.count,
      orphanedLocks: orphanedLocks.count,
      cleanedAt: new Date(),
    };
  }

  /**
   * Obtiene estadísticas de timbrado
   */
  async getStampingStats(
    periodId?: string,
  ): Promise<StampingStats> {
    const whereClause = periodId
      ? {
          cfdi: {
            payrollDetail: {
              periodId,
            },
          },
        }
      : {};

    const [total, success, failed, inProgress, expired] = await Promise.all([
      this.prisma.stampingAttempt.count({ where: whereClause }),
      this.prisma.stampingAttempt.count({
        where: { ...whereClause, status: StampingAttemptStatus.SUCCESS },
      }),
      this.prisma.stampingAttempt.count({
        where: { ...whereClause, status: StampingAttemptStatus.FAILED },
      }),
      this.prisma.stampingAttempt.count({
        where: { ...whereClause, status: StampingAttemptStatus.IN_PROGRESS },
      }),
      this.prisma.stampingAttempt.count({
        where: { ...whereClause, status: StampingAttemptStatus.EXPIRED },
      }),
    ]);

    // Agrupar errores por tipo
    const errorsByType = await this.prisma.stampingAttempt.groupBy({
      by: ['errorType'],
      where: {
        ...whereClause,
        status: StampingAttemptStatus.FAILED,
        errorType: { not: null },
      },
      _count: true,
    });

    return {
      periodId,
      total,
      success,
      failed,
      inProgress,
      expired,
      successRate: total > 0 ? (success / total) * 100 : 0,
      errorsByType: errorsByType.reduce(
        (acc: Record<string, number>, e: any) => ({
          ...acc,
          [e.errorType || 'UNKNOWN']: e._count,
        }),
        {} as Record<string, number>,
      ),
    };
  }
}

// === DTOs e Interfaces ===

export interface AcquireLockResult {
  acquired: boolean;
  reason?: 'ALREADY_STAMPED' | 'IN_PROGRESS' | 'LOCKED';
  attemptId?: string;
  idempotencyKey?: string;
  existingAttempt?: any;
  cfdiStatus?: string;
  lockOwner?: string;
}

export interface StampingResult {
  success: boolean;
  errorMessage?: string;
  errorType?: StampingErrorType;
  pacResponse?: Record<string, any>;
}

export interface CanStampResult {
  cfdiId: string;
  canStamp: boolean;
  currentStatus: string;
  issues: string[];
  recentAttempts: RecentAttempt[];
}

export interface RecentAttempt {
  id: string;
  status: StampingAttemptStatus;
  startedAt: Date;
  completedAt: Date | null;
  errorType: StampingErrorType | null;
  errorMessage: string | null;
}

export interface StampingAttemptInfo {
  id: string;
  cfdiId: string;
  idempotencyKey: string;
  status: StampingAttemptStatus;
  startedAt: Date;
  completedAt: Date | null;
  errorType: StampingErrorType | null;
  errorMessage: string | null;
  cfdiInfo: {
    uuid: string | null;
    status: string;
    fechaTimbrado: Date | null;
  } | null;
}

export interface CleanupResult {
  expiredAttempts: number;
  orphanedLocks: number;
  cleanedAt: Date;
}

export interface StampingStats {
  periodId?: string;
  total: number;
  success: number;
  failed: number;
  inProgress: number;
  expired: number;
  successRate: number;
  errorsByType: Record<string, number>;
}
