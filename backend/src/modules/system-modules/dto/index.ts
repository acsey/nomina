import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsInt, IsObject } from 'class-validator';

export enum ModuleCategory {
  CORE = 'CORE',
  PAYROLL = 'PAYROLL',
  HR = 'HR',
  ATTENDANCE = 'ATTENDANCE',
  PORTAL = 'PORTAL',
  INTEGRATION = 'INTEGRATION',
  REPORTS = 'REPORTS',
}

export class CreateSystemModuleDto {
  @ApiProperty({ description: 'Código único del módulo' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Nombre del módulo' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del módulo' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ModuleCategory, description: 'Categoría del módulo' })
  @IsEnum(ModuleCategory)
  @IsOptional()
  category?: ModuleCategory;

  @ApiPropertyOptional({ description: 'Si es un módulo esencial que no se puede desactivar' })
  @IsBoolean()
  @IsOptional()
  isCore?: boolean;

  @ApiPropertyOptional({ description: 'Si está habilitado por defecto para nuevas empresas' })
  @IsBoolean()
  @IsOptional()
  defaultEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Nombre del icono (heroicons)' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización' })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateSystemModuleDto extends PartialType(CreateSystemModuleDto) {}

export class UpdateCompanyModuleDto {
  @ApiProperty({ description: 'Si el módulo está habilitado' })
  @IsBoolean()
  isEnabled: boolean;

  @ApiPropertyOptional({ description: 'Configuración específica del módulo' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
