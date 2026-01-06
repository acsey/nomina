import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PeriodType } from '@/common/types/period-type';

// ============================================
// STATE ISN CONFIG DTOs
// ============================================

export class CreateStateIsnConfigDto {
  @IsString()
  stateCode: string;

  @IsString()
  stateName: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  rate: number;

  @IsOptional()
  @IsNumber()
  threshold?: number;

  @IsOptional()
  exemptions?: any;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStateIsnConfigDto {
  @IsOptional()
  @IsString()
  stateName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  rate?: number;

  @IsOptional()
  @IsNumber()
  threshold?: number;

  @IsOptional()
  exemptions?: any;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================
// FISCAL VALUES DTOs
// ============================================

export class CreateFiscalValuesDto {
  @IsNumber()
  year: number;

  @IsNumber()
  @Min(0)
  umaDaily: number;

  @IsNumber()
  @Min(0)
  umaMonthly: number;

  @IsNumber()
  @Min(0)
  umaYearly: number;

  @IsNumber()
  @Min(0)
  smgDaily: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  smgZfnDaily?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  aguinaldoDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  vacationPremiumPercent?: number;

  @IsOptional()
  @IsDateString()
  ptuDeadline?: string;

  @IsOptional()
  @IsString()
  isrTableVersion?: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFiscalValuesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  umaDaily?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  umaMonthly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  umaYearly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  smgDaily?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  smgZfnDaily?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  aguinaldoDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  vacationPremiumPercent?: number;

  @IsOptional()
  @IsDateString()
  ptuDeadline?: string;

  @IsOptional()
  @IsString()
  isrTableVersion?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================
// COMPANY PAYROLL CONFIG DTOs
// ============================================

export class CreateCompanyPayrollConfigDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsEnum(PeriodType)
  defaultPeriodType?: PeriodType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  payDayOfWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  payDayOfMonth?: number;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsBoolean()
  applyIsn?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(60)
  aguinaldoDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  aguinaldoPayMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  aguinaldoPayDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(1)
  vacationPremiumPercent?: number;

  @IsOptional()
  @IsBoolean()
  applyPtu?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.2)
  ptuPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  ptuPayMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  ptuPayDay?: number;

  @IsOptional()
  @IsBoolean()
  savingsFundEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.13)
  savingsFundEmployeePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.13)
  savingsFundCompanyPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.13)
  savingsFundMaxPercent?: number;

  @IsOptional()
  @IsBoolean()
  savingsBoxEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.15)
  savingsBoxEmployeePercent?: number;

  @IsOptional()
  @IsBoolean()
  foodVouchersEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.40)
  foodVouchersPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  foodVouchersMaxUma?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  overtimeDoubleAfter?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9)
  overtimeTripleAfter?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(18)
  maxOvertimeHoursWeek?: number;

  @IsOptional()
  @IsBoolean()
  applySubsidioEmpleo?: boolean;

  @IsOptional()
  @IsString()
  roundingMethod?: string;
}

export class UpdateCompanyPayrollConfigDto {
  @IsOptional()
  @IsEnum(PeriodType)
  defaultPeriodType?: PeriodType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  payDayOfWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  payDayOfMonth?: number;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsBoolean()
  applyIsn?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(60)
  aguinaldoDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  aguinaldoPayMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  aguinaldoPayDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(1)
  vacationPremiumPercent?: number;

  @IsOptional()
  @IsBoolean()
  applyPtu?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.2)
  ptuPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  ptuPayMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  ptuPayDay?: number;

  @IsOptional()
  @IsBoolean()
  savingsFundEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.13)
  savingsFundEmployeePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.13)
  savingsFundCompanyPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.13)
  savingsFundMaxPercent?: number;

  @IsOptional()
  @IsBoolean()
  savingsBoxEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.15)
  savingsBoxEmployeePercent?: number;

  @IsOptional()
  @IsBoolean()
  foodVouchersEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.40)
  foodVouchersPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  foodVouchersMaxUma?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  overtimeDoubleAfter?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9)
  overtimeTripleAfter?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(18)
  maxOvertimeHoursWeek?: number;

  @IsOptional()
  @IsBoolean()
  applySubsidioEmpleo?: boolean;

  @IsOptional()
  @IsString()
  roundingMethod?: string;
}

// ============================================
// ISR TABLE DTOs
// ============================================

export class CreateIsrTableDto {
  @IsNumber()
  year: number;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsNumber()
  @Min(0)
  lowerLimit: number;

  @IsNumber()
  @Min(0)
  upperLimit: number;

  @IsNumber()
  @Min(0)
  fixedFee: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  rateOnExcess: number;
}

export class UpdateIsrTableDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  upperLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  rateOnExcess?: number;
}

// ============================================
// SUBSIDIO AL EMPLEO TABLE DTOs
// ============================================

export class CreateSubsidioEmpleoTableDto {
  @IsNumber()
  year: number;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsNumber()
  @Min(0)
  lowerLimit: number;

  @IsNumber()
  @Min(0)
  upperLimit: number;

  @IsNumber()
  @Min(0)
  subsidyAmount: number;
}

export class UpdateSubsidioEmpleoTableDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  upperLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subsidyAmount?: number;
}

// ============================================
// IMSS RATES DTOs
// ============================================

export class CreateImssRateDto {
  @IsNumber()
  year: number;

  @IsString()
  concept: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  employerRate: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  employeeRate: number;

  @IsString()
  salaryBase: string;
}

export class UpdateImssRateDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  employerRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  employeeRate?: number;

  @IsOptional()
  @IsString()
  salaryBase?: string;
}
