import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { GeofenceService } from './geofence.service';
import { TwilioWebhookDto, MetaWebhookDto, AttendanceEventType } from './dto';

interface ProcessedMessage {
  phoneNumber: string;
  content: string;
  messageType: 'TEXT' | 'LOCATION' | 'IMAGE' | 'AUDIO';
  location?: { latitude: number; longitude: number };
  mediaUrl?: string;
  rawPayload: any;
}

@Injectable()
export class WhatsAppMessageProcessor {
  private readonly logger = new Logger(WhatsAppMessageProcessor.name);

  // Patrones para detectar intención de checado
  private readonly CHECK_IN_PATTERNS = [
    /^(1|entrada|llegada|check.?in|buenos?\s*d[ií]as?|ya\s*llegu[eé])/i,
  ];

  private readonly BREAK_START_PATTERNS = [
    /^(2|salida.*comer|voy.*comer|a\s*comer|break|almuerzo|comida)/i,
  ];

  private readonly BREAK_END_PATTERNS = [
    /^(3|regreso|volv[ií]|ya\s*regres[eé]|listo)/i,
  ];

  private readonly CHECK_OUT_PATTERNS = [
    /^(4|salida|me\s*voy|hasta\s*ma[ñn]ana|check.?out|ya\s*me\s*voy|fin)/i,
  ];

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private geofenceService: GeofenceService
  ) {}

  // =============================================
  // Twilio Message Processing
  // =============================================

  async processTwilioMessage(payload: TwilioWebhookDto) {
    const processed = this.parseTwilioMessage(payload);

    if (!processed) {
      this.logger.warn('Could not parse Twilio message');
      return;
    }

    return this.processMessage(processed);
  }

  private parseTwilioMessage(payload: TwilioWebhookDto): ProcessedMessage | null {
    if (!payload.From) return null;

    const message: ProcessedMessage = {
      phoneNumber: payload.From,
      content: payload.Body || '',
      messageType: 'TEXT',
      rawPayload: payload,
    };

    // Detectar tipo de mensaje
    if (payload.Latitude && payload.Longitude) {
      message.messageType = 'LOCATION';
      message.location = {
        latitude: parseFloat(payload.Latitude),
        longitude: parseFloat(payload.Longitude),
      };
    } else if (payload.NumMedia && parseInt(payload.NumMedia) > 0) {
      if (payload.MediaContentType0?.startsWith('image/')) {
        message.messageType = 'IMAGE';
        message.mediaUrl = payload.MediaUrl0;
      } else if (payload.MediaContentType0?.startsWith('audio/')) {
        message.messageType = 'AUDIO';
        message.mediaUrl = payload.MediaUrl0;
      }
    }

    return message;
  }

  // =============================================
  // Meta (WhatsApp Business API) Processing
  // =============================================

  async processMetaMessage(payload: MetaWebhookDto) {
    if (!payload.entry || payload.object !== 'whatsapp_business_account') {
      return;
    }

    for (const entry of payload.entry) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages = value.messages || [];

        for (const msg of messages) {
          const processed = this.parseMetaMessage(msg, value.metadata);
          if (processed) {
            await this.processMessage(processed);
          }
        }
      }
    }
  }

  private parseMetaMessage(msg: any, metadata: any): ProcessedMessage | null {
    const message: ProcessedMessage = {
      phoneNumber: `whatsapp:+${msg.from}`,
      content: '',
      messageType: 'TEXT',
      rawPayload: { msg, metadata },
    };

    switch (msg.type) {
      case 'text':
        message.content = msg.text?.body || '';
        message.messageType = 'TEXT';
        break;

      case 'location':
        message.messageType = 'LOCATION';
        message.location = {
          latitude: msg.location?.latitude,
          longitude: msg.location?.longitude,
        };
        break;

      case 'image':
        message.messageType = 'IMAGE';
        message.mediaUrl = msg.image?.id; // Meta usa IDs, necesita llamada adicional para URL
        break;

      case 'audio':
        message.messageType = 'AUDIO';
        message.mediaUrl = msg.audio?.id;
        break;

      default:
        return null;
    }

    return message;
  }

  // =============================================
  // Core Message Processing
  // =============================================

  async processMessage(message: ProcessedMessage) {
    this.logger.log(
      `Processing message from ${message.phoneNumber}: ${message.messageType}`
    );

    // Buscar empleado por número de teléfono
    const employeeWhatsApp = await this.whatsappService.getEmployeeByPhone(
      message.phoneNumber
    );

    if (!employeeWhatsApp) {
      this.logger.warn(`Unknown phone number: ${message.phoneNumber}`);
      // TODO: Enviar mensaje de que el número no está registrado
      return { success: false, reason: 'PHONE_NOT_REGISTERED' };
    }

    if (!employeeWhatsApp.isVerified) {
      this.logger.warn(`Unverified phone: ${message.phoneNumber}`);
      // TODO: Verificar si el mensaje es el código de verificación
      return { success: false, reason: 'PHONE_NOT_VERIFIED' };
    }

    const companyId = employeeWhatsApp.employee.companyId;

    // Determinar el tipo de evento de asistencia
    let eventType: AttendanceEventType | null = null;

    // Si es una ubicación, determinar el tipo por el contexto o el último mensaje
    if (message.messageType === 'LOCATION') {
      eventType = await this.determineEventTypeFromContext(employeeWhatsApp.id);
    } else if (message.messageType === 'TEXT') {
      eventType = this.detectEventTypeFromText(message.content);
    }

    if (!eventType) {
      // Enviar menú de opciones
      await this.sendOptionsMenu(companyId, message.phoneNumber);
      return { success: true, action: 'MENU_SENT' };
    }

    // Registrar el evento de asistencia
    const log = await this.whatsappService.logAttendanceEvent(
      employeeWhatsApp.id,
      eventType,
      {
        latitude: message.location?.latitude,
        longitude: message.location?.longitude,
        photoUrl: message.messageType === 'IMAGE' ? message.mediaUrl : undefined,
        voiceNoteUrl: message.messageType === 'AUDIO' ? message.mediaUrl : undefined,
        whatsappMessageId: message.rawPayload?.MessageSid || message.rawPayload?.msg?.id,
        rawPayload: message.rawPayload,
      }
    );

    // Enviar confirmación
    await this.whatsappService.sendCheckConfirmation(
      companyId,
      message.phoneNumber,
      eventType,
      log.timestamp
    );

    return {
      success: true,
      eventType,
      logId: log.id,
      isInsideGeofence: log.isInsideGeofence,
    };
  }

  private detectEventTypeFromText(text: string): AttendanceEventType | null {
    const normalizedText = text.trim().toLowerCase();

    for (const pattern of this.CHECK_IN_PATTERNS) {
      if (pattern.test(normalizedText)) return AttendanceEventType.CHECK_IN;
    }

    for (const pattern of this.BREAK_START_PATTERNS) {
      if (pattern.test(normalizedText)) return AttendanceEventType.BREAK_START;
    }

    for (const pattern of this.BREAK_END_PATTERNS) {
      if (pattern.test(normalizedText)) return AttendanceEventType.BREAK_END;
    }

    for (const pattern of this.CHECK_OUT_PATTERNS) {
      if (pattern.test(normalizedText)) return AttendanceEventType.CHECK_OUT;
    }

    return null;
  }

  private async determineEventTypeFromContext(
    employeeWhatsAppId: string
  ): Promise<AttendanceEventType> {
    // Obtener el último registro del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastLog = await this.prisma.whatsAppAttendanceLog.findFirst({
      where: {
        employeeWhatsAppId,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastLog) {
      return AttendanceEventType.CHECK_IN;
    }

    // Determinar el siguiente evento lógico
    switch (lastLog.eventType) {
      case 'CHECK_IN':
        return AttendanceEventType.BREAK_START;
      case 'BREAK_START':
        return AttendanceEventType.BREAK_END;
      case 'BREAK_END':
        return AttendanceEventType.CHECK_OUT;
      case 'CHECK_OUT':
        // Ya salió, podría ser una nueva entrada
        return AttendanceEventType.CHECK_IN;
      default:
        return AttendanceEventType.CHECK_IN;
    }
  }

  private async sendOptionsMenu(companyId: string, phoneNumber: string) {
    const menu = `📋 *Opciones de Asistencia*

Envíe el número o palabra clave:

1️⃣ *Entrada* - Registrar llegada
2️⃣ *Salida a comer* - Iniciar break
3️⃣ *Regreso* - Fin de break
4️⃣ *Salida* - Fin de jornada

💡 También puede enviar su ubicación para registrar automáticamente.`;

    await this.whatsappService.sendWhatsAppMessage(companyId, phoneNumber, menu);
  }

  // =============================================
  // n8n Webhook Processing
  // =============================================

  async processN8nWebhook(payload: any) {
    this.logger.log('Processing n8n webhook');

    const action = payload.action;

    switch (action) {
      case 'send_message':
        return this.handleN8nSendMessage(payload);

      case 'check_attendance':
        return this.handleN8nCheckAttendance(payload);

      case 'chatbot_response':
        return this.handleN8nChatbotResponse(payload);

      default:
        this.logger.warn(`Unknown n8n action: ${action}`);
        return { success: false, error: 'Unknown action' };
    }
  }

  private async handleN8nSendMessage(payload: any) {
    const { companyId, phoneNumber, message } = payload;

    if (!companyId || !phoneNumber || !message) {
      return { success: false, error: 'Missing required fields' };
    }

    const result = await this.whatsappService.sendWhatsAppMessage(
      companyId,
      phoneNumber,
      message
    );

    return result;
  }

  private async handleN8nCheckAttendance(payload: any) {
    const { phoneNumber, eventType, latitude, longitude } = payload;

    const employeeWhatsApp = await this.whatsappService.getEmployeeByPhone(phoneNumber);

    if (!employeeWhatsApp) {
      return { success: false, error: 'Employee not found' };
    }

    const log = await this.whatsappService.logAttendanceEvent(
      employeeWhatsApp.id,
      eventType as AttendanceEventType,
      { latitude, longitude }
    );

    return { success: true, logId: log.id };
  }

  private async handleN8nChatbotResponse(payload: any) {
    // Este endpoint se usa cuando n8n procesa un mensaje con IA
    // y quiere enviar una respuesta al usuario
    const { companyId, phoneNumber, response, sessionId, intent } = payload;

    // Guardar el mensaje en el historial
    await this.prisma.whatsAppMessage.create({
      data: {
        sessionId,
        direction: 'OUTBOUND',
        messageType: 'TEXT',
        content: response,
        intent,
        n8nExecutionId: payload.executionId,
        n8nWorkflowId: payload.workflowId,
      },
    });

    // Enviar el mensaje
    const result = await this.whatsappService.sendWhatsAppMessage(
      companyId,
      phoneNumber,
      response
    );

    return result;
  }

  // =============================================
  // Test Message Processing (Development only)
  // =============================================

  async processTestMessage(payload: any) {
    const { phoneNumber, message, location } = payload;

    const processed: ProcessedMessage = {
      phoneNumber: phoneNumber || 'whatsapp:+525512345678',
      content: message || '',
      messageType: location ? 'LOCATION' : 'TEXT',
      location: location,
      rawPayload: payload,
    };

    return this.processMessage(processed);
  }
}
