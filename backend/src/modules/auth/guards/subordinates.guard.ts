import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * SubordinatesGuard - Ensures managers can only access/modify their subordinates
 *
 * This guard is used for endpoints where managers should only have access
 * to employees under their supervision.
 *
 * Usage: @UseGuards(JwtAuthGuard, RolesGuard, SubordinatesGuard)
 */
@Injectable()
export class SubordinatesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Super admin, company_admin, and rh can access all employees in their scope
    if (['admin', 'company_admin', 'rh'].includes(user.role)) {
      return true;
    }

    // Manager role needs subordinate validation
    if (user.role === 'manager') {
      const employeeId = request.params.employeeId || request.body?.employeeId;

      if (!employeeId) {
        // If no specific employee is being accessed, we'll filter in the controller
        request.subordinatesOnly = true;
        return true;
      }

      // Get the manager's employee record
      const managerEmployee = await this.prisma.employee.findFirst({
        where: { email: user.email },
        select: { id: true },
      });

      if (!managerEmployee) {
        throw new ForbiddenException('Gerente no tiene perfil de empleado asociado');
      }

      // Check if the target employee is a subordinate of the manager
      const isSubordinate = await this.isSubordinate(employeeId, managerEmployee.id);

      if (!isSubordinate) {
        throw new ForbiddenException('Solo puedes acceder a los datos de tus subordinados');
      }

      return true;
    }

    // Employee role - can only access own data
    if (user.role === 'employee') {
      const employeeId = request.params.employeeId || request.body?.employeeId;

      if (!employeeId) {
        request.ownDataOnly = true;
        return true;
      }

      // Get the user's employee record
      const userEmployee = await this.prisma.employee.findFirst({
        where: { email: user.email },
        select: { id: true },
      });

      if (!userEmployee || userEmployee.id !== employeeId) {
        throw new ForbiddenException('Solo puedes acceder a tus propios datos');
      }

      return true;
    }

    return false;
  }

  /**
   * Check if targetEmployeeId is a subordinate of managerEmployeeId
   * (direct or indirect through hierarchy)
   */
  private async isSubordinate(targetEmployeeId: string, managerEmployeeId: string): Promise<boolean> {
    // Direct subordinate check
    const directSubordinate = await this.prisma.employee.findFirst({
      where: {
        id: targetEmployeeId,
        supervisorId: managerEmployeeId,
      },
    });

    if (directSubordinate) {
      return true;
    }

    // Check if manager is head of a department and target is in that department
    const managedDepartments = await this.prisma.department.findMany({
      where: { managerId: managerEmployeeId },
      select: { id: true },
    });

    if (managedDepartments.length > 0) {
      const departmentIds = managedDepartments.map((d: any) => d.id);
      const inDepartment = await this.prisma.employee.findFirst({
        where: {
          id: targetEmployeeId,
          departmentId: { in: departmentIds },
        },
      });

      if (inDepartment) {
        return true;
      }
    }

    // Recursive check for indirect subordinates (up to 5 levels)
    const indirectSubordinate = await this.checkIndirectSubordinate(targetEmployeeId, managerEmployeeId, 5);

    return indirectSubordinate;
  }

  private async checkIndirectSubordinate(
    targetEmployeeId: string,
    managerEmployeeId: string,
    maxDepth: number
  ): Promise<boolean> {
    if (maxDepth <= 0) return false;

    // Get direct subordinates of manager
    const directSubordinates = await this.prisma.employee.findMany({
      where: { supervisorId: managerEmployeeId },
      select: { id: true },
    });

    for (const subordinate of directSubordinates) {
      if (subordinate.id === targetEmployeeId) {
        return true;
      }

      // Recursively check subordinates of subordinates
      const isIndirect = await this.checkIndirectSubordinate(
        targetEmployeeId,
        subordinate.id,
        maxDepth - 1
      );

      if (isIndirect) {
        return true;
      }
    }

    return false;
  }
}
