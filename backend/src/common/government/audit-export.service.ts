/**
 * Servicio de Exportación para Auditoría Externa
 * Cumplimiento: Gobierno MX - Transparencia y rendición de cuentas
 *
 * Permite exportar:
 * - Auditoría fiscal completa por período
 * - Recibos con versiones y snapshots
 * - Registros de acciones críticas
 * - Evidencias fiscales
 *
 * Formatos: CSV, Excel (XLSX), JSON
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  companyId: string;
  periodId?: string;
  startDate?: Date;
  endDate?: Date;
  includeSnapshots?: boolean;
  includeVersions?: boolean;
  includeDocuments?: boolean;
}

export interface ExportResult {
  fileName: string;
  mimeType: string;
  data: Buffer | string;
  recordCount: number;
  exportedAt: string;
}

@Injectable()
export class AuditExportService {
  private readonly logger = new Logger(AuditExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exporta auditoría fiscal completa de un período
   */
  async exportFiscalAudit(options: ExportOptions): Promise<ExportResult> {
    this.logger.log(`Exportando auditoría fiscal: ${JSON.stringify(options)}`);

    // Obtener datos
    const where: any = {};
    if (options.periodId) {
      where.payrollDetail = {
        payrollPeriodId: options.periodId,
      };
    }
    if (options.startDate || options.endDate) {
      where.calculatedAt = {};
      if (options.startDate) where.calculatedAt.gte = options.startDate;
      if (options.endDate) where.calculatedAt.lte = options.endDate;
    }

    const fiscalAudits = await this.prisma.fiscalCalculationAudit.findMany({
      where,
      include: {
        payrollDetail: {
          include: {
            employee: {
              select: {
                employeeNumber: true,
                firstName: true,
                lastName: true,
                rfc: true,
              },
            },
            payrollPeriod: {
              select: {
                periodNumber: true,
                year: true,
                periodType: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
      orderBy: { calculatedAt: 'asc' },
    });

    return this.formatExport(
      fiscalAudits,
      'fiscal_audit',
      options.format,
      this.formatFiscalAuditRow.bind(this),
    );
  }

  /**
   * Exporta recibos con historial de versiones
   */
  async exportReceipts(options: ExportOptions): Promise<ExportResult> {
    this.logger.log(`Exportando recibos: ${JSON.stringify(options)}`);

    const where: any = {
      payrollPeriod: { companyId: options.companyId },
    };
    if (options.periodId) {
      where.payrollPeriodId = options.periodId;
    }

    const receipts = await this.prisma.payrollDetail.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeNumber: true,
            firstName: true,
            lastName: true,
            rfc: true,
            nss: true,
          },
        },
        payrollPeriod: true,
        perceptions: {
          include: { concept: true },
        },
        deductions: {
          include: { concept: true },
        },
        cfdiNomina: {
          select: {
            uuid: true,
            fechaTimbrado: true,
            status: true,
          },
        },
        versions: options.includeVersions ? true : false,
        rulesetSnapshots: options.includeSnapshots ? true : false,
      },
      orderBy: [
        { payrollPeriod: { year: 'asc' } },
        { payrollPeriod: { periodNumber: 'asc' } },
        { employee: { employeeNumber: 'asc' } },
      ],
    });

    return this.formatExport(
      receipts,
      'receipts',
      options.format,
      this.formatReceiptRow.bind(this),
    );
  }

  /**
   * Exporta snapshots de reglas fiscales
   */
  async exportRulesetSnapshots(options: ExportOptions): Promise<ExportResult> {
    this.logger.log(`Exportando snapshots: ${JSON.stringify(options)}`);

    const where: any = {};
    if (options.periodId) {
      where.payrollDetail = {
        payrollPeriodId: options.periodId,
      };
    }

    const snapshots = await this.prisma.receiptRulesetSnapshot.findMany({
      where,
      include: {
        payrollDetail: {
          include: {
            employee: {
              select: {
                employeeNumber: true,
                rfc: true,
              },
            },
            payrollPeriod: {
              select: {
                periodNumber: true,
                year: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.formatExport(
      snapshots,
      'ruleset_snapshots',
      options.format,
      this.formatSnapshotRow.bind(this),
    );
  }

  /**
   * Exporta log de acciones críticas
   */
  async exportCriticalActions(options: ExportOptions): Promise<ExportResult> {
    this.logger.log(`Exportando acciones críticas`);

    const where: any = { isCriticalAction: true };
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const actions = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.formatExport(
      actions,
      'critical_actions',
      options.format,
      this.formatActionRow.bind(this),
    );
  }

  /**
   * Exporta transiciones de estado
   */
  async exportStateTransitions(options: ExportOptions): Promise<ExportResult> {
    this.logger.log(`Exportando transiciones de estado`);

    const where: any = {};
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const transitions = await this.prisma.stateTransitionLog.findMany({
      where,
      include: {
        transitionRule: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.formatExport(
      transitions,
      'state_transitions',
      options.format,
      this.formatTransitionRow.bind(this),
    );
  }

  /**
   * Exporta reporte consolidado de un período
   */
  async exportPeriodReport(periodId: string): Promise<ExportResult> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        company: { select: { name: true, rfc: true } },
        payrollDetails: {
          include: {
            employee: true,
            perceptions: { include: { concept: true } },
            deductions: { include: { concept: true } },
            cfdiNomina: true,
          },
        },
        stampingAuthorizations: true,
      },
    });

    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Nómina';
    workbook.created = new Date();

    // Hoja 1: Resumen del período
    const summarySheet = workbook.addWorksheet('Resumen');
    this.addPeriodSummary(summarySheet, period);

    // Hoja 2: Detalle de recibos
    const receiptsSheet = workbook.addWorksheet('Recibos');
    this.addReceiptsDetail(receiptsSheet, period.payrollDetails);

    // Hoja 3: Desglose de conceptos
    const conceptsSheet = workbook.addWorksheet('Conceptos');
    this.addConceptsBreakdown(conceptsSheet, period.payrollDetails);

    // Hoja 4: Autorizaciones
    const authSheet = workbook.addWorksheet('Autorizaciones');
    this.addAuthorizationsDetail(authSheet, period);

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      fileName: `reporte_periodo_${period.year}_${period.periodNumber}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: Buffer.from(buffer),
      recordCount: period.payrollDetails.length,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Formatea y genera el archivo de exportación
   */
  private async formatExport(
    data: any[],
    type: string,
    format: 'csv' | 'xlsx' | 'json',
    rowFormatter: (item: any) => Record<string, any>,
  ): Promise<ExportResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rows = data.map(rowFormatter);

    if (format === 'json') {
      return {
        fileName: `${type}_${timestamp}.json`,
        mimeType: 'application/json',
        data: JSON.stringify(rows, null, 2),
        recordCount: rows.length,
        exportedAt: new Date().toISOString(),
      };
    }

    if (format === 'csv') {
      const csv = this.toCSV(rows);
      return {
        fileName: `${type}_${timestamp}.csv`,
        mimeType: 'text/csv',
        data: csv,
        recordCount: rows.length,
        exportedAt: new Date().toISOString(),
      };
    }

    // Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type);

    if (rows.length > 0) {
      // Headers
      const headers = Object.keys(rows[0]);
      sheet.addRow(headers);

      // Data
      rows.forEach((row) => {
        sheet.addRow(Object.values(row));
      });

      // Formato
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((col) => {
        col.width = 15;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      fileName: `${type}_${timestamp}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: Buffer.from(buffer),
      recordCount: rows.length,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Convierte datos a CSV
   */
  private toCSV(rows: Record<string, any>[]): string {
    if (rows.length === 0) return '';

    const headers = Object.keys(rows[0]);
    const headerLine = headers.map((h) => `"${h}"`).join(',');

    const dataLines = rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return val;
        })
        .join(','),
    );

    return [headerLine, ...dataLines].join('\n');
  }

  // Formatters
  private formatFiscalAuditRow(audit: any): Record<string, any> {
    return {
      fecha_calculo: audit.calculatedAt?.toISOString(),
      empleado_numero: audit.payrollDetail?.employee?.employeeNumber,
      empleado_nombre: `${audit.payrollDetail?.employee?.firstName} ${audit.payrollDetail?.employee?.lastName}`,
      empleado_rfc: audit.payrollDetail?.employee?.rfc,
      periodo: `${audit.payrollDetail?.payrollPeriod?.year}-${audit.payrollDetail?.payrollPeriod?.periodNumber}`,
      tipo_concepto: audit.conceptType,
      codigo_concepto: audit.conceptCode,
      base_calculo: audit.calculationBase,
      limite_inferior: audit.limitInferior,
      excedente: audit.excedente,
      impuesto_marginal: audit.impuestoMarginal,
      cuota_fija: audit.cuotaFija,
      resultado: audit.resultAmount,
      ley_aplicada: audit.legalLaw,
      articulo: audit.legalArticle,
      fuente_normativa: audit.legalSource,
      regla_aplicada: audit.ruleApplied,
      version_regla: audit.ruleVersion,
      tabla_usada: audit.tableUsed,
      anio_fiscal: audit.fiscalYear,
      tipo_periodo: audit.periodType,
    };
  }

  private formatReceiptRow(receipt: any): Record<string, any> {
    return {
      periodo: `${receipt.payrollPeriod?.year}-${receipt.payrollPeriod?.periodNumber}`,
      tipo_periodo: receipt.payrollPeriod?.periodType,
      empleado_numero: receipt.employee?.employeeNumber,
      empleado_nombre: `${receipt.employee?.firstName} ${receipt.employee?.lastName}`,
      empleado_rfc: receipt.employee?.rfc,
      empleado_nss: receipt.employee?.nss,
      dias_trabajados: receipt.workedDays,
      total_percepciones: receipt.totalPerceptions,
      total_deducciones: receipt.totalDeductions,
      neto: receipt.netPay,
      estado: receipt.status,
      uuid_cfdi: receipt.cfdiNomina?.uuid,
      fecha_timbrado: receipt.cfdiNomina?.fechaTimbrado?.toISOString(),
      estado_cfdi: receipt.cfdiNomina?.status,
      versiones: receipt.versions?.length || 0,
      snapshots: receipt.rulesetSnapshots?.length || 0,
    };
  }

  private formatSnapshotRow(snapshot: any): Record<string, any> {
    return {
      fecha_creacion: snapshot.createdAt?.toISOString(),
      empleado: snapshot.payrollDetail?.employee?.employeeNumber,
      periodo: `${snapshot.payrollDetail?.payrollPeriod?.year}-${snapshot.payrollDetail?.payrollPeriod?.periodNumber}`,
      version: snapshot.version,
      uma_diaria: snapshot.umaDaily,
      uma_mensual: snapshot.umaMonthly,
      smg_diario: snapshot.smgDaily,
      modo_redondeo: snapshot.roundingMode,
      version_tabla_isr: snapshot.isrTableVersion,
      version_tabla_subsidio: snapshot.subsidioTableVersion,
      version_tasas_imss: snapshot.imssRatesVersion,
      hash_integridad: snapshot.snapshotHash,
      estado_integridad: snapshot.integrityStatus,
      anio_fiscal: snapshot.fiscalYear,
    };
  }

  private formatActionRow(action: any): Record<string, any> {
    return {
      fecha: action.createdAt?.toISOString(),
      usuario_email: action.user?.email,
      usuario_nombre: `${action.user?.firstName} ${action.user?.lastName}`,
      accion: action.action,
      entidad: action.entity,
      entidad_id: action.entityId,
      justificacion: action.justification,
      base_legal: action.legalBasis,
      ip_origen: action.ipAddress,
      es_critica: action.isCriticalAction,
    };
  }

  private formatTransitionRow(transition: any): Record<string, any> {
    return {
      fecha: transition.createdAt?.toISOString(),
      tipo_entidad: transition.entityType,
      entidad_id: transition.entityId,
      estado_origen: transition.fromState,
      estado_destino: transition.toState,
      accion: transition.action,
      usuario_id: transition.userId,
      usuario_email: transition.userEmail,
      rol: transition.userRole,
      justificacion: transition.justification,
      es_valida: transition.isValid,
      razon_rechazo: transition.rejectionReason,
      ip_origen: transition.ipAddress,
    };
  }

  // Excel helpers
  private addPeriodSummary(sheet: ExcelJS.Worksheet, period: any): void {
    sheet.addRow(['REPORTE DE NÓMINA']);
    sheet.addRow([]);
    sheet.addRow(['Empresa', period.company?.name]);
    sheet.addRow(['RFC', period.company?.rfc]);
    sheet.addRow(['Período', `${period.year} - ${period.periodNumber}`]);
    sheet.addRow(['Tipo', period.periodType]);
    sheet.addRow(['Fecha Inicio', period.startDate?.toISOString().split('T')[0]]);
    sheet.addRow(['Fecha Fin', period.endDate?.toISOString().split('T')[0]]);
    sheet.addRow(['Fecha Pago', period.paymentDate?.toISOString().split('T')[0]]);
    sheet.addRow([]);
    sheet.addRow(['TOTALES']);
    sheet.addRow(['Total Percepciones', period.totalPerceptions]);
    sheet.addRow(['Total Deducciones', period.totalDeductions]);
    sheet.addRow(['Total Neto', period.totalNet]);
    sheet.addRow(['Número de Recibos', period.payrollDetails?.length]);
    sheet.addRow([]);
    sheet.addRow(['Estado', period.status]);
    sheet.addRow(['Autorizado para Timbrado', period.authorizedForStamping ? 'Sí' : 'No']);
    if (period.authorizedAt) {
      sheet.addRow(['Fecha Autorización', period.authorizedAt?.toISOString()]);
    }

    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 40;
  }

  private addReceiptsDetail(sheet: ExcelJS.Worksheet, details: any[]): void {
    const headers = [
      'No. Empleado',
      'Nombre',
      'RFC',
      'Días Trabajados',
      'Percepciones',
      'Deducciones',
      'Neto',
      'Estado',
      'UUID CFDI',
    ];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };

    details.forEach((d: any) => {
      sheet.addRow([
        d.employee?.employeeNumber,
        `${d.employee?.firstName} ${d.employee?.lastName}`,
        d.employee?.rfc,
        d.workedDays,
        d.totalPerceptions,
        d.totalDeductions,
        d.netPay,
        d.status,
        d.cfdiNomina?.uuid || '',
      ]);
    });

    sheet.columns.forEach((col) => (col.width = 15));
  }

  private addConceptsBreakdown(sheet: ExcelJS.Worksheet, details: any[]): void {
    const headers = ['No. Empleado', 'Tipo', 'Código', 'Concepto', 'Monto', 'Gravado', 'Exento'];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };

    details.forEach((d: any) => {
      // Percepciones
      d.perceptions?.forEach((p: any) => {
        sheet.addRow([
          d.employee?.employeeNumber,
          'PERCEPCIÓN',
          p.concept?.code,
          p.concept?.name,
          p.amount,
          p.taxableAmount,
          p.exemptAmount,
        ]);
      });
      // Deducciones
      d.deductions?.forEach((ded: any) => {
        sheet.addRow([
          d.employee?.employeeNumber,
          'DEDUCCIÓN',
          ded.concept?.code,
          ded.concept?.name,
          ded.amount,
          '',
          '',
        ]);
      });
    });

    sheet.columns.forEach((col) => (col.width = 15));
  }

  private addAuthorizationsDetail(sheet: ExcelJS.Worksheet, period: any): void {
    const headers = ['Tipo', 'Usuario', 'Fecha', 'Estado', 'Motivo'];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };

    period.stampingAuthorizations?.forEach((auth: any) => {
      sheet.addRow([
        'Autorización Timbrado',
        auth.authorizedBy,
        auth.authorizedAt?.toISOString(),
        auth.isActive ? 'Activa' : auth.revokedAt ? 'Revocada' : 'Inactiva',
        auth.revokeReason || '',
      ]);
    });

    sheet.columns.forEach((col) => (col.width = 20));
  }
}
