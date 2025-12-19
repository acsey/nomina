import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dayjs from 'dayjs';

@Injectable()
export class XmlBuilderService {
  constructor(private readonly configService: ConfigService) {}

  async buildNominaXml(payrollDetail: any): Promise<string> {
    const employee = payrollDetail.employee;
    const company = employee.company;
    const period = payrollDetail.payrollPeriod;

    const fecha = dayjs().format('YYYY-MM-DDTHH:mm:ss');
    const folio = this.generateFolio();

    // Construir XML de CFDI 4.0 con complemento de Nómina 1.2
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
    xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
    xmlns:nomina12="http://www.sat.gob.mx/nomina12"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd"
    Version="4.0"
    Serie="NOM"
    Folio="${folio}"
    Fecha="${fecha}"
    FormaPago="99"
    SubTotal="${payrollDetail.totalPerceptions}"
    Descuento="${payrollDetail.totalDeductions}"
    Moneda="MXN"
    Total="${payrollDetail.netPay}"
    TipoDeComprobante="N"
    Exportacion="01"
    MetodoPago="PUE"
    LugarExpedicion="${company.zipCode || '00000'}">

    <cfdi:Emisor
        Rfc="${company.rfc}"
        Nombre="${company.name}"
        RegimenFiscal="601" />

    <cfdi:Receptor
        Rfc="${employee.rfc}"
        Nombre="${employee.firstName} ${employee.lastName}"
        DomicilioFiscalReceptor="${employee.zipCode || company.zipCode || '00000'}"
        RegimenFiscalReceptor="605"
        UsoCFDI="CN01" />

    <cfdi:Conceptos>
        <cfdi:Concepto
            ClaveProdServ="84111505"
            Cantidad="1"
            ClaveUnidad="ACT"
            Descripcion="Pago de nómina"
            ValorUnitario="${payrollDetail.totalPerceptions}"
            Importe="${payrollDetail.totalPerceptions}"
            Descuento="${payrollDetail.totalDeductions}"
            ObjetoImp="01" />
    </cfdi:Conceptos>

    <cfdi:Complemento>
        <nomina12:Nomina
            Version="1.2"
            TipoNomina="O"
            FechaPago="${dayjs(period.paymentDate).format('YYYY-MM-DD')}"
            FechaInicialPago="${dayjs(period.startDate).format('YYYY-MM-DD')}"
            FechaFinalPago="${dayjs(period.endDate).format('YYYY-MM-DD')}"
            NumDiasPagados="${payrollDetail.workedDays}"
            TotalPercepciones="${payrollDetail.totalPerceptions}"
            TotalDeducciones="${payrollDetail.totalDeductions}">

            <nomina12:Emisor
                RegistroPatronal="${company.registroPatronal || ''}" />

            <nomina12:Receptor
                Curp="${employee.curp}"
                NumSeguridadSocial="${employee.nss || ''}"
                FechaInicioRelLaboral="${dayjs(employee.hireDate).format('YYYY-MM-DD')}"
                Antigüedad="P${this.calculateAntiguedad(employee.hireDate)}W"
                TipoContrato="${this.mapContractType(employee.contractType)}"
                TipoJornada="01"
                TipoRegimen="02"
                NumEmpleado="${employee.employeeNumber}"
                Departamento="${employee.department?.name || ''}"
                Puesto="${employee.jobPosition?.name || ''}"
                RiesgoTrabajo="${this.mapRiskLevel(employee.jobPosition?.riskLevel)}"
                PeriodicidadPago="${this.mapPeriodType(period.periodType)}"
                SalarioBaseCotApor="${employee.salarioDiarioIntegrado || employee.baseSalary / 30}"
                SalarioDiarioIntegrado="${employee.salarioDiarioIntegrado || employee.baseSalary / 30}"
                ClaveEntFed="${this.getClaveEntFed(employee.state)}" />

            ${this.buildPerceptions(payrollDetail.perceptions)}

            ${this.buildDeductions(payrollDetail.deductions)}

        </nomina12:Nomina>
    </cfdi:Complemento>
</cfdi:Comprobante>`;

    return xml;
  }

  private generateFolio(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  private calculateAntiguedad(hireDate: Date): number {
    return dayjs().diff(dayjs(hireDate), 'week');
  }

  private mapContractType(type: string): string {
    const map: Record<string, string> = {
      INDEFINITE: '01',
      FIXED_TERM: '02',
      SEASONAL: '03',
      TRIAL_PERIOD: '05',
      TRAINING: '06',
    };
    return map[type] || '01';
  }

  private mapRiskLevel(level?: string): string {
    const map: Record<string, string> = {
      CLASE_I: '1',
      CLASE_II: '2',
      CLASE_III: '3',
      CLASE_IV: '4',
      CLASE_V: '5',
    };
    return map[level || 'CLASE_I'] || '1';
  }

  private mapPeriodType(type: string): string {
    const map: Record<string, string> = {
      WEEKLY: '02',
      BIWEEKLY: '04',
      MONTHLY: '05',
    };
    return map[type] || '04';
  }

  private getClaveEntFed(state?: string): string {
    // Simplificado - en producción se mapearía el estado completo
    return 'JAL';
  }

  private buildPerceptions(perceptions: any[]): string {
    if (!perceptions || perceptions.length === 0) {
      return '';
    }

    const totalGravado = perceptions.reduce((sum, p) => sum + Number(p.taxableAmount), 0);
    const totalExento = perceptions.reduce((sum, p) => sum + Number(p.exemptAmount), 0);

    const items = perceptions.map((p) => `
                <nomina12:Percepcion
                    TipoPercepcion="${p.concept?.satCode || '001'}"
                    Clave="${p.concept?.code || 'P001'}"
                    Concepto="${p.concept?.name || 'Percepción'}"
                    ImporteGravado="${p.taxableAmount}"
                    ImporteExento="${p.exemptAmount}" />`).join('');

    return `
            <nomina12:Percepciones
                TotalSueldos="${totalGravado + totalExento}"
                TotalGravado="${totalGravado}"
                TotalExento="${totalExento}">
                ${items}
            </nomina12:Percepciones>`;
  }

  private buildDeductions(deductions: any[]): string {
    if (!deductions || deductions.length === 0) {
      return '';
    }

    const total = deductions.reduce((sum, d) => sum + Number(d.amount), 0);

    const items = deductions.map((d) => `
                <nomina12:Deduccion
                    TipoDeduccion="${d.concept?.satCode || '001'}"
                    Clave="${d.concept?.code || 'D001'}"
                    Concepto="${d.concept?.name || 'Deducción'}"
                    Importe="${d.amount}" />`).join('');

    return `
            <nomina12:Deducciones
                TotalOtrasDeducciones="${total}">
                ${items}
            </nomina12:Deducciones>`;
  }
}
