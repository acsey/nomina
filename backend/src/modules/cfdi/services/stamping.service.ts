import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface StampingResult {
  uuid: string;
  fechaTimbrado: Date;
  noCertificadoSat: string;
  selloDigitalSat: string;
  xmlTimbrado: string;
  cadenaOriginal: string;
  pacResponse: any;
}

interface CompanyPacConfig {
  pacProvider?: string;
  pacUser?: string;
  pacPassword?: string;
  pacMode?: string;
  certificadoCer?: string;
  certificadoKey?: string;
  certificadoPassword?: string;
  noCertificado?: string;
}

@Injectable()
export class StampingService {
  constructor(private readonly configService: ConfigService) {}

  async stamp(xmlOriginal: string, companyConfig?: CompanyPacConfig): Promise<StampingResult> {
    // Usar configuración de la empresa si está disponible, sino usar env vars
    const pacProvider = companyConfig?.pacProvider || this.configService.get<string>('PAC_PROVIDER');
    const pacUser = companyConfig?.pacUser || this.configService.get<string>('PAC_USER');
    const pacPassword = companyConfig?.pacPassword || this.configService.get<string>('PAC_PASSWORD');
    const pacMode = companyConfig?.pacMode || this.configService.get<string>('PAC_MODE') || 'sandbox';

    // Si no hay configuración PAC válida, usar modo simulación
    if (!pacProvider || !pacUser || pacMode === 'sandbox') {
      return this.simulateStamping(xmlOriginal, companyConfig?.noCertificado);
    }

    // Aquí iría la integración real con el PAC según el proveedor
    switch (pacProvider) {
      case 'FINKOK':
        return this.stampWithFinkok(xmlOriginal, pacUser, pacPassword!, pacMode);
      case 'SW_SAPIEN':
        return this.stampWithSwSapien(xmlOriginal, pacUser, pacPassword!, pacMode);
      default:
        // Modo desarrollo - simular timbrado
        return this.simulateStamping(xmlOriginal, companyConfig?.noCertificado);
    }
  }

  async cancel(uuid: string, reason: string, companyConfig?: CompanyPacConfig): Promise<void> {
    const pacProvider = companyConfig?.pacProvider || this.configService.get<string>('PAC_PROVIDER');
    const pacMode = companyConfig?.pacMode || 'sandbox';

    if (!pacProvider || pacMode === 'sandbox') {
      // Modo desarrollo - simular cancelación
      console.log(`[SANDBOX] Simulando cancelación de CFDI: ${uuid}, Motivo: ${reason}`);
      return;
    }

    // Aquí iría la integración real con el PAC para cancelación
    throw new Error('Cancelación en producción no implementada aún');
  }

  private async stampWithFinkok(xml: string, user: string, password: string, mode: string): Promise<StampingResult> {
    // TODO: Implementar integración real con FINKOK
    // const url = mode === 'production'
    //   ? 'https://facturacion.finkok.com/servicios/soap/stamp'
    //   : 'https://demo-facturacion.finkok.com/servicios/soap/stamp';

    console.log(`[FINKOK ${mode}] Timbrado solicitado para usuario: ${user}`);
    return this.simulateStamping(xml);
  }

  private async stampWithSwSapien(xml: string, user: string, password: string, mode: string): Promise<StampingResult> {
    // TODO: Implementar integración real con SW Sapien
    // const url = mode === 'production'
    //   ? 'https://services.sw.com.mx'
    //   : 'https://services.test.sw.com.mx';

    console.log(`[SW_SAPIEN ${mode}] Timbrado solicitado para usuario: ${user}`);
    return this.simulateStamping(xml);
  }

  private simulateStamping(xmlOriginal: string, noCertificadoEmisor?: string): StampingResult {
    const uuid = this.generateUUID();
    const fechaTimbrado = new Date();
    const noCertificado = noCertificadoEmisor || '30001000000400002434';

    // Simular XML timbrado (en producción vendría del PAC)
    const xmlTimbrado = xmlOriginal.replace(
      '</cfdi:Comprobante>',
      `
    <cfdi:Complemento>
        <tfd:TimbreFiscalDigital
            xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
            Version="1.1"
            UUID="${uuid}"
            FechaTimbrado="${fechaTimbrado.toISOString()}"
            SelloCFD="SELLO_SIMULADO_${Math.random().toString(36).substring(7)}"
            NoCertificadoSAT="00001000000500003416"
            SelloSAT="SELLO_SAT_SIMULADO_${Math.random().toString(36).substring(7)}" />
    </cfdi:Complemento>
</cfdi:Comprobante>`,
    );

    return {
      uuid,
      fechaTimbrado,
      noCertificadoSat: '00001000000500003416',
      selloDigitalSat: 'SELLO_SAT_SIMULADO_' + Math.random().toString(36),
      xmlTimbrado,
      cadenaOriginal: `||1.1|${uuid}|${fechaTimbrado.toISOString()}|SELLO_SIMULADO|${noCertificado}||`,
      pacResponse: {
        success: true,
        mode: 'sandbox',
        message: 'Timbrado simulado - Modo desarrollo/sandbox',
        timestamp: fechaTimbrado,
      },
    };
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16).toUpperCase();
    });
  }
}
