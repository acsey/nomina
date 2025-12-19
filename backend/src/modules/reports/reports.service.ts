import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nómina');

    // Encabezados
    sheet.columns = [
      { header: 'No. Empleado', key: 'employeeNumber', width: 15 },
      { header: 'Nombre', key: 'name', width: 30 },
      { header: 'Departamento', key: 'department', width: 20 },
      { header: 'Días Trabajados', key: 'workedDays', width: 15 },
      { header: 'Percepciones', key: 'perceptions', width: 15 },
      { header: 'Deducciones', key: 'deductions', width: 15 },
      { header: 'Neto', key: 'netPay', width: 15 },
    ];

    // Estilo de encabezados
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Datos
    data?.payrollDetails.forEach((detail) => {
      sheet.addRow({
        employeeNumber: detail.employee.employeeNumber,
        name: `${detail.employee.firstName} ${detail.employee.lastName}`,
        department: detail.employee.department?.name || '',
        workedDays: Number(detail.workedDays),
        perceptions: Number(detail.totalPerceptions),
        deductions: Number(detail.totalDeductions),
        netPay: Number(detail.netPay),
      });
    });

    // Formato de moneda
    ['E', 'F', 'G'].forEach((col) => {
      sheet.getColumn(col).numFmt = '$#,##0.00';
    });

    // Totales
    const totalRow = sheet.addRow({
      employeeNumber: '',
      name: 'TOTALES',
      department: '',
      workedDays: '',
      perceptions: Number(data?.totalPerceptions),
      deductions: Number(data?.totalDeductions),
      netPay: Number(data?.totalNet),
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generatePayrollPdf(periodId: string): Promise<Buffer> {
    const data = await this.getPayrollSummary(periodId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
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
