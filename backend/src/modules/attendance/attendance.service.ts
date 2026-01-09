import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AttendanceStatus } from '@/common/types/prisma-enums';
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
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (employee?.workSchedule) {
      const dayOfWeek = dayjs().day();
      const scheduleDetail = employee.workSchedule.scheduleDetails.find(
        (d: any) => d.dayOfWeek === dayOfWeek,
      );

      if (scheduleDetail) {
        const [hours, minutes] = scheduleDetail.startTime.split(':').map(Number);
        const scheduledStart = dayjs().hour(hours).minute(minutes).second(0);

        if (dayjs(now).isAfter(scheduledStart.add(10, 'minute'))) {
          status = AttendanceStatus.LATE;
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
      (acc: Record<string, number>, curr: any) => {
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

  async breakStart(employeeId: string) {
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

    if (!record.checkIn) {
      throw new NotFoundException('Debe registrar entrada antes de iniciar descanso');
    }

    if (record.breakStart && !record.breakEnd) {
      throw new NotFoundException('Ya hay un descanso en curso');
    }

    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        breakStart: now,
        breakEnd: null, // Reset breakEnd if starting new break
      },
    });
  }

  async breakEnd(employeeId: string) {
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

    if (!record.breakStart) {
      throw new NotFoundException('No hay descanso iniciado');
    }

    if (record.breakEnd) {
      throw new NotFoundException('El descanso ya fue terminado');
    }

    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        breakEnd: now,
      },
    });
  }

  async getTodayRecord(employeeId: string) {
    const today = dayjs().startOf('day').toDate();

    return this.prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });
  }

  async getEmployeeWithSchedule(employeeId: string) {
    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        workSchedule: {
          include: {
            scheduleDetails: true,
          },
        },
        department: true,
      },
    });
  }

  async getAllEmployeesToday(companyId: string) {
    const today = dayjs().startOf('day').toDate();

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        department: true,
        workSchedule: {
          include: {
            scheduleDetails: true,
          },
        },
        attendanceRecords: {
          where: {
            date: today,
          },
        },
      },
      orderBy: {
        lastName: 'asc',
      },
    });

    return employees.map((emp: any) => ({
      ...emp,
      todayAttendance: emp.attendanceRecords[0] || null,
    }));
  }

  async updateAttendanceRecord(
    recordId: string,
    data: {
      checkIn?: Date;
      checkOut?: Date;
      breakStart?: Date;
      breakEnd?: Date;
      notes?: string;
      status?: AttendanceStatus;
    },
  ) {
    return this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data,
    });
  }

  /**
   * Get detailed attendance report for date range
   */
  async getAttendanceReport(
    companyId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    employeeId?: string,
  ) {
    const whereEmployee: any = {
      companyId,
      isActive: true,
    };

    if (departmentId) {
      whereEmployee.departmentId = departmentId;
    }

    if (employeeId) {
      whereEmployee.id = employeeId;
    }

    // Get all employees with their attendance in the date range
    const employees = await this.prisma.employee.findMany({
      where: whereEmployee,
      include: {
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, name: true } },
        workSchedule: {
          include: {
            scheduleDetails: true,
          },
        },
        attendanceRecords: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: [
        { department: { name: 'asc' } },
        { lastName: 'asc' },
      ],
    });

    // Calculate working days in range (excluding weekends for simplicity)
    const totalDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;

    // Process each employee
    const employeeReports = employees.map((emp: any) => {
      const records = emp.attendanceRecords;
      const stats = {
        totalDays,
        daysPresent: records.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length,
        daysLate: records.filter((r: any) => r.status === 'LATE').length,
        daysAbsent: records.filter((r: any) => r.status === 'ABSENT').length,
        daysVacation: records.filter((r: any) => r.status === 'VACATION').length,
        daysSickLeave: records.filter((r: any) => r.status === 'SICK_LEAVE').length,
        totalHoursWorked: records.reduce((sum: number, r: any) => sum + (r.hoursWorked || 0), 0),
        noRecord: totalDays - records.length,
      };

      return {
        employee: {
          id: emp.id,
          employeeNumber: emp.employeeNumber,
          firstName: emp.firstName,
          lastName: emp.lastName,
          department: emp.department?.name || null,
          jobPosition: emp.jobPosition?.name || null,
          schedule: emp.workSchedule?.name || null,
        },
        stats,
        records: records.map((r: any) => ({
          date: r.date,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          breakStart: r.breakStart,
          breakEnd: r.breakEnd,
          status: r.status,
          hoursWorked: r.hoursWorked,
          notes: r.notes,
        })),
      };
    });

    // Calculate global summary
    const summary = {
      totalEmployees: employees.length,
      periodStart: startDate,
      periodEnd: endDate,
      totalDays,
      totals: {
        present: employeeReports.reduce((sum, e) => sum + e.stats.daysPresent, 0),
        late: employeeReports.reduce((sum, e) => sum + e.stats.daysLate, 0),
        absent: employeeReports.reduce((sum, e) => sum + e.stats.daysAbsent, 0),
        vacation: employeeReports.reduce((sum, e) => sum + e.stats.daysVacation, 0),
        sickLeave: employeeReports.reduce((sum, e) => sum + e.stats.daysSickLeave, 0),
        hoursWorked: employeeReports.reduce((sum, e) => sum + e.stats.totalHoursWorked, 0),
      },
    };

    return {
      summary,
      employees: employeeReports,
    };
  }

  /**
   * Get all employees with their assigned schedules
   */
  async getEmployeeSchedulesReport(companyId: string, departmentId?: string) {
    const where: any = {
      companyId,
      isActive: true,
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, name: true } },
        workSchedule: {
          include: {
            scheduleDetails: {
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        },
      },
      orderBy: [
        { department: { name: 'asc' } },
        { lastName: 'asc' },
      ],
    });

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const employeesWithSchedules = employees.map((emp: any) => ({
      employee: {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department?.name || null,
        jobPosition: emp.jobPosition?.name || null,
      },
      schedule: emp.workSchedule ? {
        id: emp.workSchedule.id,
        name: emp.workSchedule.name,
        description: emp.workSchedule.description,
        isActive: emp.workSchedule.isActive,
        details: emp.workSchedule.scheduleDetails.map((d: any) => ({
          dayOfWeek: d.dayOfWeek,
          dayName: dayNames[d.dayOfWeek],
          isWorkDay: d.isWorkDay,
          startTime: d.startTime,
          endTime: d.endTime,
          breakStart: d.breakStart,
          breakEnd: d.breakEnd,
        })),
        weeklyHours: emp.workSchedule.scheduleDetails
          .filter((d: any) => d.isWorkDay)
          .reduce((sum: number, d: any) => {
            if (!d.startTime || !d.endTime) return sum;
            const start = dayjs(`2000-01-01 ${d.startTime}`);
            const end = dayjs(`2000-01-01 ${d.endTime}`);
            let hours = end.diff(start, 'hour', true);
            // Subtract break time if exists
            if (d.breakStart && d.breakEnd) {
              const breakStart = dayjs(`2000-01-01 ${d.breakStart}`);
              const breakEnd = dayjs(`2000-01-01 ${d.breakEnd}`);
              hours -= breakEnd.diff(breakStart, 'hour', true);
            }
            return sum + hours;
          }, 0),
      } : null,
      hasSchedule: !!emp.workSchedule,
    }));

    // Summary by schedule
    const scheduleGroups: Record<string, number> = {};
    let withoutSchedule = 0;

    employeesWithSchedules.forEach((e) => {
      if (e.schedule) {
        const key = e.schedule.name;
        scheduleGroups[key] = (scheduleGroups[key] || 0) + 1;
      } else {
        withoutSchedule++;
      }
    });

    return {
      summary: {
        totalEmployees: employees.length,
        withSchedule: employees.length - withoutSchedule,
        withoutSchedule,
        bySchedule: Object.entries(scheduleGroups).map(([name, count]) => ({ name, count })),
      },
      employees: employeesWithSchedules,
    };
  }
}
