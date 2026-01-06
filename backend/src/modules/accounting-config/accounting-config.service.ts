import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PeriodType } from '@/common/types/period-type';
import {
  CreateStateIsnConfigDto,
  UpdateStateIsnConfigDto,
  CreateFiscalValuesDto,
  UpdateFiscalValuesDto,
  CreateCompanyPayrollConfigDto,
  UpdateCompanyPayrollConfigDto,
  CreateIsrTableDto,
  UpdateIsrTableDto,
  CreateSubsidioEmpleoTableDto,
  UpdateSubsidioEmpleoTableDto,
  CreateImssRateDto,
  UpdateImssRateDto,
} from './dto/accounting-config.dto';

@Injectable()
export class AccountingConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // STATE ISN CONFIG
  // ============================================

  async getAllStateIsnConfigs(activeOnly = true) {
    return this.prisma.stateIsnConfig.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { stateName: 'asc' },
    });
  }

  async getStateIsnConfig(stateCode: string) {
    const config = await this.prisma.stateIsnConfig.findUnique({
      where: { stateCode },
    });
    if (!config) {
      throw new NotFoundException(`ISN config for state ${stateCode} not found`);
    }
    return config;
  }

  async createStateIsnConfig(dto: CreateStateIsnConfigDto) {
    return this.prisma.stateIsnConfig.create({
      data: {
        stateCode: dto.stateCode,
        stateName: dto.stateName,
        rate: dto.rate,
        threshold: dto.threshold,
        exemptions: dto.exemptions,
        notes: dto.notes,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateStateIsnConfig(stateCode: string, dto: UpdateStateIsnConfigDto) {
    const existing = await this.getStateIsnConfig(stateCode);
    return this.prisma.stateIsnConfig.update({
      where: { id: existing.id },
      data: {
        ...(dto.stateName && { stateName: dto.stateName }),
        ...(dto.rate !== undefined && { rate: dto.rate }),
        ...(dto.threshold !== undefined && { threshold: dto.threshold }),
        ...(dto.exemptions !== undefined && { exemptions: dto.exemptions }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.effectiveFrom && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async getIsnRateForState(stateCode: string, date: Date = new Date()): Promise<number> {
    const config = await this.prisma.stateIsnConfig.findFirst({
      where: {
        stateCode,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: date } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return config ? Number(config.rate) : 0.03; // Default 3%
  }

  // ============================================
  // FISCAL VALUES
  // ============================================

  async getAllFiscalValues() {
    return this.prisma.fiscalValues.findMany({
      orderBy: { year: 'desc' },
    });
  }

  async getFiscalValues(year: number) {
    const values = await this.prisma.fiscalValues.findUnique({
      where: { year },
    });
    if (!values) {
      throw new NotFoundException(`Fiscal values for year ${year} not found`);
    }
    return values;
  }

  async createFiscalValues(dto: CreateFiscalValuesDto) {
    return this.prisma.fiscalValues.create({
      data: {
        year: dto.year,
        umaDaily: dto.umaDaily,
        umaMonthly: dto.umaMonthly,
        umaYearly: dto.umaYearly,
        smgDaily: dto.smgDaily,
        smgZfnDaily: dto.smgZfnDaily,
        aguinaldoDays: dto.aguinaldoDays ?? 15,
        vacationPremiumPercent: dto.vacationPremiumPercent ?? 0.25,
        ptuDeadline: dto.ptuDeadline ? new Date(dto.ptuDeadline) : null,
        isrTableVersion: dto.isrTableVersion,
        effectiveFrom: new Date(dto.effectiveFrom),
        notes: dto.notes,
      },
    });
  }

  async updateFiscalValues(year: number, dto: UpdateFiscalValuesDto) {
    await this.getFiscalValues(year);
    return this.prisma.fiscalValues.update({
      where: { year },
      data: {
        ...(dto.umaDaily !== undefined && { umaDaily: dto.umaDaily }),
        ...(dto.umaMonthly !== undefined && { umaMonthly: dto.umaMonthly }),
        ...(dto.umaYearly !== undefined && { umaYearly: dto.umaYearly }),
        ...(dto.smgDaily !== undefined && { smgDaily: dto.smgDaily }),
        ...(dto.smgZfnDaily !== undefined && { smgZfnDaily: dto.smgZfnDaily }),
        ...(dto.aguinaldoDays !== undefined && { aguinaldoDays: dto.aguinaldoDays }),
        ...(dto.vacationPremiumPercent !== undefined && { vacationPremiumPercent: dto.vacationPremiumPercent }),
        ...(dto.ptuDeadline !== undefined && { ptuDeadline: dto.ptuDeadline ? new Date(dto.ptuDeadline) : null }),
        ...(dto.isrTableVersion !== undefined && { isrTableVersion: dto.isrTableVersion }),
        ...(dto.effectiveFrom && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async getCurrentFiscalValues(): Promise<any> {
    const currentYear = new Date().getFullYear();
    const values = await this.prisma.fiscalValues.findFirst({
      where: { year: currentYear },
    });
    if (!values) {
      // Fall back to previous year
      return this.prisma.fiscalValues.findFirst({
        orderBy: { year: 'desc' },
      });
    }
    return values;
  }

  // ============================================
  // COMPANY PAYROLL CONFIG
  // ============================================

  async getCompanyPayrollConfig(companyId: string) {
    const config = await this.prisma.companyPayrollConfig.findUnique({
      where: { companyId },
      include: { company: { select: { id: true, name: true, rfc: true, state: true } } },
    });
    return config;
  }

  async createOrUpdateCompanyPayrollConfig(dto: CreateCompanyPayrollConfigDto) {
    const existing = await this.prisma.companyPayrollConfig.findUnique({
      where: { companyId: dto.companyId },
    });

    const data = {
      defaultPeriodType: dto.defaultPeriodType ?? PeriodType.BIWEEKLY,
      payDayOfWeek: dto.payDayOfWeek,
      payDayOfMonth: dto.payDayOfMonth,
      stateCode: dto.stateCode,
      applyIsn: dto.applyIsn ?? true,
      aguinaldoDays: dto.aguinaldoDays ?? 15,
      aguinaldoPayMonth: dto.aguinaldoPayMonth ?? 12,
      aguinaldoPayDay: dto.aguinaldoPayDay ?? 20,
      vacationPremiumPercent: dto.vacationPremiumPercent ?? 0.25,
      applyPtu: dto.applyPtu ?? true,
      ptuPercent: dto.ptuPercent ?? 0.10,
      ptuPayMonth: dto.ptuPayMonth ?? 5,
      ptuPayDay: dto.ptuPayDay ?? 30,
      savingsFundEnabled: dto.savingsFundEnabled ?? false,
      savingsFundEmployeePercent: dto.savingsFundEmployeePercent,
      savingsFundCompanyPercent: dto.savingsFundCompanyPercent,
      savingsFundMaxPercent: dto.savingsFundMaxPercent ?? 0.13,
      savingsBoxEnabled: dto.savingsBoxEnabled ?? false,
      savingsBoxEmployeePercent: dto.savingsBoxEmployeePercent,
      foodVouchersEnabled: dto.foodVouchersEnabled ?? false,
      foodVouchersPercent: dto.foodVouchersPercent,
      foodVouchersMaxUma: dto.foodVouchersMaxUma,
      overtimeDoubleAfter: dto.overtimeDoubleAfter ?? 9,
      overtimeTripleAfter: dto.overtimeTripleAfter ?? 3,
      maxOvertimeHoursWeek: dto.maxOvertimeHoursWeek ?? 9,
      applySubsidioEmpleo: dto.applySubsidioEmpleo ?? true,
      roundingMethod: dto.roundingMethod ?? 'ROUND',
    };

    if (existing) {
      return this.prisma.companyPayrollConfig.update({
        where: { companyId: dto.companyId },
        data,
      });
    }

    return this.prisma.companyPayrollConfig.create({
      data: {
        companyId: dto.companyId,
        ...data,
      },
    });
  }

  async updateCompanyPayrollConfig(companyId: string, dto: UpdateCompanyPayrollConfigDto) {
    const config = await this.getCompanyPayrollConfig(companyId);
    if (!config) {
      throw new NotFoundException(`Payroll config for company ${companyId} not found`);
    }

    return this.prisma.companyPayrollConfig.update({
      where: { companyId },
      data: {
        ...(dto.defaultPeriodType && { defaultPeriodType: dto.defaultPeriodType }),
        ...(dto.payDayOfWeek !== undefined && { payDayOfWeek: dto.payDayOfWeek }),
        ...(dto.payDayOfMonth !== undefined && { payDayOfMonth: dto.payDayOfMonth }),
        ...(dto.stateCode !== undefined && { stateCode: dto.stateCode }),
        ...(dto.applyIsn !== undefined && { applyIsn: dto.applyIsn }),
        ...(dto.aguinaldoDays !== undefined && { aguinaldoDays: dto.aguinaldoDays }),
        ...(dto.aguinaldoPayMonth !== undefined && { aguinaldoPayMonth: dto.aguinaldoPayMonth }),
        ...(dto.aguinaldoPayDay !== undefined && { aguinaldoPayDay: dto.aguinaldoPayDay }),
        ...(dto.vacationPremiumPercent !== undefined && { vacationPremiumPercent: dto.vacationPremiumPercent }),
        ...(dto.applyPtu !== undefined && { applyPtu: dto.applyPtu }),
        ...(dto.ptuPercent !== undefined && { ptuPercent: dto.ptuPercent }),
        ...(dto.ptuPayMonth !== undefined && { ptuPayMonth: dto.ptuPayMonth }),
        ...(dto.ptuPayDay !== undefined && { ptuPayDay: dto.ptuPayDay }),
        ...(dto.savingsFundEnabled !== undefined && { savingsFundEnabled: dto.savingsFundEnabled }),
        ...(dto.savingsFundEmployeePercent !== undefined && { savingsFundEmployeePercent: dto.savingsFundEmployeePercent }),
        ...(dto.savingsFundCompanyPercent !== undefined && { savingsFundCompanyPercent: dto.savingsFundCompanyPercent }),
        ...(dto.savingsFundMaxPercent !== undefined && { savingsFundMaxPercent: dto.savingsFundMaxPercent }),
        ...(dto.savingsBoxEnabled !== undefined && { savingsBoxEnabled: dto.savingsBoxEnabled }),
        ...(dto.savingsBoxEmployeePercent !== undefined && { savingsBoxEmployeePercent: dto.savingsBoxEmployeePercent }),
        ...(dto.foodVouchersEnabled !== undefined && { foodVouchersEnabled: dto.foodVouchersEnabled }),
        ...(dto.foodVouchersPercent !== undefined && { foodVouchersPercent: dto.foodVouchersPercent }),
        ...(dto.foodVouchersMaxUma !== undefined && { foodVouchersMaxUma: dto.foodVouchersMaxUma }),
        ...(dto.overtimeDoubleAfter !== undefined && { overtimeDoubleAfter: dto.overtimeDoubleAfter }),
        ...(dto.overtimeTripleAfter !== undefined && { overtimeTripleAfter: dto.overtimeTripleAfter }),
        ...(dto.maxOvertimeHoursWeek !== undefined && { maxOvertimeHoursWeek: dto.maxOvertimeHoursWeek }),
        ...(dto.applySubsidioEmpleo !== undefined && { applySubsidioEmpleo: dto.applySubsidioEmpleo }),
        ...(dto.roundingMethod !== undefined && { roundingMethod: dto.roundingMethod }),
      },
    });
  }

  // ============================================
  // ISR TABLE
  // ============================================

  async getIsrTable(year: number, periodType: PeriodType) {
    return this.prisma.isrTable.findMany({
      where: { year, periodType },
      orderBy: { lowerLimit: 'asc' },
    });
  }

  async getAllIsrTables() {
    const tables = await this.prisma.isrTable.findMany({
      orderBy: [{ year: 'desc' }, { periodType: 'asc' }, { lowerLimit: 'asc' }],
    });

    // Group by year and periodType
    const grouped: Record<string, any[]> = {};
    for (const row of tables) {
      const key = `${row.year}-${row.periodType}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    return Object.entries(grouped).map(([key, rows]) => {
      const [year, periodType] = key.split('-');
      return { year: Number(year), periodType, rows };
    });
  }

  async createIsrTableRow(dto: CreateIsrTableDto) {
    return this.prisma.isrTable.create({
      data: {
        year: dto.year,
        periodType: dto.periodType,
        lowerLimit: dto.lowerLimit,
        upperLimit: dto.upperLimit,
        fixedFee: dto.fixedFee,
        rateOnExcess: dto.rateOnExcess,
      },
    });
  }

  async updateIsrTableRow(id: string, dto: UpdateIsrTableDto) {
    return this.prisma.isrTable.update({
      where: { id },
      data: {
        ...(dto.upperLimit !== undefined && { upperLimit: dto.upperLimit }),
        ...(dto.fixedFee !== undefined && { fixedFee: dto.fixedFee }),
        ...(dto.rateOnExcess !== undefined && { rateOnExcess: dto.rateOnExcess }),
      },
    });
  }

  async deleteIsrTableRow(id: string) {
    return this.prisma.isrTable.delete({ where: { id } });
  }

  // Calculate ISR for a given base
  async calculateIsr(taxableIncome: number, year: number, periodType: PeriodType): Promise<{ isr: number; subsidio: number; netIsr: number }> {
    const isrTable = await this.getIsrTable(year, periodType);
    const subsidioTable = await this.getSubsidioEmpleoTable(year, periodType);

    let isr = 0;
    let subsidio = 0;

    // Find ISR bracket
    for (const bracket of isrTable) {
      if (taxableIncome >= Number(bracket.lowerLimit) && taxableIncome <= Number(bracket.upperLimit)) {
        const excess = taxableIncome - Number(bracket.lowerLimit);
        isr = Number(bracket.fixedFee) + (excess * Number(bracket.rateOnExcess));
        break;
      }
    }

    // Find Subsidio bracket
    for (const bracket of subsidioTable) {
      if (taxableIncome >= Number(bracket.lowerLimit) && taxableIncome <= Number(bracket.upperLimit)) {
        subsidio = Number(bracket.subsidyAmount);
        break;
      }
    }

    const netIsr = Math.max(0, isr - subsidio);

    return { isr: Math.round(isr * 100) / 100, subsidio: Math.round(subsidio * 100) / 100, netIsr: Math.round(netIsr * 100) / 100 };
  }

  // ============================================
  // SUBSIDIO AL EMPLEO TABLE
  // ============================================

  async getSubsidioEmpleoTable(year: number, periodType: PeriodType) {
    return this.prisma.subsidioEmpleoTable.findMany({
      where: { year, periodType },
      orderBy: { lowerLimit: 'asc' },
    });
  }

  async getAllSubsidioEmpleoTables() {
    const tables = await this.prisma.subsidioEmpleoTable.findMany({
      orderBy: [{ year: 'desc' }, { periodType: 'asc' }, { lowerLimit: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    for (const row of tables) {
      const key = `${row.year}-${row.periodType}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    return Object.entries(grouped).map(([key, rows]) => {
      const [year, periodType] = key.split('-');
      return { year: Number(year), periodType, rows };
    });
  }

  async createSubsidioEmpleoTableRow(dto: CreateSubsidioEmpleoTableDto) {
    return this.prisma.subsidioEmpleoTable.create({
      data: {
        year: dto.year,
        periodType: dto.periodType,
        lowerLimit: dto.lowerLimit,
        upperLimit: dto.upperLimit,
        subsidyAmount: dto.subsidyAmount,
      },
    });
  }

  async updateSubsidioEmpleoTableRow(id: string, dto: UpdateSubsidioEmpleoTableDto) {
    return this.prisma.subsidioEmpleoTable.update({
      where: { id },
      data: {
        ...(dto.upperLimit !== undefined && { upperLimit: dto.upperLimit }),
        ...(dto.subsidyAmount !== undefined && { subsidyAmount: dto.subsidyAmount }),
      },
    });
  }

  async deleteSubsidioEmpleoTableRow(id: string) {
    return this.prisma.subsidioEmpleoTable.delete({ where: { id } });
  }

  // ============================================
  // IMSS RATES
  // ============================================

  async getImssRates(year: number) {
    return this.prisma.imssRate.findMany({
      where: { year },
      orderBy: { concept: 'asc' },
    });
  }

  async getAllImssRates() {
    return this.prisma.imssRate.findMany({
      orderBy: [{ year: 'desc' }, { concept: 'asc' }],
    });
  }

  async createImssRate(dto: CreateImssRateDto) {
    return this.prisma.imssRate.create({
      data: {
        year: dto.year,
        concept: dto.concept,
        employerRate: dto.employerRate,
        employeeRate: dto.employeeRate,
        salaryBase: dto.salaryBase as any,
      },
    });
  }

  async updateImssRate(id: string, dto: UpdateImssRateDto) {
    return this.prisma.imssRate.update({
      where: { id },
      data: {
        ...(dto.employerRate !== undefined && { employerRate: dto.employerRate }),
        ...(dto.employeeRate !== undefined && { employeeRate: dto.employeeRate }),
        ...(dto.salaryBase !== undefined && { salaryBase: dto.salaryBase as any }),
      },
    });
  }

  async deleteImssRate(id: string) {
    return this.prisma.imssRate.delete({ where: { id } });
  }

  // ============================================
  // DASHBOARD / SUMMARY
  // ============================================

  async getAccountingConfigSummary() {
    const [
      stateConfigs,
      fiscalValues,
      imssRates,
      isrTables,
      subsidioTables,
    ] = await Promise.all([
      this.prisma.stateIsnConfig.count({ where: { isActive: true } }),
      this.prisma.fiscalValues.findMany({ orderBy: { year: 'desc' }, take: 3 }),
      this.prisma.imssRate.findMany({ where: { year: new Date().getFullYear() } }),
      this.prisma.isrTable.count({ where: { year: new Date().getFullYear() } }),
      this.prisma.subsidioEmpleoTable.count({ where: { year: new Date().getFullYear() } }),
    ]);

    return {
      stateIsnConfigs: stateConfigs,
      fiscalValues,
      imssRatesCount: imssRates.length,
      imssRates,
      isrTableRowsCurrentYear: isrTables,
      subsidioTableRowsCurrentYear: subsidioTables,
    };
  }
}
