import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IncidentCategory, IncidentValueType, IncidentStatus, Prisma } from '@prisma/client';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Helper methods for RBAC =====

  /**
   * Check if an employee belongs to a specific company
   */
  async employeeBelongsToCompany(employeeId: string, companyId: string): Promise<boolean> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    return !!employee;
  }

  /**
   * Get employee record by email
   */
  async getEmployeeByEmail(email: string) {
    return this.prisma.employee.findFirst({
      where: { email },
      select: { id: true, supervisorId: true, companyId: true },
    });
  }

  /**
   * Check if a manager can create incidents for a specific employee
   * (employee must be a direct or indirect subordinate)
   */
  async canManagerCreateIncident(managerEmail: string, employeeId: string): Promise<boolean> {
    // Get the manager's employee record
    const managerEmployee = await this.prisma.employee.findFirst({
      where: { email: managerEmail },
      select: { id: true, companyId: true },
    });

    if (!managerEmployee) {
      return false;
    }

    // Check if manager is head of a department that contains the employee
    const managedDepartments = await this.prisma.department.findMany({
      where: { managerId: managerEmployee.id },
      select: { id: true },
    });

    if (managedDepartments.length > 0) {
      const departmentIds = managedDepartments.map(d => d.id);
      const inDepartment = await this.prisma.employee.findFirst({
        where: {
          id: employeeId,
          departmentId: { in: departmentIds },
        },
      });

      if (inDepartment) {
        return true;
      }
    }

    // Check if the employee is a direct subordinate
    const directSubordinate = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        supervisorId: managerEmployee.id,
      },
    });

    if (directSubordinate) {
      return true;
    }

    // Check for indirect subordinates (up to 5 levels)
    return this.checkIndirectSubordinate(employeeId, managerEmployee.id, 5);
  }

  /**
   * Get IDs of all subordinates for a manager
   */
  async getManagerSubordinateIds(managerEmail: string): Promise<string[]> {
    const managerEmployee = await this.prisma.employee.findFirst({
      where: { email: managerEmail },
      select: { id: true },
    });

    if (!managerEmployee) {
      return [];
    }

    const subordinateIds: string[] = [];

    // Get employees from managed departments
    const managedDepartments = await this.prisma.department.findMany({
      where: { managerId: managerEmployee.id },
      select: { id: true },
    });

    if (managedDepartments.length > 0) {
      const departmentIds = managedDepartments.map(d => d.id);
      const departmentEmployees = await this.prisma.employee.findMany({
        where: {
          departmentId: { in: departmentIds },
          id: { not: managerEmployee.id }, // Exclude self
        },
        select: { id: true },
      });
      subordinateIds.push(...departmentEmployees.map(e => e.id));
    }

    // Get direct subordinates
    const directSubordinates = await this.prisma.employee.findMany({
      where: { supervisorId: managerEmployee.id },
      select: { id: true },
    });

    for (const sub of directSubordinates) {
      if (!subordinateIds.includes(sub.id)) {
        subordinateIds.push(sub.id);
      }
    }

    return subordinateIds;
  }

  /**
   * Get full subordinate data for a manager (for dropdowns)
   */
  async getManagerSubordinates(managerEmail: string) {
    const subordinateIds = await this.getManagerSubordinateIds(managerEmail);

    return this.prisma.employee.findMany({
      where: {
        id: { in: subordinateIds },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        department: {
          select: { name: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });
  }

  private async checkIndirectSubordinate(
    targetEmployeeId: string,
    managerEmployeeId: string,
    maxDepth: number
  ): Promise<boolean> {
    if (maxDepth <= 0) return false;

    const directSubordinates = await this.prisma.employee.findMany({
      where: { supervisorId: managerEmployeeId },
      select: { id: true },
    });

    for (const subordinate of directSubordinates) {
      if (subordinate.id === targetEmployeeId) {
        return true;
      }

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

  // ===== Incident Types =====
  async createIncidentType(data: {
    code: string;
    name: string;
    description?: string;
    category: IncidentCategory;
    affectsPayroll?: boolean;
    isDeduction?: boolean;
    defaultValue?: number;
    valueType?: IncidentValueType;
  }) {
    const existing = await this.prisma.incidentType.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un tipo de incidencia con ese codigo');
    }

    return this.prisma.incidentType.create({
      data: {
        ...data,
        isActive: true,
      },
    });
  }

  async findAllIncidentTypes() {
    return this.prisma.incidentType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findIncidentType(id: string) {
    const type = await this.prisma.incidentType.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException('Tipo de incidencia no encontrado');
    }

    return type;
  }

  async updateIncidentType(id: string, data: Partial<{
    name: string;
    description: string;
    category: IncidentCategory;
    affectsPayroll: boolean;
    isDeduction: boolean;
    defaultValue: number;
    valueType: IncidentValueType;
  }>) {
    await this.findIncidentType(id);

    return this.prisma.incidentType.update({
      where: { id },
      data,
    });
  }

  async deleteIncidentType(id: string) {
    await this.findIncidentType(id);

    return this.prisma.incidentType.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ===== Employee Incidents =====
  async createIncident(data: {
    employeeId: string;
    incidentTypeId: string;
    date: Date | string;
    value: number;
    description?: string;
    documentPath?: string;
  }) {
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;

    return this.prisma.employeeIncident.create({
      data: {
        ...data,
        date,
        status: IncidentStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
    });
  }

  async findAllIncidents(filters?: {
    employeeId?: string;
    incidentTypeId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: IncidentStatus;
    companyId?: string;
    subordinateIds?: string[];
  }) {
    // Build where clause with company and subordinate filters
    const whereClause: Prisma.EmployeeIncidentWhereInput = {
      ...(filters?.employeeId && { employeeId: filters.employeeId }),
      ...(filters?.incidentTypeId && { incidentTypeId: filters.incidentTypeId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate && filters?.endDate && {
        date: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      }),
      // Company filter
      ...(filters?.companyId && {
        employee: {
          companyId: filters.companyId,
        },
      }),
      // Subordinate filter (for managers)
      ...(filters?.subordinateIds && filters.subordinateIds.length > 0 && {
        employeeId: { in: filters.subordinateIds },
      }),
    };

    return this.prisma.employeeIncident.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            companyId: true,
            department: {
              select: { name: true },
            },
          },
        },
        incidentType: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findIncident(id: string) {
    const incident = await this.prisma.employeeIncident.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            department: {
              select: { name: true },
            },
          },
        },
        incidentType: true,
      },
    });

    if (!incident) {
      throw new NotFoundException('Incidencia no encontrada');
    }

    return incident;
  }

  async updateIncident(id: string, data: Partial<{
    date: Date | string;
    value: number;
    description: string;
    documentPath: string;
  }>) {
    await this.findIncident(id);

    const updateData: any = { ...data };
    if (data.date) {
      updateData.date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    }

    return this.prisma.employeeIncident.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
    });
  }

  async approveIncident(id: string, approvedById: string) {
    const incident = await this.findIncident(id);

    if (incident.status !== IncidentStatus.PENDING) {
      throw new BadRequestException('Solo se pueden aprobar incidencias pendientes');
    }

    return this.prisma.employeeIncident.update({
      where: { id },
      data: {
        status: IncidentStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
    });
  }

  async rejectIncident(id: string) {
    const incident = await this.findIncident(id);

    if (incident.status !== IncidentStatus.PENDING) {
      throw new BadRequestException('Solo se pueden rechazar incidencias pendientes');
    }

    return this.prisma.employeeIncident.update({
      where: { id },
      data: {
        status: IncidentStatus.REJECTED,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
    });
  }

  async deleteIncident(id: string) {
    const incident = await this.findIncident(id);

    if (incident.status === IncidentStatus.APPLIED) {
      throw new BadRequestException('No se pueden eliminar incidencias ya aplicadas a nomina');
    }

    return this.prisma.employeeIncident.update({
      where: { id },
      data: {
        status: IncidentStatus.CANCELLED,
      },
    });
  }

  async getEmployeeIncidents(employeeId: string, year?: number) {
    const startDate = year ? new Date(year, 0, 1) : undefined;
    const endDate = year ? new Date(year, 11, 31) : undefined;

    return this.prisma.employeeIncident.findMany({
      where: {
        employeeId,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      include: {
        incidentType: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getPendingIncidentsForPayroll(companyId: string, startDate: Date, endDate: Date) {
    return this.prisma.employeeIncident.findMany({
      where: {
        status: IncidentStatus.APPROVED,
        payrollPeriodId: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
        employee: {
          companyId,
          status: 'ACTIVE',
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
      orderBy: { date: 'asc' },
    });
  }
}
