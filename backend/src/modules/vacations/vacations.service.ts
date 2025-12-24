import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LeaveType, RequestStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

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

  async createRequest(data: {
    employeeId: string;
    type: LeaveType;
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
    const approverEmployee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { id: approverId },
          { userId: approverId },
        ],
      },
    });

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
        .filter(d => d.isWorkDay)
        .map(d => d.dayOfWeek);
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
        workDaysPerWeek: schedule.scheduleDetails.filter(d => d.isWorkDay).length,
        details: schedule.scheduleDetails.map(d => ({
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
