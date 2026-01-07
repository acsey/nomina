import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { normalizeRole } from '@/common/decorators';
import { RoleName } from '@/common/constants/roles';

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

    // Normalize user role to handle both legacy and new role names
    const userRole = normalizeRole(user.role);

    // Only SYSTEM_ADMIN role without companyId is considered super admin
    // Also accepts legacy 'admin' role for backward compatibility (normalizes to SYSTEM_ADMIN)
    if (userRole !== RoleName.SYSTEM_ADMIN) {
      throw new ForbiddenException('Esta acción requiere permisos de Super Administrador');
    }

    if (user.companyId) {
      throw new ForbiddenException('Solo el Super Administrador del sistema puede acceder a esta configuración');
    }

    return true;
  }
}
