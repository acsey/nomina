import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Tipos de reglas fiscales soportadas
 * Corresponden al enum FiscalRuleType en schema.prisma
 */
export enum FiscalRuleType {
  ISR = 'ISR',
  IMSS_EMPLOYEE = 'IMSS_EMPLOYEE',
  IMSS_EMPLOYER = 'IMSS_EMPLOYER',
  SUBSIDIO_EMPLEO = 'SUBSIDIO_EMPLEO',
  ISN = 'ISN',
  INFONAVIT = 'INFONAVIT',
  RCV = 'RCV',
  AGUINALDO = 'AGUINALDO',
  PRIMA_VACACIONAL = 'PRIMA_VACACIONAL',
  PTU = 'PTU',
  OVERTIME = 'OVERTIME',
  CUSTOM = 'CUSTOM',
}

/**
 * Tipos de operadores para condiciones en reglas
 */
export enum RuleOperator {
  EQ = 'EQ',           // Igual
  NEQ = 'NEQ',         // No igual
  GT = 'GT',           // Mayor que
  GTE = 'GTE',         // Mayor o igual
  LT = 'LT',           // Menor que
  LTE = 'LTE',         // Menor o igual
  BETWEEN = 'BETWEEN', // Entre dos valores
  IN = 'IN',           // En lista de valores
  NOT_IN = 'NOT_IN',   // No en lista de valores
}

/**
 * Tipos de acciones para reglas
 */
export enum RuleAction {
  APPLY_RATE = 'APPLY_RATE',         // Aplicar tasa porcentual
  APPLY_FIXED = 'APPLY_FIXED',       // Aplicar monto fijo
  APPLY_TABLE = 'APPLY_TABLE',       // Aplicar tabla de rangos
  APPLY_FORMULA = 'APPLY_FORMULA',   // Aplicar fórmula personalizada
  EXEMPT = 'EXEMPT',                 // Exentar del cálculo
  CAP = 'CAP',                       // Aplicar tope máximo
  FLOOR = 'FLOOR',                   // Aplicar mínimo
}

/**
 * Condición para aplicar la regla
 */
export class RuleConditionDto {
  @ApiProperty({ description: 'Campo a evaluar (ej: baseSalary, workedDays)' })
  @IsString()
  field: string;

  @ApiProperty({ enum: RuleOperator, description: 'Operador de comparación' })
  @IsEnum(RuleOperator)
  operator: RuleOperator;

  @ApiProperty({ description: 'Valor(es) a comparar' })
  value: number | string | number[] | string[];

  @ApiPropertyOptional({ description: 'Valor secundario para BETWEEN' })
  @IsOptional()
  valueTo?: number | string;
}

/**
 * Fila de tabla de rangos (para ISR, subsidio, etc.)
 */
export class RuleTableRowDto {
  @ApiProperty({ description: 'Límite inferior del rango' })
  @IsInt()
  @Min(0)
  lowerLimit: number;

  @ApiProperty({ description: 'Límite superior del rango' })
  @IsInt()
  @Min(0)
  upperLimit: number;

  @ApiPropertyOptional({ description: 'Cuota fija del rango' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fixedFee?: number;

  @ApiPropertyOptional({ description: 'Tasa sobre excedente (decimal, ej: 0.32 para 32%)' })
  @IsOptional()
  rateOnExcess?: number;

  @ApiPropertyOptional({ description: 'Monto fijo a aplicar' })
  @IsOptional()
  fixedAmount?: number;
}

/**
 * Acción a ejecutar cuando la regla aplica
 */
export class RuleActionDto {
  @ApiProperty({ enum: RuleAction, description: 'Tipo de acción' })
  @IsEnum(RuleAction)
  type: RuleAction;

  @ApiPropertyOptional({ description: 'Tasa a aplicar (decimal)' })
  @IsOptional()
  rate?: number;

  @ApiPropertyOptional({ description: 'Monto fijo a aplicar' })
  @IsOptional()
  fixedAmount?: number;

  @ApiPropertyOptional({ description: 'Tabla de rangos para APPLY_TABLE' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RuleTableRowDto)
  table?: RuleTableRowDto[];

  @ApiPropertyOptional({ description: 'Fórmula personalizada para APPLY_FORMULA' })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({ description: 'Valor máximo (tope)' })
  @IsOptional()
  maxValue?: number;

  @ApiPropertyOptional({ description: 'Valor mínimo (piso)' })
  @IsOptional()
  minValue?: number;
}

/**
 * Estructura completa de la lógica de una regla fiscal
 * Este es el formato estricto que debe cumplir logicJson
 */
export class FiscalRuleLogicDto {
  @ApiProperty({ description: 'Versión del esquema de lógica' })
  @IsString()
  schemaVersion: string = '1.0';

  @ApiPropertyOptional({ description: 'Condiciones para aplicar la regla (AND lógico)' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions?: RuleConditionDto[];

  @ApiProperty({ description: 'Acción a ejecutar' })
  @ValidateNested()
  @Type(() => RuleActionDto)
  action: RuleActionDto;

  @ApiPropertyOptional({ description: 'Base de cálculo (campo del empleado/recibo)' })
  @IsOptional()
  @IsString()
  calculationBase?: string; // ej: 'taxableIncome', 'grossSalary', 'netSalary'

  @ApiPropertyOptional({ description: 'Notas o comentarios sobre la regla' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para crear una nueva regla fiscal
 */
export class CreateFiscalRuleDto {
  @ApiProperty({ description: 'ID de la empresa' })
  @IsString()
  companyId: string;

  @ApiProperty({ enum: FiscalRuleType, description: 'Tipo de regla fiscal' })
  @IsEnum(FiscalRuleType)
  ruleType: FiscalRuleType;

  @ApiProperty({ description: 'Nombre descriptivo de la regla' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Fecha de inicio de vigencia (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Fecha de fin de vigencia (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Lógica de la regla', type: FiscalRuleLogicDto })
  @IsObject()
  @ValidateNested()
  @Type(() => FiscalRuleLogicDto)
  logicJson: FiscalRuleLogicDto;

  @ApiPropertyOptional({ description: 'Prioridad (mayor = más prioritaria)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ description: 'Ley aplicable (ej: LISR, LSS)' })
  @IsOptional()
  @IsString()
  legalLaw?: string;

  @ApiPropertyOptional({ description: 'Artículo de la ley' })
  @IsOptional()
  @IsString()
  legalArticle?: string;

  @ApiPropertyOptional({ description: 'Fuente legal (ej: DOF 2024-12-01)' })
  @IsOptional()
  @IsString()
  legalSource?: string;
}

/**
 * DTO para actualizar una regla fiscal existente
 */
export class UpdateFiscalRuleDto {
  @ApiPropertyOptional({ description: 'Nombre descriptivo de la regla' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio de vigencia (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin de vigencia (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Lógica de la regla', type: FiscalRuleLogicDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FiscalRuleLogicDto)
  logicJson?: FiscalRuleLogicDto;

  @ApiPropertyOptional({ description: 'Prioridad (mayor = más prioritaria)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Ley aplicable' })
  @IsOptional()
  @IsString()
  legalLaw?: string;

  @ApiPropertyOptional({ description: 'Artículo de la ley' })
  @IsOptional()
  @IsString()
  legalArticle?: string;

  @ApiPropertyOptional({ description: 'Fuente legal' })
  @IsOptional()
  @IsString()
  legalSource?: string;
}

/**
 * Resultado de búsqueda de traslape de fechas
 */
export interface OverlapCheckResult {
  hasOverlap: boolean;
  conflictingRules: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date | null;
  }[];
}
