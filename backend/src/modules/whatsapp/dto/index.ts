import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsPhoneNumber,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
} from 'class-validator';

// =============================================
// WhatsApp Config DTOs
// =============================================

export enum WhatsAppProvider {
  TWILIO = 'TWILIO',
  META = 'META',
  DIALOG_360 = 'DIALOG_360',
  WATI = 'WATI',
}

export class CreateWhatsAppConfigDto {
  @ApiProperty({ enum: WhatsAppProvider, description: 'Proveedor de WhatsApp' })
  @IsEnum(WhatsAppProvider)
  provider: WhatsAppProvider;

  @ApiPropertyOptional({ description: 'Account SID (Twilio)' })
  @IsString()
  @IsOptional()
  accountSid?: string;

  @ApiPropertyOptional({ description: 'Auth Token' })
  @IsString()
  @IsOptional()
  authToken?: string;

  @ApiPropertyOptional({ description: 'Número de WhatsApp Business' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Requiere ubicación para checado' })
  @IsBoolean()
  @IsOptional()
  requireLocation?: boolean;

  @ApiPropertyOptional({ description: 'Requiere foto para checado' })
  @IsBoolean()
  @IsOptional()
  requirePhoto?: boolean;

  @ApiPropertyOptional({ description: 'Permitir reporte por voz' })
  @IsBoolean()
  @IsOptional()
  allowVoiceReport?: boolean;

  @ApiPropertyOptional({ description: 'Mensaje de bienvenida personalizado' })
  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Mensaje de entrada personalizado' })
  @IsString()
  @IsOptional()
  checkInMessage?: string;

  @ApiPropertyOptional({ description: 'Mensaje de salida personalizado' })
  @IsString()
  @IsOptional()
  checkOutMessage?: string;
}

export class UpdateWhatsAppConfigDto extends PartialType(CreateWhatsAppConfigDto) {}

// =============================================
// Employee WhatsApp DTOs
// =============================================

export class RegisterEmployeeWhatsAppDto {
  @ApiProperty({ description: 'ID del empleado' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Número de WhatsApp del empleado' })
  @IsString()
  phoneNumber: string;
}

export class VerifyEmployeeWhatsAppDto {
  @ApiProperty({ description: 'Código de verificación' })
  @IsString()
  verificationCode: string;
}

// =============================================
// Geofence DTOs
// =============================================

export enum GeofenceType {
  OFFICE = 'OFFICE',
  BRANCH = 'BRANCH',
  WAREHOUSE = 'WAREHOUSE',
  CONSTRUCTION = 'CONSTRUCTION',
  HOME_OFFICE = 'HOME_OFFICE',
  CLIENT_SITE = 'CLIENT_SITE',
  OTHER = 'OTHER',
}

export class CreateGeofenceDto {
  @ApiProperty({ description: 'Nombre de la geocerca' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Latitud del centro', example: 19.4326 })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitud del centro', example: -99.1332 })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiProperty({ description: 'Radio en metros', minimum: 10, maximum: 10000 })
  @IsNumber()
  @Min(10)
  @Max(10000)
  radius: number;

  @ApiPropertyOptional({ enum: GeofenceType, description: 'Tipo de geocerca' })
  @IsEnum(GeofenceType)
  @IsOptional()
  type?: GeofenceType;

  @ApiPropertyOptional({ description: 'Dirección física' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Si es la geocerca principal' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Permitir check-in fuera con advertencia' })
  @IsBoolean()
  @IsOptional()
  allowCheckInOutside?: boolean;
}

export class UpdateGeofenceDto extends PartialType(CreateGeofenceDto) {}

export class AssignGeofenceDto {
  @ApiProperty({ description: 'ID del empleado' })
  @IsString()
  employeeId: string;

  @ApiPropertyOptional({ description: 'Radio personalizado para el empleado' })
  @IsNumber()
  @IsOptional()
  customRadius?: number;
}

// =============================================
// Attendance Event DTOs
// =============================================

export enum AttendanceEventType {
  CHECK_IN = 'CHECK_IN',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
  CHECK_OUT = 'CHECK_OUT',
}

export class ManualAttendanceLogDto {
  @ApiProperty({ description: 'ID del empleado' })
  @IsString()
  employeeId: string;

  @ApiProperty({ enum: AttendanceEventType, description: 'Tipo de evento' })
  @IsEnum(AttendanceEventType)
  eventType: AttendanceEventType;

  @ApiPropertyOptional({ description: 'Latitud' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitud' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// =============================================
// Webhook DTOs
// =============================================

export class TwilioWebhookDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  MessageSid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  AccountSid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  From?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  To?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  Body?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  NumMedia?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  Latitude?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  Longitude?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  MediaUrl0?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  MediaContentType0?: string;
}

// Meta/WhatsApp Business API webhook
export class MetaWebhookDto {
  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  entry?: any[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  object?: string;
}

// =============================================
// Query DTOs
// =============================================

export class AttendanceLogQueryDto {
  @ApiPropertyOptional({ description: 'Fecha inicio (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'ID del empleado' })
  @IsString()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ enum: AttendanceEventType })
  @IsEnum(AttendanceEventType)
  @IsOptional()
  eventType?: AttendanceEventType;

  @ApiPropertyOptional({ description: 'Estado del log' })
  @IsString()
  @IsOptional()
  status?: string;
}
