import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as dayjs from 'dayjs';

// Type alias for schedule detail
type ScheduleDetailType = {
  id: string;
  dayOfWeek: number;
  isWorkDay: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
};

@Injectable()
export class VacationsService {
  // Tabla de días de vacaciones según LFT México
  private readonly VACATION_TABLE = [
    { years: 1, days: 12 },
    { years: 2, days: 14 },
    { years: 3, days: 16 },
    { years: 4, days: 18 },
    { years: 5, days: 20 },
    { years: 6, days: 22 },
    { years: 10, days: 24 },
    { years: 15, days: 26 },
    { years: 20, days: 28 },
    { years: 25, days: 30 },
    { years: 30, days: 32 },
  ];

  constructor(private readonly prisma: PrismaService) {}

  // ===== Helper methods for RBAC =====

  /**
   * Get employee by email
   */
  async getEmployeeByEmail(email: string) {
    return this.prisma.employee.findFirst({
      where: { email },
      select: { id: true, companyId: true, supervisorId: true },
    });
  }

  /**
   * Check if employee belongs to a company
   */
  async employeeBelongsToCompany(employeeId: string, companyId: string): Promise<boolean> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    return !!employee;
  }

  /**
   * Check if targetEmployeeId is a subordinate of managerEmployeeId
   */
  async isSubordinate(targetEmployeeId: string, managerEmployeeId: string): Promise<boolean> {
    // Check if manager heads a department containing the target
    const managedDepartments = await this.prisma.department.findMany({
      where: { managerId: managerEmployeeId },
      select: { id: true },
    });

    if (managedDepartments.length > 0) {
      const departmentIds = managedDepartments.map((d: { id: string }) => d.id);
      const inDepartment = await this.prisma.employee.findFirst({
        where: {
          id: targetEmployeeId,
          departmentId: { in: departmentIds },
        },
      });
      if (inDepartment) return true;
    }

    // Direct subordinate check
    const directSub = await this.prisma.employee.findFirst({
      where: {
        id: targetEmployeeId,
        supervisorId: managerEmployeeId,
      },
    });
    if (directSub) return true;

    // Check indirect subordinates (up to 5 levels)
    return this.checkIndirectSubordinate(targetEmployeeId, managerEmployeeId, 5);
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

    for (const sub of directSubordinates) {
      if (sub.id === targetEmployeeId) return true;
      const isIndirect = await this.checkIndirectSubordinate(targetEmployeeId, sub.id, maxDepth - 1);
      if (isIndirect) return true;
    }

    return false;
  }

  /**
   * Get request by ID
   */
  async getRequestById(id: string) {
    const request = await this.prisma.vacationRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return request;
  }

  /**
   * Get pending requests for a manager (only subordinates)
   */
  async getPendingRequestsForManager(managerEmployeeId: string, companyId: string) {
    // Get subordinate IDs
    const subordinateIds = await this.getManagerSubordinateIds(managerEmployeeId);

    if (subordinateIds.length === 0) {
      return [];
    }

    return this.prisma.vacationRequest.findMany({
      where: {
        status: 'PENDING',
        employeeId: { in: subordinateIds },
        employee: {
          companyId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get all subordinate IDs for a manager
   */
  private async getManagerSubordinateIds(managerEmployeeId: string): Promise<string[]> {
    const subordinateIds: string[] = [];

    // Get employees from managed departments
    const managedDepartments = await this.prisma.department.findMany({
      where: { managerId: managerEmployeeId },
      select: { id: true },
    });

    if (managedDepartments.length > 0) {
      const departmentIds = managedDepartments.map((d: { id: string }) => d.id);
      const departmentEmployees = await this.prisma.employee.findMany({
        where: {
          departmentId: { in: departmentIds },
          id: { not: managerEmployeeId },
        },
        select: { id: true },
      });
      subordinateIds.push(...departmentEmployees.map((e: { id: string }) => e.id));
    }

    // Get direct subordinates
    const directSubs = await this.prisma.employee.findMany({
      where: { supervisorId: managerEmployeeId },
      select: { id: true },
    });

    for (const sub of directSubs) {
      if (!subordinateIds.includes(sub.id)) {
        subordinateIds.push(sub.id);
      }
    }

    return subordinateIds;
  }

  /**
   * Get leave types that employees can request themselves
   */
  async getRequestableLeaveTypes() {
    return [
      { code: 'VACATION', name: 'Vacaciones', isPaid: true, requiresApproval: true },
      { code: 'PERSONAL', name: 'Permiso Personal (con goce)', isPaid: true, requiresApproval: true },
      { code: 'UNPAID', name: 'Permiso Personal (sin goce)', isPaid: false, requiresApproval: true },
      { code: 'MEDICAL_APPOINTMENT', name: 'Cita Médica', isPaid: true, requiresApproval: true },
      { code: 'GOVERNMENT_PROCEDURE', name: 'Trámite Gubernamental', isPaid: true, requiresApproval: true },
      { code: 'STUDY_PERMIT', name: 'Permiso de Estudios', isPaid: true, requiresApproval: true },
    ];
  }

  async createRequest(data: {
    employeeId: string;
    type: string;
    startDate: Date | string;
    endDate: Date | string;
    reason?: string;
  }) {
    const { employeeId, type, reason } = data;
    // Convert string dates to Date objects
    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate;

    // Calculate work days based on employee's schedule
    const totalDays = await this.calculateWorkDays(employeeId, startDate, endDate);

    // Validar disponibilidad si es vacaciones
    if (type === 'VACATION') {
      const balance = await this.getBalance(employeeId, dayjs().year());
      const available = balance.earnedDays - balance.usedDays - balance.pendingDays;

      if (totalDays > available) {
        throw new BadRequestException(
          `No hay suficientes días disponibles. Disponibles: ${available}`,
        );
      }

      // Actualizar días pendientes
      await this.prisma.vacationBalance.update({
        where: {
          employeeId_year: {
            employeeId,
            year: dayjs().year(),
          },
        },
        data: {
          pendingDays: { increment: totalDays },
        },
      });
    }

    return this.prisma.vacationRequest.create({
      data: {
        employeeId,
        type,
        startDate,
        endDate,
        totalDays,
        reason,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    });
  }

  async approveRequest(requestId: string, approvedById: string, skipHierarchyCheck = false) {
    const request = await this.prisma.vacationRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden aprobar solicitudes pendientes');
    }

    // Check if approver has permission (unless admin/rh)
    if (!skipHierarchyCheck) {
      const canApprove = await this.canApproveRequest(approvedById, request.employeeId);
      if (!canApprove.allowed) {
        throw new ForbiddenException('No tiene permiso para aprobar esta solicitud');
      }
    }

    // Actualizar balance si es vacaciones
    if (request.type === 'VACATION') {
      await this.prisma.vacationBalance.update({
        where: {
          employeeId_year: {
            employeeId: request.employeeId,
            year: dayjs(request.startDate).year(),
          },
        },
        data: {
          usedDays: { increment: request.totalDays },
          pendingDays: { decrement: request.totalDays },
        },
      });
    }

    return this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
    });
  }

  // Check if an employee can approve a request for another employee
  async canApproveRequest(approverId: string, employeeId: string): Promise<{ allowed: boolean; reason: string; delegatedFrom?: string }> {
    // Get the approver's employee record
    // First try to find by employee ID
    let approverEmployee = await this.prisma.employee.findUnique({
      where: { id: approverId },
    });

    // If not found, try to find by user's email
    if (!approverEmployee) {
      const user = await this.prisma.user.findUnique({
        where: { id: approverId },
      });
      if (user?.email) {
        approverEmployee = await this.prisma.employee.findFirst({
          where: { email: user.email },
        });
      }
    }

    if (!approverEmployee) {
      return { allowed: false, reason: 'Approver not found' };
    }

    // Check if approver is direct supervisor
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { supervisor: true },
    });

    if (!employee) {
      return { allowed: false, reason: 'Employee not found' };
    }

    // Direct supervisor can approve
    if (employee.supervisorId === approverEmployee.id) {
      return { allowed: true, reason: 'Direct supervisor' };
    }

    // Check if approver is in the supervisor chain
    let currentSupervisor = employee.supervisor;
    while (currentSupervisor) {
      if (currentSupervisor.id === approverEmployee.id) {
        return { allowed: true, reason: 'In supervisor chain' };
      }
      currentSupervisor = await this.prisma.employee.findUnique({
        where: { id: currentSupervisor.supervisorId || '' },
      });
    }

    // Check for active delegations
    const today = new Date();
    const activeDelegation = await this.prisma.approvalDelegation.findFirst({
      where: {
        delegateeId: approverEmployee.id,
        isActive: true,
        startDate: { lte: today },
        OR: [
          { endDate: null },
          { endDate: { gte: today } },
        ],
        delegationType: {
          in: ['ALL', 'VACATION'],
        },
      },
      include: {
        delegator: true,
      },
    });

    if (activeDelegation) {
      // Check if delegator is in supervisor chain
      currentSupervisor = employee.supervisor;
      while (currentSupervisor) {
        if (currentSupervisor.id === activeDelegation.delegatorId) {
          return {
            allowed: true,
            reason: 'Delegated authority',
            delegatedFrom: `${activeDelegation.delegator.firstName} ${activeDelegation.delegator.lastName}`,
          };
        }
        currentSupervisor = await this.prisma.employee.findUnique({
          where: { id: currentSupervisor.supervisorId || '' },
        });
      }
    }

    return { allowed: false, reason: 'Not authorized' };
  }

  // Get who can approve a request for an employee
  async getApproversForEmployee(employeeId: string): Promise<Array<{ id: string; name: string; reason: string }>> {
    const approvers: Array<{ id: string; name: string; reason: string }> = [];

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        supervisor: true,
      },
    });

    if (!employee) {
      return approvers;
    }

    // Add supervisor chain
    let currentSupervisor = employee.supervisor;
    let level = 1;
    while (currentSupervisor) {
      approvers.push({
        id: currentSupervisor.id,
        name: `${currentSupervisor.firstName} ${currentSupervisor.lastName}`,
        reason: level === 1 ? 'Supervisor directo' : `Nivel ${level} en cadena`,
      });

      currentSupervisor = await this.prisma.employee.findUnique({
        where: { id: currentSupervisor.supervisorId || '' },
      });
      level++;
    }

    // Add delegates
    const today = new Date();
    const supervisorIds = approvers.map(a => a.id);

    const activeDelegations = await this.prisma.approvalDelegation.findMany({
      where: {
        delegatorId: { in: supervisorIds },
        isActive: true,
        startDate: { lte: today },
        OR: [
          { endDate: null },
          { endDate: { gte: today } },
        ],
        delegationType: {
          in: ['ALL', 'VACATION'],
        },
      },
      include: {
        delegator: true,
        delegatee: true,
      },
    });

    for (const delegation of activeDelegations) {
      // Avoid duplicates
      if (!approvers.some(a => a.id === delegation.delegateeId)) {
        approvers.push({
          id: delegation.delegateeId,
          name: `${delegation.delegatee.firstName} ${delegation.delegatee.lastName}`,
          reason: `Delegado por ${delegation.delegator.firstName} ${delegation.delegator.lastName}`,
        });
      }
    }

    return approvers;
  }

  async rejectRequest(requestId: string, reason: string) {
    const request = await this.prisma.vacationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden rechazar solicitudes pendientes');
    }

    // Restaurar días pendientes si es vacaciones
    if (request.type === 'VACATION') {
      await this.prisma.vacationBalance.update({
        where: {
          employeeId_year: {
            employeeId: request.employeeId,
            year: dayjs(request.startDate).year(),
          },
        },
        data: {
          pendingDays: { decrement: request.totalDays },
        },
      });
    }

    return this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
    });
  }

  async getBalance(employeeId: string, year: number) {
    let balance = await this.prisma.vacationBalance.findUnique({
      where: {
        employeeId_year: {
          employeeId,
          year,
        },
      },
    });

    if (!balance) {
      // Calcular días correspondientes
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        throw new NotFoundException('Empleado no encontrado');
      }

      const yearsWorked = dayjs().diff(dayjs(employee.hireDate), 'year');
      const earnedDays = this.calculateVacationDays(yearsWorked);

      balance = await this.prisma.vacationBalance.create({
        data: {
          employeeId,
          year,
          earnedDays,
          usedDays: 0,
          pendingDays: 0,
          expiredDays: 0,
        },
      });
    }

    return balance;
  }

  async getEmployeeRequests(employeeId: string, year?: number) {
    return this.prisma.vacationRequest.findMany({
      where: {
        employeeId,
        ...(year && {
          startDate: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31),
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingRequests(companyId: string) {
    return this.prisma.vacationRequest.findMany({
      where: {
        status: 'PENDING',
        employee: {
          companyId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private calculateVacationDays(yearsWorked: number): number {
    if (yearsWorked < 1) return 0;

    for (let i = this.VACATION_TABLE.length - 1; i >= 0; i--) {
      if (yearsWorked >= this.VACATION_TABLE[i].years) {
        return this.VACATION_TABLE[i].days;
      }
    }

    return 12;
  }

  async getLeaveTypeConfigs() {
    return this.prisma.leaveTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getEmployeeSchedule(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        workSchedule: {
          include: {
            scheduleDetails: {
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return employee.workSchedule;
  }

  async calculateWorkDays(employeeId: string, startDate: Date, endDate: Date): Promise<number> {
    const schedule = await this.getEmployeeSchedule(employeeId);

    // Get work days from schedule, or default to Monday-Friday (1-5)
    let workDays: number[];
    if (schedule && schedule.scheduleDetails.length > 0) {
      workDays = schedule.scheduleDetails
        .filter((d: ScheduleDetailType) => d.isWorkDay)
        .map((d: ScheduleDetailType) => d.dayOfWeek);
    } else {
      // Default: Monday (1) to Friday (5)
      workDays = [1, 2, 3, 4, 5];
    }

    let count = 0;
    let current = dayjs(startDate);
    const end = dayjs(endDate);

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const dayOfWeek = current.day(); // 0 = Sunday, 6 = Saturday
      if (workDays.includes(dayOfWeek)) {
        count++;
      }
      current = current.add(1, 'day');
    }

    return count;
  }

  async previewVacationDays(employeeId: string, startDate: Date, endDate: Date) {
    const workDays = await this.calculateWorkDays(employeeId, startDate, endDate);
    const calendarDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    const schedule = await this.getEmployeeSchedule(employeeId);

    return {
      calendarDays,
      workDays,
      schedule: schedule ? {
        id: schedule.id,
        name: schedule.name,
        description: schedule.description,
        workDaysPerWeek: schedule.scheduleDetails.filter((d: ScheduleDetailType) => d.isWorkDay).length,
        details: schedule.scheduleDetails.map((d: ScheduleDetailType) => ({
          dayOfWeek: d.dayOfWeek,
          dayName: this.getDayName(d.dayOfWeek),
          isWorkDay: d.isWorkDay,
          startTime: d.startTime,
          endTime: d.endTime,
        })),
      } : null,
    };
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    return days[dayOfWeek] || '';
  }
}
