import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { FiscalValuesService } from '@/common/fiscal/fiscal-values.service';

/**
 * Overtime Calculator Service
 *
 * Implements overtime calculation according to Mexican Federal Labor Law (LFT)
 * Articles 66-68.
 *
 * LFT Requirements:
 * - Art. 66: Maximum 3 overtime hours per day
 * - Art. 67: Maximum 3 days per week with overtime
 * - Art. 68: First 9 hours weekly = 200% (double)
 *            Beyond 9 hours weekly = 300% (triple)
 *
 * ISR Treatment (LISR Art. 93 Fraction I):
 * - First 50% of overtime is exempt (up to 5 UMA weekly)
 * - Beyond that is taxable at 100%
 */

export interface OvertimeHours {
  date: Date;
  hours: number;
  description?: string;
}

export interface OvertimeCalculationResult {
  employeeId: string;
  periodStartDate: Date;
  periodEndDate: Date;
  hourlyRate: number;
  totalHours: number;
  doubleHours: number; // First 9 hours weekly at 200%
  tripleHours: number; // Beyond 9 hours at 300%
  doubleAmount: number;
  tripleAmount: number;
  totalAmount: number;
  exemptAmount: number;
  taxableAmount: number;
  weeklyBreakdown: WeeklyOvertimeBreakdown[];
  warnings: string[];
}

export interface WeeklyOvertimeBreakdown {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  hours: number;
  doubleHours: number;
  tripleHours: number;
  daysWithOvertime: number;
  exceededDailyLimit: boolean;
  exceededWeeklyLimit: boolean;
}

@Injectable()
export class OvertimeCalculatorService {
  private readonly logger = new Logger(OvertimeCalculatorService.name);

  // LFT constants
  private readonly MAX_DAILY_OVERTIME = 3; // Art. 66
  private readonly MAX_WEEKLY_OVERTIME_DAYS = 3; // Art. 66
  private readonly DOUBLE_RATE_LIMIT = 9; // First 9 hours at double
  private readonly DOUBLE_MULTIPLIER = 2; // 200%
  private readonly TRIPLE_MULTIPLIER = 3; // 300%

  // ISR exemption constants (LISR Art. 93 Fraction I)
  private readonly EXEMPT_PERCENTAGE = 0.5; // 50% of overtime is exempt
  private readonly EXEMPT_UMA_WEEKLY = 5; // Up to 5 UMA weekly

  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalValues: FiscalValuesService,
  ) {}

  /**
   * Calculate overtime pay for an employee based on overtime hours
   *
   * @param employeeId Employee ID
   * @param hourlyRate Employee's base hourly rate
   * @param overtimeHours Array of overtime entries with date and hours
   * @param year Fiscal year for UMA values
   */
  async calculateOvertime(
    employeeId: string,
    hourlyRate: number,
    overtimeHours: OvertimeHours[],
    year?: number,
  ): Promise<OvertimeCalculationResult> {
    const fiscalYear = year || new Date().getFullYear();
    const umaDaily = await this.fiscalValues.getUmaDaily(fiscalYear);
    const umaWeekly = umaDaily * 7;

    // Sort overtime by date
    const sortedHours = [...overtimeHours].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    if (sortedHours.length === 0) {
      return this.createEmptyResult(employeeId, hourlyRate);
    }

    // Determine period dates
    const periodStartDate = new Date(sortedHours[0].date);
    const periodEndDate = new Date(sortedHours[sortedHours.length - 1].date);

    // Group by week and calculate
    const weeklyBreakdown = this.groupByWeek(sortedHours);
    const warnings: string[] = [];

    let totalDoubleHours = 0;
    let totalTripleHours = 0;

    // Process each week
    for (const week of weeklyBreakdown) {
      // Check for daily limit violations
      const dailyHours = this.groupByDay(
        sortedHours.filter(
          h =>
            new Date(h.date) >= week.weekStart && new Date(h.date) <= week.weekEnd,
        ),
      );

      let daysWithOvertime = 0;
      week.exceededDailyLimit = false;

      for (const [date, hours] of Object.entries(dailyHours)) {
        if (hours > 0) daysWithOvertime++;
        if (hours > this.MAX_DAILY_OVERTIME) {
          week.exceededDailyLimit = true;
          warnings.push(
            `${date}: ${hours} overtime hours exceeds daily limit of ${this.MAX_DAILY_OVERTIME}`,
          );
        }
      }

      week.daysWithOvertime = daysWithOvertime;

      // Check weekly overtime days limit
      if (daysWithOvertime > this.MAX_WEEKLY_OVERTIME_DAYS) {
        warnings.push(
          `Week ${week.weekNumber}: ${daysWithOvertime} days with overtime exceeds limit of ${this.MAX_WEEKLY_OVERTIME_DAYS}`,
        );
      }

      // Calculate double and triple hours for this week
      if (week.hours <= this.DOUBLE_RATE_LIMIT) {
        week.doubleHours = week.hours;
        week.tripleHours = 0;
      } else {
        week.doubleHours = this.DOUBLE_RATE_LIMIT;
        week.tripleHours = week.hours - this.DOUBLE_RATE_LIMIT;
        week.exceededWeeklyLimit = true;
        warnings.push(
          `Week ${week.weekNumber}: ${week.tripleHours} hours at triple rate (exceeded 9-hour limit)`,
        );
      }

      totalDoubleHours += week.doubleHours;
      totalTripleHours += week.tripleHours;
    }

    // Calculate amounts
    const doubleAmount = totalDoubleHours * hourlyRate * this.DOUBLE_MULTIPLIER;
    const tripleAmount = totalTripleHours * hourlyRate * this.TRIPLE_MULTIPLIER;
    const totalAmount = doubleAmount + tripleAmount;

    // Calculate ISR exemption (LISR Art. 93 Fraction I)
    // 50% of overtime is exempt, up to 5 UMA weekly
    const weekCount = weeklyBreakdown.length;
    const maxExemptLimit = this.EXEMPT_UMA_WEEKLY * umaWeekly * weekCount;
    const fiftyPercentExempt = totalAmount * this.EXEMPT_PERCENTAGE;
    const exemptAmount = Math.min(fiftyPercentExempt, maxExemptLimit);
    const taxableAmount = totalAmount - exemptAmount;

    return {
      employeeId,
      periodStartDate,
      periodEndDate,
      hourlyRate,
      totalHours: totalDoubleHours + totalTripleHours,
      doubleHours: Math.round(totalDoubleHours * 100) / 100,
      tripleHours: Math.round(totalTripleHours * 100) / 100,
      doubleAmount: Math.round(doubleAmount * 100) / 100,
      tripleAmount: Math.round(tripleAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      exemptAmount: Math.round(exemptAmount * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      weeklyBreakdown,
      warnings,
    };
  }

  /**
   * Calculate overtime from incidents in a payroll period
   */
  async calculateFromPeriod(
    employeeId: string,
    periodId: string,
    hourlyRate: number,
  ): Promise<OvertimeCalculationResult> {
    // Get overtime incidents for the period
    const incidents = await this.prisma.employeeIncident.findMany({
      where: {
        employeeId,
        payrollPeriodId: periodId,
        status: 'APPROVED',
        incidentType: {
          category: 'OVERTIME',
        },
      },
      include: {
        incidentType: true,
      },
      orderBy: { date: 'asc' },
    });

    const overtimeHours: OvertimeHours[] = incidents.map(incident => ({
      date: incident.date,
      hours: Number(incident.value),
      description: incident.description || undefined,
    }));

    return this.calculateOvertime(employeeId, hourlyRate, overtimeHours);
  }

  /**
   * Validate overtime hours against LFT limits
   */
  validateOvertimeEntry(hours: number, date: Date): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (hours < 0) {
      errors.push('Overtime hours cannot be negative');
    }

    if (hours > this.MAX_DAILY_OVERTIME) {
      warnings.push(
        `${hours} hours exceeds the LFT Art. 66 daily limit of ${this.MAX_DAILY_OVERTIME} hours`,
      );
    }

    if (hours > 8) {
      errors.push('Overtime hours cannot exceed 8 hours per day (would exceed normal workday)');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Group overtime hours by week (Monday to Sunday)
   */
  private groupByWeek(overtimeHours: OvertimeHours[]): WeeklyOvertimeBreakdown[] {
    const weeks = new Map<string, WeeklyOvertimeBreakdown>();

    for (const entry of overtimeHours) {
      const date = new Date(entry.date);
      const { weekStart, weekEnd, weekKey } = this.getWeekBounds(date);

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, {
          weekNumber: weeks.size + 1,
          weekStart,
          weekEnd,
          hours: 0,
          doubleHours: 0,
          tripleHours: 0,
          daysWithOvertime: 0,
          exceededDailyLimit: false,
          exceededWeeklyLimit: false,
        });
      }

      const week = weeks.get(weekKey)!;
      week.hours += entry.hours;
    }

    return Array.from(weeks.values());
  }

  /**
   * Group overtime hours by day
   */
  private groupByDay(overtimeHours: OvertimeHours[]): Record<string, number> {
    const days: Record<string, number> = {};

    for (const entry of overtimeHours) {
      const dateKey = new Date(entry.date).toISOString().split('T')[0];
      days[dateKey] = (days[dateKey] || 0) + entry.hours;
    }

    return days;
  }

  /**
   * Get week bounds (Monday to Sunday) for a given date
   */
  private getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date; weekKey: string } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday

    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekKey = `${weekStart.getFullYear()}-W${this.getWeekNumber(weekStart)}`;

    return { weekStart, weekEnd, weekKey };
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Create empty result for cases with no overtime
   */
  private createEmptyResult(employeeId: string, hourlyRate: number): OvertimeCalculationResult {
    return {
      employeeId,
      periodStartDate: new Date(),
      periodEndDate: new Date(),
      hourlyRate,
      totalHours: 0,
      doubleHours: 0,
      tripleHours: 0,
      doubleAmount: 0,
      tripleAmount: 0,
      totalAmount: 0,
      exemptAmount: 0,
      taxableAmount: 0,
      weeklyBreakdown: [],
      warnings: [],
    };
  }

  /**
   * Calculate overtime for Sunday work (LFT Art. 73)
   * Sunday work is paid at 125% (prima dominical)
   */
  calculateSundayPremium(
    hourlyRate: number,
    sundayHours: number,
    isRestDay: boolean,
  ): { regularPay: number; premium: number; total: number } {
    const regularPay = hourlyRate * sundayHours;

    if (isRestDay) {
      // If Sunday is the rest day, pay triple (Art. 73)
      return {
        regularPay,
        premium: regularPay * 2, // Additional 200% = triple total
        total: regularPay * 3,
      };
    }

    // If Sunday is a regular work day, pay 25% premium (prima dominical)
    const premium = regularPay * 0.25;
    return {
      regularPay,
      premium: Math.round(premium * 100) / 100,
      total: Math.round((regularPay + premium) * 100) / 100,
    };
  }

  /**
   * Calculate holiday work premium (LFT Art. 75)
   * Work on mandatory holidays is paid at 200% additional (triple total)
   */
  calculateHolidayPremium(
    hourlyRate: number,
    holidayHours: number,
  ): { regularPay: number; premium: number; total: number } {
    const regularPay = hourlyRate * holidayHours;
    // Holiday work = regular pay + 200% premium = triple
    const premium = regularPay * 2;
    return {
      regularPay: Math.round(regularPay * 100) / 100,
      premium: Math.round(premium * 100) / 100,
      total: Math.round((regularPay + premium) * 100) / 100,
    };
  }
}
