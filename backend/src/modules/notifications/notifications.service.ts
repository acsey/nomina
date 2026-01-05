import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationType,
  NotificationPriority,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear una notificación
   */
  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        userId: data.userId,
        companyId: data.companyId,
        priority: data.priority || NotificationPriority.NORMAL,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Crear múltiples notificaciones (para enviar a varios usuarios)
   */
  async createMany(notifications: CreateNotificationDto[]) {
    return this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        type: n.type,
        title: n.title,
        message: n.message,
        userId: n.userId,
        companyId: n.companyId,
        priority: n.priority || NotificationPriority.NORMAL,
        metadata: n.metadata || {},
      })),
    });
  }

  /**
   * Obtener notificaciones de un usuario
   */
  async findByUser(
    userId: string,
    params?: {
      unreadOnly?: boolean;
      skip?: number;
      take?: number;
      type?: string;
    },
  ) {
    const skip = Number(params?.skip) || 0;
    const take = Number(params?.take) || 20;

    const where: any = { userId };

    if (params?.unreadOnly) {
      where.isRead = false;
    }

    if (params?.type) {
      where.type = params.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: [{ isRead: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        unreadCount,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Obtener conteo de notificaciones no leídas
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /**
   * Marcar una notificación como leída
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Eliminar una notificación
   */
  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Eliminar notificaciones antiguas (para limpieza)
   */
  async deleteOld(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoffDate },
      },
    });

    return { deleted: result.count };
  }

  // =========================================
  // Métodos de conveniencia para crear notificaciones específicas
  // =========================================

  /**
   * Notificar solicitud de vacaciones al supervisor y RH
   */
  async notifyVacationRequest(data: {
    employeeName: string;
    employeeId: string;
    requestId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    supervisorUserId: string;
    rhUserIds: string[];
    companyId: string;
  }) {
    const notifications: CreateNotificationDto[] = [];

    // Notificación al supervisor
    notifications.push({
      type: NotificationType.VACATION_REQUESTED,
      title: 'Nueva solicitud de vacaciones',
      message: `${data.employeeName} ha solicitado ${data.totalDays} días de vacaciones (${data.startDate} - ${data.endDate})`,
      userId: data.supervisorUserId,
      companyId: data.companyId,
      priority: NotificationPriority.HIGH,
      metadata: {
        requestId: data.requestId,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: data.totalDays,
        action: 'PENDING_SUPERVISOR_APPROVAL',
      },
    });

    // Notificación a RH (informativa)
    for (const rhUserId of data.rhUserIds) {
      notifications.push({
        type: NotificationType.VACATION_REQUESTED,
        title: 'Nueva solicitud de vacaciones',
        message: `${data.employeeName} ha solicitado ${data.totalDays} días de vacaciones. Pendiente de aprobación del supervisor.`,
        userId: rhUserId,
        companyId: data.companyId,
        priority: NotificationPriority.NORMAL,
        metadata: {
          requestId: data.requestId,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          startDate: data.startDate,
          endDate: data.endDate,
          totalDays: data.totalDays,
          action: 'INFO_PENDING_SUPERVISOR',
        },
      });
    }

    return this.createMany(notifications);
  }

  /**
   * Notificar aprobación del supervisor (a RH para validación final)
   */
  async notifySupervisorApproval(data: {
    employeeName: string;
    employeeId: string;
    employeeUserId: string;
    requestId: string;
    supervisorName: string;
    rhUserIds: string[];
    companyId: string;
  }) {
    const notifications: CreateNotificationDto[] = [];

    // Notificación al empleado
    notifications.push({
      type: NotificationType.VACATION_SUPERVISOR_APPROVED,
      title: 'Solicitud aprobada por supervisor',
      message: `Tu solicitud de vacaciones ha sido aprobada por ${data.supervisorName}. Pendiente de validación de RH.`,
      userId: data.employeeUserId,
      companyId: data.companyId,
      priority: NotificationPriority.NORMAL,
      metadata: {
        requestId: data.requestId,
        supervisorName: data.supervisorName,
        status: 'SUPERVISOR_APPROVED',
      },
    });

    // Notificación a RH para validación
    for (const rhUserId of data.rhUserIds) {
      notifications.push({
        type: NotificationType.VACATION_SUPERVISOR_APPROVED,
        title: 'Vacaciones pendientes de validación',
        message: `La solicitud de ${data.employeeName} fue aprobada por ${data.supervisorName}. Requiere tu validación.`,
        userId: rhUserId,
        companyId: data.companyId,
        priority: NotificationPriority.HIGH,
        metadata: {
          requestId: data.requestId,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          supervisorName: data.supervisorName,
          action: 'PENDING_RH_VALIDATION',
        },
      });
    }

    return this.createMany(notifications);
  }

  /**
   * Notificar aprobación final de vacaciones
   */
  async notifyVacationApproved(data: {
    employeeName: string;
    employeeUserId: string;
    requestId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    supervisorUserId: string;
    companyId: string;
  }) {
    const notifications: CreateNotificationDto[] = [];

    // Notificación al empleado
    notifications.push({
      type: NotificationType.VACATION_APPROVED,
      title: 'Vacaciones aprobadas',
      message: `Tu solicitud de ${data.totalDays} días de vacaciones (${data.startDate} - ${data.endDate}) ha sido aprobada.`,
      userId: data.employeeUserId,
      companyId: data.companyId,
      priority: NotificationPriority.HIGH,
      metadata: {
        requestId: data.requestId,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: data.totalDays,
        status: 'APPROVED',
      },
    });

    // Notificación al supervisor (informativa)
    notifications.push({
      type: NotificationType.VACATION_APPROVED,
      title: 'Vacaciones aprobadas',
      message: `Las vacaciones de ${data.employeeName} han sido aprobadas por RH.`,
      userId: data.supervisorUserId,
      companyId: data.companyId,
      priority: NotificationPriority.NORMAL,
      metadata: {
        requestId: data.requestId,
        employeeName: data.employeeName,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'APPROVED',
      },
    });

    return this.createMany(notifications);
  }

  /**
   * Notificar rechazo de vacaciones
   */
  async notifyVacationRejected(data: {
    employeeName: string;
    employeeUserId: string;
    requestId: string;
    reason: string;
    rejectedBy: string;
    rejectedStage: 'SUPERVISOR' | 'RH';
    supervisorUserId?: string;
    companyId: string;
  }) {
    const notifications: CreateNotificationDto[] = [];

    // Notificación al empleado
    notifications.push({
      type: NotificationType.VACATION_REJECTED,
      title: 'Solicitud rechazada',
      message: `Tu solicitud de vacaciones fue rechazada por ${data.rejectedBy}. Motivo: ${data.reason}`,
      userId: data.employeeUserId,
      companyId: data.companyId,
      priority: NotificationPriority.HIGH,
      metadata: {
        requestId: data.requestId,
        reason: data.reason,
        rejectedBy: data.rejectedBy,
        rejectedStage: data.rejectedStage,
        status: 'REJECTED',
      },
    });

    // Si fue rechazado por RH, notificar también al supervisor
    if (data.rejectedStage === 'RH' && data.supervisorUserId) {
      notifications.push({
        type: NotificationType.VACATION_REJECTED,
        title: 'Vacaciones rechazadas por RH',
        message: `La solicitud de ${data.employeeName} fue rechazada por RH. Motivo: ${data.reason}`,
        userId: data.supervisorUserId,
        companyId: data.companyId,
        priority: NotificationPriority.NORMAL,
        metadata: {
          requestId: data.requestId,
          employeeName: data.employeeName,
          reason: data.reason,
          rejectedBy: data.rejectedBy,
          status: 'REJECTED',
        },
      });
    }

    return this.createMany(notifications);
  }

  /**
   * Notificar cumpleaños
   */
  async notifyBirthday(data: {
    employeeName: string;
    employeeId: string;
    supervisorUserId: string;
    rhUserIds: string[];
    companyId: string;
  }) {
    const notifications: CreateNotificationDto[] = [];

    // Notificación al supervisor
    notifications.push({
      type: NotificationType.EMPLOYEE_BIRTHDAY,
      title: 'Cumpleaños de empleado',
      message: `Hoy es el cumpleaños de ${data.employeeName}`,
      userId: data.supervisorUserId,
      companyId: data.companyId,
      priority: NotificationPriority.NORMAL,
      metadata: {
        employeeId: data.employeeId,
        employeeName: data.employeeName,
      },
    });

    // Notificación a RH
    for (const rhUserId of data.rhUserIds) {
      notifications.push({
        type: NotificationType.EMPLOYEE_BIRTHDAY,
        title: 'Cumpleaños de empleado',
        message: `Hoy es el cumpleaños de ${data.employeeName}`,
        userId: rhUserId,
        companyId: data.companyId,
        priority: NotificationPriority.NORMAL,
        metadata: {
          employeeId: data.employeeId,
          employeeName: data.employeeName,
        },
      });
    }

    return this.createMany(notifications);
  }

  /**
   * Notificar aniversario laboral
   */
  async notifyWorkAnniversary(data: {
    employeeName: string;
    employeeId: string;
    years: number;
    supervisorUserId: string;
    rhUserIds: string[];
    companyId: string;
  }) {
    const notifications: CreateNotificationDto[] = [];

    // Notificación al supervisor
    notifications.push({
      type: NotificationType.EMPLOYEE_ANNIVERSARY,
      title: 'Aniversario laboral',
      message: `${data.employeeName} cumple ${data.years} año(s) en la empresa`,
      userId: data.supervisorUserId,
      companyId: data.companyId,
      priority: NotificationPriority.NORMAL,
      metadata: {
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        years: data.years,
      },
    });

    // Notificación a RH
    for (const rhUserId of data.rhUserIds) {
      notifications.push({
        type: NotificationType.EMPLOYEE_ANNIVERSARY,
        title: 'Aniversario laboral',
        message: `${data.employeeName} cumple ${data.years} año(s) en la empresa`,
        userId: rhUserId,
        companyId: data.companyId,
        priority: NotificationPriority.NORMAL,
        metadata: {
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          years: data.years,
        },
      });
    }

    return this.createMany(notifications);
  }

  /**
   * Obtener usuarios de RH de una empresa
   */
  async getRHUserIds(companyId: string): Promise<string[]> {
    const rhUsers = await this.prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: {
          name: { in: ['rh', 'company_admin'] },
        },
      },
      select: { id: true },
    });

    return rhUsers.map((u) => u.id);
  }

  /**
   * Obtener el userId del supervisor de un empleado
   */
  async getSupervisorUserId(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        supervisor: {
          select: { email: true },
        },
      },
    });

    if (!employee?.supervisor?.email) {
      return null;
    }

    const supervisorUser = await this.prisma.user.findUnique({
      where: { email: employee.supervisor.email },
      select: { id: true },
    });

    return supervisorUser?.id || null;
  }
}
