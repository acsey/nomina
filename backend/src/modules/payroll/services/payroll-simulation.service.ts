import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoundingService, PRECISION } from '@/common/utils/rounding.service';
import { FiscalValuesService } from '@/common/fiscal/fiscal-values.service';
import { IsrCalculatorService } from './isr-calculator.service';
import { ImssCalculatorService } from './imss-calculator.service';

/**
 * Datos de entrada para simulación individual
 */
export interface SimulationEmployeeInput {
  employeeId?: string;
  baseSalary: number;
  workedDays?: number;
  hireDate?: Date;
  // Incidencias simuladas
  absenceDays?: number;
  overtimeHours?: number;
  bonuses?: { name: string; amount: number }[];
  // Deducciones adicionales
  extraDeductions?: { name: string; amount: number }[];
}

/**
 * Datos de entrada para simulación de período
 */
export interface SimulationPeriodInput {
  companyId: string;
  periodType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  year: number;
  // Ajustes globales
  salaryIncreasePercent?: number;
  newBenefits?: { type: string; value: number }[];
  // Filtros
  departmentIds?: string[];
  employeeIds?: string[];
}

/**
 * Resultado de simulación individual
 */
export interface SimulationResult {
  employee: {
    id?: string;
    name: string;
    baseSalary: number;
  };
  workedDays: number;
  perceptions: SimulationConcept[];
  deductions: SimulationConcept[];
  totals: {
    grossPay: number;
    totalDeductions: number;
    netPay: number;
    taxableIncome: number;
    exemptIncome: number;
  };
  // Detalles fiscales
  fiscalDetails: {
    isrBase: number;
    isrAmount: number;
    subsidioEmpleo: number;
    imssEmployee: number;
    imssEmployer: number;
  };
  // Metadatos de simulación
  metadata: {
    simulatedAt: Date;
    periodType: string;
    roundingMethod: string;
    warnings: string[];
  };
}

export interface SimulationConcept {
  code: string;
  name: string;
  amount: number;
  taxableAmount?: number;
  exemptAmount?: number;
  isSimulated?: boolean;
}

/**
 * Resultado de simulación de período completo
 */
export interface PeriodSimulationResult {
  period: {
    type: string;
    year: number;
    employeeCount: number;
  };
  summary: {
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    totalIsr: number;
    totalImssEmployee: number;
    totalImssEmployer: number;
    averageNetPay: number;
  };
  byDepartment: {
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalNetPay: number;
  }[];
  employees: SimulationResult[];
  comparison?: {
    previousPeriodNetPay: number;
    difference: number;
    percentChange: number;
  };
  metadata: {
    simulatedAt: Date;
    inputParameters: SimulationPeriodInput;
    warnings: string[];
  };
}

/**
 * Servicio de simulación de nómina sin persistencia
 *
 * Cumple con: Documento de Requerimientos - Sección 8. Usabilidad
 * - Simulación de nómina sin persistencia
 */
@Injectable()
export class PayrollSimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rounding: RoundingService,
    private readonly fiscalValues: FiscalValuesService,
    private readonly isrCalculator: IsrCalculatorService,
    private readonly imssCalculator: ImssCalculatorService,
  ) {}

  /**
   * Simula el cálculo de nómina para un empleado individual
   * NO persiste ningún dato en la base de datos
   */
  async simulateForEmployee(
    input: SimulationEmployeeInput,
    periodType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' = 'BIWEEKLY',
    year: number = new Date().getFullYear(),
  ): Promise<SimulationResult> {
    const warnings: string[] = [];

    // Obtener valores fiscales del año (UMA, SMG, etc.)
    const umaDaily = await this.fiscalValues.getUmaDaily(year);

    // Cargar datos del empleado si se proporciona ID
    let employeeData: any = {
      name: 'Empleado Simulado',
      baseSalary: input.baseSalary,
      hireDate: input.hireDate || new Date(),
      nss: null,
      benefits: [],
      infonavitCredits: [],
      pensionAlimenticia: [],
    };

    if (input.employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: input.employeeId },
        include: {
          benefits: { include: { benefit: true } },
          infonavitCredits: { where: { isActive: true } },
          pensionAlimenticia: { where: { isActive: true } },
        },
      });

      if (employee) {
        employeeData = {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          baseSalary: input.baseSalary || Number(employee.baseSalary),
          hireDate: employee.hireDate,
          nss: employee.nss,
          benefits: employee.benefits,
          infonavitCredits: employee.infonavitCredits,
          pensionAlimenticia: employee.pensionAlimenticia,
        };
      } else {
        warnings.push(`Empleado ${input.employeeId} no encontrado, usando datos proporcionados`);
      }
    }

    // Calcular días del período
    const periodDays = this.getPeriodDays(periodType);
    const workedDays = input.workedDays ?? periodDays - (input.absenceDays || 0);

    // Calcular salarios
    const monthlySalary = employeeData.baseSalary;
    const dailySalary = this.rounding.roundDailySalary(monthlySalary / 30);
    const hourlyRate = this.rounding.roundDailySalary(dailySalary / 8);

    // ===== PERCEPCIONES =====
    const perceptions: SimulationConcept[] = [];

    // Sueldo base
    const basePay = this.rounding.roundCurrency(dailySalary * workedDays);
    perceptions.push({
      code: 'P001',
      name: 'Sueldo',
      amount: basePay,
      taxableAmount: basePay,
      exemptAmount: 0,
    });

    // Horas extra
    if (input.overtimeHours && input.overtimeHours > 0) {
      const overtimePay = this.rounding.roundCurrency(hourlyRate * input.overtimeHours * 2);
      // Primeras 9 horas extras a la semana son exentas
      const exemptHours = Math.min(input.overtimeHours, 9 * (periodDays / 7));
      const exemptAmount = this.rounding.roundCurrency(hourlyRate * exemptHours * 2);
      const taxableAmount = this.rounding.roundCurrency(overtimePay - exemptAmount);

      perceptions.push({
        code: 'P002',
        name: 'Horas Extra',
        amount: overtimePay,
        taxableAmount,
        exemptAmount,
        isSimulated: true,
      });
    }

    // Bonos simulados
    for (const bonus of input.bonuses || []) {
      perceptions.push({
        code: 'P005',
        name: bonus.name,
        amount: this.rounding.roundCurrency(bonus.amount),
        taxableAmount: this.rounding.roundCurrency(bonus.amount),
        exemptAmount: 0,
        isSimulated: true,
      });
    }

    // Prestaciones del empleado
    for (const empBenefit of employeeData.benefits || []) {
      const benefit = empBenefit.benefit;
      const benefitAmount = this.calculateBenefitAmount(
        benefit,
        empBenefit.customValue,
        dailySalary,
        periodDays,
      );

      if (benefitAmount > 0) {
        const { taxable, exempt } = this.calculateBenefitExemption(
          benefit.type,
          benefitAmount,
          umaDaily,
        );

        perceptions.push({
          code: this.getBenefitConceptCode(benefit.type),
          name: benefit.name,
          amount: benefitAmount,
          taxableAmount: taxable,
          exemptAmount: exempt,
        });
      }
    }

    // Calcular totales de percepciones
    const grossPay = this.rounding.sumAndRound(perceptions.map((p: any) => p.amount));
    const taxableIncome = this.rounding.sumAndRound(
      perceptions.map((p: any) => p.taxableAmount || 0)
    );
    const exemptIncome = this.rounding.sumAndRound(
      perceptions.map((p: any) => p.exemptAmount || 0)
    );

    // ===== DEDUCCIONES =====
    const deductions: SimulationConcept[] = [];

    // ISR
    const isrResult = await this.isrCalculator.calculateWithSubsidy(
      taxableIncome,
      periodType,
      year,
    );
    const isrAmount = this.rounding.roundCurrency(isrResult.netIsr);
    const subsidioEmpleo = this.rounding.roundCurrency(isrResult.subsidio);

    if (isrAmount > 0) {
      deductions.push({
        code: 'D001',
        name: 'ISR',
        amount: isrAmount,
      });
    }

    // IMSS (cuota obrero)
    let imssEmployee = 0;
    let imssEmployer = 0;
    if (employeeData.nss) {
      const sbc = this.calculateSBC(dailySalary);
      imssEmployee = await this.imssCalculator.calculateEmployeeQuota(
        { baseSalary: monthlySalary, salarioDiarioIntegrado: sbc },
        { periodType },
      );
      imssEmployer = await this.imssCalculator.calculateEmployerQuota(
        { baseSalary: monthlySalary, salarioDiarioIntegrado: sbc },
        { periodType },
      );

      if (imssEmployee > 0) {
        deductions.push({
          code: 'D002',
          name: 'IMSS',
          amount: this.rounding.roundCurrency(imssEmployee),
        });
      }
    }

    // INFONAVIT
    for (const credit of employeeData.infonavitCredits || []) {
      const infonavitAmount = this.calculateInfonavitDeduction(
        credit,
        taxableIncome,
        umaDaily,
      );
      if (infonavitAmount > 0) {
        deductions.push({
          code: 'D003',
          name: 'INFONAVIT',
          amount: infonavitAmount,
        });
      }
    }

    // Pensión alimenticia
    for (const pension of employeeData.pensionAlimenticia || []) {
      const pensionAmount = this.calculatePensionDeduction(pension, taxableIncome);
      if (pensionAmount > 0) {
        deductions.push({
          code: 'D004',
          name: `Pensión - ${pension.beneficiaryName}`,
          amount: pensionAmount,
        });
      }
    }

    // Deducciones simuladas adicionales
    for (const deduction of input.extraDeductions || []) {
      deductions.push({
        code: 'D099',
        name: deduction.name,
        amount: this.rounding.roundCurrency(deduction.amount),
        isSimulated: true,
      });
    }

    // Calcular totales
    const totalDeductions = this.rounding.sumAndRound(deductions.map((d: any) => d.amount));
    const netPay = this.rounding.roundCurrency(grossPay - totalDeductions);

    return {
      employee: {
        id: employeeData.id,
        name: employeeData.name,
        baseSalary: employeeData.baseSalary,
      },
      workedDays,
      perceptions,
      deductions,
      totals: {
        grossPay,
        totalDeductions,
        netPay,
        taxableIncome,
        exemptIncome,
      },
      fiscalDetails: {
        isrBase: taxableIncome,
        isrAmount,
        subsidioEmpleo,
        imssEmployee: this.rounding.roundCurrency(imssEmployee),
        imssEmployer: this.rounding.roundCurrency(imssEmployer),
      },
      metadata: {
        simulatedAt: new Date(),
        periodType,
        roundingMethod: 'ROUND',
        warnings,
      },
    };
  }

  /**
   * Simula el cálculo de nómina para un período completo
   * Permite proyectar costos con ajustes hipotéticos
   */
  async simulatePeriod(input: SimulationPeriodInput): Promise<PeriodSimulationResult> {
    const warnings: string[] = [];

    // Obtener empleados activos
    let employeeFilter: any = {
      companyId: input.companyId,
      status: 'ACTIVE',
    };

    if (input.departmentIds?.length) {
      employeeFilter.departmentId = { in: input.departmentIds };
    }

    if (input.employeeIds?.length) {
      employeeFilter.id = { in: input.employeeIds };
    }

    const employees = await this.prisma.employee.findMany({
      where: employeeFilter,
      include: {
        department: true,
        benefits: { include: { benefit: true } },
        infonavitCredits: { where: { isActive: true } },
        pensionAlimenticia: { where: { isActive: true } },
      },
    });

    if (employees.length === 0) {
      warnings.push('No se encontraron empleados activos con los filtros especificados');
    }

    // Simular cada empleado
    const employeeResults: SimulationResult[] = [];
    const byDepartment: Map<string, {
      departmentId: string;
      departmentName: string;
      employeeCount: number;
      totalNetPay: number;
    }> = new Map();

    for (const employee of employees) {
      // Aplicar ajuste de salario si se especificó
      let adjustedSalary = Number(employee.baseSalary);
      if (input.salaryIncreasePercent) {
        adjustedSalary = this.rounding.roundCurrency(
          adjustedSalary * (1 + input.salaryIncreasePercent / 100)
        );
      }

      const result = await this.simulateForEmployee(
        {
          employeeId: employee.id,
          baseSalary: adjustedSalary,
        },
        input.periodType,
        input.year,
      );

      employeeResults.push(result);

      // Agregar a totales por departamento
      const deptId = employee.departmentId;
      const deptName = employee.department?.name || 'Sin departamento';

      if (!byDepartment.has(deptId)) {
        byDepartment.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          employeeCount: 0,
          totalNetPay: 0,
        });
      }

      const dept = byDepartment.get(deptId)!;
      dept.employeeCount++;
      dept.totalNetPay = this.rounding.roundCurrency(dept.totalNetPay + result.totals.netPay);
    }

    // Calcular resumen
    const summary = {
      totalGrossPay: this.rounding.sumAndRound(employeeResults.map((r: any) => r.totals.grossPay)),
      totalDeductions: this.rounding.sumAndRound(employeeResults.map((r: any) => r.totals.totalDeductions)),
      totalNetPay: this.rounding.sumAndRound(employeeResults.map((r: any) => r.totals.netPay)),
      totalIsr: this.rounding.sumAndRound(employeeResults.map((r: any) => r.fiscalDetails.isrAmount)),
      totalImssEmployee: this.rounding.sumAndRound(employeeResults.map((r: any) => r.fiscalDetails.imssEmployee)),
      totalImssEmployer: this.rounding.sumAndRound(employeeResults.map((r: any) => r.fiscalDetails.imssEmployer)),
      averageNetPay: employeeResults.length > 0
        ? this.rounding.roundCurrency(
            this.rounding.sumAndRound(employeeResults.map((r: any) => r.totals.netPay)) / employeeResults.length
          )
        : 0,
    };

    // Obtener comparación con período anterior si existe
    let comparison: PeriodSimulationResult['comparison'] | undefined;
    const previousPeriod = await this.getPreviousPeriodTotal(input.companyId, input.periodType, input.year);
    if (previousPeriod) {
      const difference = this.rounding.roundCurrency(summary.totalNetPay - previousPeriod);
      comparison = {
        previousPeriodNetPay: previousPeriod,
        difference,
        percentChange: previousPeriod > 0
          ? this.rounding.roundPercentage((difference / previousPeriod) * 100)
          : 0,
      };
    }

    return {
      period: {
        type: input.periodType,
        year: input.year,
        employeeCount: employees.length,
      },
      summary,
      byDepartment: Array.from(byDepartment.values()),
      employees: employeeResults,
      comparison,
      metadata: {
        simulatedAt: new Date(),
        inputParameters: input,
        warnings,
      },
    };
  }

  /**
   * Simula escenarios "what-if" comparando diferentes configuraciones
   */
  async compareScenarios(
    baseInput: SimulationPeriodInput,
    scenarios: { name: string; adjustments: Partial<SimulationPeriodInput> }[],
  ): Promise<{
    base: PeriodSimulationResult;
    scenarios: { name: string; result: PeriodSimulationResult; differenceFromBase: number }[];
  }> {
    // Calcular escenario base
    const base = await this.simulatePeriod(baseInput);

    // Calcular cada escenario alternativo
    const scenarioResults: { name: string; result: PeriodSimulationResult; differenceFromBase: number }[] = [];

    for (const scenario of scenarios) {
      const scenarioInput = { ...baseInput, ...scenario.adjustments };
      const result = await this.simulatePeriod(scenarioInput);

      scenarioResults.push({
        name: scenario.name,
        result,
        differenceFromBase: this.rounding.roundCurrency(
          result.summary.totalNetPay - base.summary.totalNetPay
        ),
      });
    }

    return {
      base,
      scenarios: scenarioResults,
    };
  }

  // ===== MÉTODOS AUXILIARES =====

  private getPeriodDays(periodType: string): number {
    switch (periodType) {
      case 'WEEKLY':
        return 7;
      case 'BIWEEKLY':
        return 15;
      case 'MONTHLY':
        return 30;
      default:
        return 15;
    }
  }

  private calculateBenefitAmount(
    benefit: any,
    customValue: any,
    dailySalary: number,
    periodDays: number,
  ): number {
    const baseValue = customValue ? Number(customValue) : Number(benefit.value || 0);

    switch (benefit.valueType) {
      case 'FIXED_AMOUNT':
        return this.rounding.roundCurrency(baseValue * (periodDays / 30));
      case 'PERCENTAGE_SALARY':
        return this.rounding.roundCurrency(dailySalary * periodDays * (baseValue / 100));
      case 'DAYS_SALARY':
        return this.rounding.roundCurrency(dailySalary * baseValue * (periodDays / 30));
      default:
        return 0;
    }
  }

  private calculateBenefitExemption(
    benefitType: string,
    amount: number,
    umaDaily: number,
  ): { taxable: number; exempt: number } {
    // Vales de despensa: exento hasta 40% UMA mensual
    if (benefitType === 'FOOD_VOUCHERS') {
      const exemptLimit = this.rounding.roundCurrency(umaDaily * 30 * 0.4);
      const exempt = Math.min(amount, exemptLimit);
      return {
        taxable: this.rounding.roundCurrency(amount - exempt),
        exempt: this.rounding.roundCurrency(exempt),
      };
    }

    // Fondo de ahorro: exento hasta 13% del salario
    if (benefitType === 'SAVINGS_FUND') {
      const exemptLimit = this.rounding.roundCurrency(umaDaily * 30 * 1.3);
      const exempt = Math.min(amount, exemptLimit);
      return {
        taxable: this.rounding.roundCurrency(amount - exempt),
        exempt: this.rounding.roundCurrency(exempt),
      };
    }

    // Por defecto, todo es gravable
    return { taxable: amount, exempt: 0 };
  }

  private getBenefitConceptCode(benefitType: string): string {
    const codeMap: Record<string, string> = {
      FOOD_VOUCHERS: 'P007',
      SAVINGS_FUND: 'P008',
      ATTENDANCE_BONUS: 'P006',
      PUNCTUALITY_BONUS: 'P005',
    };
    return codeMap[benefitType] || 'P005';
  }

  private calculateSBC(dailySalary: number): number {
    // Factor de integración simplificado
    const factorIntegracion = 1 + (15 / 365) + (12 * 0.25 / 365);
    return this.rounding.roundDailySalary(dailySalary * factorIntegracion);
  }

  private calculateInfonavitDeduction(credit: any, taxableIncome: number, umaDaily: number): number {
    let amount = 0;
    switch (credit.discountType) {
      case 'PERCENTAGE':
        amount = taxableIncome * (Number(credit.discountValue) / 100);
        break;
      case 'FIXED_AMOUNT':
        amount = Number(credit.discountValue);
        break;
      case 'VSM':
        // VSM = Veces Salario Minimo (usando UMA desde BD)
        amount = umaDaily * Number(credit.discountValue);
        break;
    }
    return this.rounding.roundCurrency(amount);
  }

  private calculatePensionDeduction(pension: any, taxableIncome: number): number {
    let amount = 0;
    if (pension.discountType === 'PERCENTAGE') {
      amount = taxableIncome * (Number(pension.discountValue) / 100);
    } else {
      amount = Number(pension.discountValue);
    }
    return this.rounding.roundCurrency(amount);
  }

  private async getPreviousPeriodTotal(
    companyId: string,
    periodType: string,
    year: number,
  ): Promise<number | null> {
    const previousPeriod = await this.prisma.payrollPeriod.findFirst({
      where: {
        companyId,
        periodType: periodType as any,
        year,
        status: { in: ['PAID', 'CLOSED'] },
      },
      orderBy: { periodNumber: 'desc' },
      select: { totalNet: true },
    });

    return previousPeriod ? Number(previousPeriod.totalNet) : null;
  }
}
