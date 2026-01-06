import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoundingService } from '@/common/utils/rounding.service';

/**
 * Comparativo entre dos períodos
 */
export interface PeriodComparison {
  period1: PeriodSummary;
  period2: PeriodSummary;
  differences: {
    employeeCount: number;
    totalPerceptions: number;
    totalDeductions: number;
    totalNet: number;
    averageNetPay: number;
    percentChange: {
      totalNet: number;
      averageNetPay: number;
    };
  };
  // Cambios por empleado
  employeeChanges: {
    newEmployees: { id: string; name: string; netPay: number }[];
    terminatedEmployees: { id: string; name: string; lastNetPay: number }[];
    salaryChanges: {
      employeeId: string;
      name: string;
      previousNet: number;
      currentNet: number;
      difference: number;
      percentChange: number;
    }[];
  };
  // Cambios por concepto
  conceptChanges: {
    code: string;
    name: string;
    type: 'PERCEPTION' | 'DEDUCTION';
    period1Total: number;
    period2Total: number;
    difference: number;
    percentChange: number;
  }[];
}

export interface PeriodSummary {
  id: string;
  periodNumber: number;
  year: number;
  periodType: string;
  startDate: Date;
  endDate: Date;
  status: string;
  employeeCount: number;
  totalPerceptions: number;
  totalDeductions: number;
  totalNet: number;
  averageNetPay: number;
}

/**
 * Dashboard ejecutivo de nómina
 */
export interface ExecutiveDashboard {
  // Resumen del último período
  currentPeriod: {
    id: string;
    description: string;
    status: string;
    totalEmployees: number;
    totalNet: number;
    totalPerceptions: number;
    totalDeductions: number;
    paymentDate: Date;
  } | null;

  // KPIs principales
  kpis: {
    monthlyPayrollCost: number;
    averageSalary: number;
    employeeCount: number;
    cfdisPending: number;
    incidentsPending: number;
    vacationRequestsPending: number;
  };

  // Tendencia de los últimos 12 períodos
  trend: {
    period: string;
    totalNet: number;
    employeeCount: number;
  }[];

  // Distribución por departamento
  byDepartment: {
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalNet: number;
    percentOfTotal: number;
  }[];

  // Top 5 conceptos de percepción
  topPerceptions: {
    code: string;
    name: string;
    total: number;
    percentOfTotal: number;
  }[];

  // Top 5 conceptos de deducción
  topDeductions: {
    code: string;
    name: string;
    total: number;
    percentOfTotal: number;
  }[];

  // Alertas y excepciones
  alerts: DashboardAlert[];

  // Metadata
  generatedAt: Date;
  companyId: string;
}

export interface DashboardAlert {
  type: 'WARNING' | 'ERROR' | 'INFO';
  category: string;
  message: string;
  count?: number;
  link?: string;
}

/**
 * Vista por excepción
 */
export interface ExceptionView {
  category: string;
  title: string;
  description: string;
  items: ExceptionItem[];
  totalCount: number;
}

export interface ExceptionItem {
  id: string;
  employeeId?: string;
  employeeName?: string;
  description: string;
  value?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionRequired: boolean;
  metadata?: Record<string, any>;
}

/**
 * Servicio de análisis y reportes de nómina
 *
 * Cumple con: Documento de Requerimientos - Sección 8. Usabilidad
 * - Comparativo entre periodos
 * - Dashboard ejecutivo
 * - Vistas por excepción
 */
@Injectable()
export class PayrollAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rounding: RoundingService,
  ) {}

  /**
   * Genera comparativo entre dos períodos de nómina
   */
  async comparePeriods(
    period1Id: string,
    period2Id: string,
  ): Promise<PeriodComparison> {
    // Obtener datos de ambos períodos
    const [period1Data, period2Data] = await Promise.all([
      this.getPeriodDetails(period1Id),
      this.getPeriodDetails(period2Id),
    ]);

    // Crear sets de empleados para comparar
    const period1Employees = new Set(period1Data.payrollDetails.map((d: any) => d.employeeId));
    const period2Employees = new Set(period2Data.payrollDetails.map((d: any) => d.employeeId));

    // Identificar cambios de empleados
    const newEmployees = period2Data.payrollDetails
      .filter((d: any) => !period1Employees.has(d.employeeId))
      .map((d: any) => ({
        id: d.employeeId,
        name: `${d.employee.firstName} ${d.employee.lastName}`,
        netPay: Number(d.netPay),
      }));

    const terminatedEmployees = period1Data.payrollDetails
      .filter((d: any) => !period2Employees.has(d.employeeId))
      .map((d: any) => ({
        id: d.employeeId,
        name: `${d.employee.firstName} ${d.employee.lastName}`,
        lastNetPay: Number(d.netPay),
      }));

    // Calcular cambios de salario para empleados que están en ambos períodos
    const salaryChanges: PeriodComparison['employeeChanges']['salaryChanges'] = [];
    for (const detail2 of period2Data.payrollDetails) {
      const detail1 = period1Data.payrollDetails.find((d: any) => d.employeeId === detail2.employeeId);
      if (detail1) {
        const previousNet = Number(detail1.netPay);
        const currentNet = Number(detail2.netPay);
        const difference = this.rounding.roundCurrency(currentNet - previousNet);

        // Solo reportar si hay diferencia significativa (> 1%)
        if (Math.abs(difference) > previousNet * 0.01) {
          salaryChanges.push({
            employeeId: detail2.employeeId,
            name: `${detail2.employee.firstName} ${detail2.employee.lastName}`,
            previousNet,
            currentNet,
            difference,
            percentChange: this.rounding.roundPercentage((difference / previousNet) * 100),
          });
        }
      }
    }

    // Ordenar por mayor cambio absoluto
    salaryChanges.sort((a: any, b: any) => Math.abs(b.difference) - Math.abs(a.difference));

    // Calcular cambios por concepto
    const conceptChanges = await this.calculateConceptChanges(period1Id, period2Id);

    // Crear resúmenes
    const period1Summary = this.createPeriodSummary(period1Data);
    const period2Summary = this.createPeriodSummary(period2Data);

    // Calcular diferencias
    const differences = {
      employeeCount: period2Summary.employeeCount - period1Summary.employeeCount,
      totalPerceptions: this.rounding.roundCurrency(
        period2Summary.totalPerceptions - period1Summary.totalPerceptions
      ),
      totalDeductions: this.rounding.roundCurrency(
        period2Summary.totalDeductions - period1Summary.totalDeductions
      ),
      totalNet: this.rounding.roundCurrency(
        period2Summary.totalNet - period1Summary.totalNet
      ),
      averageNetPay: this.rounding.roundCurrency(
        period2Summary.averageNetPay - period1Summary.averageNetPay
      ),
      percentChange: {
        totalNet: period1Summary.totalNet > 0
          ? this.rounding.roundPercentage(
              ((period2Summary.totalNet - period1Summary.totalNet) / period1Summary.totalNet) * 100
            )
          : 0,
        averageNetPay: period1Summary.averageNetPay > 0
          ? this.rounding.roundPercentage(
              ((period2Summary.averageNetPay - period1Summary.averageNetPay) / period1Summary.averageNetPay) * 100
            )
          : 0,
      },
    };

    return {
      period1: period1Summary,
      period2: period2Summary,
      differences,
      employeeChanges: {
        newEmployees,
        terminatedEmployees,
        salaryChanges: salaryChanges.slice(0, 20), // Top 20
      },
      conceptChanges,
    };
  }

  /**
   * Genera dashboard ejecutivo de nómina
   */
  async getExecutiveDashboard(companyId: string): Promise<ExecutiveDashboard> {
    // Obtener último período
    const currentPeriod = await this.prisma.payrollPeriod.findFirst({
      where: { companyId },
      orderBy: [{ year: 'desc' }, { periodNumber: 'desc' }],
      include: {
        payrollDetails: true,
      },
    });

    // Obtener tendencia de últimos 12 períodos
    const recentPeriods = await this.prisma.payrollPeriod.findMany({
      where: {
        companyId,
        status: { in: ['PAID', 'CLOSED', 'APPROVED'] },
      },
      orderBy: [{ year: 'desc' }, { periodNumber: 'desc' }],
      take: 12,
      include: {
        _count: { select: { payrollDetails: true } },
      },
    });

    // Obtener distribución por departamento
    const byDepartment = await this.getDistributionByDepartment(companyId);

    // Obtener top conceptos
    const [topPerceptions, topDeductions] = await Promise.all([
      this.getTopConcepts(companyId, 'PERCEPTION', 5),
      this.getTopConcepts(companyId, 'DEDUCTION', 5),
    ]);

    // Obtener KPIs
    const kpis = await this.calculateKPIs(companyId);

    // Generar alertas
    const alerts = await this.generateAlerts(companyId);

    // Calcular total del período actual
    const currentPeriodTotal = currentPeriod
      ? this.rounding.sumAndRound(
          currentPeriod.payrollDetails.map((d: any) => Number(d.netPay))
        )
      : 0;

    const currentPeriodPerceptions = currentPeriod
      ? this.rounding.sumAndRound(
          currentPeriod.payrollDetails.map((d: any) => Number(d.totalPerceptions))
        )
      : 0;

    const currentPeriodDeductions = currentPeriod
      ? this.rounding.sumAndRound(
          currentPeriod.payrollDetails.map((d: any) => Number(d.totalDeductions))
        )
      : 0;

    return {
      currentPeriod: currentPeriod
        ? {
            id: currentPeriod.id,
            description: `${currentPeriod.periodType} ${currentPeriod.periodNumber}/${currentPeriod.year}`,
            status: currentPeriod.status,
            totalEmployees: currentPeriod.payrollDetails.length,
            totalNet: currentPeriodTotal,
            totalPerceptions: currentPeriodPerceptions,
            totalDeductions: currentPeriodDeductions,
            paymentDate: currentPeriod.paymentDate,
          }
        : null,
      kpis,
      trend: recentPeriods.reverse().map((p: any) => ({
        period: `${p.periodType.substring(0, 3)} ${p.periodNumber}/${p.year}`,
        totalNet: Number(p.totalNet),
        employeeCount: p._count.payrollDetails,
      })),
      byDepartment,
      topPerceptions,
      topDeductions,
      alerts,
      generatedAt: new Date(),
      companyId,
    };
  }

  /**
   * Obtiene vistas por excepción para revisión rápida
   */
  async getExceptionViews(companyId: string): Promise<ExceptionView[]> {
    const exceptions: ExceptionView[] = [];

    // 1. Empleados sin NSS
    const employeesWithoutNss = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE', nss: null },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true },
    });

    if (employeesWithoutNss.length > 0) {
      exceptions.push({
        category: 'EMPLOYEE_DATA',
        title: 'Empleados sin NSS',
        description: 'Empleados activos sin Número de Seguro Social registrado',
        totalCount: employeesWithoutNss.length,
        items: employeesWithoutNss.map((e: any) => ({
          id: e.id,
          employeeId: e.id,
          employeeName: `${e.firstName} ${e.lastName}`,
          description: `Empleado ${e.employeeNumber} sin NSS`,
          severity: 'HIGH' as const,
          actionRequired: true,
        })),
      });
    }

    // 2. CFDIs pendientes de timbrar
    const pendingCfdis = await this.prisma.cfdiNomina.findMany({
      where: {
        status: 'PENDING',
        employee: { companyId },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        payrollDetail: { include: { payrollPeriod: true } },
      },
    });

    if (pendingCfdis.length > 0) {
      exceptions.push({
        category: 'CFDI',
        title: 'CFDIs pendientes de timbrar',
        description: 'Comprobantes fiscales generados pero no timbrados',
        totalCount: pendingCfdis.length,
        items: pendingCfdis.map((c: any) => ({
          id: c.id,
          employeeId: c.employeeId,
          employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
          description: `CFDI del período ${c.payrollDetail?.payrollPeriod?.periodNumber}/${c.payrollDetail?.payrollPeriod?.year}`,
          severity: 'MEDIUM' as const,
          actionRequired: true,
        })),
      });
    }

    // 3. Incidencias pendientes de aprobar
    const pendingIncidents = await this.prisma.employeeIncident.findMany({
      where: {
        status: 'PENDING',
        employee: { companyId },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        incidentType: true,
      },
    });

    if (pendingIncidents.length > 0) {
      exceptions.push({
        category: 'INCIDENTS',
        title: 'Incidencias pendientes',
        description: 'Incidencias que requieren aprobación',
        totalCount: pendingIncidents.length,
        items: pendingIncidents.map((i: any) => ({
          id: i.id,
          employeeId: i.employeeId,
          employeeName: `${i.employee.firstName} ${i.employee.lastName}`,
          description: `${i.incidentType.name} - ${new Date(i.date).toLocaleDateString('es-MX')}`,
          value: Number(i.value),
          severity: 'MEDIUM' as const,
          actionRequired: true,
        })),
      });
    }

    // 4. Solicitudes de vacaciones pendientes
    const pendingVacations = await this.prisma.vacationRequest.findMany({
      where: {
        status: 'PENDING',
        employee: { companyId },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
      },
    });

    if (pendingVacations.length > 0) {
      exceptions.push({
        category: 'VACATIONS',
        title: 'Vacaciones pendientes de aprobar',
        description: 'Solicitudes de vacaciones esperando aprobación',
        totalCount: pendingVacations.length,
        items: pendingVacations.map((v: any) => ({
          id: v.id,
          employeeId: v.employeeId,
          employeeName: `${v.employee.firstName} ${v.employee.lastName}`,
          description: `${v.totalDays} días - ${new Date(v.startDate).toLocaleDateString('es-MX')} al ${new Date(v.endDate).toLocaleDateString('es-MX')}`,
          value: v.totalDays,
          severity: 'LOW' as const,
          actionRequired: true,
        })),
      });
    }

    // 5. Certificados próximos a vencer
    const companies = await this.prisma.company.findMany({
      where: {
        id: companyId,
        certificadoVigenciaFin: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        },
      },
      select: { id: true, name: true, certificadoVigenciaFin: true },
    });

    if (companies.length > 0) {
      exceptions.push({
        category: 'CERTIFICATES',
        title: 'Certificados por vencer',
        description: 'Certificados SAT que vencen en los próximos 30 días',
        totalCount: companies.length,
        items: companies.map((c: any) => ({
          id: c.id,
          description: `Certificado de ${c.name} vence el ${c.certificadoVigenciaFin?.toLocaleDateString('es-MX')}`,
          severity: 'CRITICAL' as const,
          actionRequired: true,
        })),
      });
    }

    // 6. Empleados con salario fuera de rango
    const salaryOutliers = await this.findSalaryOutliers(companyId);
    if (salaryOutliers.length > 0) {
      exceptions.push({
        category: 'SALARY',
        title: 'Salarios fuera de rango',
        description: 'Empleados con salario fuera del rango de su puesto',
        totalCount: salaryOutliers.length,
        items: salaryOutliers,
      });
    }

    // 7. Empleados sin departamento
    const employeesWithoutDept = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE', departmentId: null as any },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true },
    });

    if (employeesWithoutDept.length > 0) {
      exceptions.push({
        category: 'EMPLOYEE_DATA',
        title: 'Empleados sin departamento',
        description: 'Empleados activos sin departamento asignado',
        totalCount: employeesWithoutDept.length,
        items: employeesWithoutDept.map((e: any) => ({
          id: e.id,
          employeeId: e.id,
          employeeName: `${e.firstName} ${e.lastName}`,
          description: `Empleado ${e.employeeNumber} sin departamento`,
          severity: 'LOW' as const,
          actionRequired: false,
        })),
      });
    }

    return exceptions;
  }

  // ===== MÉTODOS AUXILIARES =====

  private async getPeriodDetails(periodId: string) {
    return this.prisma.payrollPeriod.findUniqueOrThrow({
      where: { id: periodId },
      include: {
        payrollDetails: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeNumber: true },
            },
            perceptions: { include: { concept: true } },
            deductions: { include: { concept: true } },
          },
        },
      },
    });
  }

  private createPeriodSummary(periodData: any): PeriodSummary {
    const totalPerceptions = this.rounding.sumAndRound(
      periodData.payrollDetails.map((d: any) => Number(d.totalPerceptions))
    );
    const totalDeductions = this.rounding.sumAndRound(
      periodData.payrollDetails.map((d: any) => Number(d.totalDeductions))
    );
    const totalNet = this.rounding.sumAndRound(
      periodData.payrollDetails.map((d: any) => Number(d.netPay))
    );
    const employeeCount = periodData.payrollDetails.length;

    return {
      id: periodData.id,
      periodNumber: periodData.periodNumber,
      year: periodData.year,
      periodType: periodData.periodType,
      startDate: periodData.startDate,
      endDate: periodData.endDate,
      status: periodData.status,
      employeeCount,
      totalPerceptions,
      totalDeductions,
      totalNet,
      averageNetPay: employeeCount > 0
        ? this.rounding.roundCurrency(totalNet / employeeCount)
        : 0,
    };
  }

  private async calculateConceptChanges(
    period1Id: string,
    period2Id: string,
  ): Promise<PeriodComparison['conceptChanges']> {
    // Obtener totales por concepto para ambos períodos
    const [p1Perceptions, p1Deductions, p2Perceptions, p2Deductions] = await Promise.all([
      this.getConceptTotals(period1Id, 'PERCEPTION'),
      this.getConceptTotals(period1Id, 'DEDUCTION'),
      this.getConceptTotals(period2Id, 'PERCEPTION'),
      this.getConceptTotals(period2Id, 'DEDUCTION'),
    ]);

    const changes: PeriodComparison['conceptChanges'] = [];

    // Combinar percepciones
    const allPerceptionCodes = new Set([
      ...p1Perceptions.map((p: any) => p.code),
      ...p2Perceptions.map((p: any) => p.code),
    ]);

    for (const code of allPerceptionCodes) {
      const p1 = p1Perceptions.find((p: any) => p.code === code);
      const p2 = p2Perceptions.find((p: any) => p.code === code);
      const period1Total = p1?.total || 0;
      const period2Total = p2?.total || 0;
      const difference = this.rounding.roundCurrency(period2Total - period1Total);

      if (Math.abs(difference) > 0) {
        changes.push({
          code,
          name: p2?.name || p1?.name || code,
          type: 'PERCEPTION',
          period1Total,
          period2Total,
          difference,
          percentChange: period1Total > 0
            ? this.rounding.roundPercentage((difference / period1Total) * 100)
            : period2Total > 0 ? 100 : 0,
        });
      }
    }

    // Combinar deducciones
    const allDeductionCodes = new Set([
      ...p1Deductions.map((p: any) => p.code),
      ...p2Deductions.map((p: any) => p.code),
    ]);

    for (const code of allDeductionCodes) {
      const p1 = p1Deductions.find((p: any) => p.code === code);
      const p2 = p2Deductions.find((p: any) => p.code === code);
      const period1Total = p1?.total || 0;
      const period2Total = p2?.total || 0;
      const difference = this.rounding.roundCurrency(period2Total - period1Total);

      if (Math.abs(difference) > 0) {
        changes.push({
          code,
          name: p2?.name || p1?.name || code,
          type: 'DEDUCTION',
          period1Total,
          period2Total,
          difference,
          percentChange: period1Total > 0
            ? this.rounding.roundPercentage((difference / period1Total) * 100)
            : period2Total > 0 ? 100 : 0,
        });
      }
    }

    // Ordenar por mayor cambio absoluto
    return changes.sort((a: any, b: any) => Math.abs(b.difference) - Math.abs(a.difference));
  }

  private async getConceptTotals(
    periodId: string,
    type: 'PERCEPTION' | 'DEDUCTION',
  ): Promise<{ code: string; name: string; total: number }[]> {
    if (type === 'PERCEPTION') {
      const perceptions = await this.prisma.payrollPerception.groupBy({
        by: ['conceptId'],
        where: { payrollDetail: { payrollPeriodId: periodId } },
        _sum: { amount: true },
      });

      const concepts = await this.prisma.payrollConcept.findMany({
        where: { id: { in: perceptions.map((p: any) => p.conceptId) } },
      });

      return perceptions.map((p: any) => ({
        code: concepts.find((c: any) => c.id === p.conceptId)?.code || '',
        name: concepts.find((c: any) => c.id === p.conceptId)?.name || '',
        total: Number(p._sum.amount) || 0,
      }));
    } else {
      const deductions = await this.prisma.payrollDeduction.groupBy({
        by: ['conceptId'],
        where: { payrollDetail: { payrollPeriodId: periodId } },
        _sum: { amount: true },
      });

      const concepts = await this.prisma.payrollConcept.findMany({
        where: { id: { in: deductions.map((d: any) => d.conceptId) } },
      });

      return deductions.map((d: any) => ({
        code: concepts.find((c: any) => c.id === d.conceptId)?.code || '',
        name: concepts.find((c: any) => c.id === d.conceptId)?.name || '',
        total: Number(d._sum.amount) || 0,
      }));
    }
  }

  private async getDistributionByDepartment(companyId: string) {
    const departments = await this.prisma.department.findMany({
      where: { companyId },
      include: {
        employees: {
          where: { status: 'ACTIVE' },
          include: {
            payrollDetails: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    const totalNet = departments.reduce((sum: any, dept: any) => {
      return sum + dept.employees.reduce((empSum: any, emp: any) => {
        return empSum + (emp.payrollDetails[0] ? Number(emp.payrollDetails[0].netPay) : 0);
      }, 0);
    }, 0);

    return departments.map((dept: any) => {
      const deptTotal = dept.employees.reduce((sum: number, emp: any) => {
        return sum + (emp.payrollDetails[0] ? Number(emp.payrollDetails[0].netPay) : 0);
      }, 0);

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        employeeCount: dept.employees.length,
        totalNet: this.rounding.roundCurrency(deptTotal),
        percentOfTotal: totalNet > 0
          ? this.rounding.roundPercentage((deptTotal / totalNet) * 100)
          : 0,
      };
    }).sort((a: any, b: any) => b.totalNet - a.totalNet);
  }

  private async getTopConcepts(
    companyId: string,
    type: 'PERCEPTION' | 'DEDUCTION',
    limit: number,
  ) {
    const lastPeriod = await this.prisma.payrollPeriod.findFirst({
      where: { companyId, status: { in: ['PAID', 'CLOSED'] } },
      orderBy: [{ year: 'desc' }, { periodNumber: 'desc' }],
    });

    if (!lastPeriod) return [];

    const totals = await this.getConceptTotals(lastPeriod.id, type);
    const total = this.rounding.sumAndRound(totals.map(t => t.total));

    return totals
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, limit)
      .map(t => ({
        code: t.code,
        name: t.name,
        total: this.rounding.roundCurrency(t.total),
        percentOfTotal: total > 0
          ? this.rounding.roundPercentage((t.total / total) * 100)
          : 0,
      }));
  }

  private async calculateKPIs(companyId: string) {
    const [
      employeeCount,
      avgSalary,
      cfdisPending,
      incidentsPending,
      vacationsPending,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.employee.aggregate({
        where: { companyId, status: 'ACTIVE' },
        _avg: { baseSalary: true },
      }),
      this.prisma.cfdiNomina.count({
        where: { status: 'PENDING', employee: { companyId } },
      }),
      this.prisma.employeeIncident.count({
        where: { status: 'PENDING', employee: { companyId } },
      }),
      this.prisma.vacationRequest.count({
        where: { status: 'PENDING', employee: { companyId } },
      }),
    ]);

    // Calcular costo mensual estimado
    const lastPeriod = await this.prisma.payrollPeriod.findFirst({
      where: { companyId, status: { in: ['PAID', 'CLOSED'] } },
      orderBy: [{ year: 'desc' }, { periodNumber: 'desc' }],
    });

    let monthlyPayrollCost = 0;
    if (lastPeriod) {
      const periodNet = Number(lastPeriod.totalNet);
      // Ajustar según tipo de período
      switch (lastPeriod.periodType) {
        case 'WEEKLY':
          monthlyPayrollCost = periodNet * 4.33;
          break;
        case 'BIWEEKLY':
          monthlyPayrollCost = periodNet * 2;
          break;
        case 'MONTHLY':
          monthlyPayrollCost = periodNet;
          break;
      }
    }

    return {
      monthlyPayrollCost: this.rounding.roundCurrency(monthlyPayrollCost),
      averageSalary: this.rounding.roundCurrency(Number(avgSalary._avg.baseSalary) || 0),
      employeeCount,
      cfdisPending,
      incidentsPending,
      vacationRequestsPending: vacationsPending,
    };
  }

  private async generateAlerts(companyId: string): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    // Alerta de CFDIs pendientes
    const cfdisPending = await this.prisma.cfdiNomina.count({
      where: { status: 'PENDING', employee: { companyId } },
    });
    if (cfdisPending > 0) {
      alerts.push({
        type: 'WARNING',
        category: 'CFDI',
        message: `Hay ${cfdisPending} CFDI(s) pendientes de timbrar`,
        count: cfdisPending,
        link: '/cfdi/pending',
      });
    }

    // Alerta de período sin cerrar
    const openPeriods = await this.prisma.payrollPeriod.count({
      where: { companyId, status: { in: ['DRAFT', 'PROCESSING', 'CALCULATED'] } },
    });
    if (openPeriods > 0) {
      alerts.push({
        type: 'INFO',
        category: 'PAYROLL',
        message: `Hay ${openPeriods} período(s) de nómina sin cerrar`,
        count: openPeriods,
        link: '/payroll/periods',
      });
    }

    // Alerta de certificado próximo a vencer
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { certificadoVigenciaFin: true },
    });
    if (company?.certificadoVigenciaFin) {
      const daysToExpire = Math.floor(
        (company.certificadoVigenciaFin.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      if (daysToExpire <= 30) {
        alerts.push({
          type: daysToExpire <= 7 ? 'ERROR' : 'WARNING',
          category: 'CERTIFICATE',
          message: `El certificado SAT vence en ${daysToExpire} día(s)`,
          link: '/settings/certificates',
        });
      }
    }

    return alerts;
  }

  private async findSalaryOutliers(companyId: string): Promise<ExceptionItem[]> {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        jobPosition: true,
      },
    });

    const outliers: ExceptionItem[] = [];

    for (const emp of employees) {
      const salary = Number(emp.baseSalary);
      const minSalary = emp.jobPosition?.minSalary ? Number(emp.jobPosition.minSalary) : null;
      const maxSalary = emp.jobPosition?.maxSalary ? Number(emp.jobPosition.maxSalary) : null;

      if (minSalary && salary < minSalary) {
        outliers.push({
          id: emp.id,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          description: `Salario ($${salary.toLocaleString()}) por debajo del mínimo del puesto ($${minSalary.toLocaleString()})`,
          value: salary,
          severity: 'HIGH',
          actionRequired: true,
          metadata: { minSalary, maxSalary, currentSalary: salary },
        });
      } else if (maxSalary && salary > maxSalary) {
        outliers.push({
          id: emp.id,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          description: `Salario ($${salary.toLocaleString()}) por encima del máximo del puesto ($${maxSalary.toLocaleString()})`,
          value: salary,
          severity: 'MEDIUM',
          actionRequired: false,
          metadata: { minSalary, maxSalary, currentSalary: salary },
        });
      }
    }

    return outliers;
  }
}
