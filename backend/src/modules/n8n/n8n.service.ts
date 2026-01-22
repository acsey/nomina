import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateN8nConfigDto, UpdateN8nConfigDto, TriggerWorkflowDto } from './dto';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);

  constructor(private prisma: PrismaService) {}

  // =============================================
  // Configuration
  // =============================================

  async getConfig(companyId: string) {
    return this.prisma.n8nConfig.findUnique({
      where: { companyId },
    });
  }

  async createConfig(companyId: string, dto: CreateN8nConfigDto) {
    const existing = await this.prisma.n8nConfig.findUnique({
      where: { companyId },
    });

    if (existing) {
      throw new BadRequestException('La configuración de n8n ya existe');
    }

    return this.prisma.n8nConfig.create({
      data: {
        companyId,
        ...dto,
      },
    });
  }

  async updateConfig(companyId: string, dto: UpdateN8nConfigDto) {
    return this.prisma.n8nConfig.update({
      where: { companyId },
      data: dto,
    });
  }

  async deleteConfig(companyId: string) {
    return this.prisma.n8nConfig.delete({
      where: { companyId },
    });
  }

  // =============================================
  // Health Check
  // =============================================

  async healthCheck(companyId: string) {
    const config = await this.getConfig(companyId);

    if (!config) {
      throw new NotFoundException('Configuración de n8n no encontrada');
    }

    try {
      const response = await fetch(`${config.baseUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': config.apiKey || '',
        },
      });

      const isHealthy = response.ok;

      // Actualizar estado de salud
      await this.prisma.n8nConfig.update({
        where: { companyId },
        data: {
          lastHealthCheck: new Date(),
          healthStatus: isHealthy ? 'healthy' : 'unhealthy',
        },
      });

      return {
        healthy: isHealthy,
        status: response.status,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      await this.prisma.n8nConfig.update({
        where: { companyId },
        data: {
          lastHealthCheck: new Date(),
          healthStatus: 'unhealthy',
        },
      });

      return {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }

  // =============================================
  // Workflow Execution
  // =============================================

  async triggerWorkflow(companyId: string, dto: TriggerWorkflowDto) {
    const config = await this.getConfig(companyId);

    if (!config || !config.isActive) {
      throw new BadRequestException('n8n no está configurado o está desactivado');
    }

    try {
      // Método 1: Trigger via Webhook
      if (config.webhookBaseUrl) {
        return this.triggerViaWebhook(config, dto);
      }

      // Método 2: Trigger via API
      return this.triggerViaApi(config, dto);
    } catch (error: any) {
      this.logger.error(`Error triggering workflow: ${error.message}`);
      throw new BadRequestException(`Error ejecutando workflow: ${error.message}`);
    }
  }

  private async triggerViaWebhook(config: any, dto: TriggerWorkflowDto) {
    const webhookUrl = `${config.webhookBaseUrl}/${dto.workflowId}`;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto.data || {}),
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }

    return response.json();
  }

  private async triggerViaApi(config: any, dto: TriggerWorkflowDto) {
    const apiUrl = `${config.baseUrl}/api/v1/workflows/${dto.workflowId}/execute`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': config.apiKey || '',
      },
      body: JSON.stringify({
        data: dto.data || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  // =============================================
  // Predefined Workflow Triggers
  // =============================================

  async triggerAttendanceWorkflow(
    companyId: string,
    data: {
      employeeId: string;
      eventType: string;
      timestamp: Date;
      location?: { latitude: number; longitude: number };
    }
  ) {
    const config = await this.getConfig(companyId);

    if (!config?.attendanceWorkflowId) {
      this.logger.warn('No attendance workflow configured');
      return null;
    }

    return this.triggerWorkflow(companyId, {
      workflowId: config.attendanceWorkflowId,
      data,
    });
  }

  async triggerChatbotWorkflow(
    companyId: string,
    data: {
      sessionId: string;
      message: string;
      phoneNumber: string;
      employeeId: string;
      context?: any;
    }
  ) {
    const config = await this.getConfig(companyId);

    if (!config?.chatbotWorkflowId) {
      this.logger.warn('No chatbot workflow configured');
      return null;
    }

    return this.triggerWorkflow(companyId, {
      workflowId: config.chatbotWorkflowId,
      data,
    });
  }

  async triggerVacationWorkflow(
    companyId: string,
    data: {
      requestId: string;
      employeeId: string;
      action: 'created' | 'approved' | 'rejected' | 'cancelled';
      details: any;
    }
  ) {
    const config = await this.getConfig(companyId);

    if (!config?.vacationWorkflowId) {
      this.logger.warn('No vacation workflow configured');
      return null;
    }

    return this.triggerWorkflow(companyId, {
      workflowId: config.vacationWorkflowId,
      data,
    });
  }

  async triggerNotificationWorkflow(
    companyId: string,
    data: {
      type: string;
      recipient: string;
      channel: 'whatsapp' | 'email' | 'push';
      message: string;
      metadata?: any;
    }
  ) {
    const config = await this.getConfig(companyId);

    if (!config?.notificationWorkflowId) {
      this.logger.warn('No notification workflow configured');
      return null;
    }

    return this.triggerWorkflow(companyId, {
      workflowId: config.notificationWorkflowId,
      data,
    });
  }

  // =============================================
  // Webhook Logging
  // =============================================

  async logWebhook(data: {
    companyId?: string;
    source: string;
    endpoint: string;
    method: string;
    headers?: any;
    body?: any;
    queryParams?: any;
    responseStatus?: number;
    responseBody?: any;
    processingTimeMs?: number;
    error?: string;
  }) {
    return this.prisma.webhookLog.create({
      data: {
        companyId: data.companyId,
        source: data.source,
        endpoint: data.endpoint,
        method: data.method,
        headers: data.headers,
        body: data.body,
        queryParams: data.queryParams,
        responseStatus: data.responseStatus,
        responseBody: data.responseBody,
        processingTimeMs: data.processingTimeMs,
        error: data.error,
      },
    });
  }

  async getWebhookLogs(companyId: string, options?: { limit?: number; source?: string }) {
    return this.prisma.webhookLog.findMany({
      where: {
        companyId,
        source: options?.source,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }
}
