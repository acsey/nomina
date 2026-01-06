import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface HierarchyNode {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobPosition: string;
  department: string;
  departmentId: string | null;
  email: string | null;
  photoUrl?: string;
  level: number;
  supervisorId: string | null;
  companyId: string;
  subordinates: HierarchyNode[];
}

export interface ApprovalChainMember {
  level: number;
  employeeId: string;
  employeeNumber: string;
  name: string;
  jobPosition: string;
  department?: string;
  email?: string;
  role: 'SUPERVISOR' | 'RH' | 'ADMIN';
  canApprove: boolean;
  isDelegated: boolean;
  delegatedFrom?: string;
}

@Injectable()
export class HierarchyService {
  constructor(private prisma: PrismaService) {}

  // Get the full organizational chart starting from top-level employees
  // CRITICAL: Always filter by companyId to ensure data isolation
  async getOrganizationalChart(companyId: string): Promise<HierarchyNode[]> {
    if (!companyId) {
      throw new BadRequestException('Se requiere el ID de la empresa');
    }

    // Get all employees with no supervisor (top level) for this company only
    const topLevelEmployees = await this.prisma.employee.findMany({
      where: {
        supervisorId: null,
        isActive: true,
        companyId, // CRITICAL: Always filter by company
      },
      include: {
        jobPosition: true,
        department: true,
      },
      orderBy: [{ hierarchyLevel: 'asc' }, { lastName: 'asc' }],
    });

    // Build hierarchy for each top-level employee
    const chart: HierarchyNode[] = [];
    for (const employee of topLevelEmployees) {
      const node = await this.buildHierarchyNode(employee, 0, companyId);
      chart.push(node);
    }

    return chart;
  }

  // Build hierarchy tree for a single employee
  // CRITICAL: companyId is required to ensure we only get subordinates from the same company
  private async buildHierarchyNode(employee: any, level: number, companyId: string): Promise<HierarchyNode> {
    const subordinates = await this.prisma.employee.findMany({
      where: {
        supervisorId: employee.id,
        isActive: true,
        companyId, // CRITICAL: Filter subordinates by company
      },
      include: {
        jobPosition: true,
        department: true,
      },
      orderBy: { lastName: 'asc' },
    });

    const subordinateNodes: HierarchyNode[] = [];
    for (const sub of subordinates) {
      const subNode = await this.buildHierarchyNode(sub, level + 1, companyId);
      subordinateNodes.push(subNode);
    }

    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`,
      jobPosition: employee.jobPosition?.name || '',
      department: employee.department?.name || '',
      departmentId: employee.departmentId,
      email: employee.email,
      photoUrl: employee.photoUrl,
      level,
      supervisorId: employee.supervisorId,
      companyId: employee.companyId,
      subordinates: subordinateNodes,
    };
  }

  // Get hierarchy for a specific employee (their supervisors up to the top)
  // Returns the approval chain: Supervisor → RH → Admin
  async getEmployeeHierarchy(employeeId: string): Promise<ApprovalChainMember[]> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        jobPosition: true,
        department: true,
        company: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const chain: ApprovalChainMember[] = [];
    const companyId = employee.companyId;
    let currentEmployee = employee;
    let level = 1;

    // Step 1: Add supervisors up the chain (same company only)
    while (currentEmployee.supervisorId) {
      const supervisor = await this.prisma.employee.findUnique({
        where: { id: currentEmployee.supervisorId },
        include: {
          jobPosition: true,
          department: true,
          delegationsGiven: {
            where: {
              isActive: true,
              startDate: { lte: new Date() },
              OR: [
                { endDate: null },
                { endDate: { gte: new Date() } },
              ],
            },
            include: {
              delegatee: {
                include: { jobPosition: true, department: true },
              },
            },
          },
        },
      });

      // CRITICAL: Only include supervisors from the same company
      if (!supervisor || supervisor.companyId !== companyId) break;

      // Check for active delegation
      const activeDelegation = supervisor.delegationsGiven.find(
        (d) => d.delegationType === 'VACATION' || d.delegationType === 'ALL'
      );

      chain.push({
        level,
        employeeId: supervisor.id,
        employeeNumber: supervisor.employeeNumber,
        name: `${supervisor.firstName} ${supervisor.lastName}`,
        jobPosition: supervisor.jobPosition?.name || '',
        department: supervisor.department?.name,
        email: supervisor.email || undefined,
        role: 'SUPERVISOR',
        canApprove: true,
        isDelegated: false,
      });

      // If there's a delegation, add the delegatee (same company only)
      if (activeDelegation && activeDelegation.delegatee.companyId === companyId) {
        chain.push({
          level,
          employeeId: activeDelegation.delegatee.id,
          employeeNumber: activeDelegation.delegatee.employeeNumber,
          name: `${activeDelegation.delegatee.firstName} ${activeDelegation.delegatee.lastName}`,
          jobPosition: activeDelegation.delegatee.jobPosition?.name || '',
          department: activeDelegation.delegatee.department?.name,
          email: activeDelegation.delegatee.email || undefined,
          role: 'SUPERVISOR',
          canApprove: true,
          isDelegated: true,
          delegatedFrom: `${supervisor.firstName} ${supervisor.lastName}`,
        });
      }

      currentEmployee = supervisor;
      level++;
    }

    // Step 2: Add RH users from the same company
    const rhUsers = await this.prisma.user.findMany({
      where: {
        companyId,
        role: 'rh',
        isActive: true,
      },
      include: {
        employee: {
          include: { jobPosition: true, department: true },
        },
      },
    });

    for (const rhUser of rhUsers) {
      // Avoid duplicates if RH is already in supervisor chain
      if (!chain.some(c => c.employeeId === rhUser.employeeId) && rhUser.employee) {
        chain.push({
          level: level++,
          employeeId: rhUser.employee.id,
          employeeNumber: rhUser.employee.employeeNumber,
          name: `${rhUser.employee.firstName} ${rhUser.employee.lastName}`,
          jobPosition: rhUser.employee.jobPosition?.name || 'Recursos Humanos',
          department: rhUser.employee.department?.name,
          email: rhUser.email,
          role: 'RH',
          canApprove: true,
          isDelegated: false,
        });
      }
    }

    // Step 3: Add Company Admin
    const companyAdmins = await this.prisma.user.findMany({
      where: {
        companyId,
        role: 'company_admin',
        isActive: true,
      },
      include: {
        employee: {
          include: { jobPosition: true, department: true },
        },
      },
    });

    for (const admin of companyAdmins) {
      // Avoid duplicates
      if (!chain.some(c => c.employeeId === admin.employeeId) && admin.employee) {
        chain.push({
          level: level++,
          employeeId: admin.employee.id,
          employeeNumber: admin.employee.employeeNumber,
          name: `${admin.employee.firstName} ${admin.employee.lastName}`,
          jobPosition: admin.employee.jobPosition?.name || 'Administrador',
          department: admin.employee.department?.name,
          email: admin.email,
          role: 'ADMIN',
          canApprove: true,
          isDelegated: false,
        });
      }
    }

    return chain;
  }

  // Get subordinates for an employee (direct reports)
  // CRITICAL: Filter by the employee's company to ensure isolation
  async getSubordinates(employeeId: string): Promise<any[]> {
    // First get the employee to know their company
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const subordinates = await this.prisma.employee.findMany({
      where: {
        supervisorId: employeeId,
        isActive: true,
        companyId: employee.companyId, // CRITICAL: Filter by company
      },
      include: {
        jobPosition: true,
        department: true,
      },
      orderBy: { lastName: 'asc' },
    });

    return subordinates.map((emp) => ({
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`,
      jobPosition: emp.jobPosition?.name || '',
      department: emp.department?.name || '',
      departmentId: emp.departmentId,
      email: emp.email,
      companyId: emp.companyId,
    }));
  }

  // Get all subordinates recursively (entire team)
  // CRITICAL: Uses getSubordinates which already filters by company
  async getAllSubordinates(employeeId: string): Promise<any[]> {
    const result: any[] = [];
    const directReports = await this.getSubordinates(employeeId);

    for (const report of directReports) {
      result.push(report);
      const subReports = await this.getAllSubordinates(report.id);
      result.push(...subReports);
    }

    return result;
  }

  // Set supervisor for an employee
  // CRITICAL: Validates that both employees belong to the same company
  async setSupervisor(employeeId: string, supervisorId: string | null): Promise<any> {
    // Get the employee first
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (supervisorId) {
      // CRITICAL: Validate supervisor belongs to the same company
      const supervisor = await this.prisma.employee.findUnique({
        where: { id: supervisorId },
        select: { companyId: true, hierarchyLevel: true },
      });

      if (!supervisor) {
        throw new NotFoundException('Supervisor no encontrado');
      }

      if (supervisor.companyId !== employee.companyId) {
        throw new ForbiddenException('El supervisor debe pertenecer a la misma empresa');
      }

      // Validate no circular reference
      const isCircular = await this.checkCircularReference(employeeId, supervisorId);
      if (isCircular) {
        throw new BadRequestException('No se puede crear una referencia circular en la jerarquía');
      }
    }

    // Calculate hierarchy level
    let hierarchyLevel = 0;
    if (supervisorId) {
      const supervisor = await this.prisma.employee.findUnique({
        where: { id: supervisorId },
      });
      if (supervisor) {
        hierarchyLevel = supervisor.hierarchyLevel + 1;
      }
    }

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        supervisorId,
        hierarchyLevel,
      },
      include: {
        supervisor: {
          include: { jobPosition: true },
        },
        jobPosition: true,
        department: true,
        company: true,
      },
    });

    // Update hierarchy levels for all subordinates
    await this.updateSubordinateLevels(employeeId, hierarchyLevel);

    return updated;
  }

  // Check for circular reference
  private async checkCircularReference(employeeId: string, potentialSupervisorId: string): Promise<boolean> {
    if (employeeId === potentialSupervisorId) return true;

    let currentId = potentialSupervisorId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) return true;
      if (currentId === employeeId) return true;

      visited.add(currentId);

      const employee = await this.prisma.employee.findUnique({
        where: { id: currentId },
        select: { supervisorId: true },
      });

      if (!employee || !employee.supervisorId) break;
      currentId = employee.supervisorId;
    }

    return false;
  }

  // Update hierarchy levels for subordinates recursively
  private async updateSubordinateLevels(employeeId: string, parentLevel: number): Promise<void> {
    const subordinates = await this.prisma.employee.findMany({
      where: { supervisorId: employeeId },
    });

    for (const sub of subordinates) {
      await this.prisma.employee.update({
        where: { id: sub.id },
        data: { hierarchyLevel: parentLevel + 1 },
      });
      await this.updateSubordinateLevels(sub.id, parentLevel + 1);
    }
  }

  // Create approval delegation
  // CRITICAL: Validates that both employees belong to the same company
  async createDelegation(data: {
    delegatorId: string;
    delegateeId: string;
    delegationType: string;
    startDate: Date;
    endDate?: Date;
    reason?: string;
  }): Promise<any> {
    // Get delegator with company info
    const delegator = await this.prisma.employee.findUnique({
      where: { id: data.delegatorId },
      select: { id: true, companyId: true },
    });

    if (!delegator) {
      throw new NotFoundException('Delegador no encontrado');
    }

    // Get delegatee with company info
    const delegatee = await this.prisma.employee.findUnique({
      where: { id: data.delegateeId },
      select: { id: true, companyId: true },
    });

    if (!delegatee) {
      throw new NotFoundException('Delegatario no encontrado');
    }

    // CRITICAL: Validate both belong to the same company
    if (delegator.companyId !== delegatee.companyId) {
      throw new ForbiddenException('Solo puede delegar a empleados de la misma empresa');
    }

    // Check if delegatee is a supervisor of the delegator or RH/Admin
    const isValidDelegatee = await this.isValidDelegatee(data.delegatorId, data.delegateeId, delegator.companyId);
    if (!isValidDelegatee) {
      throw new BadRequestException('Solo puede delegar a un supervisor, RH o administrador de su empresa');
    }

    // Deactivate existing delegations of same type
    await this.prisma.approvalDelegation.updateMany({
      where: {
        delegatorId: data.delegatorId,
        delegationType: data.delegationType as any,
        isActive: true,
      },
      data: { isActive: false },
    });

    return this.prisma.approvalDelegation.create({
      data: {
        delegatorId: data.delegatorId,
        delegateeId: data.delegateeId,
        delegationType: data.delegationType as any,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
      },
      include: {
        delegator: { include: { jobPosition: true, department: true } },
        delegatee: { include: { jobPosition: true, department: true } },
      },
    });
  }

  // Check if delegatee is valid (supervisor in chain, RH, or admin)
  private async isValidDelegatee(delegatorId: string, delegateeId: string, companyId: string): Promise<boolean> {
    // Check if in supervisor chain
    const isInChain = await this.isInHierarchyChain(delegatorId, delegateeId);
    if (isInChain) return true;

    // Check if delegatee is RH or company_admin of the same company
    const delegateeUser = await this.prisma.user.findFirst({
      where: {
        employeeId: delegateeId,
        companyId,
        role: { in: ['rh', 'company_admin'] },
        isActive: true,
      },
    });

    return !!delegateeUser;
  }

  // Check if targetId is in the supervisor chain of employeeId
  // CRITICAL: Also validates company consistency
  private async isInHierarchyChain(employeeId: string, targetId: string): Promise<boolean> {
    // Get employee's company
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true, supervisorId: true },
    });

    if (!employee) return false;

    const companyId = employee.companyId;
    let currentId = employee.supervisorId;

    while (currentId) {
      if (currentId === targetId) return true;

      const current = await this.prisma.employee.findUnique({
        where: { id: currentId },
        select: { supervisorId: true, companyId: true },
      });

      // CRITICAL: Stop if we leave the company
      if (!current || current.companyId !== companyId) return false;

      currentId = current.supervisorId;
    }

    return false;
  }

  // Get active delegations for an employee
  async getDelegations(employeeId: string): Promise<any[]> {
    return this.prisma.approvalDelegation.findMany({
      where: {
        delegatorId: employeeId,
        isActive: true,
      },
      include: {
        delegatee: { include: { jobPosition: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Revoke a delegation
  async revokeDelegation(delegationId: string): Promise<any> {
    return this.prisma.approvalDelegation.update({
      where: { id: delegationId },
      data: { isActive: false },
    });
  }

  // Get who can approve for an employee
  async getApprovers(employeeId: string): Promise<ApprovalChainMember[]> {
    return this.getEmployeeHierarchy(employeeId);
  }

  // Check if an approver can approve for an employee
  // CRITICAL: Validates company consistency
  async canApprove(approverId: string, employeeId: string): Promise<boolean> {
    // Get both employees
    const [approver, employee] = await Promise.all([
      this.prisma.employee.findUnique({
        where: { id: approverId },
        select: { companyId: true },
      }),
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true },
      }),
    ]);

    // Both must exist and belong to the same company
    if (!approver || !employee) return false;
    if (approver.companyId !== employee.companyId) return false;

    // Check if in approval chain
    const approvers = await this.getApprovers(employeeId);
    return approvers.some((a) => a.employeeId === approverId && a.canApprove);
  }

  // Get employees that a user can manage based on their role
  async getManagedEmployees(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user) return [];

    // Super admin can see all
    if (user.role === 'admin') {
      const allEmployees = await this.prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      return allEmployees.map(e => e.id);
    }

    // Company-scoped roles
    if (!user.companyId) return [];

    // company_admin and rh can see all employees of their company
    if (user.role === 'company_admin' || user.role === 'rh') {
      const companyEmployees = await this.prisma.employee.findMany({
        where: {
          companyId: user.companyId,
          isActive: true,
        },
        select: { id: true },
      });
      return companyEmployees.map(e => e.id);
    }

    // manager can see their subordinates
    if (user.role === 'manager' && user.employeeId) {
      const subordinates = await this.getAllSubordinates(user.employeeId);
      return subordinates.map(s => s.id);
    }

    // employee can only see themselves
    return user.employeeId ? [user.employeeId] : [];
  }

  // Validate that a user can access an employee's data
  async validateAccess(userId: string, employeeId: string): Promise<boolean> {
    const managedEmployees = await this.getManagedEmployees(userId);
    return managedEmployees.includes(employeeId);
  }
}
