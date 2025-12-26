import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * SuperAdminGuard - Ensures only super admin (admin without companyId) can access
 *
 * This guard is used for system-level configuration that should only be
 * accessible by the super admin who has no company association.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Only admin role without companyId is considered super admin
    if (user.role !== 'admin') {
      throw new ForbiddenException('Esta acción requiere permisos de Super Administrador');
    }

    if (user.companyId) {
      throw new ForbiddenException('Solo el Super Administrador del sistema puede acceder a esta configuración');
    }

    return true;
  }
}
