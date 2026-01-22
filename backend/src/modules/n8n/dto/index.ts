import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsUrl, IsObject } from 'class-validator';

export class CreateN8nConfigDto {
  @ApiProperty({ description: 'URL base de n8n', example: 'https://n8n.tudominio.com' })
  @IsUrl()
  baseUrl: string;

  @ApiPropertyOptional({ description: 'API Key de n8n' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'URL base para webhooks' })
  @IsUrl()
  @IsOptional()
  webhookBaseUrl?: string;

  @ApiPropertyOptional({ description: 'ID del workflow de asistencia' })
  @IsString()
  @IsOptional()
  attendanceWorkflowId?: string;

  @ApiPropertyOptional({ description: 'ID del workflow de chatbot' })
  @IsString()
  @IsOptional()
  chatbotWorkflowId?: string;

  @ApiPropertyOptional({ description: 'ID del workflow de vacaciones' })
  @IsString()
  @IsOptional()
  vacationWorkflowId?: string;

  @ApiPropertyOptional({ description: 'ID del workflow de notificaciones' })
  @IsString()
  @IsOptional()
  notificationWorkflowId?: string;
}

export class UpdateN8nConfigDto extends PartialType(CreateN8nConfigDto) {}

export class TriggerWorkflowDto {
  @ApiProperty({ description: 'ID del workflow a ejecutar' })
  @IsString()
  workflowId: string;

  @ApiPropertyOptional({ description: 'Datos a enviar al workflow' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}

export class ChatbotMessageDto {
  @ApiProperty({ description: 'Mensaje del usuario' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'ID de la sesión de chat' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Contexto adicional' })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

// Intenciones del chatbot
export enum ChatbotIntent {
  // Asistencia
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
  BREAK_START = 'break_start',
  BREAK_END = 'break_end',

  // Vacaciones
  REQUEST_VACATION = 'request_vacation',
  CHECK_VACATION_BALANCE = 'check_vacation_balance',
  CANCEL_VACATION = 'cancel_vacation',

  // Permisos
  REQUEST_PERMISSION = 'request_permission',

  // Consultas de nómina
  CHECK_PAYROLL = 'check_payroll',
  DOWNLOAD_PAYSLIP = 'download_payslip',

  // Información
  CHECK_SCHEDULE = 'check_schedule',
  COMPANY_INFO = 'company_info',
  HELP = 'help',

  // Otros
  GREETING = 'greeting',
  UNKNOWN = 'unknown',
}
