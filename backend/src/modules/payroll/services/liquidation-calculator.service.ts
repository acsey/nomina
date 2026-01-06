import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AccountingConfigService } from '@/modules/accounting-config/accounting-config.service';
import { LiquidationType, LiquidationStatus, PeriodType } from '@/common/types/prisma-enums';

interface LiquidationInput {
  employeeId: string;
  terminationDate: string | Date;
  type: LiquidationType;
  terminationReason?: string;
}

interface LiquidationBreakdown {
  // Employee info
  employeeId: string;
  employeeName: string;
  hireDate: Date;
  terminationDate: Date;
  yearsOfService: number;
  daysOfService: number;

  // Salary info
  dailySalary: number;
  integratedSalary: number;

  // Perceptions
  pendingSalary: number;
  pendingSalaryDays: number;
  proportionalAguinaldo: number;
  proportionalAguinaldoDays: number;
  proportionalVacation: number;
  proportionalVacationDays: number;
  vacationPremium: number;

  // Only for LIQUIDACION (unjustified dismissal)
  indemnization90Days: number;
  indemnization20Days: number;
  indemnization20DaysYears: number;
  seniorityPremium: number;
  seniorityPremiumDays: number;

  // Deductions
  pendingLoans: number;
  pendingInfonavit: number;
  isrRetention: number;
  otherDeductions: number;

  // Totals
  grossTotal: number;
  totalDeductions: number;
  netTotal: number;

  // Details
  type: LiquidationType;
  calculationDetails: any;
}

@Injectable()
export class LiquidationCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingConfig: AccountingConfigService,
  ) {}

  /**
   * Calculate liquidation/finiquito for an employee
   * Based on Mexican Federal Labor Law (LFT)
   */
  async calculate(input: LiquidationInput): Promise<LiquidationBreakdown> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        company: true,
        infonavitCredits: { where: { isActive: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const terminationDate = typeof input.terminationDate === 'string'
      ? new Date(input.terminationDate)
      : input.terminationDate;
    const hireDate = new Date(employee.hireDate);

    // Validate termination date
    if (terminationDate <= hireDate) {
      throw new BadRequestException('La fecha de terminación debe ser posterior a la fecha de contratación');
    }

    // Get company payroll config
    const companyConfig = await this.accountingConfig.getCompanyPayrollConfig(employee.companyId);

    // Get current fiscal values
    const fiscalValues = await this.accountingConfig.getCurrentFiscalValues();

    // Calculate years and days of service
    const diffTime = terminationDate.getTime() - hireDate.getTime();
    const daysOfService = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const yearsOfService = daysOfService / 365;

    // Calculate daily salary
    const dailySalary = Number(employee.baseSalary) / 30;

    // Calculate integrated salary (SDI for IMSS purposes)
    // Simplified: daily salary + proportional aguinaldo + proportional vacation premium
    const aguinaldoDays = companyConfig?.aguinaldoDays || 15;
    const vacationPremiumPercent = companyConfig ? Number(companyConfig.vacationPremiumPercent) : 0.25;
    const vacationDays = this.getVacationDaysByYear(Math.floor(yearsOfService));

    const aguinaldoFactor = aguinaldoDays / 365;
    const vacationFactor = (vacationDays * vacationPremiumPercent) / 365;
    const integratedSalary = dailySalary * (1 + aguinaldoFactor + vacationFactor);

    // Calculate perceptions
    const currentYear = terminationDate.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const daysWorkedThisYear = Math.floor((terminationDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 1. Pending salary (days from last payroll to termination)
    // Simplified: calculate based on termination day of month
    const dayOfMonth = terminationDate.getDate();
    const pendingSalaryDays = dayOfMonth;
    const pendingSalary = dailySalary * pendingSalaryDays;

    // 2. Proportional aguinaldo
    const proportionalAguinaldoDays = (daysWorkedThisYear / 365) * aguinaldoDays;
    const proportionalAguinaldo = dailySalary * proportionalAguinaldoDays;

    // 3. Proportional vacation (days earned but not taken this year)
    const proportionalVacationDays = (daysWorkedThisYear / 365) * vacationDays;
    const proportionalVacation = dailySalary * proportionalVacationDays;

    // 4. Vacation premium (25% or more of vacation days)
    const vacationPremium = proportionalVacation * vacationPremiumPercent;

    // For LIQUIDACION only (unjustified dismissal)
    let indemnization90Days = 0;
    let indemnization20Days = 0;
    let indemnization20DaysYears = 0;
    let seniorityPremium = 0;
    let seniorityPremiumDays = 0;

    if (input.type === LiquidationType.LIQUIDACION || input.type === LiquidationType.TERMINATION) {
      // 5. 90 days constitutional indemnization (Art. 48 LFT)
      indemnization90Days = integratedSalary * 90;

      // 6. 20 days per year of service (Art. 50 Fracción II LFT)
      indemnization20DaysYears = Math.floor(yearsOfService);
      indemnization20Days = integratedSalary * 20 * indemnization20DaysYears;

      // 7. Seniority premium: 12 days per year (capped at 2x SMG)
      // Only for employees with 15+ years or unjustified dismissal
      if (yearsOfService >= 15 || input.type === 'LIQUIDACION') {
        seniorityPremiumDays = 12 * Math.floor(yearsOfService);
        const smgDaily = fiscalValues ? Number(fiscalValues.smgDaily) : 278.80;
        const cappedDailySalary = Math.min(dailySalary, smgDaily * 2);
        seniorityPremium = cappedDailySalary * seniorityPremiumDays;
      }
    }

    // Calculate deductions
    // Get pending INFONAVIT
    let pendingInfonavit = 0;
    if (employee.infonavitCredits.length > 0) {
      // This would need more complex calculation based on actual balance
      // For now, we'll leave it as 0 and let HR input manually
    }

    // Pending loans - would come from a loans system
    const pendingLoans = 0;
    const otherDeductions = 0;

    // Calculate gross total
    const grossTotal = pendingSalary + proportionalAguinaldo + proportionalVacation +
                       vacationPremium + indemnization90Days + indemnization20Days + seniorityPremium;

    // Calculate ISR retention
    // For liquidations, there's a special ISR calculation
    // Simplified: estimate based on annual equivalent
    const isrRetention = await this.calculateLiquidationIsr(
      grossTotal,
      yearsOfService,
      input.type,
    );

    const totalDeductions = pendingLoans + pendingInfonavit + isrRetention + otherDeductions;
    const netTotal = grossTotal - totalDeductions;

    const breakdown: LiquidationBreakdown = {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      hireDate,
      terminationDate,
      yearsOfService: Math.round(yearsOfService * 100) / 100,
      daysOfService,

      dailySalary: Math.round(dailySalary * 100) / 100,
      integratedSalary: Math.round(integratedSalary * 100) / 100,

      pendingSalary: Math.round(pendingSalary * 100) / 100,
      pendingSalaryDays,
      proportionalAguinaldo: Math.round(proportionalAguinaldo * 100) / 100,
      proportionalAguinaldoDays: Math.round(proportionalAguinaldoDays * 100) / 100,
      proportionalVacation: Math.round(proportionalVacation * 100) / 100,
      proportionalVacationDays: Math.round(proportionalVacationDays * 100) / 100,
      vacationPremium: Math.round(vacationPremium * 100) / 100,

      indemnization90Days: Math.round(indemnization90Days * 100) / 100,
      indemnization20Days: Math.round(indemnization20Days * 100) / 100,
      indemnization20DaysYears,
      seniorityPremium: Math.round(seniorityPremium * 100) / 100,
      seniorityPremiumDays,

      pendingLoans: Math.round(pendingLoans * 100) / 100,
      pendingInfonavit: Math.round(pendingInfonavit * 100) / 100,
      isrRetention: Math.round(isrRetention * 100) / 100,
      otherDeductions: Math.round(otherDeductions * 100) / 100,

      grossTotal: Math.round(grossTotal * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netTotal: Math.round(netTotal * 100) / 100,

      type: input.type,
      calculationDetails: {
        aguinaldoDays,
        vacationDays,
        vacationPremiumPercent,
        daysWorkedThisYear,
        companyConfig: companyConfig ? {
          stateCode: companyConfig.stateCode,
          aguinaldoDays: companyConfig.aguinaldoDays,
          vacationPremiumPercent: Number(companyConfig.vacationPremiumPercent),
        } : null,
      },
    };

    return breakdown;
  }

  /**
   * Save a liquidation calculation
   */
  async saveLiquidation(
    input: LiquidationInput & { saveToDb?: boolean },
  ): Promise<any> {
    const breakdown = await this.calculate(input);

    if (!input.saveToDb) {
      return { preview: true, breakdown };
    }

    const terminationDate = typeof input.terminationDate === 'string'
      ? new Date(input.terminationDate)
      : input.terminationDate;

    const liquidation = await this.prisma.liquidationCalculation.create({
      data: {
        employeeId: input.employeeId,
        type: input.type,
        terminationDate,
        terminationReason: input.terminationReason,
        dailySalary: breakdown.dailySalary,
        integratedSalary: breakdown.integratedSalary,
        yearsOfService: breakdown.yearsOfService,
        pendingSalary: breakdown.pendingSalary,
        proportionalAguinaldo: breakdown.proportionalAguinaldo,
        proportionalVacation: breakdown.proportionalVacation,
        vacationPremium: breakdown.vacationPremium,
        indemnization90Days: breakdown.indemnization90Days,
        indemnization20Days: breakdown.indemnization20Days,
        seniorityPremium: breakdown.seniorityPremium,
        pendingLoans: breakdown.pendingLoans,
        pendingInfonavit: breakdown.pendingInfonavit,
        isrRetention: breakdown.isrRetention,
        otherDeductions: breakdown.otherDeductions,
        grossTotal: breakdown.grossTotal,
        totalDeductions: breakdown.totalDeductions,
        netTotal: breakdown.netTotal,
        status: LiquidationStatus.DRAFT,
        calculationDetails: breakdown.calculationDetails,
      },
    });

    return { saved: true, liquidation, breakdown };
  }

  /**
   * Get vacation days based on years of service per LFT Art. 76
   */
  private getVacationDaysByYear(years: number): number {
    if (years < 1) return 0;
    if (years === 1) return 12;
    if (years === 2) return 14;
    if (years === 3) return 16;
    if (years === 4) return 18;
    if (years >= 5 && years < 10) return 20;
    if (years >= 10 && years < 15) return 22;
    if (years >= 15 && years < 20) return 24;
    if (years >= 20 && years < 25) return 26;
    if (years >= 25 && years < 30) return 28;
    return 30; // 30+ years
  }

  /**
   * Calculate ISR for liquidation payments
   * Art. 96 LISR - Special treatment for liquidations
   */
  private async calculateLiquidationIsr(
    grossTotal: number,
    yearsOfService: number,
    type: LiquidationType,
  ): Promise<number> {
    // For finiquito (voluntary resignation), normal ISR applies
    // For liquidación, there's a special calculation method

    if (type === LiquidationType.FINIQUITO || type === LiquidationType.RESIGNATION) {
      // Apply normal ISR table to annual equivalent
      const currentYear = new Date().getFullYear();
      try {
        const result = await this.accountingConfig.calculateIsr(
          grossTotal / 12, // Monthly equivalent
          currentYear,
          PeriodType.MONTHLY,
        );
        return result.netIsr;
      } catch {
        // Fallback: estimate 15% for medium income
        return grossTotal * 0.15;
      }
    }

    // For liquidación - Art. 96 LISR special treatment
    // Last monthly salary is exempt up to certain limit
    // The rest is subject to special rates

    // Simplified calculation for now
    // In practice, this involves complex calculations based on:
    // - Last monthly salary
    // - Years of service
    // - Separation type

    const yearsForCalc = Math.max(1, Math.floor(yearsOfService));

    // Exempt amount: Last monthly salary × years of service (capped)
    // This is a simplification - real calculation is more complex
    const estimatedMonthlySalary = grossTotal / yearsForCalc / 12;
    const exemptAmount = Math.min(estimatedMonthlySalary * yearsForCalc, grossTotal * 0.3);

    const taxableAmount = grossTotal - exemptAmount;

    // Apply approximately 25% for medium-high income
    // In production, this should use actual ISR tables
    return taxableAmount * 0.25;
  }

  /**
   * Get all liquidations for an employee
   */
  async getEmployeeLiquidations(employeeId: string) {
    return this.prisma.liquidationCalculation.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific liquidation
   */
  async getLiquidation(id: string) {
    const liquidation = await this.prisma.liquidationCalculation.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            rfc: true,
            curp: true,
            hireDate: true,
            baseSalary: true,
          },
        },
      },
    });

    if (!liquidation) {
      throw new NotFoundException('Liquidación no encontrada');
    }

    return liquidation;
  }

  /**
   * Approve a liquidation
   */
  async approveLiquidation(id: string, approvedById: string) {
    const liquidation = await this.getLiquidation(id);

    if (liquidation.status !== LiquidationStatus.DRAFT && liquidation.status !== LiquidationStatus.CALCULATED) {
      throw new BadRequestException('Solo se pueden aprobar liquidaciones en estado borrador o calculado');
    }

    return this.prisma.liquidationCalculation.update({
      where: { id },
      data: {
        status: LiquidationStatus.APPROVED,
        approvedAt: new Date(),
        approvedById,
      },
    });
  }

  /**
   * Mark liquidation as paid
   */
  async markAsPaid(id: string) {
    const liquidation = await this.getLiquidation(id);

    if (liquidation.status !== LiquidationStatus.APPROVED) {
      throw new BadRequestException('Solo se pueden marcar como pagadas las liquidaciones aprobadas');
    }

    // Also terminate the employee
    await this.prisma.employee.update({
      where: { id: liquidation.employeeId },
      data: {
        status: 'TERMINATED',
        isActive: false,
        terminationDate: liquidation.terminationDate,
      },
    });

    return this.prisma.liquidationCalculation.update({
      where: { id },
      data: {
        status: LiquidationStatus.PAID,
        paidAt: new Date(),
      },
    });
  }

  /**
   * Cancel a liquidation
   */
  async cancelLiquidation(id: string) {
    const liquidation = await this.getLiquidation(id);

    if (liquidation.status === LiquidationStatus.PAID) {
      throw new BadRequestException('No se pueden cancelar liquidaciones ya pagadas');
    }

    return this.prisma.liquidationCalculation.update({
      where: { id },
      data: {
        status: LiquidationStatus.CANCELLED,
      },
    });
  }
}
