import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayrollSummary(periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        company: true,
        payrollDetails: {
          include: {
            employee: {
              include: {
                department: true,
                bank: true,
              },
            },
            perceptions: {
              include: { concept: true },
            },
            deductions: {
              include: { concept: true },
            },
          },
        },
      },
    });

    return period;
  }

  async generatePayrollExcel(periodId: string): Promise<Buffer> {
    const data = await this.getPayrollSummary(periodId);
    if (!data) {
      throw new Error('Período no encontrado');
    }

    const workbook = new ExcelJS.Workbook();

    // ===========================================
    // HOJA 1: RESUMEN DE NÓMINA
    // ===========================================
    const summarySheet = workbook.addWorksheet('Resumen');

    // Título
    summarySheet.mergeCells('A1:H1');
    summarySheet.getCell('A1').value = `NÓMINA - ${data.company?.name || 'Empresa'}`;
    summarySheet.getCell('A1').font = { size: 16, bold: true };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    summarySheet.mergeCells('A2:H2');
    summarySheet.getCell('A2').value = `Período ${data.periodNumber}/${data.year} - ${this.getPeriodTypeLabel(data.periodType)}`;
    summarySheet.getCell('A2').alignment = { horizontal: 'center' };

    // Encabezados
    const headers = [
      'No. Empleado', 'Nombre Completo', 'RFC', 'Departamento',
      'Días Trab.', 'Total Percepciones', 'Total Deducciones', 'Neto a Pagar'
    ];

    summarySheet.getRow(4).values = headers;
    summarySheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' },
    };
    summarySheet.getRow(4).alignment = { horizontal: 'center' };

    // Anchos de columnas
    summarySheet.columns = [
      { width: 15 }, { width: 35 }, { width: 15 }, { width: 20 },
      { width: 12 }, { width: 18 }, { width: 18 }, { width: 18 },
    ];

    // Datos
    data.payrollDetails.forEach((detail) => {
      summarySheet.addRow([
        detail.employee.employeeNumber,
        `${detail.employee.firstName} ${detail.employee.lastName}`,
        (detail.employee as any).rfc || '',
        detail.employee.department?.name || '',
        Number(detail.workedDays),
        Number(detail.totalPerceptions),
        Number(detail.totalDeductions),
        Number(detail.netPay),
      ]);
    });

    // Formato de moneda
    ['F', 'G', 'H'].forEach((col) => {
      summarySheet.getColumn(col).numFmt = '$#,##0.00';
    });

    // Totales
    summarySheet.addRow([]);
    const totalRow = summarySheet.addRow([
      '', 'TOTALES', '', '',
      '', Number(data.totalPerceptions), Number(data.totalDeductions), Number(data.totalNet)
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5E9' },
    };

    // ===========================================
    // HOJA 2: DETALLE DE PERCEPCIONES
    // ===========================================
    const perceptionsSheet = workbook.addWorksheet('Percepciones');

    // Obtener todos los conceptos únicos de percepciones
    const perceptionConcepts = new Map<string, string>();
    data.payrollDetails.forEach((detail) => {
      detail.perceptions.forEach((p) => {
        perceptionConcepts.set(p.concept.code, p.concept.name);
      });
    });

    // Encabezados dinámicos
    const perceptionHeaders = ['No. Empleado', 'Nombre'];
    const conceptCodes = Array.from(perceptionConcepts.keys()).sort();
    conceptCodes.forEach((code) => {
      perceptionHeaders.push(perceptionConcepts.get(code) || code);
    });
    perceptionHeaders.push('Total Percepciones');

    perceptionsSheet.getRow(1).values = perceptionHeaders;
    perceptionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    perceptionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1565C0' },
    };

    // Datos
    data.payrollDetails.forEach((detail) => {
      const row: (string | number)[] = [
        detail.employee.employeeNumber,
        `${detail.employee.firstName} ${detail.employee.lastName}`,
      ];

      conceptCodes.forEach((code) => {
        const perception = detail.perceptions.find((p) => p.concept.code === code);
        row.push(perception ? Number(perception.amount) : 0);
      });

      row.push(Number(detail.totalPerceptions));
      perceptionsSheet.addRow(row);
    });

    // Formato de moneda para columnas de conceptos
    for (let i = 3; i <= conceptCodes.length + 3; i++) {
      perceptionsSheet.getColumn(i).numFmt = '$#,##0.00';
      perceptionsSheet.getColumn(i).width = 15;
    }
    perceptionsSheet.getColumn(1).width = 15;
    perceptionsSheet.getColumn(2).width = 35;

    // ===========================================
    // HOJA 3: DETALLE DE DEDUCCIONES
    // ===========================================
    const deductionsSheet = workbook.addWorksheet('Deducciones');

    // Obtener todos los conceptos únicos de deducciones
    const deductionConcepts = new Map<string, string>();
    data.payrollDetails.forEach((detail) => {
      detail.deductions.forEach((d) => {
        deductionConcepts.set(d.concept.code, d.concept.name);
      });
    });

    // Encabezados dinámicos
    const deductionHeaders = ['No. Empleado', 'Nombre'];
    const deductionCodes = Array.from(deductionConcepts.keys()).sort();
    deductionCodes.forEach((code) => {
      deductionHeaders.push(deductionConcepts.get(code) || code);
    });
    deductionHeaders.push('Total Deducciones');

    deductionsSheet.getRow(1).values = deductionHeaders;
    deductionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deductionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC62828' },
    };

    // Datos
    data.payrollDetails.forEach((detail) => {
      const row: (string | number)[] = [
        detail.employee.employeeNumber,
        `${detail.employee.firstName} ${detail.employee.lastName}`,
      ];

      deductionCodes.forEach((code) => {
        const deduction = detail.deductions.find((d) => d.concept.code === code);
        row.push(deduction ? Number(deduction.amount) : 0);
      });

      row.push(Number(detail.totalDeductions));
      deductionsSheet.addRow(row);
    });

    // Formato de moneda
    for (let i = 3; i <= deductionCodes.length + 3; i++) {
      deductionsSheet.getColumn(i).numFmt = '$#,##0.00';
      deductionsSheet.getColumn(i).width = 15;
    }
    deductionsSheet.getColumn(1).width = 15;
    deductionsSheet.getColumn(2).width = 35;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private getPeriodTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      WEEKLY: 'Semanal',
      BIWEEKLY: 'Quincenal',
      MONTHLY: 'Mensual',
      EXTRAORDINARY: 'Extraordinario',
    };
    return labels[type] || type;
  }

  // Generar archivo Excel de dispersión bancaria
  async generateBankDispersionExcel(periodId: string): Promise<Buffer> {
    const data = await this.getPayrollSummary(periodId);
    if (!data) {
      throw new Error('Período no encontrado');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Dispersión Bancaria');

    // Encabezados
    const headers = [
      'No. Empleado', 'Nombre Completo', 'RFC', 'CURP',
      'Banco', 'Cuenta Bancaria', 'CLABE', 'Método de Pago',
      'Neto a Pagar', 'Concepto de Pago'
    ];

    sheet.getRow(1).values = headers;
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1565C0' },
    };

    // Anchos
    sheet.columns = [
      { width: 15 }, { width: 35 }, { width: 15 }, { width: 20 },
      { width: 15 }, { width: 18 }, { width: 22 }, { width: 15 },
      { width: 18 }, { width: 30 },
    ];

    // Datos - empleados con transferencia
    data.payrollDetails.forEach((detail) => {
      const emp = detail.employee as any;
      const paymentMethod = emp.paymentMethod || 'TRANSFER';

      sheet.addRow([
        emp.employeeNumber,
        `${emp.firstName} ${emp.lastName}`,
        emp.rfc || '',
        emp.curp || '',
        emp.bank?.name || '',
        emp.bankAccount || '',
        emp.clabe || '',
        this.getPaymentMethodLabel(paymentMethod),
        Number(detail.netPay),
        `NOMINA ${data.periodType} ${data.periodNumber}/${data.year}`,
      ]);
    });

    // Formato de moneda
    sheet.getColumn('I').numFmt = '$#,##0.00';

    // Totales
    sheet.addRow([]);
    const totalRow = sheet.addRow([
      '', '', '', '', '', '', '', 'TOTAL:',
      data.payrollDetails.reduce((sum, d) => sum + Number(d.netPay), 0),
      '',
    ]);
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      TRANSFER: 'Transferencia',
      CHECK: 'Cheque',
      CASH: 'Efectivo',
    };
    return labels[method] || method;
  }

  // Generar archivo TXT para dispersión bancaria (formato estándar)
  async generateBankDispersionTxt(periodId: string): Promise<string> {
    const data = await this.getPayrollSummary(periodId);
    if (!data) {
      throw new Error('Período no encontrado');
    }

    const lines: string[] = [];
    const paymentDate = new Date(data.paymentDate).toISOString().split('T')[0].replace(/-/g, '');

    // Cabecera
    lines.push(`H|${data.company?.rfc || 'RFC'}|${paymentDate}|DISPERSION NOMINA ${data.periodNumber}/${data.year}`);

    // Detalle - solo transferencias
    data.payrollDetails.forEach((detail) => {
      const emp = detail.employee as any;
      const paymentMethod = emp.paymentMethod || 'TRANSFER';

      if (paymentMethod === 'TRANSFER') {
        const amount = Number(detail.netPay).toFixed(2).replace('.', '');
        const clabe = (emp.clabe || '').padEnd(18, '0');
        const name = `${emp.firstName} ${emp.lastName}`.substring(0, 40).padEnd(40, ' ');
        const rfc = (emp.rfc || '').padEnd(13, ' ');

        lines.push(`D|${clabe}|${amount}|${rfc}|${name}|NOMINA`);
      }
    });

    // Pie
    const transferDetails = data.payrollDetails.filter((d) => {
      const emp = d.employee as any;
      return (emp.paymentMethod || 'TRANSFER') === 'TRANSFER';
    });
    const totalAmount = transferDetails.reduce((sum, d) => sum + Number(d.netPay), 0);
    const totalCount = transferDetails.length;

    lines.push(`T|${totalCount}|${totalAmount.toFixed(2).replace('.', '')}`);

    return lines.join('\n');
  }

  async generatePayrollPdf(periodId: string): Promise<Buffer> {
    const data = await this.getPayrollSummary(periodId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Título
      doc.fontSize(18).text('Reporte de Nómina', { align: 'center' });
      doc.moveDown();

      // Información del período
      doc.fontSize(12);
      doc.text(`Empresa: ${data?.company.name}`);
      doc.text(`Período: ${data?.periodNumber} / ${data?.year}`);
      doc.text(`Tipo: ${data?.periodType}`);
      doc.moveDown();

      // Tabla simplificada
      doc.fontSize(10);
      doc.text('No. Empleado | Nombre | Percepciones | Deducciones | Neto');
      doc.moveDown(0.5);

      data?.payrollDetails.forEach((detail) => {
        doc.text(
          `${detail.employee.employeeNumber} | ${detail.employee.firstName} ${detail.employee.lastName} | $${Number(detail.totalPerceptions).toFixed(2)} | $${Number(detail.totalDeductions).toFixed(2)} | $${Number(detail.netPay).toFixed(2)}`,
        );
      });

      // Totales
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Total Percepciones: $${Number(data?.totalPerceptions).toFixed(2)}`);
      doc.text(`Total Deducciones: $${Number(data?.totalDeductions).toFixed(2)}`);
      doc.text(`Total Neto: $${Number(data?.totalNet).toFixed(2)}`);

      doc.end();
    });
  }

  async getEmployeeReport(employeeId: string, year: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        jobPosition: true,
        payrollDetails: {
          where: {
            payrollPeriod: { year },
          },
          include: {
            payrollPeriod: true,
            perceptions: {
              include: { concept: true },
            },
            deductions: {
              include: { concept: true },
            },
          },
          orderBy: {
            payrollPeriod: { periodNumber: 'asc' },
          },
        },
      },
    });

    const totals = {
      totalPerceptions: 0,
      totalDeductions: 0,
      totalNet: 0,
      isr: 0,
      imss: 0,
    };

    employee?.payrollDetails.forEach((detail) => {
      totals.totalPerceptions += Number(detail.totalPerceptions);
      totals.totalDeductions += Number(detail.totalDeductions);
      totals.totalNet += Number(detail.netPay);

      detail.deductions.forEach((ded) => {
        if (ded.concept.code === 'D001') {
          totals.isr += Number(ded.amount);
        }
        if (ded.concept.code === 'D002') {
          totals.imss += Number(ded.amount);
        }
      });
    });

    return {
      employee,
      year,
      totals,
      periodsCount: employee?.payrollDetails.length || 0,
    };
  }

  async getDepartmentReport(departmentId: string, periodId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        employees: {
          where: { isActive: true },
          include: {
            payrollDetails: {
              where: { payrollPeriodId: periodId },
            },
          },
        },
      },
    });

    const totals = {
      employees: department?.employees.length || 0,
      totalPerceptions: 0,
      totalDeductions: 0,
      totalNet: 0,
    };

    department?.employees.forEach((emp) => {
      emp.payrollDetails.forEach((detail) => {
        totals.totalPerceptions += Number(detail.totalPerceptions);
        totals.totalDeductions += Number(detail.totalDeductions);
        totals.totalNet += Number(detail.netPay);
      });
    });

    return {
      department,
      period: periodId,
      totals,
    };
  }
}
