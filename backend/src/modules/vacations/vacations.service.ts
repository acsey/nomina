import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    startDate: Date;
    endDate: Date;
    reason?: string;
  }) {
    const { employeeId, type, startDate, endDate, reason } = data;

    const totalDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;

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

  async approveRequest(requestId: string, approvedById: string) {
    const request = await this.prisma.vacationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden aprobar solicitudes pendientes');
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
}
