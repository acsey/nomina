import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators';
import { RoleName, ROLE_HIERARCHY } from '@/common/constants/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
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

    const userRole = user.role as RoleName;

    // Check direct match
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    // Check role hierarchy - if user has a higher role that inherits the required role
    const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
    return requiredRoles.some((requiredRole) => inheritedRoles.includes(requiredRole));
  }

  /**
   * Get all effective roles for a user (including inherited)
   */
  static getEffectiveRoles(role: RoleName): RoleName[] {
    const roles = new Set<RoleName>([role]);
    const inherited = ROLE_HIERARCHY[role] || [];
    inherited.forEach((r) => roles.add(r));
    return Array.from(roles);
  }
}
