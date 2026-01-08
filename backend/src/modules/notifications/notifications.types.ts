/**
 * Tipos de notificación del sistema
 */
export enum NotificationType {
  // Vacaciones y permisos
  VACATION_REQUESTED = 'VACATION_REQUESTED',
  VACATION_SUPERVISOR_APPROVED = 'VACATION_SUPERVISOR_APPROVED',
  VACATION_APPROVED = 'VACATION_APPROVED',
  VACATION_REJECTED = 'VACATION_REJECTED',

  // Nómina
  PAYROLL_CALCULATED = 'PAYROLL_CALCULATED',
  PAYROLL_APPROVED = 'PAYROLL_APPROVED',
  PAYROLL_PAID = 'PAYROLL_PAID',
  CFDI_STAMPED = 'CFDI_STAMPED',
  CFDI_ERROR = 'CFDI_ERROR',

  // Empleados
  EMPLOYEE_BIRTHDAY = 'EMPLOYEE_BIRTHDAY',
  EMPLOYEE_ANNIVERSARY = 'EMPLOYEE_ANNIVERSARY',
  EMPLOYEE_DOCUMENT_EXPIRING = 'EMPLOYEE_DOCUMENT_EXPIRING',

  // Documentos
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VALIDATED = 'DOCUMENT_VALIDATED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  DOCUMENT_REQUIRED = 'DOCUMENT_REQUIRED',

  // Sistema
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',

  // General
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum NotificationPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface CreateNotificationDto {
  type: NotificationType | string;
  title: string;
  message: string;
  userId: string;
  companyId?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

export interface NotificationWithUser {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  priority: number;
  isRead: boolean;
  userId: string;
  companyId: string | null;
  createdAt: Date;
  readAt: Date | null;
}
