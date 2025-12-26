import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IsrCalculatorService } from './isr-calculator.service';
import { ImssCalculatorService } from './imss-calculator.service';

interface ApplicableIncident {
  id: string;
  employeeId: string;
  date: Date;
  value: number;
  description: string | null;
  isRetroactive: boolean;
  retroactiveNote: string | null;
  incidentType: {
    id: string;
    code: string;
    name: string;
    category: string;
    affectsPayroll: boolean;
    isDeduction: boolean;
    valueType: string;
  };
}

@Injectable()
export class PayrollCalculatorService {
  // UMA 2024 (valor diario)
  private readonly UMA_DAILY = 108.57;

  constructor(
    private readonly prisma: PrismaService,
    private readonly isrCalculator: IsrCalculatorService,
    private readonly imssCalculator: ImssCalculatorService,
  ) {}

  /**
   * Obtiene todas las incidencias aplicables para un empleado en un período.
   * Incluye:
   * 1. Incidencias del período actual (dentro de fechas y aprobadas antes del deadline)
   * 2. Incidencias retroactivas (de períodos anteriores que no se aplicaron o aprobadas después del deadline)
   */
  async getApplicableIncidents(period: any, employeeId: string): Promise<ApplicableIncident[]> {
    const now = new Date();
    const incidentDeadline = period.incidentDeadline || period.endDate;

    // 1. Incidencias del período actual (aprobadas a tiempo)
    const currentPeriodIncidents = await this.prisma.employeeIncident.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        payrollPeriodId: null, // No aplicadas aún
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
        approvedAt: {
          lte: incidentDeadline, // Aprobadas antes del deadline
        },
      },
      include: {
        incidentType: true,
      },
    });

    // 2. Incidencias retroactivas (de períodos anteriores no aplicadas, o aprobadas después del deadline)
    const retroactiveIncidents = await this.prisma.employeeIncident.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        payrollPeriodId: null, // No aplicadas aún
        OR: [
          // Incidencias de períodos anteriores nunca aplicadas
          {
            date: {
              lt: period.startDate,
            },
          },
          // Incidencias del período actual pero aprobadas después del deadline
          {
            date: {
              gte: period.startDate,
              lte: period.endDate,
            },
            approvedAt: {
              gt: incidentDeadline,
            },
          },
        ],
      },
      include: {
        incidentType: true,
      },
    });

    // Marcar retroactivas y agregar nota
    const processedCurrent = currentPeriodIncidents.map(incident => ({
      id: incident.id,
      employeeId: incident.employeeId,
      date: incident.date,
      value: Number(incident.value),
      description: incident.description,
      isRetroactive: false,
      retroactiveNote: null,
      incidentType: {
        id: incident.incidentType.id,
        code: incident.incidentType.code,
        name: incident.incidentType.name,
        category: incident.incidentType.category,
        affectsPayroll: incident.incidentType.affectsPayroll,
        isDeduction: incident.incidentType.isDeduction,
        valueType: incident.incidentType.valueType,
      },
    }));

    const processedRetroactive = retroactiveIncidents.map(incident => ({
      id: incident.id,
      employeeId: incident.employeeId,
      date: incident.date,
      value: Number(incident.value),
      description: incident.description,
      isRetroactive: true,
      retroactiveNote: `Ajuste período anterior - Incidencia del ${new Date(incident.date).toLocaleDateString('es-MX')}`,
      incidentType: {
        id: incident.incidentType.id,
        code: incident.incidentType.code,
        name: incident.incidentType.name,
        category: incident.incidentType.category,
        affectsPayroll: incident.incidentType.affectsPayroll,
        isDeduction: incident.incidentType.isDeduction,
        valueType: incident.incidentType.valueType,
      },
    }));

    return [...processedCurrent, ...processedRetroactive];
  }

  /**
   * Aplica las incidencias al cálculo y las marca como aplicadas
   */
  async applyIncidentsToPayroll(
    period: any,
    employeeId: string,
    incidents: ApplicableIncident[],
    employee: any,
    concepts: any[],
  ) {
    const monthlySalary = Number(employee.baseSalary);
    const dailySalary = monthlySalary / 30;
    const hourlyRate = dailySalary / 8;

    const incidentPerceptions: any[] = [];
    const incidentDeductions: any[] = [];
    let absenceDays = 0;

    for (const incident of incidents) {
      if (!incident.incidentType.affectsPayroll) continue;

      const value = incident.value;
      let amount = 0;

      // Calcular monto según tipo de valor
      switch (incident.incidentType.valueType) {
        case 'DAYS':
          amount = dailySalary * value;
          if (incident.incidentType.category === 'ABSENCE' || incident.incidentType.category === 'DISABILITY') {
            absenceDays += value;
          }
          break;
        case 'HOURS':
          amount = hourlyRate * value;
          // Horas extra: pagar doble o triple según aplique
          if (incident.incidentType.category === 'OVERTIME') {
            amount = hourlyRate * value * 2; // Tiempo doble por default
          }
          break;
        case 'AMOUNT':
          amount = value;
          break;
        case 'PERCENTAGE':
          amount = monthlySalary * (value / 100);
          break;
      }

      amount = Math.round(amount * 100) / 100;

      if (incident.incidentType.isDeduction) {
        // Es una deducción (falta, retardo, etc.)
        let conceptCode = 'D010'; // Descuento por falta por default
        if (incident.incidentType.category === 'TARDINESS') conceptCode = 'D011';
        if (incident.isRetroactive) conceptCode = 'D012'; // Ajuste retroactivo

        const concept = concepts.find(c => c.code === conceptCode);
        if (concept && amount > 0) {
          incidentDeductions.push({
            conceptId: concept.id,
            amount,
            description: incident.isRetroactive
              ? `${incident.incidentType.name} - ${incident.retroactiveNote}`
              : incident.incidentType.name,
            incidentId: incident.id,
          });
        }
      } else {
        // Es una percepción (bono, horas extra, etc.)
        let conceptCode = 'P010'; // Bono por incidencia por default
        if (incident.incidentType.category === 'OVERTIME') conceptCode = 'P002';
        if (incident.isRetroactive) conceptCode = 'P011'; // Ajuste retroactivo

        const concept = concepts.find(c => c.code === conceptCode);
        if (concept && amount > 0) {
          incidentPerceptions.push({
            conceptId: concept.id,
            amount,
            taxableAmount: amount, // Gravable por default
            exemptAmount: 0,
            description: incident.isRetroactive
              ? `${incident.incidentType.name} - ${incident.retroactiveNote}`
              : incident.incidentType.name,
            incidentId: incident.id,
          });
        }
      }
    }

    return {
      perceptions: incidentPerceptions,
      deductions: incidentDeductions,
      absenceDays,
    };
  }

  /**
   * Marca las incidencias como aplicadas al período
   */
  async markIncidentsAsApplied(incidentIds: string[], periodId: string) {
    const now = new Date();
    await this.prisma.employeeIncident.updateMany({
      where: {
        id: { in: incidentIds },
      },
      data: {
        status: 'APPLIED',
        payrollPeriodId: periodId,
        appliedAt: now,
      },
    });
  }

  // Preview calculation without saving to database
  async previewForEmployee(period: any, employee: any) {
    const concepts = await this.prisma.payrollConcept.findMany({
      where: { isActive: true },
    });

    const perceptionConcepts = concepts.filter((c) => c.type === 'PERCEPTION');
    const deductionConcepts = concepts.filter((c) => c.type === 'DEDUCTION');

    // Obtener incidencias aplicables (incluyendo retroactivas)
    const applicableIncidents = await this.getApplicableIncidents(period, employee.id);

    // Aplicar incidencias y calcular efectos
    const incidentEffects = await this.applyIncidentsToPayroll(
      period,
      employee.id,
      applicableIncidents,
      employee,
      concepts,
    );

    // Calcular dias trabajados (restando faltas)
    let workedDays = await this.calculateWorkedDays(period, employee);
    workedDays = Math.max(0, workedDays - incidentEffects.absenceDays);

    // Verificar si es periodo extraordinario
    const isExtraordinary = period.periodType === 'EXTRAORDINARY';

    let perceptions: any[] = [];

    if (isExtraordinary) {
      perceptions = await this.calculateExtraordinaryPerceptions(
        employee,
        perceptionConcepts,
        period,
      );
    } else {
      perceptions = await this.calculatePerceptions(
        employee,
        perceptionConcepts,
        workedDays,
        period,
      );
    }

    // Agregar percepciones de incidencias
    perceptions = [...perceptions, ...incidentEffects.perceptions];

    // Calcular base gravable
    const taxableIncome = perceptions.reduce(
      (sum, p) => sum + Number(p.taxableAmount),
      0,
    );

    // Calcular deducciones base
    let deductions = await this.calculateDeductions(
      employee,
      deductionConcepts,
      taxableIncome,
      period,
      isExtraordinary,
    );

    // Agregar deducciones de incidencias
    deductions = [...deductions, ...incidentEffects.deductions];

    const totalPerceptions = perceptions.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const totalDeductions = deductions.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );
    const netPay = totalPerceptions - totalDeductions;

    // Formatear incidencias para mostrar
    const incidentsDisplay = applicableIncidents.map(i => ({
      type: i.incidentType.name,
      date: i.date,
      value: i.value,
      description: i.description,
      isRetroactive: i.isRetroactive,
      retroactiveNote: i.retroactiveNote,
      category: i.incidentType.category,
      isDeduction: i.incidentType.isDeduction,
    }));

    // Return preview data with concept names
    return {
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department?.name || 'Sin departamento',
        baseSalary: Number(employee.baseSalary),
      },
      workedDays,
      incidents: incidentsDisplay,
      incidentSummary: {
        total: applicableIncidents.length,
        retroactive: applicableIncidents.filter(i => i.isRetroactive).length,
        absenceDays: incidentEffects.absenceDays,
      },
      perceptions: perceptions.map(p => {
        const concept = concepts.find(c => c.id === p.conceptId);
        return {
          ...p,
          conceptName: concept?.name || 'N/A',
          conceptCode: concept?.code || 'N/A',
        };
      }),
      deductions: deductions.map(d => {
        const concept = concepts.find(c => c.id === d.conceptId);
        return {
          ...d,
          conceptName: concept?.name || 'N/A',
          conceptCode: concept?.code || 'N/A',
        };
      }),
      totalPerceptions,
      totalDeductions,
      netPay,
    };
  }

  // Get employee incidents for the period
  private async getEmployeeIncidents(period: any, employeeId: string) {
    const incidents = await this.prisma.employeeIncident.findMany({
      where: {
        employeeId,
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      include: {
        incidentType: true,
      },
    });

    return incidents.map(i => ({
      type: i.incidentType?.name || 'Incidencia',
      date: i.date,
      value: i.value,
      description: i.description,
    }));
  }

  async calculateForEmployee(period: any, employee: any) {
    const concepts = await this.prisma.payrollConcept.findMany({
      where: { isActive: true },
    });

    const perceptionConcepts = concepts.filter((c) => c.type === 'PERCEPTION');
    const deductionConcepts = concepts.filter((c) => c.type === 'DEDUCTION');

    // Obtener incidencias aplicables (incluyendo retroactivas)
    const applicableIncidents = await this.getApplicableIncidents(period, employee.id);

    // Aplicar incidencias y calcular efectos
    const incidentEffects = await this.applyIncidentsToPayroll(
      period,
      employee.id,
      applicableIncidents,
      employee,
      concepts,
    );

    // Calcular dias trabajados (restando faltas)
    let workedDays = await this.calculateWorkedDays(period, employee);
    workedDays = Math.max(0, workedDays - incidentEffects.absenceDays);

    // Verificar si es periodo extraordinario
    const isExtraordinary = period.periodType === 'EXTRAORDINARY';

    let perceptions: any[] = [];

    if (isExtraordinary) {
      perceptions = await this.calculateExtraordinaryPerceptions(
        employee,
        perceptionConcepts,
        period,
      );
    } else {
      perceptions = await this.calculatePerceptions(
        employee,
        perceptionConcepts,
        workedDays,
        period,
      );
    }

    // Agregar percepciones de incidencias
    perceptions = [...perceptions, ...incidentEffects.perceptions];

    // Calcular base gravable
    const taxableIncome = perceptions.reduce(
      (sum, p) => sum + Number(p.taxableAmount),
      0,
    );

    // Calcular deducciones base
    let deductions = await this.calculateDeductions(
      employee,
      deductionConcepts,
      taxableIncome,
      period,
      isExtraordinary,
    );

    // Agregar deducciones de incidencias
    deductions = [...deductions, ...incidentEffects.deductions];

    const totalPerceptions = perceptions.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const totalDeductions = deductions.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );
    const netPay = totalPerceptions - totalDeductions;

    // Marcar incidencias como aplicadas
    if (applicableIncidents.length > 0) {
      await this.markIncidentsAsApplied(
        applicableIncidents.map(i => i.id),
        period.id,
      );
    }

    // Crear o actualizar detalle de nomina
    const payrollDetail = await this.prisma.payrollDetail.upsert({
      where: {
        payrollPeriodId_employeeId: {
          payrollPeriodId: period.id,
          employeeId: employee.id,
        },
      },
      create: {
        payrollPeriodId: period.id,
        employeeId: employee.id,
        workedDays,
        totalPerceptions,
        totalDeductions,
        netPay,
        status: 'CALCULATED',
      },
      update: {
        workedDays,
        totalPerceptions,
        totalDeductions,
        netPay,
        status: 'CALCULATED',
      },
    });

    // Eliminar percepciones y deducciones anteriores
    await this.prisma.payrollPerception.deleteMany({
      where: { payrollDetailId: payrollDetail.id },
    });
    await this.prisma.payrollDeduction.deleteMany({
      where: { payrollDetailId: payrollDetail.id },
    });

    // Insertar nuevas percepciones
    for (const perception of perceptions) {
      await this.prisma.payrollPerception.create({
        data: {
          payrollDetailId: payrollDetail.id,
          conceptId: perception.conceptId,
          amount: perception.amount,
          taxableAmount: perception.taxableAmount,
          exemptAmount: perception.exemptAmount,
        },
      });
    }

    // Insertar nuevas deducciones
    for (const deduction of deductions) {
      await this.prisma.payrollDeduction.create({
        data: {
          payrollDetailId: payrollDetail.id,
          conceptId: deduction.conceptId,
          amount: deduction.amount,
        },
      });
    }

    return payrollDetail;
  }

  private async calculateWorkedDays(period: any, employee: any): Promise<number> {
    // Obtener registros de asistencia del periodo
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
    });

    // Si hay registros de asistencia, calcular dias trabajados
    if (attendanceRecords.length > 0) {
      const workedDays = attendanceRecords.filter(
        (r) => r.status === 'PRESENT' || r.status === 'LATE'
      ).length;
      return workedDays;
    }

    // Si no hay registros, asumir dias completos del periodo
    return this.getDaysInPeriod(period.periodType);
  }

  private getDaysInPeriod(periodType: string): number {
    switch (periodType) {
      case 'WEEKLY':
        return 7;
      case 'BIWEEKLY':
        return 15;
      case 'MONTHLY':
        return 30;
      case 'EXTRAORDINARY':
        return 0; // Los extraordinarios no tienen dias trabajados
      default:
        return 15;
    }
  }

  private async calculatePerceptions(
    employee: any,
    concepts: any[],
    workedDays: number,
    period: any,
  ) {
    const perceptions: any[] = [];
    const monthlySalary = Number(employee.baseSalary);
    const dailySalary = monthlySalary / 30;
    const periodDays = this.getDaysInPeriod(period.periodType);

    // Sueldo base
    const salaryConcept = concepts.find((c) => c.code === 'P001');
    if (salaryConcept) {
      const amount = dailySalary * workedDays;
      perceptions.push({
        conceptId: salaryConcept.id,
        amount,
        taxableAmount: amount,
        exemptAmount: 0,
      });
    }

    // Calcular prestaciones del empleado
    for (const empBenefit of employee.benefits || []) {
      const benefit = empBenefit.benefit;
      let amount = 0;

      // Calcular valor segun tipo
      const baseValue = empBenefit.customValue || benefit.value || 0;

      switch (benefit.valueType) {
        case 'FIXED_AMOUNT':
          // Monto fijo - prorratear segun periodo
          amount = Number(baseValue) * (periodDays / 30);
          break;
        case 'PERCENTAGE_SALARY':
          // Porcentaje del salario
          const periodSalary = dailySalary * periodDays;
          amount = periodSalary * (Number(baseValue) / 100);
          break;
        case 'DAYS_SALARY':
          // Dias de salario
          amount = dailySalary * Number(baseValue) * (periodDays / 30);
          break;
      }

      if (amount > 0) {
        // Buscar concepto correspondiente
        let conceptCode = 'P005'; // Default: Bono
        if (benefit.type === 'ATTENDANCE_BONUS') conceptCode = 'P006';
        if (benefit.type === 'PUNCTUALITY_BONUS') conceptCode = 'P005';
        if (benefit.type === 'FOOD_VOUCHERS') conceptCode = 'P007';
        if (benefit.type === 'SAVINGS_FUND') conceptCode = 'P008';

        const benefitConcept = concepts.find((c) => c.code === conceptCode);
        if (benefitConcept) {
          // Calcular parte exenta (vales de despensa hasta 40% UMA mensual)
          let exemptAmount = 0;
          let taxableAmount = amount;

          if (benefit.type === 'FOOD_VOUCHERS') {
            const exemptLimit = this.UMA_DAILY * 30 * 0.4;
            exemptAmount = Math.min(amount, exemptLimit);
            taxableAmount = Math.max(0, amount - exemptAmount);
          }

          perceptions.push({
            conceptId: benefitConcept.id,
            amount: Math.round(amount * 100) / 100,
            taxableAmount: Math.round(taxableAmount * 100) / 100,
            exemptAmount: Math.round(exemptAmount * 100) / 100,
          });
        }
      }
    }

    return perceptions;
  }

  private async calculateExtraordinaryPerceptions(
    employee: any,
    concepts: any[],
    period: any,
  ) {
    const perceptions: any[] = [];
    const monthlySalary = Number(employee.baseSalary);
    const dailySalary = monthlySalary / 30;

    // Calcular antiguedad del empleado
    const hireDate = new Date(employee.hireDate);
    const now = new Date();
    const yearsWorked = Math.floor(
      (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    switch (period.extraordinaryType) {
      case 'AGUINALDO': {
        // Aguinaldo: minimo 15 dias de salario por ley
        // Proporcional si no trabajo el ano completo
        const aguinaldoDays = Math.max(15, yearsWorked >= 1 ? 15 : 0);
        const yearStart = new Date(period.year, 0, 1);
        const yearEnd = new Date(period.year, 11, 31);

        let daysWorkedInYear = 365;
        if (hireDate > yearStart) {
          daysWorkedInYear = Math.floor(
            (yearEnd.getTime() - hireDate.getTime()) / (24 * 60 * 60 * 1000)
          );
        }

        const proportionalDays = (aguinaldoDays * daysWorkedInYear) / 365;
        const amount = dailySalary * proportionalDays;

        // Parte exenta: 30 UMA diarios
        const exemptLimit = this.UMA_DAILY * 30;
        const exemptAmount = Math.min(amount, exemptLimit);
        const taxableAmount = Math.max(0, amount - exemptAmount);

        const aguinaldoConcept = concepts.find((c) => c.code === 'P004');
        if (aguinaldoConcept) {
          perceptions.push({
            conceptId: aguinaldoConcept.id,
            amount: Math.round(amount * 100) / 100,
            taxableAmount: Math.round(taxableAmount * 100) / 100,
            exemptAmount: Math.round(exemptAmount * 100) / 100,
          });
        }
        break;
      }

      case 'VACATION_PREMIUM': {
        // Prima vacacional: 25% sobre los dias de vacaciones
        const vacationDays = this.getVacationDaysByYears(yearsWorked);
        const vacationPay = dailySalary * vacationDays;
        const amount = vacationPay * 0.25; // 25% prima vacacional

        // Parte exenta: 15 UMA diarios
        const exemptLimit = this.UMA_DAILY * 15;
        const exemptAmount = Math.min(amount, exemptLimit);
        const taxableAmount = Math.max(0, amount - exemptAmount);

        const primaVacacionalConcept = concepts.find((c) => c.code === 'P003');
        if (primaVacacionalConcept) {
          perceptions.push({
            conceptId: primaVacacionalConcept.id,
            amount: Math.round(amount * 100) / 100,
            taxableAmount: Math.round(taxableAmount * 100) / 100,
            exemptAmount: Math.round(exemptAmount * 100) / 100,
          });
        }
        break;
      }

      case 'PTU': {
        // PTU: Se calcula externamente, aqui solo se registra
        // Por ahora usamos un valor por defecto o el proporcionado
        const ptuAmount = Number(period.description) || 0;

        // Parte exenta: 15 UMA diarios
        const exemptLimit = this.UMA_DAILY * 15;
        const exemptAmount = Math.min(ptuAmount, exemptLimit);
        const taxableAmount = Math.max(0, ptuAmount - exemptAmount);

        const ptuConcept = concepts.find((c) => c.name?.includes('PTU') || c.code === 'P009');
        if (ptuConcept) {
          perceptions.push({
            conceptId: ptuConcept.id,
            amount: Math.round(ptuAmount * 100) / 100,
            taxableAmount: Math.round(taxableAmount * 100) / 100,
            exemptAmount: Math.round(exemptAmount * 100) / 100,
          });
        }
        break;
      }

      case 'BONUS': {
        // Bono extraordinario
        const bonusAmount = Number(period.description) || 0;

        const bonusConcept = concepts.find((c) => c.code === 'P005');
        if (bonusConcept) {
          perceptions.push({
            conceptId: bonusConcept.id,
            amount: bonusAmount,
            taxableAmount: bonusAmount,
            exemptAmount: 0,
          });
        }
        break;
      }
    }

    return perceptions;
  }

  private getVacationDaysByYears(years: number): number {
    const vacationTable = [
      { years: 1, days: 12 },
      { years: 2, days: 14 },
      { years: 3, days: 16 },
      { years: 4, days: 18 },
      { years: 5, days: 20 },
      { years: 6, days: 22 },
      { years: 10, days: 24 },
      { years: 15, days: 26 },
      { years: 20, days: 28 },
      { years: 25, days: 30 },
      { years: 30, days: 32 },
    ];

    if (years < 1) return 0;

    for (let i = vacationTable.length - 1; i >= 0; i--) {
      if (years >= vacationTable[i].years) {
        return vacationTable[i].days;
      }
    }

    return 12;
  }

  private async calculateDeductions(
    employee: any,
    concepts: any[],
    taxableIncome: number,
    period: any,
    isExtraordinary: boolean,
  ) {
    const deductions: any[] = [];

    // ISR
    const isrConcept = concepts.find((c) => c.code === 'D001');
    if (isrConcept && taxableIncome > 0) {
      const isr = await this.isrCalculator.calculate(
        taxableIncome,
        isExtraordinary ? 'MONTHLY' : period.periodType,
        period.year,
      );
      if (isr > 0) {
        deductions.push({
          conceptId: isrConcept.id,
          amount: Math.round(isr * 100) / 100,
        });
      }
    }

    // IMSS (solo para periodos normales)
    if (!isExtraordinary) {
      const imssConcept = concepts.find((c) => c.code === 'D002');
      if (imssConcept && employee.nss) {
        const imss = await this.imssCalculator.calculateEmployeeQuota(
          employee,
          period,
        );
        if (imss > 0) {
          deductions.push({
            conceptId: imssConcept.id,
            amount: Math.round(imss * 100) / 100,
          });
        }
      }
    }

    // INFONAVIT
    for (const credit of employee.infonavitCredits || []) {
      const infonavitConcept = concepts.find((c) => c.code === 'D003');
      if (infonavitConcept) {
        let amount = 0;
        if (credit.discountType === 'PERCENTAGE') {
          amount = taxableIncome * (Number(credit.discountValue) / 100);
        } else if (credit.discountType === 'FIXED_AMOUNT') {
          amount = Number(credit.discountValue);
        } else if (credit.discountType === 'VSM') {
          // VSM = Veces Salario Minimo
          const smg = this.UMA_DAILY; // Usando UMA como referencia
          amount = smg * Number(credit.discountValue);
        }
        if (amount > 0) {
          deductions.push({
            conceptId: infonavitConcept.id,
            amount: Math.round(amount * 100) / 100,
          });
        }
      }
    }

    // Pension alimenticia
    for (const pension of employee.pensionAlimenticia || []) {
      const pensionConcept = concepts.find((c) => c.code === 'D004');
      if (pensionConcept) {
        let amount = 0;
        if (pension.discountType === 'PERCENTAGE') {
          amount = taxableIncome * (Number(pension.discountValue) / 100);
        } else {
          amount = Number(pension.discountValue);
        }
        if (amount > 0) {
          deductions.push({
            conceptId: pensionConcept.id,
            amount: Math.round(amount * 100) / 100,
          });
        }
      }
    }

    // Fondo de ahorro (si aplica)
    for (const empBenefit of employee.benefits || []) {
      if (empBenefit.benefit.type === 'SAVINGS_FUND') {
        const savingsConcept = concepts.find((c) => c.code === 'D005');
        if (savingsConcept) {
          const baseValue = empBenefit.customValue || empBenefit.benefit.value || 0;
          let amount = 0;

          if (empBenefit.benefit.valueType === 'PERCENTAGE_SALARY') {
            amount = taxableIncome * (Number(baseValue) / 100);
          } else {
            amount = Number(baseValue);
          }

          if (amount > 0) {
            deductions.push({
              conceptId: savingsConcept.id,
              amount: Math.round(amount * 100) / 100,
            });
          }
        }
      }
    }

    return deductions;
  }
}
