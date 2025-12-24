import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface HierarchyNode {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobPosition: string;
  department: string;
  email: string | null;
  photoUrl?: string;
  level: number;
  supervisorId: string | null;
  subordinates: HierarchyNode[];
}

export interface ApprovalChainMember {
  level: number;
  employeeId: string;
  employeeNumber: string;
  name: string;
  jobPosition: string;
  canApprove: boolean;
  isDelegated: boolean;
  delegatedFrom?: string;
}

@Injectable()
export class HierarchyService {
  constructor(private prisma: PrismaService) {}

  // Get the full organizational chart starting from top-level employees
  async getOrganizationalChart(companyId?: string): Promise<HierarchyNode[]> {
    // Get all employees with no supervisor (top level)
    const topLevelEmployees = await this.prisma.employee.findMany({
      where: {
        supervisorId: null,
        isActive: true,
        ...(companyId && { companyId }),
      },
      include: {
        jobPosition: true,
        department: true,
      },
      orderBy: { hierarchyLevel: 'asc' },
    });

    // Build hierarchy for each top-level employee
    const chart: HierarchyNode[] = [];
    for (const employee of topLevelEmployees) {
      const node = await this.buildHierarchyNode(employee, 0);
      chart.push(node);
    }

    return chart;
  }

  // Build hierarchy tree for a single employee
  private async buildHierarchyNode(employee: any, level: number): Promise<HierarchyNode> {
    const subordinates = await this.prisma.employee.findMany({
      where: {
        supervisorId: employee.id,
        isActive: true,
      },
      include: {
        jobPosition: true,
        department: true,
      },
      orderBy: { lastName: 'asc' },
    });

    const subordinateNodes: HierarchyNode[] = [];
    for (const sub of subordinates) {
      const subNode = await this.buildHierarchyNode(sub, level + 1);
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
      email: employee.email,
      level,
      supervisorId: employee.supervisorId,
      subordinates: subordinateNodes,
    };
  }

  // Get hierarchy for a specific employee (their supervisors up to the top)
  async getEmployeeHierarchy(employeeId: string): Promise<ApprovalChainMember[]> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        jobPosition: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const chain: ApprovalChainMember[] = [];
    let currentEmployee = employee;
    let level = 1;

    while (currentEmployee.supervisorId) {
      const supervisor = await this.prisma.employee.findUnique({
        where: { id: currentEmployee.supervisorId },
        include: {
          jobPosition: true,
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
                include: { jobPosition: true },
              },
            },
          },
        },
      });

      if (!supervisor) break;

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
        canApprove: true,
        isDelegated: false,
      });

      // If there's a delegation, add the delegatee
      if (activeDelegation) {
        chain.push({
          level,
          employeeId: activeDelegation.delegatee.id,
          employeeNumber: activeDelegation.delegatee.employeeNumber,
          name: `${activeDelegation.delegatee.firstName} ${activeDelegation.delegatee.lastName}`,
          jobPosition: activeDelegation.delegatee.jobPosition?.name || '',
          canApprove: true,
          isDelegated: true,
          delegatedFrom: `${supervisor.firstName} ${supervisor.lastName}`,
        });
      }

      currentEmployee = supervisor;
      level++;
    }

    return chain;
  }

  // Get subordinates for an employee (direct reports)
  async getSubordinates(employeeId: string): Promise<any[]> {
    const subordinates = await this.prisma.employee.findMany({
      where: {
        supervisorId: employeeId,
        isActive: true,
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
      fullName: `${emp.firstName} ${emp.lastName}`,
      jobPosition: emp.jobPosition?.name || '',
      department: emp.department?.name || '',
      email: emp.email,
    }));
  }

  // Get all subordinates recursively (entire team)
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
  async setSupervisor(employeeId: string, supervisorId: string | null): Promise<any> {
    // Validate no circular reference
    if (supervisorId) {
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
  async createDelegation(data: {
    delegatorId: string;
    delegateeId: string;
    delegationType: string;
    startDate: Date;
    endDate?: Date;
    reason?: string;
  }): Promise<any> {
    // Validate delegatee is in the approval chain (supervisor or above)
    const delegator = await this.prisma.employee.findUnique({
      where: { id: data.delegatorId },
    });

    if (!delegator) {
      throw new NotFoundException('Delegador no encontrado');
    }

    // Check if delegatee is a supervisor of the delegator
    const isValidDelegatee = await this.isInHierarchyChain(data.delegatorId, data.delegateeId);
    if (!isValidDelegatee) {
      throw new BadRequestException('Solo puede delegar a un supervisor en su cadena jerárquica');
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
        delegator: { include: { jobPosition: true } },
        delegatee: { include: { jobPosition: true } },
      },
    });
  }

  // Check if targetId is in the supervisor chain of employeeId
  private async isInHierarchyChain(employeeId: string, targetId: string): Promise<boolean> {
    let currentId = employeeId;

    while (currentId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: currentId },
        select: { supervisorId: true },
      });

      if (!employee || !employee.supervisorId) return false;
      if (employee.supervisorId === targetId) return true;

      currentId = employee.supervisorId;
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
  async canApprove(approverId: string, employeeId: string): Promise<boolean> {
    const approvers = await this.getApprovers(employeeId);
    return approvers.some((a) => a.employeeId === approverId && a.canApprove);
  }
}
