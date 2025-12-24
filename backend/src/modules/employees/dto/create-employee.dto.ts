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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP001' })
  @IsString()
  employeeNumber: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiPropertyOptional({ example: 'Carlos' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiPropertyOptional({ example: 'García' })
  @IsOptional()
  @IsString()
  secondLastName?: string;

  @ApiPropertyOptional({ example: 'juan.perez@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '5551234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender: string;

  @ApiProperty({ enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COHABITING'] })
  @IsEnum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COHABITING'])
  maritalStatus: string;

  @ApiProperty({ example: 'PERJ900515ABC', description: 'RFC del empleado' })
  @IsString()
  @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, {
    message: 'RFC no tiene un formato válido',
  })
  rfc: string;

  @ApiProperty({ example: 'PERJ900515HDFRRL09', description: 'CURP del empleado' })
  @IsString()
  @Matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/, {
    message: 'CURP no tiene un formato válido',
  })
  curp: string;

  @ApiPropertyOptional({ example: '12345678901', description: 'NSS del IMSS' })
  @IsOptional()
  @IsString()
  nss?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colony?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  hireDate: string;

  @ApiProperty({ enum: ['INDEFINITE', 'FIXED_TERM', 'SEASONAL', 'TRIAL_PERIOD', 'TRAINING'] })
  @IsEnum(['INDEFINITE', 'FIXED_TERM', 'SEASONAL', 'TRIAL_PERIOD', 'TRAINING'])
  contractType: string;

  @ApiProperty({ enum: ['FULL_TIME', 'PART_TIME', 'HOURLY'] })
  @IsEnum(['FULL_TIME', 'PART_TIME', 'HOURLY'])
  employmentType: string;

  @ApiProperty()
  @IsUUID()
  jobPositionId: string;

  @ApiProperty()
  @IsUUID()
  departmentId: string;

  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workScheduleId?: string;

  @ApiPropertyOptional({ description: 'ID del supervisor/jefe directo' })
  @IsOptional()
  @IsUUID()
  supervisorId?: string;

  @ApiProperty({ example: 15000.00 })
  @IsNumber()
  baseSalary: number;

  @ApiProperty({ enum: ['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY', 'HOURLY'] })
  @IsEnum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY', 'HOURLY'])
  salaryType: string;

  @ApiProperty({ enum: ['TRANSFER', 'CHECK', 'CASH'] })
  @IsEnum(['TRANSFER', 'CHECK', 'CASH'])
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bankId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'CLABE interbancaria (18 dígitos)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{18}$/, { message: 'CLABE debe tener 18 dígitos' })
  clabe?: string;
}
