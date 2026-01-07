import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, normalizeRole } from '@/common/decorators';
import { RoleName } from '@/common/constants/roles';

/**
 * PermissionsGuard - Enforces granular permission checking
 *
 * Permission format: "resource:action" or "resource:action:scope"
 * Examples:
 *   - "employees:read" - Can read all employees
 *   - "employees:read:own" - Can only read own employee profile
 *   - "employees:read:company" - Can read employees from own company
 *   - "employees:read:subordinates" - Can read subordinates only
 *   - "payroll:approve" - Can approve payroll
 *   - "incidents:create:subordinates" - Can create incidents for subordinates
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Super admin (SYSTEM_ADMIN role without companyId) has all permissions
    // Handles both legacy 'admin' and new 'SYSTEM_ADMIN' roles
    const userRole = normalizeRole(user.role);
    if (userRole === RoleName.SYSTEM_ADMIN && !user.companyId) {
      return true;
    }

    // Parse user permissions from JWT
    let userPermissions: string[] = [];
    if (typeof user.permissions === 'string') {
      try {
        userPermissions = JSON.parse(user.permissions);
      } catch {
        userPermissions = [];
      }
    } else if (Array.isArray(user.permissions)) {
      userPermissions = user.permissions;
    }

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some((requiredPerm) => {
      // Exact match
      if (userPermissions.includes(requiredPerm)) {
        return true;
      }

      // Check for wildcard permissions (e.g., "employees:*" matches "employees:read")
      const [resource, action] = requiredPerm.split(':');
      if (userPermissions.includes(`${resource}:*`)) {
        return true;
      }

      // Check for global wildcard
      if (userPermissions.includes('*')) {
        return true;
      }

      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    return true;
  }
}
