import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsUUID,
  MinLength,
  Matches,
  IsNotEmpty,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Helper to transform empty strings to undefined
const EmptyToUndefined = () =>
  Transform(({ value }) => (value === '' || value === null ? undefined : value));

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP001' })
  @IsNotEmpty({ message: 'El número de empleado es requerido' })
  @IsString({ message: 'El número de empleado debe ser texto' })
  employeeNumber: string;

  @ApiProperty({ example: 'Juan' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  firstName: string;

  @ApiPropertyOptional({ example: 'Carlos' })
  @IsOptional()
  @IsString({ message: 'El segundo nombre debe ser texto' })
  middleName?: string;

  @ApiProperty({ example: 'Pérez' })
  @IsNotEmpty({ message: 'El apellido paterno es requerido' })
  @IsString({ message: 'El apellido paterno debe ser texto' })
  @MinLength(2, { message: 'El apellido paterno debe tener al menos 2 caracteres' })
  lastName: string;

  @ApiPropertyOptional({ example: 'García' })
  @IsOptional()
  @IsString({ message: 'El apellido materno debe ser texto' })
  secondLastName?: string;

  @ApiPropertyOptional({ example: 'juan.perez@empresa.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  email?: string;

  @ApiPropertyOptional({ example: '5551234567' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  phone?: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es requerida' })
  @IsDateString({}, { message: 'La fecha de nacimiento debe tener formato YYYY-MM-DD' })
  birthDate: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsNotEmpty({ message: 'El género es requerido' })
  @IsEnum(['MALE', 'FEMALE', 'OTHER'], { message: 'Seleccione un género válido' })
  gender: string;

  @ApiProperty({ enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COHABITING'] })
  @IsNotEmpty({ message: 'El estado civil es requerido' })
  @IsEnum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COHABITING'], {
    message: 'Seleccione un estado civil válido',
  })
  maritalStatus: string;

  @ApiProperty({ example: 'PERJ900515ABC', description: 'RFC del empleado (12-13 caracteres)' })
  @IsNotEmpty({ message: 'El RFC es requerido' })
  @IsString({ message: 'El RFC debe ser texto' })
  @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, {
    message: 'El RFC no tiene formato válido (ej. PERJ900515ABC)',
  })
  rfc: string;

  @ApiProperty({ example: 'PERJ900515HDFRRL09', description: 'CURP del empleado (18 caracteres)' })
  @IsNotEmpty({ message: 'El CURP es requerido' })
  @IsString({ message: 'El CURP debe ser texto' })
  @Matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/, {
    message: 'El CURP no tiene formato válido (ej. PERJ900515HDFRRL09)',
  })
  curp: string;

  @ApiPropertyOptional({ example: '12345678901', description: 'NSS del IMSS (11 dígitos)' })
  @IsOptional()
  @IsString({ message: 'El NSS debe ser texto' })
  nss?: string;

  @ApiPropertyOptional({ description: 'Calle y número' })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  address?: string;

  @ApiPropertyOptional({ description: 'Colonia' })
  @IsOptional()
  @IsString({ message: 'La colonia debe ser texto' })
  colony?: string;

  @ApiPropertyOptional({ description: 'Ciudad' })
  @IsOptional()
  @IsString({ message: 'La ciudad debe ser texto' })
  city?: string;

  @ApiPropertyOptional({ description: 'Estado' })
  @IsOptional()
  @IsString({ message: 'El estado debe ser texto' })
  state?: string;

  @ApiPropertyOptional({ description: 'Código Postal (5 dígitos)' })
  @IsOptional()
  @IsString({ message: 'El código postal debe ser texto' })
  zipCode?: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsNotEmpty({ message: 'La fecha de ingreso es requerida' })
  @IsDateString({}, { message: 'La fecha de ingreso debe tener formato YYYY-MM-DD' })
  hireDate: string;

  @ApiProperty({ enum: ['INDEFINITE', 'FIXED_TERM', 'SEASONAL', 'TRIAL_PERIOD', 'TRAINING'] })
  @IsNotEmpty({ message: 'El tipo de contrato es requerido' })
  @IsEnum(['INDEFINITE', 'FIXED_TERM', 'SEASONAL', 'TRIAL_PERIOD', 'TRAINING'], {
    message: 'Seleccione un tipo de contrato válido',
  })
  contractType: string;

  @ApiProperty({ enum: ['FULL_TIME', 'PART_TIME', 'HOURLY'] })
  @IsNotEmpty({ message: 'El tipo de jornada es requerido' })
  @IsEnum(['FULL_TIME', 'PART_TIME', 'HOURLY'], {
    message: 'Seleccione un tipo de jornada válido',
  })
  employmentType: string;

  @ApiProperty({ description: 'ID del puesto de trabajo' })
  @IsNotEmpty({ message: 'El puesto es requerido' })
  @IsUUID('4', { message: 'Seleccione un puesto válido' })
  jobPositionId: string;

  @ApiProperty({ description: 'ID del departamento' })
  @IsNotEmpty({ message: 'El departamento es requerido' })
  @IsUUID('4', { message: 'Seleccione un departamento válido' })
  departmentId: string;

  @ApiProperty({ description: 'ID de la empresa' })
  @IsNotEmpty({ message: 'La empresa es requerida' })
  @IsUUID('4', { message: 'Seleccione una empresa válida' })
  companyId: string;

  @ApiPropertyOptional({ description: 'ID del horario de trabajo' })
  @EmptyToUndefined()
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined && value !== null)
  @IsUUID('4', { message: 'Seleccione un horario válido' })
  workScheduleId?: string;

  @ApiPropertyOptional({ description: 'ID del supervisor/jefe directo' })
  @EmptyToUndefined()
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined && value !== null)
  @IsUUID('4', { message: 'Seleccione un supervisor válido' })
  supervisorId?: string;

  @ApiProperty({ example: 15000.0, description: 'Salario base' })
  @IsNotEmpty({ message: 'El salario base es requerido' })
  @IsNumber({}, { message: 'El salario base debe ser un número' })
  @Min(0, { message: 'El salario base no puede ser negativo' })
  baseSalary: number;

  @ApiProperty({ enum: ['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY', 'HOURLY'] })
  @IsNotEmpty({ message: 'El tipo de salario es requerido' })
  @IsEnum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY', 'HOURLY'], {
    message: 'Seleccione un tipo de salario válido',
  })
  salaryType: string;

  @ApiProperty({ enum: ['TRANSFER', 'CHECK', 'CASH'] })
  @IsNotEmpty({ message: 'La forma de pago es requerida' })
  @IsEnum(['TRANSFER', 'CHECK', 'CASH'], {
    message: 'Seleccione una forma de pago válida',
  })
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'ID del banco' })
  @EmptyToUndefined()
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined && value !== null)
  @IsUUID('4', { message: 'Seleccione un banco válido' })
  bankId?: string;

  @ApiPropertyOptional({ description: 'Número de cuenta bancaria' })
  @IsOptional()
  @IsString({ message: 'El número de cuenta debe ser texto' })
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'CLABE interbancaria (18 dígitos)' })
  @EmptyToUndefined()
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined && value !== null)
  @IsString({ message: 'La CLABE debe ser texto' })
  @Matches(/^\d{18}$/, { message: 'La CLABE debe tener exactamente 18 dígitos' })
  clabe?: string;
}
