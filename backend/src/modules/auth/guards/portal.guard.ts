import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { normalizeRole } from '@/common/decorators';
import { RoleName } from '@/common/constants/roles';

/**
 * PortalGuard - Ensures only users with employee access can use portal endpoints
 *
 * This guard checks:
 * 1. User must have an employeeId (linked to an employee record)
 * 2. OR user has EMPLOYEE role
 * 3. OR user is admin accessing for management purposes
 */
@Injectable()
export class PortalGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const userRole = normalizeRole(user.role) as RoleName;

    // Admins can access portal for management purposes
    const adminRoles = [
      RoleName.SYSTEM_ADMIN,
      RoleName.COMPANY_ADMIN,
      RoleName.HR_ADMIN,
      RoleName.PAYROLL_ADMIN,
    ];

    if (adminRoles.includes(userRole)) {
      return true;
    }

    // Regular users must have employeeId to access portal
    if (!user.employeeId) {
      throw new ForbiddenException('Usuario no vinculado a un empleado. No tienes acceso al portal de empleados.');
    }

    return true;
  }
}

/**
 * Decorator to require that the user can only access their own employee data
 * Use this for endpoints where employeeId is passed as a parameter
 */
export const EMPLOYEE_OWNER_KEY = 'employeeOwner';
export const RequireEmployeeOwnership = () => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(EMPLOYEE_OWNER_KEY, true, descriptor.value);
    return descriptor;
  };
};

/**
 * EmployeeOwnershipGuard - Verifies that the user can only access their own data
 * unless they are an admin
 */
@Injectable()
export class EmployeeOwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresOwnership = this.reflector.get<boolean>(
      EMPLOYEE_OWNER_KEY,
      context.getHandler(),
    );

    if (!requiresOwnership) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const userRole = normalizeRole(user.role) as RoleName;

    // Admins can access any employee's data
    const adminRoles = [
      RoleName.SYSTEM_ADMIN,
      RoleName.COMPANY_ADMIN,
      RoleName.HR_ADMIN,
      RoleName.PAYROLL_ADMIN,
      RoleName.MANAGER,
    ];

    if (adminRoles.includes(userRole)) {
      return true;
    }

    // For regular employees, verify they can only access their own data
    const targetEmployeeId = params.employeeId;

    if (targetEmployeeId && targetEmployeeId !== user.employeeId) {
      throw new ForbiddenException('No tienes permiso para acceder a datos de otro empleado');
    }

    return true;
  }
}
