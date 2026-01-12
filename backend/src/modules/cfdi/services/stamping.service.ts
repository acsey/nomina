import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as xml2js from 'xml2js';

export interface StampingResult {
  uuid: string;
  fechaTimbrado: Date;
  noCertificadoSat: string;
  selloDigitalSat: string;
  xmlTimbrado: string;
  cadenaOriginal: string;
  pacResponse: any;
}

export interface StampingError {
  code: string;
  message: string;
  details?: any;
  isRetryable: boolean;
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
  private readonly logger = new Logger(StampingService.name);

  constructor(private readonly configService: ConfigService) {}

  async stamp(xmlOriginal: string, companyConfig?: CompanyPacConfig): Promise<StampingResult> {
    const pacProvider = companyConfig?.pacProvider || this.configService.get<string>('PAC_PROVIDER');
    const pacUser = companyConfig?.pacUser || this.configService.get<string>('PAC_USER');
    const pacPassword = companyConfig?.pacPassword || this.configService.get<string>('PAC_PASSWORD');
    const pacMode = companyConfig?.pacMode || this.configService.get<string>('PAC_MODE') || 'sandbox';

    // Validate PAC configuration
    if (!pacProvider || !pacUser) {
      this.logger.warn('No PAC configuration found, using simulation mode');
      return this.simulateStamping(xmlOriginal, companyConfig?.noCertificado);
    }

    // Route to appropriate PAC implementation
    try {
      switch (pacProvider.toUpperCase()) {
        case 'FINKOK':
          return await this.stampWithFinkok(xmlOriginal, pacUser, pacPassword!, pacMode);
        case 'SW_SAPIEN':
        case 'SWSAPIEN':
          return await this.stampWithSwSapien(xmlOriginal, pacUser, pacPassword!, pacMode);
        default:
          this.logger.warn(`Unknown PAC provider: ${pacProvider}, falling back to simulation`);
          return this.simulateStamping(xmlOriginal, companyConfig?.noCertificado);
      }
    } catch (error) {
      this.logger.error(`PAC stamping failed for provider ${pacProvider}:`, error);
      throw error;
    }
  }

  async cancel(uuid: string, reason: string, companyConfig?: CompanyPacConfig): Promise<{ success: boolean; acuse?: string }> {
    const pacProvider = companyConfig?.pacProvider || this.configService.get<string>('PAC_PROVIDER');
    const pacUser = companyConfig?.pacUser || this.configService.get<string>('PAC_USER');
    const pacPassword = companyConfig?.pacPassword || this.configService.get<string>('PAC_PASSWORD');
    const pacMode = companyConfig?.pacMode || 'sandbox';

    if (!pacProvider || !pacUser || pacMode === 'sandbox') {
      this.logger.log(`[SANDBOX] Simulating CFDI cancellation: ${uuid}, Reason: ${reason}`);
      return { success: true, acuse: `ACUSE_SIMULADO_${uuid}` };
    }

    try {
      switch (pacProvider.toUpperCase()) {
        case 'FINKOK':
          return await this.cancelWithFinkok(uuid, reason, pacUser, pacPassword!, pacMode, companyConfig);
        case 'SW_SAPIEN':
        case 'SWSAPIEN':
          return await this.cancelWithSwSapien(uuid, reason, pacUser, pacPassword!, pacMode, companyConfig);
        default:
          throw new Error(`Cancellation not implemented for PAC provider: ${pacProvider}`);
      }
    } catch (error) {
      this.logger.error(`PAC cancellation failed for UUID ${uuid}:`, error);
      throw error;
    }
  }

  // ============================================
  // FINKOK INTEGRATION (SOAP)
  // ============================================

  private async stampWithFinkok(xml: string, user: string, password: string, mode: string): Promise<StampingResult> {
    const url = mode === 'production'
      ? 'https://facturacion.finkok.com/servicios/soap/stamp'
      : 'https://demo-facturacion.finkok.com/servicios/soap/stamp';

    this.logger.log(`[FINKOK ${mode.toUpperCase()}] Initiating stamp request`);

    // Build SOAP envelope for FINKOK stamp method
    const soapEnvelope = this.buildFinkokStampSoapEnvelope(xml, user, password);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'stamp',
        },
        body: soapEnvelope,
      });

      if (!response.ok) {
        throw this.createStampingError(
          'FINKOK_HTTP_ERROR',
          `HTTP error: ${response.status} ${response.statusText}`,
          null,
          response.status >= 500
        );
      }

      const responseText = await response.text();
      return await this.parseFinkokStampResponse(responseText);
    } catch (error: any) {
      if (error.code) {
        throw error; // Already a StampingError
      }
      throw this.createStampingError(
        'FINKOK_CONNECTION_ERROR',
        `Connection error: ${error.message}`,
        error,
        true
      );
    }
  }

  private buildFinkokStampSoapEnvelope(xml: string, user: string, password: string): string {
    // Base64 encode the XML for FINKOK
    const xmlBase64 = Buffer.from(xml).toString('base64');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:stam="http://facturacion.finkok.com/stamp">
  <soapenv:Header/>
  <soapenv:Body>
    <stam:stamp>
      <stam:xml>${xmlBase64}</stam:xml>
      <stam:username>${user}</stam:username>
      <stam:password>${password}</stam:password>
    </stam:stamp>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private async parseFinkokStampResponse(responseXml: string): Promise<StampingResult> {
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const result = await parser.parseStringPromise(responseXml);

    const envelope = result['SOAP-ENV:Envelope'] || result['soapenv:Envelope'] || result.Envelope;
    const body = envelope['SOAP-ENV:Body'] || envelope['soapenv:Body'] || envelope.Body;
    const stampResponse = body['ns1:stampResponse'] || body.stampResponse;

    if (!stampResponse) {
      throw this.createStampingError('FINKOK_PARSE_ERROR', 'Invalid FINKOK response structure', result, false);
    }

    const stampResult = stampResponse['ns1:stampResult'] || stampResponse.stampResult;

    // Check for errors
    const incidencias = stampResult['ns1:Incidencias'] || stampResult.Incidencias;
    if (incidencias) {
      const incidencia = incidencias['ns1:Incidencia'] || incidencias.Incidencia;
      const errorCode = incidencia?.['ns1:CodigoError'] || incidencia?.CodigoError || 'UNKNOWN';
      const errorMessage = incidencia?.['ns1:MensajeIncidencia'] || incidencia?.MensajeIncidencia || 'Unknown error';

      throw this.createStampingError(
        `FINKOK_${errorCode}`,
        errorMessage,
        incidencia,
        this.isFinkokErrorRetryable(errorCode)
      );
    }

    // Extract successful stamp data
    const uuid = stampResult['ns1:UUID'] || stampResult.UUID;
    const fechaTimbrado = stampResult['ns1:Fecha'] || stampResult.Fecha;
    const noCertificadoSat = stampResult['ns1:NoCertificadoSAT'] || stampResult.NoCertificadoSAT;
    const selloSat = stampResult['ns1:SatSeal'] || stampResult.SatSeal;
    const xmlTimbrado = stampResult['ns1:xml'] || stampResult.xml;
    const cadenaOriginal = stampResult['ns1:CadenaOriginalSAT'] || stampResult.CadenaOriginalSAT || '';

    // Decode XML if base64 encoded
    let decodedXml = xmlTimbrado;
    try {
      decodedXml = Buffer.from(xmlTimbrado, 'base64').toString('utf-8');
    } catch {
      // Already decoded or not base64
    }

    this.logger.log(`[FINKOK] Stamp successful - UUID: ${uuid}`);

    return {
      uuid,
      fechaTimbrado: new Date(fechaTimbrado),
      noCertificadoSat,
      selloDigitalSat: selloSat,
      xmlTimbrado: decodedXml,
      cadenaOriginal,
      pacResponse: {
        success: true,
        provider: 'FINKOK',
        timestamp: new Date(),
      },
    };
  }

  private isFinkokErrorRetryable(errorCode: string): boolean {
    // FINKOK error codes that are retryable
    const retryableCodes = ['503', '504', '429', 'TIMEOUT', 'CONNECTION_ERROR'];
    return retryableCodes.some(code => errorCode.includes(code));
  }

  private async cancelWithFinkok(
    uuid: string,
    reason: string,
    user: string,
    password: string,
    mode: string,
    config?: CompanyPacConfig
  ): Promise<{ success: boolean; acuse?: string }> {
    const url = mode === 'production'
      ? 'https://facturacion.finkok.com/servicios/soap/cancel'
      : 'https://demo-facturacion.finkok.com/servicios/soap/cancel';

    // SAT cancellation reasons: 01=Con errores con relación, 02=Sin errores con relación, 03=No se llevó a cabo, 04=Operación nominativa
    const satReason = this.mapToSatCancellationReason(reason);

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:can="http://facturacion.finkok.com/cancel">
  <soapenv:Header/>
  <soapenv:Body>
    <can:cancel>
      <can:UUIDS>
        <can:uuids>
          <can:uuid>${uuid}</can:uuid>
        </can:uuids>
      </can:UUIDS>
      <can:username>${user}</can:username>
      <can:password>${password}</can:password>
      <can:taxpayer_id>${config?.noCertificado || ''}</can:taxpayer_id>
      <can:motivo>${satReason}</can:motivo>
    </can:cancel>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'cancel',
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();
    // Parse cancellation response (simplified)
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(responseText);

    this.logger.log(`[FINKOK] Cancellation response for UUID ${uuid}`);

    return { success: true, acuse: responseText };
  }

  // ============================================
  // SW SAPIEN INTEGRATION (REST)
  // ============================================

  private async stampWithSwSapien(xml: string, user: string, password: string, mode: string): Promise<StampingResult> {
    const baseUrl = mode === 'production'
      ? 'https://services.sw.com.mx'
      : 'https://services.test.sw.com.mx';

    this.logger.log(`[SW_SAPIEN ${mode.toUpperCase()}] Initiating stamp request`);

    try {
      // First, authenticate to get token
      const token = await this.getSwSapienToken(baseUrl, user, password);

      // Then stamp the CFDI
      const stampUrl = `${baseUrl}/cfdi33/stamp/v4`;

      const response = await fetch(stampUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xml: Buffer.from(xml).toString('base64'),
        }),
      });

      const data = await response.json();

      if (data.status === 'error' || !data.data) {
        throw this.createStampingError(
          data.messageDetail || 'SW_SAPIEN_ERROR',
          data.message || 'Stamping failed',
          data,
          this.isSwSapienErrorRetryable(data.messageDetail)
        );
      }

      this.logger.log(`[SW_SAPIEN] Stamp successful - UUID: ${data.data.uuid}`);

      return {
        uuid: data.data.uuid,
        fechaTimbrado: new Date(data.data.fechaTimbrado),
        noCertificadoSat: data.data.noCertificadoSAT,
        selloDigitalSat: data.data.selloSAT,
        xmlTimbrado: Buffer.from(data.data.cfdi, 'base64').toString('utf-8'),
        cadenaOriginal: data.data.cadenaOriginalSAT || '',
        pacResponse: {
          success: true,
          provider: 'SW_SAPIEN',
          timestamp: new Date(),
          qrCode: data.data.qrCode,
        },
      };
    } catch (error: any) {
      if (error.code) {
        throw error;
      }
      throw this.createStampingError(
        'SW_SAPIEN_CONNECTION_ERROR',
        `Connection error: ${error.message}`,
        error,
        true
      );
    }
  }

  private async getSwSapienToken(baseUrl: string, user: string, password: string): Promise<string> {
    const authUrl = `${baseUrl}/security/authenticate`;

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user,
        password,
      }),
    });

    const data = await response.json();

    if (data.status === 'error' || !data.data?.token) {
      throw this.createStampingError(
        'SW_SAPIEN_AUTH_ERROR',
        data.message || 'Authentication failed',
        data,
        false
      );
    }

    return data.data.token;
  }

  private isSwSapienErrorRetryable(errorCode: string): boolean {
    const retryableCodes = ['ServerError', 'Timeout', 'ConnectionError', '503', '504', '429'];
    return retryableCodes.some(code => errorCode?.includes(code));
  }

  private async cancelWithSwSapien(
    uuid: string,
    reason: string,
    user: string,
    password: string,
    mode: string,
    config?: CompanyPacConfig
  ): Promise<{ success: boolean; acuse?: string }> {
    const baseUrl = mode === 'production'
      ? 'https://services.sw.com.mx'
      : 'https://services.test.sw.com.mx';

    const token = await this.getSwSapienToken(baseUrl, user, password);
    const satReason = this.mapToSatCancellationReason(reason);

    const cancelUrl = `${baseUrl}/cfdi33/cancel/${config?.noCertificado || ''}/${uuid}/${satReason}`;

    const response = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Cancellation failed');
    }

    return { success: true, acuse: data.data?.acuse };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapToSatCancellationReason(reason: string): string {
    // Map internal reasons to SAT cancellation codes
    const reasonMap: Record<string, string> = {
      'ERROR_WITH_RELATION': '01',
      'ERROR_WITHOUT_RELATION': '02',
      'NOT_EXECUTED': '03',
      'NOMINAL_OPERATION': '04',
      'default': '02',
    };
    return reasonMap[reason] || reasonMap['default'];
  }

  private createStampingError(code: string, message: string, details: any, isRetryable: boolean): StampingError {
    const error = new Error(message) as any;
    error.code = code;
    error.details = details;
    error.isRetryable = isRetryable;
    return error;
  }

  // ============================================
  // SIMULATION MODE (Development/Sandbox)
  // ============================================

  private simulateStamping(xmlOriginal: string, noCertificadoEmisor?: string): StampingResult {
    const uuid = this.generateUUID();
    const fechaTimbrado = new Date();
    const noCertificado = noCertificadoEmisor || '30001000000400002434';

    this.logger.log(`[SANDBOX] Simulating stamp - UUID: ${uuid}`);

    // Add TFD complement to simulated XML
    const xmlTimbrado = xmlOriginal.replace(
      '</cfdi:Comprobante>',
      `
    <cfdi:Complemento>
        <tfd:TimbreFiscalDigital
            xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
            xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd"
            Version="1.1"
            UUID="${uuid}"
            FechaTimbrado="${fechaTimbrado.toISOString().replace('Z', '')}"
            RfcProvCertif="SPR190613I52"
            SelloCFD="SELLO_CFD_SIMULADO_${this.generateRandomString(32)}"
            NoCertificadoSAT="00001000000500003416"
            SelloSAT="SELLO_SAT_SIMULADO_${this.generateRandomString(32)}" />
    </cfdi:Complemento>
</cfdi:Comprobante>`,
    );

    return {
      uuid,
      fechaTimbrado,
      noCertificadoSat: '00001000000500003416',
      selloDigitalSat: 'SELLO_SAT_SIMULADO_' + this.generateRandomString(32),
      xmlTimbrado,
      cadenaOriginal: `||1.1|${uuid}|${fechaTimbrado.toISOString()}|SELLO_CFD_SIMULADO|${noCertificado}||`,
      pacResponse: {
        success: true,
        mode: 'sandbox',
        provider: 'SIMULATION',
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

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
