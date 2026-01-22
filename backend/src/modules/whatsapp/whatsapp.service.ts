import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateWhatsAppConfigDto,
  UpdateWhatsAppConfigDto,
  RegisterEmployeeWhatsAppDto,
  AttendanceEventType,
  ManualAttendanceLogDto,
  AttendanceLogQueryDto,
} from './dto';
import { GeofenceService } from './geofence.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private geofenceService: GeofenceService
  ) {}

  // =============================================
  // WhatsApp Config
  // =============================================

  async getConfig(companyId: string) {
    return this.prisma.whatsAppConfig.findUnique({
      where: { companyId },
    });
  }

  async createConfig(companyId: string, dto: CreateWhatsAppConfigDto) {
    const existing = await this.prisma.whatsAppConfig.findUnique({
      where: { companyId },
    });

    if (existing) {
      throw new BadRequestException('La configuración de WhatsApp ya existe para esta empresa');
    }

    return this.prisma.whatsAppConfig.create({
      data: {
        companyId,
        ...dto,
      } as any,
    });
  }

  async updateConfig(companyId: string, dto: UpdateWhatsAppConfigDto) {
    return this.prisma.whatsAppConfig.update({
      where: { companyId },
      data: dto as any,
    });
  }

  // =============================================
  // Employee WhatsApp Registration
  // =============================================

  async registerEmployeeWhatsApp(companyId: string, dto: RegisterEmployeeWhatsAppDto) {
    // Verificar que el empleado pertenece a la empresa
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        companyId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Generar código de verificación de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Normalizar número de teléfono
    const normalizedPhone = this.normalizePhoneNumber(dto.phoneNumber);

    // Crear o actualizar registro
    const employeeWhatsApp = await this.prisma.employeeWhatsApp.upsert({
      where: { employeeId: dto.employeeId },
      update: {
        phoneNumber: normalizedPhone,
        verificationCode,
        isVerified: false,
      },
      create: {
        employeeId: dto.employeeId,
        phoneNumber: normalizedPhone,
        verificationCode,
      },
    });

    // TODO: Enviar código de verificación por WhatsApp
    this.logger.log(`Código de verificación para ${normalizedPhone}: ${verificationCode}`);

    return {
      id: employeeWhatsApp.id,
      phoneNumber: normalizedPhone,
      message: 'Se ha enviado un código de verificación al número de WhatsApp',
    };
  }

  async verifyEmployeeWhatsApp(employeeWhatsAppId: string, code: string) {
    const record = await this.prisma.employeeWhatsApp.findUnique({
      where: { id: employeeWhatsAppId },
    });

    if (!record) {
      throw new NotFoundException('Registro no encontrado');
    }

    if (record.verificationCode !== code) {
      throw new BadRequestException('Código de verificación incorrecto');
    }

    return this.prisma.employeeWhatsApp.update({
      where: { id: employeeWhatsAppId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verificationCode: null,
      },
    });
  }

  async getEmployeeByPhone(phoneNumber: string) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    return this.prisma.employeeWhatsApp.findUnique({
      where: { phoneNumber: normalizedPhone },
      include: {
        employee: {
          include: {
            company: true,
            workSchedule: true,
          },
        },
      },
    });
  }

  async getEmployeeWhatsAppList(companyId: string) {
    return this.prisma.employeeWhatsApp.findMany({
      where: {
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
            email: true,
          },
        },
      },
    });
  }

  // =============================================
  // Attendance Logging
  // =============================================

  async logAttendanceEvent(
    employeeWhatsAppId: string,
    eventType: AttendanceEventType,
    data: {
      latitude?: number;
      longitude?: number;
      locationAccuracy?: number;
      photoUrl?: string;
      voiceNoteUrl?: string;
      voiceTranscription?: string;
      whatsappMessageId?: string;
      rawPayload?: any;
    }
  ) {
    const employeeWhatsApp = await this.prisma.employeeWhatsApp.findUnique({
      where: { id: employeeWhatsAppId },
      include: {
        employee: {
          include: { company: true },
        },
      },
    });

    if (!employeeWhatsApp) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const companyId = employeeWhatsApp.employee.companyId;

    // Validar geocerca si hay ubicación
    let geofenceValidation = null;
    if (data.latitude && data.longitude) {
      geofenceValidation = await this.geofenceService.validateLocation(
        companyId,
        employeeWhatsApp.employee.id,
        data.latitude,
        data.longitude
      );
    }

    // Crear log de asistencia
    const attendanceLog = await this.prisma.whatsAppAttendanceLog.create({
      data: {
        employeeWhatsAppId,
        eventType: eventType as any,
        latitude: data.latitude ? new Prisma.Decimal(data.latitude) : null,
        longitude: data.longitude ? new Prisma.Decimal(data.longitude) : null,
        locationAccuracy: data.locationAccuracy
          ? new Prisma.Decimal(data.locationAccuracy)
          : null,
        geofenceId: geofenceValidation?.geofenceId || null,
        isInsideGeofence: geofenceValidation?.isInside ?? null,
        distanceFromGeofence: geofenceValidation?.distance
          ? new Prisma.Decimal(geofenceValidation.distance)
          : null,
        locationAddress: geofenceValidation?.address || null,
        photoUrl: data.photoUrl,
        voiceNoteUrl: data.voiceNoteUrl,
        voiceTranscription: data.voiceTranscription,
        whatsappMessageId: data.whatsappMessageId,
        rawPayload: data.rawPayload,
        status: this.determineLogStatus(geofenceValidation),
      },
    });

    // Si está dentro de geocerca, sincronizar con AttendanceRecord
    if (!geofenceValidation || geofenceValidation.isInside || geofenceValidation.allowOutside) {
      await this.syncWithAttendanceRecord(attendanceLog.id);
    }

    return attendanceLog;
  }

  async manualAttendanceLog(companyId: string, dto: ManualAttendanceLogDto) {
    // Verificar empleado
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Buscar registro de WhatsApp del empleado
    let employeeWhatsApp = await this.prisma.employeeWhatsApp.findUnique({
      where: { employeeId: dto.employeeId },
    });

    // Si no tiene registro de WhatsApp, crear uno temporal
    if (!employeeWhatsApp) {
      employeeWhatsApp = await this.prisma.employeeWhatsApp.create({
        data: {
          employeeId: dto.employeeId,
          phoneNumber: `manual-${dto.employeeId}`,
          isVerified: false,
        },
      });
    }

    return this.logAttendanceEvent(employeeWhatsApp.id, dto.eventType, {
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  async getAttendanceLogs(companyId: string, query: AttendanceLogQueryDto) {
    const where: any = {
      employeeWhatsApp: {
        employee: {
          companyId,
        },
      },
    };

    if (query.employeeId) {
      where.employeeWhatsApp = {
        ...where.employeeWhatsApp,
        employeeId: query.employeeId,
      };
    }

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate + 'T23:59:59');
      }
    }

    return this.prisma.whatsAppAttendanceLog.findMany({
      where,
      include: {
        employeeWhatsApp: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        geofence: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async approveAttendanceLog(logId: string, adminNotes?: string) {
    const log = await this.prisma.whatsAppAttendanceLog.update({
      where: { id: logId },
      data: {
        status: 'PROCESSED',
        adminNotes,
        processedAt: new Date(),
      },
    });

    // Sincronizar con AttendanceRecord
    await this.syncWithAttendanceRecord(logId);

    return log;
  }

  async rejectAttendanceLog(logId: string, adminNotes: string) {
    return this.prisma.whatsAppAttendanceLog.update({
      where: { id: logId },
      data: {
        status: 'REJECTED',
        adminNotes,
        processedAt: new Date(),
      },
    });
  }

  // =============================================
  // Private Methods
  // =============================================

  private normalizePhoneNumber(phone: string): string {
    // Remover todo excepto números
    let normalized = phone.replace(/\D/g, '');

    // Si empieza con 52 (México), mantenerlo
    // Si no tiene código de país, agregar 52
    if (!normalized.startsWith('52') && normalized.length === 10) {
      normalized = '52' + normalized;
    }

    // Agregar prefijo whatsapp:
    return `whatsapp:+${normalized}`;
  }

  private determineLogStatus(
    geofenceValidation: { isInside: boolean; allowOutside: boolean } | null
  ): string {
    if (!geofenceValidation) {
      return 'PROCESSED'; // Sin validación de geocerca
    }

    if (geofenceValidation.isInside) {
      return 'PROCESSED';
    }

    if (geofenceValidation.allowOutside) {
      return 'PROCESSED'; // Permitido pero con advertencia
    }

    return 'MANUAL_REVIEW'; // Requiere revisión
  }

  private async syncWithAttendanceRecord(logId: string) {
    const log = await this.prisma.whatsAppAttendanceLog.findUnique({
      where: { id: logId },
      include: {
        employeeWhatsApp: {
          include: { employee: true },
        },
      },
    });

    if (!log) return;

    const employeeId = log.employeeWhatsApp.employee.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar o crear registro de asistencia del día
    let attendanceRecord = await this.prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    const updateData: any = {};

    switch (log.eventType) {
      case 'CHECK_IN':
        updateData.checkIn = log.timestamp;
        updateData.status = 'PRESENT';
        break;
      case 'BREAK_START':
        updateData.breakStart = log.timestamp;
        break;
      case 'BREAK_END':
        updateData.breakEnd = log.timestamp;
        break;
      case 'CHECK_OUT':
        updateData.checkOut = log.timestamp;
        break;
    }

    if (attendanceRecord) {
      attendanceRecord = await this.prisma.attendanceRecord.update({
        where: { id: attendanceRecord.id },
        data: updateData,
      });
    } else {
      attendanceRecord = await this.prisma.attendanceRecord.create({
        data: {
          employeeId,
          date: today,
          ...updateData,
        },
      });
    }

    // Actualizar el log con el ID del registro de asistencia
    await this.prisma.whatsAppAttendanceLog.update({
      where: { id: logId },
      data: {
        linkedAttendanceRecordId: attendanceRecord.id,
        processedAt: new Date(),
      },
    });
  }

  // =============================================
  // WhatsApp Message Sending (Twilio)
  // =============================================

  async sendWhatsAppMessage(
    companyId: string,
    to: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = await this.getConfig(companyId);

    if (!config || !config.isActive) {
      return { success: false, error: 'WhatsApp no configurado' };
    }

    // Por ahora solo soportamos Twilio
    if (config.provider === 'TWILIO') {
      return this.sendTwilioMessage(config, to, message);
    }

    return { success: false, error: 'Proveedor no soportado' };
  }

  private async sendTwilioMessage(
    config: any,
    to: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Importar Twilio dinámicamente
      const twilio = await import('twilio');
      const client = twilio.default(config.accountSid, config.authToken);

      const result = await client.messages.create({
        from: config.phoneNumber,
        to: to,
        body: message,
      });

      return { success: true, messageId: result.sid };
    } catch (error: any) {
      this.logger.error(`Error enviando mensaje Twilio: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Mensajes predefinidos
  async sendWelcomeMessage(companyId: string, to: string, employeeName: string) {
    const config = await this.getConfig(companyId);
    const message =
      config?.welcomeMessage ||
      `¡Hola ${employeeName}! 👋\n\nBienvenido al sistema de asistencia por WhatsApp.\n\nOpciones disponibles:\n1️⃣ Entrada\n2️⃣ Salida a comer\n3️⃣ Regreso de comer\n4️⃣ Salida\n\nPuede enviar su ubicación para registrar asistencia.`;

    return this.sendWhatsAppMessage(companyId, to, message);
  }

  async sendCheckConfirmation(
    companyId: string,
    to: string,
    eventType: AttendanceEventType,
    time: Date
  ) {
    const config = await this.getConfig(companyId);
    const timeStr = time.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const messages: Record<AttendanceEventType, string> = {
      CHECK_IN: `✅ Entrada registrada a las ${timeStr}`,
      BREAK_START: `🍽️ Salida a comer registrada a las ${timeStr}`,
      BREAK_END: `✅ Regreso de comer registrado a las ${timeStr}`,
      CHECK_OUT: `👋 Salida registrada a las ${timeStr}. ¡Hasta mañana!`,
    };

    const message = config?.checkInMessage || messages[eventType];
    return this.sendWhatsAppMessage(companyId, to, message);
  }
}
