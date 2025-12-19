import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(employeeId: string) {
    const today = dayjs().startOf('day').toDate();
    const now = new Date();

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (existing?.checkIn) {
      return existing;
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { workSchedule: { include: { scheduleDetails: true } } },
    });

    // Determinar estado (presente o tarde)
    let status: AttendanceStatus = 'PRESENT';
    if (employee?.workSchedule) {
      const dayOfWeek = dayjs().day();
      const scheduleDetail = employee.workSchedule.scheduleDetails.find(
        (d) => d.dayOfWeek === dayOfWeek,
      );

      if (scheduleDetail) {
        const [hours, minutes] = scheduleDetail.startTime.split(':').map(Number);
        const scheduledStart = dayjs().hour(hours).minute(minutes).second(0);

        if (dayjs(now).isAfter(scheduledStart.add(10, 'minute'))) {
          status = 'LATE';
        }
      }
    }

    return this.prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      create: {
        employeeId,
        date: today,
        checkIn: now,
        status,
      },
      update: {
        checkIn: now,
        status,
      },
    });
  }

  async checkOut(employeeId: string) {
    const today = dayjs().startOf('day').toDate();
    const now = new Date();

    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (!record) {
      throw new NotFoundException('No hay registro de entrada para hoy');
    }

    const hoursWorked = record.checkIn
      ? dayjs(now).diff(dayjs(record.checkIn), 'hour', true)
      : 0;

    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOut: now,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
      },
    });
  }

  async getEmployeeAttendance(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getDailyAttendance(companyId: string, date: Date) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        date,
        employee: {
          companyId,
          isActive: true,
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
      orderBy: {
        employee: {
          lastName: 'asc',
        },
      },
    });
  }

  async getAttendanceSummary(companyId: string, startDate: Date, endDate: Date) {
    const records = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        employee: {
          companyId,
        },
      },
      _count: true,
    });

    return records.reduce(
      (acc, curr) => {
        acc[curr.status.toLowerCase()] = curr._count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async markAbsent(employeeId: string, date: Date, notes?: string) {
    return this.prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
      create: {
        employeeId,
        date,
        status: 'ABSENT',
        notes,
      },
      update: {
        status: 'ABSENT',
        notes,
      },
    });
  }
}
