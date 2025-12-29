import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService, CriticalAction } from '@/common/security/audit.service';

/**
 * Decorador para marcar rutas que modifican información fiscal inmutable
 */
export const FISCAL_ENTITY_KEY = 'fiscalEntity';
export const FiscalEntity = (entity: 'cfdi' | 'payrollDetail' | 'payrollPeriod') =>
  Reflect.metadata(FISCAL_ENTITY_KEY, entity);

/**
 * Guard que protege la inmutabilidad de registros fiscales
 *
 * Cumple con: Documento de Requerimientos - Sección 5. Base de Datos
 * - Recibos timbrados son inmutables
 * - Prohibido eliminar información fiscal
 *
 * Y Sección 4. Cálculo de Nómina:
 * - Versionar recibos: ningún recálculo debe sobrescribir información previa
 */
@Injectable()
export class FiscalImmutabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const user = request.user;

    // Solo interceptar DELETE y ciertos PUT/PATCH
    if (!['DELETE', 'PUT', 'PATCH'].includes(method)) {
      return true;
    }

    const fiscalEntity = this.reflector.get<string>(
      FISCAL_ENTITY_KEY,
      context.getHandler(),
    );

    if (!fiscalEntity) {
      return true;
    }

    const entityId = request.params.id;

    switch (fiscalEntity) {
      case 'cfdi':
        return this.checkCfdiImmutability(entityId, method, user?.id);

      case 'payrollDetail':
        return this.checkPayrollDetailImmutability(entityId, method, user?.id);

      case 'payrollPeriod':
        return this.checkPayrollPeriodImmutability(entityId, method, user?.id);

      default:
        return true;
    }
  }

  private async checkCfdiImmutability(
    cfdiId: string,
    method: string,
    userId?: string,
  ): Promise<boolean> {
    const cfdi = await this.prisma.cfdiNomina.findUnique({
      where: { id: cfdiId },
      select: { status: true, uuid: true },
    });

    if (!cfdi) {
      return true; // El controller manejará el 404
    }

    // CFDIs timbrados son inmutables (excepto cancelación vía proceso especial)
    if (cfdi.status === 'STAMPED') {
      if (method === 'DELETE') {
        // Registrar intento de eliminación
        await this.auditService.logFiscalDeleteAttempt(
          userId || 'UNKNOWN',
          'CfdiNomina',
          cfdiId,
          { uuid: cfdi.uuid, attemptedMethod: method },
        );

        throw new ForbiddenException(
          'No se puede eliminar un CFDI timbrado. ' +
          'Los comprobantes fiscales son documentos legales inmutables. ' +
          'Si necesita anular el documento, utilice el proceso de cancelación ante el SAT.'
        );
      }

      // Solo permitir actualizar campos específicos de cancelación
      if (method === 'PATCH' || method === 'PUT') {
        throw new ForbiddenException(
          'No se puede modificar un CFDI timbrado. ' +
          'Los comprobantes fiscales digitales son inmutables una vez timbrados.'
        );
      }
    }

    return true;
  }

  private async checkPayrollDetailImmutability(
    detailId: string,
    method: string,
    userId?: string,
  ): Promise<boolean> {
    const detail = await this.prisma.payrollDetail.findUnique({
      where: { id: detailId },
      select: {
        status: true,
        cfdiNomina: {
          select: { status: true, uuid: true },
        },
      },
    });

    if (!detail) {
      return true;
    }

    // Si tiene CFDI timbrado, es inmutable
    if (detail.cfdiNomina?.status === 'STAMPED') {
      await this.auditService.logFiscalDeleteAttempt(
        userId || 'UNKNOWN',
        'PayrollDetail',
        detailId,
        {
          cfdiUuid: detail.cfdiNomina.uuid,
          attemptedMethod: method,
          reason: 'Detalle de nómina con CFDI timbrado',
        },
      );

      throw new ForbiddenException(
        'No se puede modificar o eliminar un detalle de nómina con CFDI timbrado. ' +
        'La información fiscal debe permanecer inmutable para fines de auditoría SAT.'
      );
    }

    // Si está pagado, también es inmutable
    if (detail.status === 'PAID') {
      await this.auditService.logFiscalDeleteAttempt(
        userId || 'UNKNOWN',
        'PayrollDetail',
        detailId,
        { status: detail.status, attemptedMethod: method },
      );

      throw new ForbiddenException(
        'No se puede modificar o eliminar un detalle de nómina ya pagado. ' +
        'Para correcciones, genere un ajuste en el siguiente período.'
      );
    }

    if (method === 'DELETE') {
      await this.auditService.logCriticalAction({
        userId,
        action: CriticalAction.PAYROLL_DELETE_ATTEMPT,
        entity: 'PayrollDetail',
        entityId: detailId,
        details: { status: detail.status, method },
      });
    }

    return true;
  }

  private async checkPayrollPeriodImmutability(
    periodId: string,
    method: string,
    userId?: string,
  ): Promise<boolean> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      select: {
        status: true,
        _count: {
          select: {
            payrollDetails: {
              where: {
                cfdiNomina: {
                  status: 'STAMPED',
                },
              },
            },
          },
        },
      },
    });

    if (!period) {
      return true;
    }

    // Si tiene CFDIs timbrados, no se puede eliminar
    if (period._count.payrollDetails > 0) {
      if (method === 'DELETE') {
        await this.auditService.logFiscalDeleteAttempt(
          userId || 'UNKNOWN',
          'PayrollPeriod',
          periodId,
          {
            stampedCfdis: period._count.payrollDetails,
            attemptedMethod: method,
          },
        );

        throw new ForbiddenException(
          `No se puede eliminar el período de nómina. ` +
          `Contiene ${period._count.payrollDetails} CFDI(s) timbrado(s). ` +
          `Los comprobantes fiscales deben permanecer en el sistema.`
        );
      }
    }

    // Períodos cerrados son inmutables
    if (period.status === 'CLOSED' || period.status === 'PAID') {
      throw new ForbiddenException(
        `No se puede modificar un período de nómina con estado "${period.status}". ` +
        'Los períodos cerrados o pagados son inmutables para fines de auditoría.'
      );
    }

    return true;
  }
}
