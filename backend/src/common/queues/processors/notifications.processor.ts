import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QUEUE_NAMES } from '../queues.module';
import { NotificationData, NotificationType } from '../services/queue-events.service';

/**
 * Procesador de notificaciones
 *
 * Envía notificaciones a través de diferentes canales:
 * - Base de datos (para UI)
 * - Email (futuro)
 * - Push notifications (futuro)
 * - Webhooks (futuro)
 */
@Processor(QUEUE_NAMES.NOTIFICATIONS, {
  concurrency: 10, // Procesar hasta 10 notificaciones en paralelo
})
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<NotificationData>): Promise<{ success: boolean; notificationId?: string }> {
    const { type, userId, companyId, title, message, metadata, priority } = job.data;

    this.logger.debug(`Procesando notificación: ${type} - ${title}`);

    try {
      // Guardar notificación en base de datos
      const notification = await this.saveNotification({
        type,
        userId,
        companyId,
        title,
        message,
        metadata,
        priority,
      });

      // Aquí se pueden agregar más canales de notificación:
      // - await this.sendEmail(job.data);
      // - await this.sendPushNotification(job.data);
      // - await this.callWebhook(job.data);

      return { success: true, notificationId: notification.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error procesando notificación: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Guarda la notificación en la base de datos
   */
  private async saveNotification(data: NotificationData): Promise<{ id: string }> {
    // Determinar destinatarios
    const recipients = await this.getRecipients(data);

    // Crear notificación para cada destinatario
    const notifications = await Promise.all(
      recipients.map((recipientId) =>
        this.prisma.notification.create({
          data: {
            type: data.type,
            title: data.title,
            message: data.message,
            metadata: data.metadata || {},
            priority: this.mapPriority(data.priority),
            userId: recipientId,
            companyId: data.companyId,
            isRead: false,
          },
        })
      )
    );

    this.logger.debug(`Notificación guardada para ${recipients.length} destinatarios`);

    return notifications[0] || { id: 'no-recipients' };
  }

  /**
   * Obtiene los destinatarios de la notificación
   */
  private async getRecipients(data: NotificationData): Promise<string[]> {
    const recipients: string[] = [];

    // Si hay un usuario específico, agregarlo
    if (data.userId) {
      recipients.push(data.userId);
    }

    // Si hay una compañía, notificar a administradores
    if (data.companyId && this.shouldNotifyAdmins(data.type)) {
      const admins = await this.prisma.user.findMany({
        where: {
          companyId: data.companyId,
          role: { in: ['ADMIN', 'HR_MANAGER', 'PAYROLL_ADMIN'] },
          isActive: true,
        },
        select: { id: true },
      });

      for (const admin of admins) {
        if (!recipients.includes(admin.id)) {
          recipients.push(admin.id);
        }
      }
    }

    return recipients;
  }

  /**
   * Determina si se debe notificar a los administradores
   */
  private shouldNotifyAdmins(type: NotificationType): boolean {
    const adminNotificationTypes = [
      NotificationType.CFDI_STAMP_FAILED,
      NotificationType.CFDI_BATCH_COMPLETED,
      NotificationType.PAYROLL_CALCULATION_COMPLETED,
      NotificationType.PAYROLL_CALCULATION_FAILED,
      NotificationType.SYSTEM_ALERT,
    ];

    return adminNotificationTypes.includes(type);
  }

  /**
   * Mapea la prioridad a un valor numérico para la base de datos
   */
  private mapPriority(priority?: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'low':
        return 3;
      default:
        return 2;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<NotificationData>) {
    this.logger.debug(`Notificación ${job.id} procesada: ${job.data.title}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationData>, error: Error) {
    this.logger.error(`Notificación ${job.id} falló: ${error.message}`);
  }
}
