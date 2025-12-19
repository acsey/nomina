import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as dayjs from 'dayjs';

const PDFDocument = require('pdfkit');

@Injectable()
export class PayrollReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReceipt(payrollDetailId: string): Promise<Buffer> {
    const detail = await this.prisma.payrollDetail.findUnique({
      where: { id: payrollDetailId },
      include: {
        employee: {
          include: {
            department: true,
            jobPosition: true,
            company: true,
          },
        },
        payrollPeriod: {
          include: {
            company: true,
          },
        },
        perceptions: {
          include: { concept: true },
        },
        deductions: {
          include: { concept: true },
        },
      },
    });

    if (!detail) {
      throw new NotFoundException('Detalle de nomina no encontrado');
    }

    return this.createPdf(detail);
  }

  async getEmployeeReceipts(employeeId: string, year?: number) {
    return this.prisma.payrollDetail.findMany({
      where: {
        employeeId,
        payrollPeriod: {
          ...(year !== undefined && { year }),
          status: { in: ['PROCESSING', 'CALCULATED', 'APPROVED', 'PAID', 'CLOSED'] },
        },
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
        payrollPeriod: {
          paymentDate: 'desc',
        },
      },
    });
  }

  private async createPdf(detail: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const { employee, payrollPeriod, perceptions, deductions } = detail;
        const company = payrollPeriod?.company || employee?.company || {};

        if (!payrollPeriod) {
          reject(new Error('Periodo de nomina no encontrado'));
          return;
        }

      // Header
      doc.fontSize(16).font('Helvetica-Bold').text('RECIBO DE NOMINA', { align: 'center' });
      doc.moveDown(0.5);

      // Company Info
      doc.fontSize(12).font('Helvetica-Bold').text(company.name || 'Empresa');
      doc.fontSize(10).font('Helvetica').text(`RFC: ${company.rfc || 'N/A'}`);
      if (company.registroPatronal) {
        doc.text(`Registro Patronal: ${company.registroPatronal}`);
      }
      doc.text(`${company.address || ''} ${company.city || ''}, ${company.state || ''}`.trim() || 'Sin direccion');
      doc.moveDown();

      // Period Info
      doc.rect(50, doc.y, 512, 60).stroke();
      const periodY = doc.y + 10;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Periodo: ${this.getPeriodTypeLabel(payrollPeriod.periodType)} ${payrollPeriod.periodNumber}/${payrollPeriod.year}`, 60, periodY);
      doc.text(`Fecha de Pago: ${dayjs(payrollPeriod.paymentDate).format('DD/MM/YYYY')}`, 300, periodY);
      doc.text(`Del: ${dayjs(payrollPeriod.startDate).format('DD/MM/YYYY')} al ${dayjs(payrollPeriod.endDate).format('DD/MM/YYYY')}`, 60, periodY + 20);
      doc.text(`Dias Trabajados: ${detail.workedDays}`, 300, periodY + 20);
      doc.y = periodY + 50;
      doc.moveDown();

      // Employee Info
      doc.rect(50, doc.y, 512, 80).stroke();
      const empY = doc.y + 10;
      doc.fontSize(10).font('Helvetica-Bold').text('DATOS DEL TRABAJADOR', 60, empY);
      doc.font('Helvetica');
      doc.text(`Nombre: ${employee.firstName} ${employee.lastName} ${employee.secondLastName || ''}`, 60, empY + 15);
      doc.text(`No. Empleado: ${employee.employeeNumber}`, 300, empY + 15);
      doc.text(`RFC: ${employee.rfc}`, 60, empY + 30);
      doc.text(`CURP: ${employee.curp}`, 300, empY + 30);
      doc.text(`Departamento: ${employee.department?.name || 'N/A'}`, 60, empY + 45);
      doc.text(`Puesto: ${employee.jobPosition?.name || 'N/A'}`, 300, empY + 45);
      if (employee.nss) {
        doc.text(`NSS: ${employee.nss}`, 60, empY + 60);
      }
      doc.y = empY + 80;
      doc.moveDown();

      // Perceptions Table
      doc.fontSize(11).font('Helvetica-Bold').text('PERCEPCIONES', 50);
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const colWidths = [200, 100, 100, 100];

      // Header row
      doc.fontSize(9).font('Helvetica-Bold');
      doc.rect(50, tableTop, 500, 20).fill('#f0f0f0');
      doc.fillColor('#000000');
      doc.text('Concepto', 55, tableTop + 5);
      doc.text('Gravado', 260, tableTop + 5);
      doc.text('Exento', 360, tableTop + 5);
      doc.text('Total', 460, tableTop + 5);

      let currentY = tableTop + 25;
      doc.font('Helvetica').fontSize(9);

      for (const perception of perceptions) {
        doc.text(perception.concept.name, 55, currentY, { width: 190 });
        doc.text(`$${this.formatNumber(perception.taxableAmount)}`, 260, currentY);
        doc.text(`$${this.formatNumber(perception.exemptAmount)}`, 360, currentY);
        doc.text(`$${this.formatNumber(perception.amount)}`, 460, currentY);
        currentY += 15;
      }

      // Total perceptions
      doc.rect(50, currentY, 500, 1).stroke();
      currentY += 5;
      doc.font('Helvetica-Bold');
      doc.text('TOTAL PERCEPCIONES:', 55, currentY);
      doc.text(`$${this.formatNumber(detail.totalPerceptions)}`, 460, currentY);
      currentY += 25;

      // Deductions Table
      doc.fontSize(11).font('Helvetica-Bold').text('DEDUCCIONES', 50, currentY);
      currentY += 20;

      doc.fontSize(9).font('Helvetica-Bold');
      doc.rect(50, currentY, 500, 20).fill('#f0f0f0');
      doc.fillColor('#000000');
      doc.text('Concepto', 55, currentY + 5);
      doc.text('Importe', 460, currentY + 5);

      currentY += 25;
      doc.font('Helvetica').fontSize(9);

      for (const deduction of deductions) {
        doc.text(deduction.concept.name, 55, currentY, { width: 390 });
        doc.text(`$${this.formatNumber(deduction.amount)}`, 460, currentY);
        currentY += 15;
      }

      // Total deductions
      doc.rect(50, currentY, 500, 1).stroke();
      currentY += 5;
      doc.font('Helvetica-Bold');
      doc.text('TOTAL DEDUCCIONES:', 55, currentY);
      doc.text(`$${this.formatNumber(detail.totalDeductions)}`, 460, currentY);
      currentY += 30;

      // Net Pay Box
      doc.rect(50, currentY, 500, 40).fill('#e8f5e9');
      doc.fillColor('#000000');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('NETO A PAGAR:', 60, currentY + 12);
      doc.text(`$${this.formatNumber(detail.netPay)}`, 400, currentY + 12);
      currentY += 60;

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#666666');
      doc.text('Este documento es un comprobante de pago para fines informativos.', 50, currentY, { align: 'center' });
      doc.text('Para efectos fiscales favor de solicitar el CFDI correspondiente.', 50, currentY + 12, { align: 'center' });

      // Signatures
      currentY += 50;
      if (currentY < 650) {
        doc.fillColor('#000000');
        doc.moveTo(100, currentY + 30).lineTo(250, currentY + 30).stroke();
        doc.moveTo(362, currentY + 30).lineTo(512, currentY + 30).stroke();
        doc.fontSize(9);
        doc.text('Firma del Empleador', 100, currentY + 35, { width: 150, align: 'center' });
        doc.text('Firma del Trabajador', 362, currentY + 35, { width: 150, align: 'center' });
      }

      doc.end();
      } catch (error) {
        reject(error);
      }
    });
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

  private formatNumber(value: any): string {
    return Number(value || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
