import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IsrCalculatorService } from './isr-calculator.service';
import { ImssCalculatorService } from './imss-calculator.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PayrollCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly isrCalculator: IsrCalculatorService,
    private readonly imssCalculator: ImssCalculatorService,
  ) {}

  async calculateForEmployee(period: any, employee: any) {
    // Obtener conceptos de nómina
    const concepts = await this.prisma.payrollConcept.findMany({
      where: { isActive: true },
    });

    const perceptionConcepts = concepts.filter((c) => c.type === 'PERCEPTION');
    const deductionConcepts = concepts.filter((c) => c.type === 'DEDUCTION');

    // Calcular días trabajados (simplificado)
    const workedDays = this.calculateWorkedDays(period, employee);

    // Calcular percepciones
    const perceptions = await this.calculatePerceptions(
      employee,
      perceptionConcepts,
      workedDays,
      period,
    );

    // Calcular base gravable
    const taxableIncome = perceptions.reduce(
      (sum, p) => sum + Number(p.taxableAmount),
      0,
    );

    // Calcular deducciones
    const deductions = await this.calculateDeductions(
      employee,
      deductionConcepts,
      taxableIncome,
      period,
    );

    const totalPerceptions = perceptions.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const totalDeductions = deductions.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );
    const netPay = totalPerceptions - totalDeductions;

    // Crear o actualizar detalle de nómina
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

  private calculateWorkedDays(period: any, employee: any): number {
    // Lógica simplificada - en producción se calcularía con asistencias
    const periodDays = this.getDaysInPeriod(period.periodType);
    return periodDays;
  }

  private getDaysInPeriod(periodType: string): number {
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

  private async calculatePerceptions(
    employee: any,
    concepts: any[],
    workedDays: number,
    period: any,
  ) {
    const perceptions: any[] = [];
    const dailySalary = Number(employee.baseSalary) / 30;
    const periodDays = this.getDaysInPeriod(period.periodType);

    // Sueldo base
    const salaryConceptCode = 'P001'; // Código para sueldo
    const salaryConcept = concepts.find((c) => c.code === salaryConceptCode);

    if (salaryConcept) {
      const amount = dailySalary * workedDays;
      perceptions.push({
        conceptId: salaryConcept.id,
        amount,
        taxableAmount: amount,
        exemptAmount: 0,
      });
    }

    // Prestaciones del empleado
    for (const empBenefit of employee.benefits || []) {
      const benefit = empBenefit.benefit;
      if (benefit.type === 'ATTENDANCE_BONUS' || benefit.type === 'PUNCTUALITY_BONUS') {
        const amount = empBenefit.customValue || benefit.value || 0;
        const benefitConcept = concepts.find((c) => c.name.includes(benefit.name));
        if (benefitConcept) {
          perceptions.push({
            conceptId: benefitConcept.id,
            amount: Number(amount),
            taxableAmount: Number(amount),
            exemptAmount: 0,
          });
        }
      }
    }

    return perceptions;
  }

  private async calculateDeductions(
    employee: any,
    concepts: any[],
    taxableIncome: number,
    period: any,
  ) {
    const deductions: any[] = [];

    // ISR
    const isrConcept = concepts.find((c) => c.code === 'D001');
    if (isrConcept) {
      const isr = await this.isrCalculator.calculate(
        taxableIncome,
        period.periodType,
        period.year,
      );
      if (isr > 0) {
        deductions.push({
          conceptId: isrConcept.id,
          amount: isr,
        });
      }
    }

    // IMSS
    const imssConcept = concepts.find((c) => c.code === 'D002');
    if (imssConcept && employee.nss) {
      const imss = await this.imssCalculator.calculateEmployeeQuota(
        employee,
        period,
      );
      if (imss > 0) {
        deductions.push({
          conceptId: imssConcept.id,
          amount: imss,
        });
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
        }
        deductions.push({
          conceptId: infonavitConcept.id,
          amount,
        });
      }
    }

    // Pensión alimenticia
    for (const pension of employee.pensionAlimenticia || []) {
      const pensionConcept = concepts.find((c) => c.code === 'D004');
      if (pensionConcept) {
        let amount = 0;
        if (pension.discountType === 'PERCENTAGE') {
          amount = taxableIncome * (Number(pension.discountValue) / 100);
        } else {
          amount = Number(pension.discountValue);
        }
        deductions.push({
          conceptId: pensionConcept.id,
          amount,
        });
      }
    }

    return deductions;
  }
}
