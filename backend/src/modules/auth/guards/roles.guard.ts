import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleType, normalizeRole, LEGACY_ROLE_MAP } from '@/common/decorators';
import { RoleName, ROLE_HIERARCHY } from '@/common/constants/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    // Normalize user role (handle legacy role names from database)
    const userRole = normalizeRole(user.role) as RoleName;

    // Normalize required roles (handle legacy role names in decorators)
    const normalizedRequiredRoles = requiredRoles.map(r => normalizeRole(r));

    // Check direct match (both legacy and new names)
    if (normalizedRequiredRoles.includes(userRole)) {
      return true;
    }

    // Also check if user's original role matches any required role
    if (normalizedRequiredRoles.includes(user.role)) {
      return true;
    }

    // Check role hierarchy - if user has a higher role that inherits the required role
    const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
    if (inheritedRoles.length > 0) {
      return normalizedRequiredRoles.some((requiredRole) =>
        inheritedRoles.includes(requiredRole as RoleName)
      );
    }

    return false;
  }

  /**
   * Get all effective roles for a user (including inherited)
   */
  static getEffectiveRoles(role: RoleName | string): RoleName[] {
    const normalizedRole = normalizeRole(role) as RoleName;
    const roles = new Set<RoleName>([normalizedRole]);
    const inherited = ROLE_HIERARCHY[normalizedRole] || [];
    inherited.forEach((r) => roles.add(r));
    return Array.from(roles);
  }
}
