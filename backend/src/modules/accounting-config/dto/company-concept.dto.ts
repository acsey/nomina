import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear un concepto global de nómina
 */
export class CreatePayrollConceptDto {
  @ApiProperty({ description: 'Código único del concepto (ej: P001, D001)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Nombre del concepto' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tipo de concepto', enum: ['PERCEPTION', 'DEDUCTION'] })
  @IsEnum(['PERCEPTION', 'DEDUCTION'])
  type: 'PERCEPTION' | 'DEDUCTION';

  @ApiPropertyOptional({ description: 'Código SAT para CFDI' })
  @IsOptional()
  @IsString()
  satCode?: string;

  @ApiPropertyOptional({ description: 'Es gravable para ISR', default: false })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional({ description: 'Es monto fijo', default: false })
  @IsOptional()
  @IsBoolean()
  isFixed?: boolean;

  @ApiPropertyOptional({ description: 'Monto por defecto' })
  @IsOptional()
  @IsNumber()
  defaultAmount?: number;

  @ApiPropertyOptional({ description: 'Fórmula de cálculo' })
  @IsOptional()
  @IsString()
  formula?: string;
}

/**
 * DTO para actualizar un concepto global
 */
export class UpdatePayrollConceptDto {
  @ApiPropertyOptional({ description: 'Nombre del concepto' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Código SAT para CFDI' })
  @IsOptional()
  @IsString()
  satCode?: string;

  @ApiPropertyOptional({ description: 'Es gravable para ISR' })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional({ description: 'Es monto fijo' })
  @IsOptional()
  @IsBoolean()
  isFixed?: boolean;

  @ApiPropertyOptional({ description: 'Monto por defecto' })
  @IsOptional()
  @IsNumber()
  defaultAmount?: number;

  @ApiPropertyOptional({ description: 'Fórmula de cálculo' })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({ description: 'Concepto activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO para crear configuración de concepto por empresa
 */
export class CreateCompanyConceptDto {
  @ApiProperty({ description: 'ID del concepto base' })
  @IsString()
  conceptId: string;

  @ApiPropertyOptional({ description: 'Nombre personalizado para la empresa' })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiPropertyOptional({ description: 'Código personalizado para la empresa' })
  @IsOptional()
  @IsString()
  customCode?: string;

  @ApiPropertyOptional({ description: 'Monto por defecto para esta empresa' })
  @IsOptional()
  @IsNumber()
  defaultAmount?: number;

  @ApiPropertyOptional({ description: 'Fórmula personalizada de cálculo' })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({
    description: 'A quién aplica: ALL, DEPARTMENT:id, POSITION:id',
    default: 'ALL',
  })
  @IsOptional()
  @IsString()
  appliesTo?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

/**
 * DTO para actualizar configuración de concepto por empresa
 */
export class UpdateCompanyConceptDto {
  @ApiPropertyOptional({ description: 'Nombre personalizado para la empresa' })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiPropertyOptional({ description: 'Código personalizado para la empresa' })
  @IsOptional()
  @IsString()
  customCode?: string;

  @ApiPropertyOptional({ description: 'Monto por defecto para esta empresa' })
  @IsOptional()
  @IsNumber()
  defaultAmount?: number;

  @ApiPropertyOptional({ description: 'Fórmula personalizada de cálculo' })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({ description: 'A quién aplica: ALL, DEPARTMENT:id, POSITION:id' })
  @IsOptional()
  @IsString()
  appliesTo?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Concepto activo en esta empresa' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO para crear mapeo de incidencia a concepto
 */
export class CreateIncidentMappingDto {
  @ApiProperty({ description: 'ID del tipo de incidencia' })
  @IsString()
  incidentTypeId: string;

  @ApiProperty({ description: 'ID del concepto de nómina' })
  @IsString()
  conceptId: string;

  @ApiPropertyOptional({ description: 'Es para incidencias retroactivas', default: false })
  @IsOptional()
  @IsBoolean()
  isRetroactive?: boolean;

  @ApiPropertyOptional({ description: 'Prioridad (mayor = más prioritario)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;
}

/**
 * DTO para actualizar mapeo de incidencia
 */
export class UpdateIncidentMappingDto {
  @ApiPropertyOptional({ description: 'ID del concepto de nómina' })
  @IsOptional()
  @IsString()
  conceptId?: string;

  @ApiPropertyOptional({ description: 'Prioridad' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'Mapeo activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO para crear un nuevo concepto personalizado de empresa
 * (crea tanto el concepto global como la configuración de empresa)
 */
export class CreateCustomConceptDto {
  @ApiProperty({ description: 'Código único del concepto' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Nombre del concepto' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tipo de concepto', enum: ['PERCEPTION', 'DEDUCTION'] })
  @IsEnum(['PERCEPTION', 'DEDUCTION'])
  type: 'PERCEPTION' | 'DEDUCTION';

  @ApiPropertyOptional({ description: 'Código SAT para CFDI' })
  @IsOptional()
  @IsString()
  satCode?: string;

  @ApiPropertyOptional({ description: 'Es gravable para ISR', default: true })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional({ description: 'Monto por defecto' })
  @IsOptional()
  @IsNumber()
  defaultAmount?: number;

  @ApiPropertyOptional({ description: 'Fórmula de cálculo' })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({ description: 'A quién aplica: ALL, DEPARTMENT:id, POSITION:id' })
  @IsOptional()
  @IsString()
  appliesTo?: string;
}
