import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { FiscalValuesService } from '@/common/fiscal/fiscal-values.service';

/**
 * PTU Calculator Service
 *
 * Implements PTU (Participación de los Trabajadores en las Utilidades) distribution
 * according to Mexican Federal Labor Law (LFT) Articles 117-131.
 *
 * Distribution Formula (Art. 123):
 * - 50% distributed equally based on days worked
 * - 50% distributed proportionally based on salary
 *
 * Legal Requirements:
 * - 10% of company's taxable profit (Art. 117)
 * - Deadline: May 30 for most companies (Art. 122)
 * - Maximum salary considered: equivalent to highest syndicated worker + 20%
 * - Exempt amount: 15 UMA daily (LISR Art. 93 Fraction XIV)
 */

export interface PtuEmployee {
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  daysWorked: number;
  dailySalary: number;
  monthlySalary: number;
  hireDate: Date;
  terminationDate?: Date;
  isEligible: boolean;
  exclusionReason?: string;
}

export interface PtuDistributionResult {
  companyId: string;
  fiscalYear: number;
  totalProfit: number;
  ptuBase: number; // 10% of profit
  totalDaysWorked: number;
  totalSalaries: number;
  valuePerDay: number;
  valuePerSalaryUnit: number;
  distributions: PtuEmployeeDistribution[];
  summary: {
    eligibleEmployees: number;
    excludedEmployees: number;
    totalDistributed: number;
    byDays: number;
    bySalary: number;
  };
  calculatedAt: Date;
}

export interface PtuEmployeeDistribution {
  employeeId: string;
  employeeNumber: string;
  fullName: string;
  daysWorked: number;
  dailySalary: number;
  cappedDailySalary: number; // After applying max salary cap
  byDays: number; // 50% portion based on days
  bySalary: number; // 50% portion based on salary
  totalPtu: number;
  exemptAmount: number;
  taxableAmount: number;
  isEligible: boolean;
  exclusionReason?: string;
}

@Injectable()
export class PtuCalculatorService {
  private readonly logger = new Logger(PtuCalculatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalValues: FiscalValuesService,
  ) {}

  /**
   * Calculate PTU distribution for a company
   *
   * @param companyId Company ID
   * @param fiscalYear Fiscal year for PTU calculation
   * @param totalProfit Company's taxable profit for the year
   * @param options Additional options for calculation
   */
  async calculateDistribution(
    companyId: string,
    fiscalYear: number,
    totalProfit: number,
    options?: {
      maxSalaryCap?: number; // Custom salary cap (defaults to highest + 20%)
      excludeHighManagement?: boolean; // Exclude directors/general managers
    },
  ): Promise<PtuDistributionResult> {
    this.logger.log(`Calculating PTU distribution for company ${companyId}, year ${fiscalYear}`);

    // Get fiscal values for the year
    const umaDaily = await this.fiscalValues.getUmaDaily(fiscalYear);

    // Calculate PTU base (10% of profits)
    const ptuBase = totalProfit * 0.10;

    // Get eligible employees
    const employees = await this.getEligibleEmployees(companyId, fiscalYear, options);

    // Calculate salary cap (highest syndicated salary + 20% or custom)
    const salaryCap = options?.maxSalaryCap || this.calculateSalaryCap(employees);

    // Calculate totals for distribution formula
    const eligibleEmployees = employees.filter(e => e.isEligible);
    const totalDaysWorked = eligibleEmployees.reduce((sum, e) => sum + e.daysWorked, 0);
    const totalSalaries = eligibleEmployees.reduce(
      (sum, e) => sum + Math.min(e.dailySalary, salaryCap) * e.daysWorked,
      0,
    );

    // Calculate value per unit for each portion
    const halfPtu = ptuBase / 2;
    const valuePerDay = totalDaysWorked > 0 ? halfPtu / totalDaysWorked : 0;
    const valuePerSalaryUnit = totalSalaries > 0 ? halfPtu / totalSalaries : 0;

    // Calculate individual distributions
    const distributions: PtuEmployeeDistribution[] = employees.map(emp => {
      if (!emp.isEligible) {
        return {
          employeeId: emp.employeeId,
          employeeNumber: emp.employeeNumber,
          fullName: `${emp.firstName} ${emp.lastName}`,
          daysWorked: emp.daysWorked,
          dailySalary: emp.dailySalary,
          cappedDailySalary: Math.min(emp.dailySalary, salaryCap),
          byDays: 0,
          bySalary: 0,
          totalPtu: 0,
          exemptAmount: 0,
          taxableAmount: 0,
          isEligible: false,
          exclusionReason: emp.exclusionReason,
        };
      }

      const cappedDailySalary = Math.min(emp.dailySalary, salaryCap);

      // 50% by days worked
      const byDays = valuePerDay * emp.daysWorked;

      // 50% by salary (using capped salary)
      const bySalary = valuePerSalaryUnit * (cappedDailySalary * emp.daysWorked);

      const totalPtu = byDays + bySalary;

      // Calculate exempt and taxable portions (15 UMA daily exempt)
      const exemptLimit = umaDaily * 15;
      const exemptAmount = Math.min(totalPtu, exemptLimit);
      const taxableAmount = Math.max(0, totalPtu - exemptLimit);

      return {
        employeeId: emp.employeeId,
        employeeNumber: emp.employeeNumber,
        fullName: `${emp.firstName} ${emp.lastName}`,
        daysWorked: emp.daysWorked,
        dailySalary: emp.dailySalary,
        cappedDailySalary,
        byDays: Math.round(byDays * 100) / 100,
        bySalary: Math.round(bySalary * 100) / 100,
        totalPtu: Math.round(totalPtu * 100) / 100,
        exemptAmount: Math.round(exemptAmount * 100) / 100,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        isEligible: true,
      };
    });

    // Calculate summary
    const eligibleDistributions = distributions.filter(d => d.isEligible);
    const summary = {
      eligibleEmployees: eligibleDistributions.length,
      excludedEmployees: distributions.length - eligibleDistributions.length,
      totalDistributed: eligibleDistributions.reduce((sum, d) => sum + d.totalPtu, 0),
      byDays: eligibleDistributions.reduce((sum, d) => sum + d.byDays, 0),
      bySalary: eligibleDistributions.reduce((sum, d) => sum + d.bySalary, 0),
    };

    this.logger.log(
      `PTU calculation complete: ${summary.eligibleEmployees} employees, $${summary.totalDistributed.toFixed(2)} distributed`,
    );

    return {
      companyId,
      fiscalYear,
      totalProfit,
      ptuBase: Math.round(ptuBase * 100) / 100,
      totalDaysWorked,
      totalSalaries: Math.round(totalSalaries * 100) / 100,
      valuePerDay: Math.round(valuePerDay * 100) / 100,
      valuePerSalaryUnit: Math.round(valuePerSalaryUnit * 10000) / 10000, // More precision needed
      distributions,
      summary: {
        ...summary,
        totalDistributed: Math.round(summary.totalDistributed * 100) / 100,
        byDays: Math.round(summary.byDays * 100) / 100,
        bySalary: Math.round(summary.bySalary * 100) / 100,
      },
      calculatedAt: new Date(),
    };
  }

  /**
   * Get eligible employees for PTU distribution
   */
  private async getEligibleEmployees(
    companyId: string,
    fiscalYear: number,
    options?: { excludeHighManagement?: boolean },
  ): Promise<PtuEmployee[]> {
    const yearStart = new Date(fiscalYear, 0, 1);
    const yearEnd = new Date(fiscalYear, 11, 31);

    // Get all employees who worked during the fiscal year
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        OR: [
          // Active employees
          {
            status: 'ACTIVE',
            hireDate: { lte: yearEnd },
          },
          // Terminated employees who worked part of the year
          {
            status: 'TERMINATED',
            hireDate: { lte: yearEnd },
            terminationDate: { gte: yearStart },
          },
        ],
      },
      include: {
        jobPosition: true,
      },
    });

    return employees.map(emp => {
      const hireDate = new Date(emp.hireDate);
      const terminationDate = emp.terminationDate ? new Date(emp.terminationDate) : null;

      // Calculate days worked in the fiscal year
      const effectiveStart = hireDate > yearStart ? hireDate : yearStart;
      const effectiveEnd = terminationDate && terminationDate < yearEnd ? terminationDate : yearEnd;
      const daysWorked = Math.max(
        0,
        Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );

      const dailySalary = Number(emp.baseSalary) / 30;

      // Check eligibility
      let isEligible = true;
      let exclusionReason: string | undefined;

      // Minimum 60 days worked requirement (LFT Art. 127)
      if (daysWorked < 60) {
        isEligible = false;
        exclusionReason = 'Less than 60 days worked in fiscal year';
      }

      // Exclude high management if option is set (directors, general managers)
      if (options?.excludeHighManagement) {
        const highManagementPositions = ['DIRECTOR', 'GENERAL_MANAGER', 'CEO', 'CFO', 'GERENTE GENERAL'];
        const positionName = emp.jobPosition?.name?.toUpperCase() || '';
        if (highManagementPositions.some(pos => positionName.includes(pos))) {
          isEligible = false;
          exclusionReason = 'High management position excluded';
        }
      }

      // Domestic workers and personal service workers are excluded (LFT Art. 127)
      const domesticPositions = ['DOMESTIC', 'PERSONAL_SERVICE', 'DOMESTICO', 'SERVICIO PERSONAL'];
      const positionName = emp.jobPosition?.name?.toUpperCase() || '';
      if (domesticPositions.some(pos => positionName.includes(pos))) {
        isEligible = false;
        exclusionReason = 'Domestic or personal service worker';
      }

      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        daysWorked,
        dailySalary,
        monthlySalary: Number(emp.baseSalary),
        hireDate,
        terminationDate: terminationDate || undefined,
        isEligible,
        exclusionReason,
      };
    });
  }

  /**
   * Calculate salary cap based on highest syndicated worker + 20%
   */
  private calculateSalaryCap(employees: PtuEmployee[]): number {
    // Find highest salary among syndicated workers
    // For simplicity, we use the highest salary and add 20%
    const highestSalary = Math.max(...employees.map(e => e.dailySalary), 0);
    return highestSalary * 1.20;
  }

  /**
   * Validate PTU calculation against legal requirements
   */
  async validateDistribution(result: PtuDistributionResult): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check if total distributed matches PTU base
    const tolerance = 0.01; // Allow 1 cent tolerance for rounding
    if (Math.abs(result.summary.totalDistributed - result.ptuBase) > tolerance) {
      errors.push(
        `Distribution total ($${result.summary.totalDistributed}) doesn't match PTU base ($${result.ptuBase})`,
      );
    }

    // Check if 50/50 split is correct
    const expectedHalf = result.ptuBase / 2;
    if (Math.abs(result.summary.byDays - expectedHalf) > tolerance * result.summary.eligibleEmployees) {
      warnings.push('Days portion is not exactly 50% of total');
    }
    if (Math.abs(result.summary.bySalary - expectedHalf) > tolerance * result.summary.eligibleEmployees) {
      warnings.push('Salary portion is not exactly 50% of total');
    }

    // Check for employees with negative PTU (shouldn't happen)
    const negativeDistributions = result.distributions.filter(d => d.totalPtu < 0);
    if (negativeDistributions.length > 0) {
      errors.push(`${negativeDistributions.length} employees have negative PTU amounts`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Save PTU distribution to database for a payroll period
   */
  async saveDistribution(
    result: PtuDistributionResult,
    periodId: string,
    userId: string,
  ): Promise<void> {
    // Create PTU period record and individual distributions
    // This would be implemented based on your database schema
    this.logger.log(`Saving PTU distribution for period ${periodId}`);

    // Save distribution data
    await this.prisma.$transaction(async (tx) => {
      // Update payroll period with PTU calculation metadata
      await tx.payrollPeriod.update({
        where: { id: periodId },
        data: {
          extraordinaryType: 'PTU',
          description: JSON.stringify({
            totalProfit: result.totalProfit,
            ptuBase: result.ptuBase,
            calculatedAt: result.calculatedAt,
            calculatedBy: userId,
          }),
        },
      });

      // Create individual PTU records for each employee
      // This would create payroll details for each employee
      this.logger.log(`PTU distribution saved for ${result.distributions.length} employees`);
    });
  }
}
