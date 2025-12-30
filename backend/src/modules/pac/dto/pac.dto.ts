import { IsString, IsBoolean, IsOptional, IsObject, IsArray, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// DTOs para Catálogo de PACs
// ============================================

export class CreatePacProviderDto {
  @ApiProperty({ description: 'Código único del PAC', example: 'MI_PAC' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Nombre comercial', example: 'Mi PAC Personalizado' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Razón social', example: 'Mi Empresa PAC, S.A. de C.V.' })
  @IsString()
  legalName: string;

  @ApiPropertyOptional({ description: 'URL de timbrado sandbox' })
  @IsOptional()
  @IsString()
  sandboxStampUrl?: string;

  @ApiPropertyOptional({ description: 'URL de cancelación sandbox' })
  @IsOptional()
  @IsString()
  sandboxCancelUrl?: string;

  @ApiPropertyOptional({ description: 'URL de timbrado producción' })
  @IsOptional()
  @IsString()
  productionStampUrl?: string;

  @ApiPropertyOptional({ description: 'URL de cancelación producción' })
  @IsOptional()
  @IsString()
  productionCancelUrl?: string;

  @ApiPropertyOptional({ description: 'Tipo de integración', enum: ['SOAP', 'REST', 'CUSTOM'] })
  @IsOptional()
  @IsString()
  integrationType?: string;

  @ApiPropertyOptional({ description: 'URL de documentación' })
  @IsOptional()
  @IsString()
  documentationUrl?: string;

  @ApiPropertyOptional({ description: 'Campos requeridos para autenticación', example: ['user', 'password'] })
  @IsOptional()
  @IsArray()
  requiredFields?: string[];

  @ApiPropertyOptional({ description: 'Soporta timbrado' })
  @IsOptional()
  @IsBoolean()
  supportsStamping?: boolean;

  @ApiPropertyOptional({ description: 'Soporta cancelación' })
  @IsOptional()
  @IsBoolean()
  supportsCancellation?: boolean;

  @ApiPropertyOptional({ description: 'Soporta consulta de estatus' })
  @IsOptional()
  @IsBoolean()
  supportsQueryStatus?: boolean;

  @ApiPropertyOptional({ description: 'Soporta recuperación de XML' })
  @IsOptional()
  @IsBoolean()
  supportsRecovery?: boolean;

  @ApiPropertyOptional({ description: 'Es PAC oficial SAT' })
  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'URL del logo' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'URL del sitio web' })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Email de soporte' })
  @IsOptional()
  @IsString()
  supportEmail?: string;

  @ApiPropertyOptional({ description: 'Teléfono de soporte' })
  @IsOptional()
  @IsString()
  supportPhone?: string;
}

export class UpdatePacProviderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sandboxStampUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sandboxCancelUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productionStampUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productionCancelUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  integrationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentationUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  requiredFields?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  supportsStamping?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  supportsCancellation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  supportsQueryStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  supportsRecovery?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isImplemented?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supportEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supportPhone?: string;
}

// ============================================
// DTOs para Configuración de PAC por Empresa
// ============================================

export class ConfigurePacDto {
  @ApiProperty({ description: 'ID del PAC provider' })
  @IsString()
  pacProviderId: string;

  @ApiProperty({ description: 'Credenciales del PAC', example: { user: 'mi_usuario', password: 'mi_password' } })
  @IsObject()
  credentials: Record<string, string>;

  @ApiPropertyOptional({ description: 'Modo de operación', enum: ['sandbox', 'production'] })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ description: 'Es el PAC principal de la empresa' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePacConfigDto {
  @ApiPropertyOptional({ description: 'Credenciales del PAC' })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Modo de operación', enum: ['sandbox', 'production'] })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ description: 'Es el PAC principal de la empresa' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Configuración activa' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TestPacConnectionDto {
  @ApiProperty({ description: 'ID de la configuración de PAC' })
  @IsString()
  configId: string;
}
