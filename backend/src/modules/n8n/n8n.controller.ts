import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { N8nService } from './n8n.service';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { ModuleEnabledGuard, RequireModule } from '../../common/guards/module-enabled.guard';
import {
  CreateN8nConfigDto,
  UpdateN8nConfigDto,
  TriggerWorkflowDto,
  ChatbotMessageDto,
} from './dto';

@ApiTags('n8n Integration')
@ApiBearerAuth()
@Controller('n8n')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleEnabledGuard)
@RequireModule('n8n_integration')
export class N8nController {
  constructor(
    private readonly n8nService: N8nService,
    private readonly chatbotService: ChatbotService
  ) {}

  // =============================================
  // Configuration
  // =============================================

  @Get('config/:companyId')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Obtener configuración de n8n' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  getConfig(@Param('companyId') companyId: string) {
    return this.n8nService.getConfig(companyId);
  }

  @Post('config/:companyId')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Crear configuración de n8n' })
  createConfig(
    @Param('companyId') companyId: string,
    @Body() dto: CreateN8nConfigDto
  ) {
    return this.n8nService.createConfig(companyId, dto);
  }

  @Patch('config/:companyId')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Actualizar configuración de n8n' })
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateN8nConfigDto
  ) {
    return this.n8nService.updateConfig(companyId, dto);
  }

  @Delete('config/:companyId')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Eliminar configuración de n8n' })
  deleteConfig(@Param('companyId') companyId: string) {
    return this.n8nService.deleteConfig(companyId);
  }

  // =============================================
  // Health Check
  // =============================================

  @Get('health/:companyId')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Verificar conexión con n8n' })
  healthCheck(@Param('companyId') companyId: string) {
    return this.n8nService.healthCheck(companyId);
  }

  // =============================================
  // Workflow Execution
  // =============================================

  @Post('trigger/:companyId')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Ejecutar un workflow de n8n' })
  triggerWorkflow(
    @Param('companyId') companyId: string,
    @Body() dto: TriggerWorkflowDto
  ) {
    return this.n8nService.triggerWorkflow(companyId, dto);
  }

  // =============================================
  // Chatbot (AI-powered RRHH assistant)
  // =============================================

  @Post('chatbot/:companyId/:employeeId')
  @RequireModule('ai_chatbot')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'EMPLOYEE')
  @ApiOperation({ summary: 'Enviar mensaje al chatbot de RRHH' })
  chatbotMessage(
    @Param('companyId') companyId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: ChatbotMessageDto
  ) {
    // El phoneNumber se obtiene del registro del empleado
    return this.chatbotService.processMessage(
      companyId,
      employeeId,
      '', // Se obtiene internamente
      dto
    );
  }

  // =============================================
  // Webhook Logs
  // =============================================

  @Get('logs/:companyId')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Obtener logs de webhooks' })
  getWebhookLogs(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: number,
    @Query('source') source?: string
  ) {
    return this.n8nService.getWebhookLogs(companyId, { limit, source });
  }
}
