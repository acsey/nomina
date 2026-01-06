import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import * as dayjs from 'dayjs';

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Ejecutar cada día a las 8:00 AM para enviar alertas de cumpleaños y aniversarios
   */
  @Cron('0 8 * * *', {
    name: 'daily-alerts',
    timeZone: 'America/Mexico_City',
  })
  async handleDailyAlerts() {
    this.logger.log('Ejecutando alertas diarias de cumpleaños y aniversarios...');

    try {
      await this.sendBirthdayAlerts();
      await this.sendAnniversaryAlerts();
      this.logger.log('Alertas diarias completadas');
    } catch (error) {
      this.logger.error('Error ejecutando alertas diarias:', error);
    }
  }

  /**
   * Enviar alertas de cumpleaños para hoy
   */
  async sendBirthdayAlerts() {
    const today = dayjs();
    const month = today.month() + 1; // dayjs months are 0-indexed
    const day = today.date();

    // Obtener empleados que cumplen años hoy
    const employees = await this.prisma.employee.findMany({
      where: {
        isActive: true,
        // Filter by birth month and day
        AND: [
          {
            birthDate: {
              not: null,
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        companyId: true,
        supervisorId: true,
        email: true,
      },
    });

    // Filter employees whose birthday is today
    const birthdayEmployees = employees.filter((emp) => {
      if (!emp.birthDate) return false;
      const birthDate = dayjs(emp.birthDate);
      return birthDate.month() + 1 === month && birthDate.date() === day;
    });

    this.logger.log(`Encontrados ${birthdayEmployees.length} cumpleaños hoy`);

    for (const employee of birthdayEmployees) {
      try {
        // Obtener supervisor userId
        let supervisorUserId: string | null = null;
        if (employee.supervisorId) {
          const supervisor = await this.prisma.employee.findUnique({
            where: { id: employee.supervisorId },
            select: { email: true },
          });
          if (supervisor?.email) {
            const supervisorUser = await this.prisma.user.findUnique({
              where: { email: supervisor.email },
              select: { id: true },
            });
            supervisorUserId = supervisorUser?.id || null;
          }
        }

        // Obtener RH userIds
        const rhUserIds = await this.notificationsService.getRHUserIds(employee.companyId);

        if (supervisorUserId || rhUserIds.length > 0) {
          await this.notificationsService.notifyBirthday({
            employeeName: `${employee.firstName} ${employee.lastName}`,
            employeeId: employee.id,
            birthDate: dayjs(employee.birthDate).format('DD/MM'),
            supervisorUserId: supervisorUserId || '',
            rhUserIds,
            companyId: employee.companyId,
          });

          this.logger.log(`Alerta de cumpleaños enviada para ${employee.firstName} ${employee.lastName}`);
        }
      } catch (error) {
        this.logger.error(`Error enviando alerta de cumpleaños para ${employee.id}:`, error);
      }
    }
  }

  /**
   * Enviar alertas de aniversarios laborales para hoy
   */
  async sendAnniversaryAlerts() {
    const today = dayjs();
    const month = today.month() + 1;
    const day = today.date();

    // Obtener empleados activos
    const employees = await this.prisma.employee.findMany({
      where: {
        isActive: true,
        hireDate: {
          not: null,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hireDate: true,
        companyId: true,
        supervisorId: true,
        email: true,
      },
    });

    // Filter employees whose work anniversary is today
    const anniversaryEmployees = employees.filter((emp) => {
      const hireDate = dayjs(emp.hireDate);
      return hireDate.month() + 1 === month && hireDate.date() === day;
    });

    this.logger.log(`Encontrados ${anniversaryEmployees.length} aniversarios laborales hoy`);

    for (const employee of anniversaryEmployees) {
      try {
        const hireDate = dayjs(employee.hireDate);
        const years = today.diff(hireDate, 'year');

        // Solo alertar si es al menos 1 año
        if (years < 1) continue;

        // Obtener supervisor userId
        let supervisorUserId: string | null = null;
        if (employee.supervisorId) {
          const supervisor = await this.prisma.employee.findUnique({
            where: { id: employee.supervisorId },
            select: { email: true },
          });
          if (supervisor?.email) {
            const supervisorUser = await this.prisma.user.findUnique({
              where: { email: supervisor.email },
              select: { id: true },
            });
            supervisorUserId = supervisorUser?.id || null;
          }
        }

        // Obtener RH userIds
        const rhUserIds = await this.notificationsService.getRHUserIds(employee.companyId);

        if (supervisorUserId || rhUserIds.length > 0) {
          await this.notificationsService.notifyWorkAnniversary({
            employeeName: `${employee.firstName} ${employee.lastName}`,
            employeeId: employee.id,
            years,
            anniversaryDate: today.format('DD/MM/YYYY'),
            supervisorUserId: supervisorUserId || '',
            rhUserIds,
            companyId: employee.companyId,
          });

          this.logger.log(`Alerta de aniversario (${years} años) enviada para ${employee.firstName} ${employee.lastName}`);
        }
      } catch (error) {
        this.logger.error(`Error enviando alerta de aniversario para ${employee.id}:`, error);
      }
    }
  }

  /**
   * Obtener empleados con cumpleaños próximos (para mostrar en dashboard)
   */
  async getUpcomingBirthdays(companyId: string, daysAhead: number = 7) {
    const today = dayjs();
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        isActive: true,
        birthDate: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        department: {
          select: { name: true },
        },
      },
    });

    const upcoming = employees
      .map((emp) => {
        const birthDate = dayjs(emp.birthDate);
        // Create birthday date for this year
        let nextBirthday = birthDate.year(today.year());
        // If birthday has passed this year, use next year
        if (nextBirthday.isBefore(today, 'day')) {
          nextBirthday = nextBirthday.add(1, 'year');
        }
        const daysUntil = nextBirthday.diff(today, 'day');
        return {
          ...emp,
          nextBirthday: nextBirthday.format('YYYY-MM-DD'),
          daysUntil,
          departmentName: emp.department?.name,
        };
      })
      .filter((emp) => emp.daysUntil >= 0 && emp.daysUntil <= daysAhead)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return upcoming;
  }

  /**
   * Obtener empleados con aniversarios laborales próximos
   */
  async getUpcomingAnniversaries(companyId: string, daysAhead: number = 7) {
    const today = dayjs();
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        isActive: true,
        hireDate: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hireDate: true,
        department: {
          select: { name: true },
        },
      },
    });

    const upcoming = employees
      .map((emp) => {
        const hireDate = dayjs(emp.hireDate);
        // Create anniversary date for this year
        let nextAnniversary = hireDate.year(today.year());
        // If anniversary has passed this year, use next year
        if (nextAnniversary.isBefore(today, 'day')) {
          nextAnniversary = nextAnniversary.add(1, 'year');
        }
        const daysUntil = nextAnniversary.diff(today, 'day');
        const yearsAtCompany = nextAnniversary.diff(hireDate, 'year');
        return {
          ...emp,
          nextAnniversary: nextAnniversary.format('YYYY-MM-DD'),
          daysUntil,
          yearsAtCompany,
          departmentName: emp.department?.name,
        };
      })
      .filter((emp) => emp.daysUntil >= 0 && emp.daysUntil <= daysAhead && emp.yearsAtCompany >= 1)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return upcoming;
  }
}
