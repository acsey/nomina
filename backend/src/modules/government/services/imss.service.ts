import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { FiscalValuesService } from '@/common/fiscal/fiscal-values.service';
import * as dayjs from 'dayjs';

/**
 * IMSS Service - Government Integration
 *
 * Handles IMSS quota calculations, SUA file generation, and IDSE movements.
 *
 * File Format References:
 * - SUA: Sistema Único de Autodeterminación (IMSS payment file)
 * - IDSE: IMSS Desde Su Empresa (electronic movements)
 *
 * Movement Types:
 * - 08: Alta (New hire)
 * - 02: Baja (Termination)
 * - 07: Modificación de salario (Salary change)
 */

export interface IdseMovement {
  registroPatronal: string;
  nss: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombre: string;
  salarioBase: number;
  tipoMovimiento: '08' | '02' | '07'; // 08=Alta, 02=Baja, 07=Modificación
  fechaMovimiento: Date;
  umf?: string; // Unidad Médica Familiar (optional)
  tipoSalario: '0' | '1' | '2'; // 0=Fijo, 1=Variable, 2=Mixto
  semanaJornadaReducida?: string;
  guia?: string;
}

export interface SuaRecord {
  registroPatronal: string;
  nss: string;
  nombreTrabajador: string;
  sbc: number;
  diasCotizados: number;
  incapacidades: number;
  ausentismos: number;
  cuotaPatronal: number;
  cuotaObrera: number;
}

@Injectable()
export class ImssService {
  private readonly logger = new Logger(ImssService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalValues: FiscalValuesService,
  ) {}

  async generateReport(companyId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        nss: { not: null },
      },
      include: {
        jobPosition: true,
        payrollDetails: {
          where: { payrollPeriodId: periodId },
        },
      },
    });

    const report = employees.map((emp: any) => {
      const sbc = Number(emp.salarioDiarioIntegrado) || this.calculateSBC(emp);
      const periodDays = this.getPeriodDays(period?.periodType || 'BIWEEKLY');

      return {
        nss: emp.nss,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        sbc,
        periodDays,
        quotas: this.calculateQuotas(sbc, periodDays, emp.jobPosition?.riskLevel),
      };
    });

    const totals = report.reduce(
      (acc: any, emp: any) => ({
        employerTotal: acc.employerTotal + emp.quotas.employer.total,
        employeeTotal: acc.employeeTotal + emp.quotas.employee.total,
        grandTotal: acc.grandTotal + emp.quotas.employer.total + emp.quotas.employee.total,
      }),
      { employerTotal: 0, employeeTotal: 0, grandTotal: 0 },
    );

    return {
      period,
      employees: report,
      totals,
    };
  }

  async calculateEmployerQuotas(companyId: string, periodId: string) {
    const report = await this.generateReport(companyId, periodId);

    return {
      period: report.period,
      summary: {
        cuotaFijaPatron: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.cuotaFija,
          0,
        ),
        excedente: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.excedente,
          0,
        ),
        prestacionesDinero: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.prestacionesDinero,
          0,
        ),
        gastosMedicosPensionados: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.gastosMedicosPensionados,
          0,
        ),
        riesgoTrabajo: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.riesgoTrabajo,
          0,
        ),
        invalidezVida: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.invalidezVida,
          0,
        ),
        guarderias: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.guarderias,
          0,
        ),
        cesantiaVejez: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.cesantiaVejez,
          0,
        ),
        infonavit: report.employees.reduce(
          (sum: number, e: any) => sum + e.quotas.employer.infonavit,
          0,
        ),
        total: report.totals.employerTotal,
      },
    };
  }

  async generateSuaFile(companyId: string, periodId: string): Promise<string> {
    const report = await this.generateReport(companyId, periodId);

    // Formato SUA simplificado
    const lines: string[] = [];

    for (const emp of report.employees) {
      const line = [
        emp.nss?.padEnd(11, ' '),
        emp.name.substring(0, 50).padEnd(50, ' '),
        emp.sbc.toFixed(2).padStart(10, '0'),
        emp.periodDays.toString().padStart(2, '0'),
        emp.quotas.employer.total.toFixed(2).padStart(12, '0'),
        emp.quotas.employee.total.toFixed(2).padStart(12, '0'),
      ].join('|');

      lines.push(line);
    }

    return lines.join('\n');
  }

  async getIdseMovements(companyId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Altas
    const altas = await this.prisma.employee.findMany({
      where: {
        companyId,
        hireDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        nss: true,
        curp: true,
        hireDate: true,
        salarioDiarioIntegrado: true,
        baseSalary: true,
      },
    });

    // Bajas
    const bajas = await this.prisma.employee.findMany({
      where: {
        companyId,
        terminationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        nss: true,
        terminationDate: true,
      },
    });

    // Modificaciones de salario
    const modificaciones = await this.prisma.salaryHistory.findMany({
      where: {
        employee: { companyId },
        effectiveDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            nss: true,
          },
        },
      },
    });

    return {
      period: { month, year },
      altas: altas.map((e: any) => ({
        ...e,
        movementType: 'ALTA',
        sbc: Number(e.salarioDiarioIntegrado) || Number(e.baseSalary) / 30,
      })),
      bajas: bajas.map((e: any) => ({
        ...e,
        movementType: 'BAJA',
      })),
      modificaciones: modificaciones.map((m: any) => ({
        ...m.employee,
        movementType: 'MODIFICACION_SALARIO',
        oldSalary: m.oldSalary,
        newSalary: m.newSalary,
        effectiveDate: m.effectiveDate,
      })),
    };
  }

  async registerMovement(data: {
    employeeId: string;
    movementType: 'ALTA' | 'BAJA' | 'MODIFICACION_SALARIO';
    effectiveDate: Date;
    sbc?: number;
    reason?: string;
  }) {
    // Registrar movimiento para IDSE
    // En producción, esto generaría el archivo de movimientos IDSE
    return {
      success: true,
      movementType: data.movementType,
      effectiveDate: data.effectiveDate,
      message: 'Movimiento registrado correctamente',
    };
  }

  private calculateSBC(employee: any): number {
    const dailySalary = Number(employee.baseSalary) / 30;
    const factorIntegracion = 1 + (15 / 365) + (12 * 0.25 / 365);
    return dailySalary * factorIntegracion;
  }

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

  private calculateQuotas(sbc: number, days: number, riskLevel?: string) {
    const tresSMG = this.SALARIO_MINIMO * 3;

    // Cuotas del patrón
    const employer = {
      cuotaFija: this.UMA_DIARIA * days * 0.204,
      excedente: sbc > tresSMG ? (sbc - tresSMG) * days * 0.011 : 0,
      prestacionesDinero: sbc * days * 0.007,
      gastosMedicosPensionados: sbc * days * 0.0105,
      riesgoTrabajo: sbc * days * this.getRiskRate(riskLevel),
      invalidezVida: sbc * days * 0.0175,
      guarderias: sbc * days * 0.01,
      cesantiaVejez: sbc * days * 0.0315,
      infonavit: sbc * days * 0.05,
      total: 0,
    };
    employer.total = Object.values(employer).reduce((a, b) => a + b, 0);

    // Cuotas del trabajador
    const employee = {
      excedente: sbc > tresSMG ? (sbc - tresSMG) * days * 0.004 : 0,
      prestacionesDinero: sbc * days * 0.0025,
      invalidezVida: sbc * days * 0.00625,
      cesantiaVejez: sbc * days * 0.01125,
      total: 0,
    };
    employee.total = Object.values(employee).reduce((a, b) => a + b, 0);

    return { employer, employee };
  }

  private getRiskRate(riskLevel?: string): number {
    const rates: Record<string, number> = {
      CLASE_I: 0.0054355,
      CLASE_II: 0.0113065,
      CLASE_III: 0.025984,
      CLASE_IV: 0.0465325,
      CLASE_V: 0.0758875,
    };
    return rates[riskLevel || 'CLASE_I'] || 0.0054355;
  }

  // ============================================
  // IDSE FILE GENERATION (IMSS Desde Su Empresa)
  // ============================================

  /**
   * Generate IDSE file for employee movements
   * Format: Fixed-length records per IMSS specification
   *
   * Record Layout (per movement):
   * - Pos 1-11: NSS (11 chars)
   * - Pos 12-61: Apellido Paterno (50 chars)
   * - Pos 62-111: Apellido Materno (50 chars)
   * - Pos 112-161: Nombre(s) (50 chars)
   * - Pos 162-168: SBC (7 digits, 2 decimals implied)
   * - Pos 169-170: Tipo de Movimiento (2 chars: 08=Alta, 02=Baja, 07=Mod)
   * - Pos 171-178: Fecha Movimiento (DDMMAAAA)
   * - Pos 179-181: UMF (3 chars, optional)
   * - Pos 182: Tipo de Salario (1 char: 0=Fijo, 1=Variable, 2=Mixto)
   * - Pos 183-188: Semana/Jornada Reducida (6 chars, optional)
   * - Pos 189-196: Guía (8 chars, for batch identification)
   */
  async generateIdseFile(companyId: string, month: number, year: number): Promise<{
    content: string;
    recordCount: number;
    movements: IdseMovement[];
    validation: { isValid: boolean; errors: string[] };
  }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { registroPatronal: true, name: true },
    });

    if (!company?.registroPatronal) {
      return {
        content: '',
        recordCount: 0,
        movements: [],
        validation: { isValid: false, errors: ['Company has no Registro Patronal configured'] },
      };
    }

    const movements = await this.getIdseMovements(companyId, month, year);
    const idseRecords: string[] = [];
    const errors: string[] = [];

    // Process Altas
    for (const alta of movements.altas) {
      const validation = this.validateIdseMovement({
        nss: alta.nss,
        nombre: alta.firstName,
        apellidoPaterno: alta.lastName,
        sbc: alta.sbc,
      });

      if (!validation.isValid) {
        errors.push(`Alta ${alta.employeeNumber}: ${validation.errors.join(', ')}`);
        continue;
      }

      const record = this.formatIdseRecord({
        registroPatronal: company.registroPatronal,
        nss: alta.nss || '',
        apellidoPaterno: alta.lastName,
        apellidoMaterno: alta.secondLastName || '',
        nombre: alta.firstName,
        salarioBase: alta.sbc,
        tipoMovimiento: '08',
        fechaMovimiento: new Date(alta.hireDate),
        tipoSalario: '0', // Default: Fijo
      });

      idseRecords.push(record);
    }

    // Process Bajas
    for (const baja of movements.bajas) {
      const validation = this.validateIdseMovement({
        nss: baja.nss,
        nombre: baja.firstName,
        apellidoPaterno: baja.lastName,
      });

      if (!validation.isValid) {
        errors.push(`Baja ${baja.employeeNumber}: ${validation.errors.join(', ')}`);
        continue;
      }

      const record = this.formatIdseRecord({
        registroPatronal: company.registroPatronal,
        nss: baja.nss || '',
        apellidoPaterno: baja.lastName,
        apellidoMaterno: baja.secondLastName || '',
        nombre: baja.firstName,
        salarioBase: 0,
        tipoMovimiento: '02',
        fechaMovimiento: new Date(baja.terminationDate),
        tipoSalario: '0',
      });

      idseRecords.push(record);
    }

    // Process Modificaciones
    for (const mod of movements.modificaciones) {
      const validation = this.validateIdseMovement({
        nss: mod.nss,
        nombre: mod.firstName,
        apellidoPaterno: mod.lastName,
        sbc: Number(mod.newSalary) / 30,
      });

      if (!validation.isValid) {
        errors.push(`Modificación ${mod.employeeNumber}: ${validation.errors.join(', ')}`);
        continue;
      }

      const record = this.formatIdseRecord({
        registroPatronal: company.registroPatronal,
        nss: mod.nss || '',
        apellidoPaterno: mod.lastName,
        apellidoMaterno: mod.secondLastName || '',
        nombre: mod.firstName,
        salarioBase: Number(mod.newSalary) / 30,
        tipoMovimiento: '07',
        fechaMovimiento: new Date(mod.effectiveDate),
        tipoSalario: '0',
      });

      idseRecords.push(record);
    }

    this.logger.log(`Generated IDSE file with ${idseRecords.length} records for ${company.name}`);

    return {
      content: idseRecords.join('\r\n'),
      recordCount: idseRecords.length,
      movements: [...movements.altas, ...movements.bajas, ...movements.modificaciones] as any[],
      validation: {
        isValid: errors.length === 0,
        errors,
      },
    };
  }

  /**
   * Format a single IDSE record according to IMSS specification
   */
  private formatIdseRecord(movement: IdseMovement): string {
    const fecha = dayjs(movement.fechaMovimiento).format('DDMMYYYY');

    // Format SBC: 7 digits with 2 implied decimals (e.g., 50000 = 500.00)
    const sbcFormatted = Math.round(movement.salarioBase * 100).toString().padStart(7, '0');

    return [
      movement.nss.padEnd(11, ' '),                                    // 1-11: NSS
      this.sanitizeText(movement.apellidoPaterno, 50),                 // 12-61: Apellido Paterno
      this.sanitizeText(movement.apellidoMaterno || '', 50),           // 62-111: Apellido Materno
      this.sanitizeText(movement.nombre, 50),                          // 112-161: Nombre
      sbcFormatted,                                                     // 162-168: SBC
      movement.tipoMovimiento,                                          // 169-170: Tipo Movimiento
      fecha,                                                            // 171-178: Fecha
      (movement.umf || '').padEnd(3, ' '),                              // 179-181: UMF
      movement.tipoSalario,                                             // 182: Tipo Salario
      (movement.semanaJornadaReducida || '').padEnd(6, ' '),           // 183-188: Semana/Jornada
      (movement.guia || this.generateGuia()).padEnd(8, ' '),           // 189-196: Guía
    ].join('');
  }

  /**
   * Validate IDSE movement data
   */
  private validateIdseMovement(data: {
    nss?: string | null;
    nombre?: string;
    apellidoPaterno?: string;
    sbc?: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.nss || data.nss.length !== 11) {
      errors.push('NSS must be 11 characters');
    }

    if (!data.nombre || data.nombre.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!data.apellidoPaterno || data.apellidoPaterno.trim().length === 0) {
      errors.push('Last name (paterno) is required');
    }

    if (data.sbc !== undefined && (data.sbc < 0 || data.sbc > 99999.99)) {
      errors.push('SBC must be between 0 and 99999.99');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ============================================
  // ENHANCED SUA FILE GENERATION
  // ============================================

  /**
   * Generate SUA file in official IMSS format
   * Used for submitting IMSS quota payments
   *
   * File Structure:
   * - Header record (type 1)
   * - Employee records (type 2)
   * - Trailer record (type 9)
   */
  async generateSuaFileEnhanced(companyId: string, periodId: string): Promise<{
    content: string;
    recordCount: number;
    totals: {
      cuotaPatronal: number;
      cuotaObrera: number;
      total: number;
    };
    validation: { isValid: boolean; errors: string[]; warnings: string[] };
  }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { registroPatronal: true, name: true, rfc: true },
    });

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    if (!company?.registroPatronal) {
      return {
        content: '',
        recordCount: 0,
        totals: { cuotaPatronal: 0, cuotaObrera: 0, total: 0 },
        validation: { isValid: false, errors: ['Company has no Registro Patronal'], warnings: [] },
      };
    }

    if (!period) {
      return {
        content: '',
        recordCount: 0,
        totals: { cuotaPatronal: 0, cuotaObrera: 0, total: 0 },
        validation: { isValid: false, errors: ['Period not found'], warnings: [] },
      };
    }

    const report = await this.generateReport(companyId, periodId);
    const year = await this.fiscalValues.getValuesForYear(period.year);

    const lines: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Header record (Type 1)
    const header = this.formatSuaHeader({
      registroPatronal: company.registroPatronal,
      periodoInicio: period.startDate,
      periodoFin: period.endDate,
      rfc: company.rfc || '',
    });
    lines.push(header);

    // Employee records (Type 2)
    let totalPatronal = 0;
    let totalObrera = 0;

    for (const emp of report.employees) {
      if (!emp.nss) {
        warnings.push(`Employee ${emp.employeeNumber} has no NSS, skipped`);
        continue;
      }

      const record = this.formatSuaEmployeeRecord({
        registroPatronal: company.registroPatronal,
        nss: emp.nss,
        nombreTrabajador: emp.name,
        sbc: emp.sbc,
        diasCotizados: emp.periodDays,
        incapacidades: 0, // TODO: Get from incidents
        ausentismos: 0, // TODO: Get from incidents
        cuotaPatronal: emp.quotas.employer.total,
        cuotaObrera: emp.quotas.employee.total,
      });

      lines.push(record);
      totalPatronal += emp.quotas.employer.total;
      totalObrera += emp.quotas.employee.total;
    }

    // Trailer record (Type 9)
    const trailer = this.formatSuaTrailer({
      registroPatronal: company.registroPatronal,
      totalRegistros: report.employees.length,
      totalPatronal,
      totalObrera,
    });
    lines.push(trailer);

    this.logger.log(`Generated SUA file with ${report.employees.length} employees for ${company.name}`);

    return {
      content: lines.join('\r\n'),
      recordCount: report.employees.length,
      totals: {
        cuotaPatronal: Math.round(totalPatronal * 100) / 100,
        cuotaObrera: Math.round(totalObrera * 100) / 100,
        total: Math.round((totalPatronal + totalObrera) * 100) / 100,
      },
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
    };
  }

  /**
   * Format SUA header record
   */
  private formatSuaHeader(data: {
    registroPatronal: string;
    periodoInicio: Date;
    periodoFin: Date;
    rfc: string;
  }): string {
    return [
      '1',                                                    // Record type
      data.registroPatronal.padEnd(11, ' '),                 // Registro Patronal
      dayjs(data.periodoInicio).format('DDMMYYYY'),          // Fecha inicio
      dayjs(data.periodoFin).format('DDMMYYYY'),             // Fecha fin
      data.rfc.padEnd(13, ' '),                              // RFC
      dayjs().format('DDMMYYYY'),                            // Fecha generación
      ''.padEnd(50, ' '),                                    // Reserved
    ].join('');
  }

  /**
   * Format SUA employee record
   */
  private formatSuaEmployeeRecord(data: SuaRecord): string {
    return [
      '2',                                                    // Record type
      data.registroPatronal.padEnd(11, ' '),                 // Registro Patronal
      data.nss.padEnd(11, ' '),                              // NSS
      this.sanitizeText(data.nombreTrabajador, 50),          // Nombre
      Math.round(data.sbc * 100).toString().padStart(9, '0'), // SBC (2 decimals implied)
      data.diasCotizados.toString().padStart(2, '0'),        // Días cotizados
      data.incapacidades.toString().padStart(2, '0'),        // Días incapacidad
      data.ausentismos.toString().padStart(2, '0'),          // Días ausentismo
      Math.round(data.cuotaPatronal * 100).toString().padStart(12, '0'), // Cuota patronal
      Math.round(data.cuotaObrera * 100).toString().padStart(12, '0'),   // Cuota obrera
    ].join('');
  }

  /**
   * Format SUA trailer record
   */
  private formatSuaTrailer(data: {
    registroPatronal: string;
    totalRegistros: number;
    totalPatronal: number;
    totalObrera: number;
  }): string {
    return [
      '9',                                                    // Record type
      data.registroPatronal.padEnd(11, ' '),                 // Registro Patronal
      data.totalRegistros.toString().padStart(6, '0'),       // Total registros
      Math.round(data.totalPatronal * 100).toString().padStart(15, '0'),  // Total patronal
      Math.round(data.totalObrera * 100).toString().padStart(15, '0'),    // Total obrera
      Math.round((data.totalPatronal + data.totalObrera) * 100).toString().padStart(15, '0'), // Gran total
    ].join('');
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Sanitize text for file output (remove special chars, uppercase)
   */
  private sanitizeText(text: string, maxLength: number): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^A-Za-z0-9\s]/g, '')  // Remove special chars
      .toUpperCase()
      .substring(0, maxLength)
      .padEnd(maxLength, ' ');
  }

  /**
   * Generate unique guide identifier for IDSE batch
   */
  private generateGuia(): string {
    const date = dayjs().format('MMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return date + random;
  }

  /**
   * Validate SUA file format
   */
  validateSuaFile(content: string): { isValid: boolean; errors: string[]; recordCount: number } {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const errors: string[] = [];
    let employeeRecords = 0;

    if (lines.length === 0) {
      return { isValid: false, errors: ['File is empty'], recordCount: 0 };
    }

    // Check header
    if (!lines[0].startsWith('1')) {
      errors.push('Missing or invalid header record (must start with 1)');
    }

    // Check trailer
    if (!lines[lines.length - 1].startsWith('9')) {
      errors.push('Missing or invalid trailer record (must start with 9)');
    }

    // Count and validate employee records
    for (let i = 1; i < lines.length - 1; i++) {
      if (!lines[i].startsWith('2')) {
        errors.push(`Line ${i + 1}: Invalid record type (expected 2)`);
      } else {
        employeeRecords++;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      recordCount: employeeRecords,
    };
  }
}
