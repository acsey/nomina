import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { AuditService } from './audit.service';

/**
 * Servicio para gestión segura de secretos empresariales
 *
 * Cumple con: Documento de Requerimientos - Sección 6. Seguridad
 * - Certificados SAT fuera del código
 * - Gestión de secretos cifrada
 */
@Injectable()
export class SecretsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Guarda los certificados CFDI de una empresa de forma segura
   */
  async saveCompanyCertificates(
    companyId: string,
    data: {
      certificadoCer: string;
      certificadoKey: string;
      certificadoPassword: string;
      noCertificado?: string;
      vigenciaInicio?: Date;
      vigenciaFin?: Date;
    },
    userId?: string,
  ) {
    // Validar que los certificados tengan formato válido
    this.validateCertificateFormat(data.certificadoCer, 'cer');
    this.validateCertificateFormat(data.certificadoKey, 'key');

    // Cifrar los datos sensibles
    const encryptedCer = this.encryption.encrypt(data.certificadoCer);
    const encryptedKey = this.encryption.encrypt(data.certificadoKey);
    const encryptedPassword = this.encryption.encrypt(data.certificadoPassword);

    // Guardar en BD
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        certificadoCer: encryptedCer,
        certificadoKey: encryptedKey,
        certificadoPassword: encryptedPassword,
        noCertificado: data.noCertificado,
        certificadoVigenciaInicio: data.vigenciaInicio,
        certificadoVigenciaFin: data.vigenciaFin,
      },
    });

    // Registrar en auditoría
    await this.auditService.logCriticalAction({
      userId,
      action: 'CERTIFICATE_UPDATE',
      entity: 'Company',
      entityId: companyId,
      details: {
        noCertificado: data.noCertificado,
        vigenciaInicio: data.vigenciaInicio,
        vigenciaFin: data.vigenciaFin,
        // NO registrar los certificados en sí
      },
    });

    return {
      success: true,
      noCertificado: company.noCertificado,
      vigenciaInicio: company.certificadoVigenciaInicio,
      vigenciaFin: company.certificadoVigenciaFin,
    };
  }

  /**
   * Obtiene los certificados descifrados para uso interno
   * SOLO usar para operaciones de timbrado
   */
  async getCompanyCertificates(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        certificadoCer: true,
        certificadoKey: true,
        certificadoPassword: true,
        noCertificado: true,
        certificadoVigenciaInicio: true,
        certificadoVigenciaFin: true,
      },
    });

    if (!company) {
      throw new BadRequestException('Empresa no encontrada');
    }

    // Verificar vigencia del certificado
    if (company.certificadoVigenciaFin) {
      const now = new Date();
      if (now > company.certificadoVigenciaFin) {
        throw new BadRequestException(
          'El certificado de la empresa ha expirado. ' +
          `Vigencia hasta: ${company.certificadoVigenciaFin.toISOString().split('T')[0]}`
        );
      }
    }

    return {
      certificadoCer: company.certificadoCer
        ? this.encryption.decrypt(company.certificadoCer)
        : null,
      certificadoKey: company.certificadoKey
        ? this.encryption.decrypt(company.certificadoKey)
        : null,
      certificadoPassword: company.certificadoPassword
        ? this.encryption.decrypt(company.certificadoPassword)
        : null,
      noCertificado: company.noCertificado,
      vigenciaInicio: company.certificadoVigenciaInicio,
      vigenciaFin: company.certificadoVigenciaFin,
    };
  }

  /**
   * Guarda las credenciales PAC de una empresa de forma segura
   */
  async savePacCredentials(
    companyId: string,
    data: {
      pacProvider: string;
      pacUser: string;
      pacPassword: string;
      pacMode: 'sandbox' | 'production';
    },
    userId?: string,
  ) {
    // Validar proveedor PAC
    const validProviders = ['FINKOK', 'SW_SAPIEN', 'SANDBOX'];
    if (!validProviders.includes(data.pacProvider)) {
      throw new BadRequestException(
        `Proveedor PAC inválido. Proveedores válidos: ${validProviders.join(', ')}`
      );
    }

    // Cifrar credenciales
    const encryptedUser = this.encryption.encrypt(data.pacUser);
    const encryptedPassword = this.encryption.encrypt(data.pacPassword);

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        pacProvider: data.pacProvider,
        pacUser: encryptedUser,
        pacPassword: encryptedPassword,
        pacMode: data.pacMode,
      },
    });

    // Registrar en auditoría
    await this.auditService.logCriticalAction({
      userId,
      action: 'PAC_CREDENTIALS_UPDATE',
      entity: 'Company',
      entityId: companyId,
      details: {
        pacProvider: data.pacProvider,
        pacMode: data.pacMode,
        // NO registrar usuario ni contraseña
      },
    });

    return {
      success: true,
      pacProvider: company.pacProvider,
      pacMode: company.pacMode,
    };
  }

  /**
   * Obtiene las credenciales PAC descifradas para uso interno
   */
  async getPacCredentials(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        pacProvider: true,
        pacUser: true,
        pacPassword: true,
        pacMode: true,
      },
    });

    if (!company) {
      throw new BadRequestException('Empresa no encontrada');
    }

    return {
      pacProvider: company.pacProvider,
      pacUser: company.pacUser
        ? this.encryption.decrypt(company.pacUser)
        : null,
      pacPassword: company.pacPassword
        ? this.encryption.decrypt(company.pacPassword)
        : null,
      pacMode: company.pacMode,
    };
  }

  /**
   * Migra secretos existentes sin cifrar a formato cifrado
   * Ejecutar una sola vez durante actualización del sistema
   */
  async migrateUnencryptedSecrets() {
    const companies = await this.prisma.company.findMany({
      select: {
        id: true,
        certificadoCer: true,
        certificadoKey: true,
        certificadoPassword: true,
        pacUser: true,
        pacPassword: true,
      },
    });

    let migrated = 0;
    const errors: string[] = [];

    for (const company of companies) {
      try {
        const updates: Record<string, string> = {};

        // Migrar certificados si no están cifrados
        if (company.certificadoCer && !this.encryption.isEncrypted(company.certificadoCer)) {
          updates.certificadoCer = this.encryption.encrypt(company.certificadoCer);
        }
        if (company.certificadoKey && !this.encryption.isEncrypted(company.certificadoKey)) {
          updates.certificadoKey = this.encryption.encrypt(company.certificadoKey);
        }
        if (company.certificadoPassword && !this.encryption.isEncrypted(company.certificadoPassword)) {
          updates.certificadoPassword = this.encryption.encrypt(company.certificadoPassword);
        }

        // Migrar credenciales PAC si no están cifradas
        if (company.pacUser && !this.encryption.isEncrypted(company.pacUser)) {
          updates.pacUser = this.encryption.encrypt(company.pacUser);
        }
        if (company.pacPassword && !this.encryption.isEncrypted(company.pacPassword)) {
          updates.pacPassword = this.encryption.encrypt(company.pacPassword);
        }

        if (Object.keys(updates).length > 0) {
          await this.prisma.company.update({
            where: { id: company.id },
            data: updates,
          });
          migrated++;
        }
      } catch (error) {
        errors.push(`Error migrando empresa ${company.id}: ${error.message}`);
      }
    }

    return {
      total: companies.length,
      migrated,
      errors,
    };
  }

  private validateCertificateFormat(cert: string, type: 'cer' | 'key') {
    if (!cert) {
      throw new BadRequestException(`El certificado ${type} es requerido`);
    }

    // Verificar si es base64 válido
    try {
      const decoded = Buffer.from(cert, 'base64');
      if (decoded.length < 100) {
        throw new Error('Certificado muy corto');
      }
    } catch {
      throw new BadRequestException(
        `El certificado ${type} debe estar en formato base64 válido`
      );
    }
  }
}
