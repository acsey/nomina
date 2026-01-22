import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nService } from './n8n.service';
import { ChatbotIntent, ChatbotMessageDto } from './dto';

export interface ChatbotResponse {
  message: string;
  intent: ChatbotIntent;
  confidence: number;
  action?: {
    type: string;
    data?: any;
  };
  suggestions?: string[];
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  // Patrones de intención básicos (fallback cuando n8n/IA no está disponible)
  private readonly intentPatterns: Array<{
    intent: ChatbotIntent;
    patterns: RegExp[];
  }> = [
    {
      intent: ChatbotIntent.CHECK_VACATION_BALANCE,
      patterns: [
        /cu[aá]ntos?\s*(d[ií]as?)?\s*(de)?\s*vacacion/i,
        /saldo\s*(de)?\s*vacacion/i,
        /d[ií]as\s*disponibles/i,
        /tengo\s*vacacion/i,
      ],
    },
    {
      intent: ChatbotIntent.REQUEST_VACATION,
      patterns: [
        /solicitar?\s*vacacion/i,
        /pedir\s*vacacion/i,
        /quiero\s*vacacion/i,
        /necesito\s*vacacion/i,
      ],
    },
    {
      intent: ChatbotIntent.REQUEST_PERMISSION,
      patterns: [
        /solicitar?\s*permiso/i,
        /pedir\s*permiso/i,
        /necesito\s*(un\s*)?permiso/i,
      ],
    },
    {
      intent: ChatbotIntent.CHECK_PAYROLL,
      patterns: [
        /mi\s*n[oó]mina/i,
        /recibo\s*(de\s*)?(n[oó]mina|sueldo)/i,
        /cu[aá]nto\s*(me\s*)?pagar?on/i,
        /ver\s*(mi\s*)?n[oó]mina/i,
      ],
    },
    {
      intent: ChatbotIntent.CHECK_IN,
      patterns: [
        /entrada/i,
        /llegada/i,
        /check.?in/i,
        /^1$/,
      ],
    },
    {
      intent: ChatbotIntent.CHECK_OUT,
      patterns: [
        /salida/i,
        /check.?out/i,
        /^4$/,
      ],
    },
    {
      intent: ChatbotIntent.HELP,
      patterns: [
        /ayuda/i,
        /help/i,
        /opciones/i,
        /men[uú]/i,
        /\?$/,
      ],
    },
    {
      intent: ChatbotIntent.GREETING,
      patterns: [
        /^hola/i,
        /^buenos?\s*(d[ií]as?|tardes?|noches?)/i,
        /^hi/i,
        /^hey/i,
      ],
    },
  ];

  constructor(
    private prisma: PrismaService,
    private n8nService: N8nService
  ) {}

  /**
   * Procesa un mensaje del chatbot
   */
  async processMessage(
    companyId: string,
    employeeId: string,
    phoneNumber: string,
    dto: ChatbotMessageDto
  ): Promise<ChatbotResponse> {
    // Obtener o crear sesión
    const session = await this.getOrCreateSession(employeeId, phoneNumber);

    // Guardar mensaje entrante
    await this.saveMessage(session.id, 'INBOUND', dto.message);

    // Intentar procesar con n8n/IA primero
    const n8nConfig = await this.n8nService.getConfig(companyId);

    if (n8nConfig?.chatbotWorkflowId && n8nConfig.isActive) {
      try {
        const aiResponse = await this.processWithN8n(
          companyId,
          session.id,
          dto,
          employeeId,
          phoneNumber
        );

        if (aiResponse) {
          await this.saveMessage(session.id, 'OUTBOUND', aiResponse.message, aiResponse.intent);
          return aiResponse;
        }
      } catch (error: any) {
        this.logger.warn(`n8n processing failed, using fallback: ${error.message}`);
      }
    }

    // Fallback: procesamiento local
    return this.processLocally(session.id, dto, employeeId, companyId);
  }

  /**
   * Procesa el mensaje usando n8n workflow con IA
   */
  private async processWithN8n(
    companyId: string,
    sessionId: string,
    dto: ChatbotMessageDto,
    employeeId: string,
    phoneNumber: string
  ): Promise<ChatbotResponse | null> {
    const result = await this.n8nService.triggerChatbotWorkflow(companyId, {
      sessionId,
      message: dto.message,
      phoneNumber,
      employeeId,
      context: {
        ...dto.context,
        conversationHistory: await this.getConversationHistory(sessionId, 5),
      },
    });

    if (!result) return null;

    return {
      message: result.response || result.message,
      intent: result.intent || ChatbotIntent.UNKNOWN,
      confidence: result.confidence || 0.5,
      action: result.action,
      suggestions: result.suggestions,
    };
  }

  /**
   * Procesamiento local (fallback sin IA)
   */
  private async processLocally(
    sessionId: string,
    dto: ChatbotMessageDto,
    employeeId: string,
    companyId: string
  ): Promise<ChatbotResponse> {
    // Detectar intención
    const detectedIntent = this.detectIntent(dto.message);

    // Generar respuesta basada en la intención
    const response = await this.generateResponse(
      detectedIntent.intent,
      employeeId,
      companyId,
      dto.message
    );

    // Guardar respuesta
    await this.saveMessage(sessionId, 'OUTBOUND', response.message, detectedIntent.intent);

    return {
      ...response,
      confidence: detectedIntent.confidence,
    };
  }

  /**
   * Detecta la intención del mensaje
   */
  private detectIntent(message: string): { intent: ChatbotIntent; confidence: number } {
    const normalizedMessage = message.trim().toLowerCase();

    for (const { intent, patterns } of this.intentPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedMessage)) {
          return { intent, confidence: 0.8 };
        }
      }
    }

    return { intent: ChatbotIntent.UNKNOWN, confidence: 0.1 };
  }

  /**
   * Genera una respuesta basada en la intención
   */
  private async generateResponse(
    intent: ChatbotIntent,
    employeeId: string,
    companyId: string,
    originalMessage: string
  ): Promise<ChatbotResponse> {
    switch (intent) {
      case ChatbotIntent.CHECK_VACATION_BALANCE:
        return this.handleVacationBalanceQuery(employeeId);

      case ChatbotIntent.REQUEST_VACATION:
        return this.handleVacationRequest(employeeId);

      case ChatbotIntent.REQUEST_PERMISSION:
        return this.handlePermissionRequest();

      case ChatbotIntent.CHECK_PAYROLL:
        return this.handlePayrollQuery(employeeId);

      case ChatbotIntent.CHECK_IN:
      case ChatbotIntent.CHECK_OUT:
      case ChatbotIntent.BREAK_START:
      case ChatbotIntent.BREAK_END:
        return this.handleAttendanceAction(intent);

      case ChatbotIntent.HELP:
        return this.handleHelp();

      case ChatbotIntent.GREETING:
        return this.handleGreeting(employeeId);

      default:
        return this.handleUnknown();
    }
  }

  // =============================================
  // Intent Handlers
  // =============================================

  private async handleVacationBalanceQuery(employeeId: string): Promise<ChatbotResponse> {
    try {
      // Buscar saldo de vacaciones
      const balance = await this.prisma.vacationBalance.findFirst({
        where: { employeeId },
        orderBy: { year: 'desc' },
      });

      if (balance) {
        const availableDays = Number(balance.earnedDays) - Number(balance.usedDays) - Number(balance.pendingDays);
        return {
          intent: ChatbotIntent.CHECK_VACATION_BALANCE,
          message: `📊 *Tu saldo de vacaciones:*\n\n` +
            `• Días disponibles: *${availableDays}*\n` +
            `• Días usados: ${balance.usedDays}\n` +
            `• Días pendientes: ${balance.pendingDays}\n\n` +
            `¿Deseas solicitar vacaciones?`,
          confidence: 0.9,
          suggestions: ['Solicitar vacaciones', 'Ver historial', 'Menú principal'],
        };
      }

      return {
        intent: ChatbotIntent.CHECK_VACATION_BALANCE,
        message: `No encontré información de tus vacaciones. ` +
          `Por favor contacta a Recursos Humanos.`,
        confidence: 0.9,
      };
    } catch {
      return {
        intent: ChatbotIntent.CHECK_VACATION_BALANCE,
        message: `Hubo un error consultando tu saldo. Intenta más tarde.`,
        confidence: 0.5,
      };
    }
  }

  private async handleVacationRequest(employeeId: string): Promise<ChatbotResponse> {
    return {
      intent: ChatbotIntent.REQUEST_VACATION,
      message: `📅 *Solicitar Vacaciones*\n\n` +
        `Para solicitar vacaciones, por favor indica:\n\n` +
        `1. Fecha de inicio (ej: 15 de febrero)\n` +
        `2. Fecha de fin (ej: 20 de febrero)\n\n` +
        `O puedes usar el portal web para una experiencia más completa.`,
      confidence: 0.9,
      action: {
        type: 'VACATION_REQUEST_FLOW',
        data: { step: 'START' },
      },
      suggestions: ['Ver saldo', 'Cancelar', 'Ir al portal'],
    };
  }

  private handlePermissionRequest(): ChatbotResponse {
    return {
      intent: ChatbotIntent.REQUEST_PERMISSION,
      message: `📝 *Solicitar Permiso*\n\n` +
        `Tipos de permiso disponibles:\n\n` +
        `1. Personal (con goce de sueldo)\n` +
        `2. Sin goce de sueldo\n` +
        `3. Cita médica\n` +
        `4. Trámite gubernamental\n\n` +
        `¿Qué tipo de permiso necesitas?`,
      confidence: 0.9,
      suggestions: ['Personal', 'Sin goce', 'Cita médica', 'Cancelar'],
    };
  }

  private async handlePayrollQuery(employeeId: string): Promise<ChatbotResponse> {
    try {
      // Buscar último recibo de nómina
      const lastPayroll = await this.prisma.payrollDetail.findFirst({
        where: {
          employeeId,
          status: { in: ['STAMP_OK', 'PAID'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          payrollPeriod: true,
        },
      });

      if (lastPayroll) {
        const periodName = lastPayroll.payrollPeriod.description ||
          `${lastPayroll.payrollPeriod.periodType} ${lastPayroll.payrollPeriod.periodNumber}/${lastPayroll.payrollPeriod.year}`;
        return {
          intent: ChatbotIntent.CHECK_PAYROLL,
          message: `💰 *Último recibo de nómina*\n\n` +
            `Período: ${periodName}\n` +
            `Percepciones: $${Number(lastPayroll.totalPerceptions).toLocaleString()}\n` +
            `Deducciones: $${Number(lastPayroll.totalDeductions).toLocaleString()}\n` +
            `*Neto a pagar: $${Number(lastPayroll.netPay).toLocaleString()}*\n\n` +
            `¿Deseas descargar el PDF?`,
          confidence: 0.9,
          action: {
            type: 'PAYROLL_INFO',
            data: { payrollDetailId: lastPayroll.id },
          },
          suggestions: ['Descargar PDF', 'Ver CFDI', 'Nóminas anteriores'],
        };
      }

      return {
        intent: ChatbotIntent.CHECK_PAYROLL,
        message: `No encontré recibos de nómina. ` +
          `Por favor contacta a Recursos Humanos.`,
        confidence: 0.9,
      };
    } catch {
      return {
        intent: ChatbotIntent.CHECK_PAYROLL,
        message: `Hubo un error consultando tu nómina. Intenta más tarde.`,
        confidence: 0.5,
      };
    }
  }

  private handleAttendanceAction(intent: ChatbotIntent): ChatbotResponse {
    const messages: Record<ChatbotIntent, string> = {
      [ChatbotIntent.CHECK_IN]: `Para registrar tu *entrada*, por favor envía tu ubicación 📍`,
      [ChatbotIntent.CHECK_OUT]: `Para registrar tu *salida*, por favor envía tu ubicación 📍`,
      [ChatbotIntent.BREAK_START]: `Para registrar *salida a comer*, por favor envía tu ubicación 📍`,
      [ChatbotIntent.BREAK_END]: `Para registrar *regreso de comer*, por favor envía tu ubicación 📍`,
    } as any;

    return {
      intent,
      message: messages[intent] || 'Por favor envía tu ubicación',
      confidence: 0.9,
      action: {
        type: 'REQUIRE_LOCATION',
        data: { eventType: intent },
      },
    };
  }

  private handleHelp(): ChatbotResponse {
    return {
      intent: ChatbotIntent.HELP,
      message: `🤖 *Asistente de RRHH*\n\n` +
        `Puedo ayudarte con:\n\n` +
        `📍 *Asistencia*\n` +
        `• "Entrada" - Registrar llegada\n` +
        `• "Salida" - Registrar salida\n\n` +
        `🏖️ *Vacaciones*\n` +
        `• "Días de vacaciones" - Ver saldo\n` +
        `• "Solicitar vacaciones"\n\n` +
        `💰 *Nómina*\n` +
        `• "Mi nómina" - Ver último recibo\n\n` +
        `📝 *Permisos*\n` +
        `• "Solicitar permiso"\n\n` +
        `Escribe lo que necesitas o envía tu ubicación para registrar asistencia.`,
      confidence: 1.0,
      suggestions: ['Entrada', 'Días de vacaciones', 'Mi nómina', 'Solicitar permiso'],
    };
  }

  private async handleGreeting(employeeId: string): Promise<ChatbotResponse> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true },
    });

    const name = employee?.firstName || 'Usuario';
    const hour = new Date().getHours();
    let greeting = 'Hola';

    if (hour < 12) greeting = 'Buenos días';
    else if (hour < 19) greeting = 'Buenas tardes';
    else greeting = 'Buenas noches';

    return {
      intent: ChatbotIntent.GREETING,
      message: `${greeting}, *${name}*! 👋\n\n` +
        `Soy el asistente de RRHH. ¿En qué puedo ayudarte?\n\n` +
        `Escribe "ayuda" para ver las opciones disponibles.`,
      confidence: 1.0,
      suggestions: ['Ayuda', 'Entrada', 'Mi nómina', 'Vacaciones'],
    };
  }

  private handleUnknown(): ChatbotResponse {
    return {
      intent: ChatbotIntent.UNKNOWN,
      message: `🤔 No entendí tu mensaje.\n\n` +
        `Escribe "ayuda" para ver las opciones disponibles, ` +
        `o intenta con palabras clave como:\n` +
        `• "entrada", "salida"\n` +
        `• "vacaciones", "nómina"\n` +
        `• "permiso"`,
      confidence: 0.1,
      suggestions: ['Ayuda', 'Entrada', 'Salida', 'Vacaciones'],
    };
  }

  // =============================================
  // Session Management
  // =============================================

  private async getOrCreateSession(employeeId: string, phoneNumber: string) {
    // Buscar sesión activa
    const employeeWhatsApp = await this.prisma.employeeWhatsApp.findUnique({
      where: { employeeId },
    });

    if (!employeeWhatsApp) {
      throw new Error('Empleado no tiene WhatsApp registrado');
    }

    let session = await this.prisma.whatsAppChatSession.findFirst({
      where: {
        employeeWhatsAppId: employeeWhatsApp.id,
        isActive: true,
      },
    });

    if (!session) {
      session = await this.prisma.whatsAppChatSession.create({
        data: {
          employeeWhatsAppId: employeeWhatsApp.id,
          lastMessageAt: new Date(),
          lastMessageDirection: 'inbound',
        },
      });
    } else {
      await this.prisma.whatsAppChatSession.update({
        where: { id: session.id },
        data: {
          lastMessageAt: new Date(),
          lastMessageDirection: 'inbound',
          messageCount: { increment: 1 },
        },
      });
    }

    return session;
  }

  private async saveMessage(
    sessionId: string,
    direction: 'INBOUND' | 'OUTBOUND',
    content: string,
    intent?: ChatbotIntent
  ) {
    return this.prisma.whatsAppMessage.create({
      data: {
        sessionId,
        direction: direction as any,
        messageType: 'TEXT',
        content,
        intent: intent || undefined,
      },
    });
  }

  private async getConversationHistory(sessionId: string, limit: number) {
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse().map((m) => ({
      role: m.direction === 'INBOUND' ? 'user' : 'assistant',
      content: m.content,
    }));
  }
}
