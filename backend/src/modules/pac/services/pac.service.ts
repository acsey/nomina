import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EncryptionService } from '@/common/security/encryption.service';
import { AuditService } from '@/common/security/audit.service';
import {
  CreatePacProviderDto,
  UpdatePacProviderDto,
  ConfigurePacDto,
  UpdatePacConfigDto,
} from '../dto/pac.dto';

@Injectable()
export class PacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  // ============================================
  // CATÁLOGO DE PACs
  // ============================================

  /**
   * Lista todos los PACs del catálogo
   */
  async getAllProviders(includeInactive = false) {
    return this.prisma.pacProvider.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [
        { isFeatured: 'desc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        code: true,
        name: true,
        legalName: true,
        integrationType: true,
        isOfficial: true,
        isActive: true,
        isImplemented: true,
        isFeatured: true,
        sortOrder: true,
        websiteUrl: true,
        logoUrl: true,
        supportsStamping: true,
        supportsCancellation: true,
        supportsQueryStatus: true,
        supportsRecovery: true,
        requiredFields: true,
      },
    });
  }

  /**
   * Lista solo los PACs destacados/recomendados
   */
  async getFeaturedProviders() {
    return this.prisma.pacProvider.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Lista solo los PACs con implementación disponible
   */
  async getImplementedProviders() {
    return this.prisma.pacProvider.findMany({
      where: {
        isActive: true,
        isImplemented: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Obtiene un PAC por ID
   */
  async getProviderById(id: string) {
    const provider = await this.prisma.pacProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`PAC ${id} no encontrado`);
    }

    return provider;
  }

  /**
   * Obtiene un PAC por código
   */
  async getProviderByCode(code: string) {
    const provider = await this.prisma.pacProvider.findUnique({
      where: { code },
    });

    if (!provider) {
      throw new NotFoundException(`PAC con código ${code} no encontrado`);
    }

    return provider;
  }

  /**
   * Crea un nuevo PAC (personalizado)
   */
  async createProvider(dto: CreatePacProviderDto, userId: string) {
    // Verificar que el código no exista
    const existing = await this.prisma.pacProvider.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un PAC con el código ${dto.code}`);
    }

    const provider = await this.prisma.pacProvider.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        legalName: dto.legalName,
        sandboxStampUrl: dto.sandboxStampUrl,
        sandboxCancelUrl: dto.sandboxCancelUrl,
        productionStampUrl: dto.productionStampUrl,
        productionCancelUrl: dto.productionCancelUrl,
        integrationType: dto.integrationType || 'SOAP',
        documentationUrl: dto.documentationUrl,
        requiredFields: dto.requiredFields || ['user', 'password'],
        supportsStamping: dto.supportsStamping ?? true,
        supportsCancellation: dto.supportsCancellation ?? true,
        supportsQueryStatus: dto.supportsQueryStatus ?? false,
        supportsRecovery: dto.supportsRecovery ?? false,
        isOfficial: dto.isOfficial ?? false,
        isActive: true,
        isImplemented: false,
        notes: dto.notes,
        logoUrl: dto.logoUrl,
        websiteUrl: dto.websiteUrl,
        supportEmail: dto.supportEmail,
        supportPhone: dto.supportPhone,
        sortOrder: 200, // PACs personalizados al final
      },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'CREATE_PAC_PROVIDER',
      entity: 'PacProvider',
      entityId: provider.id,
      newValues: { code: dto.code, name: dto.name },
    });

    return provider;
  }

  /**
   * Actualiza un PAC
   */
  async updateProvider(id: string, dto: UpdatePacProviderDto, userId: string) {
    const existing = await this.getProviderById(id);

    const provider = await this.prisma.pacProvider.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.sandboxStampUrl !== undefined && { sandboxStampUrl: dto.sandboxStampUrl }),
        ...(dto.sandboxCancelUrl !== undefined && { sandboxCancelUrl: dto.sandboxCancelUrl }),
        ...(dto.productionStampUrl !== undefined && { productionStampUrl: dto.productionStampUrl }),
        ...(dto.productionCancelUrl !== undefined && { productionCancelUrl: dto.productionCancelUrl }),
        ...(dto.integrationType !== undefined && { integrationType: dto.integrationType }),
        ...(dto.documentationUrl !== undefined && { documentationUrl: dto.documentationUrl }),
        ...(dto.requiredFields !== undefined && { requiredFields: dto.requiredFields }),
        ...(dto.supportsStamping !== undefined && { supportsStamping: dto.supportsStamping }),
        ...(dto.supportsCancellation !== undefined && { supportsCancellation: dto.supportsCancellation }),
        ...(dto.supportsQueryStatus !== undefined && { supportsQueryStatus: dto.supportsQueryStatus }),
        ...(dto.supportsRecovery !== undefined && { supportsRecovery: dto.supportsRecovery }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isImplemented !== undefined && { isImplemented: dto.isImplemented }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl }),
        ...(dto.supportEmail !== undefined && { supportEmail: dto.supportEmail }),
        ...(dto.supportPhone !== undefined && { supportPhone: dto.supportPhone }),
      },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'UPDATE_PAC_PROVIDER',
      entity: 'PacProvider',
      entityId: id,
      oldValues: { name: existing.name },
      newValues: { ...dto },
    });

    return provider;
  }

  /**
   * Elimina un PAC personalizado (solo si no es oficial y no tiene configuraciones)
   */
  async deleteProvider(id: string, userId: string) {
    const provider = await this.getProviderById(id);

    if (provider.isOfficial) {
      throw new BadRequestException('No se puede eliminar un PAC oficial del SAT');
    }

    // Verificar que no tenga configuraciones de empresas
    const configCount = await this.prisma.companyPacConfig.count({
      where: { pacProviderId: id },
    });

    if (configCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el PAC porque tiene ${configCount} empresa(s) configuradas`
      );
    }

    await this.prisma.pacProvider.delete({
      where: { id },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'DELETE_PAC_PROVIDER',
      entity: 'PacProvider',
      entityId: id,
      oldValues: { code: provider.code, name: provider.name },
    });

    return { message: 'PAC eliminado correctamente' };
  }

  // ============================================
  // CONFIGURACIÓN DE PAC POR EMPRESA
  // ============================================

  /**
   * Lista las configuraciones de PAC de una empresa
   */
  async getCompanyConfigs(companyId: string) {
    const configs = await this.prisma.companyPacConfig.findMany({
      where: { companyId },
      include: {
        pacProvider: {
          select: {
            id: true,
            code: true,
            name: true,
            legalName: true,
            integrationType: true,
            isImplemented: true,
            requiredFields: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    // No devolver credenciales en la lista
    return configs.map((config: any) => ({
      ...config,
      credentials: undefined,
      hasCredentials: Object.keys(config.credentials as object || {}).length > 0,
    }));
  }

  /**
   * Obtiene la configuración principal de PAC de una empresa
   */
  async getPrimaryConfig(companyId: string) {
    const config = await this.prisma.companyPacConfig.findFirst({
      where: {
        companyId,
        isPrimary: true,
        isActive: true,
      },
      include: {
        pacProvider: true,
      },
    });

    return config;
  }

  /**
   * Obtiene una configuración de PAC con credenciales desencriptadas (para uso interno)
   */
  async getConfigWithCredentials(configId: string) {
    const config = await this.prisma.companyPacConfig.findUnique({
      where: { id: configId },
      include: {
        pacProvider: true,
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!config) {
      throw new NotFoundException(`Configuración de PAC ${configId} no encontrada`);
    }

    // Desencriptar credenciales
    const encryptedCreds = config.credentials as Record<string, string>;
    const decryptedCreds: Record<string, string> = {};

    for (const [key, value] of Object.entries(encryptedCreds)) {
      if (value && this.encryption.isEncrypted(value)) {
        decryptedCreds[key] = this.encryption.decrypt(value);
      } else {
        decryptedCreds[key] = value;
      }
    }

    return {
      ...config,
      credentials: decryptedCreds,
    };
  }

  /**
   * Configura un PAC para una empresa
   */
  async configurePac(companyId: string, dto: ConfigurePacDto, userId: string) {
    // Verificar que la empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Empresa ${companyId} no encontrada`);
    }

    // Verificar que el PAC existe
    const pacProvider = await this.getProviderById(dto.pacProviderId);

    // Verificar campos requeridos
    const requiredFields = pacProvider.requiredFields as string[];
    for (const field of requiredFields) {
      if (!dto.credentials[field]) {
        throw new BadRequestException(`El campo '${field}' es requerido para este PAC`);
      }
    }

    // Encriptar credenciales
    const encryptedCreds: Record<string, string> = {};
    for (const [key, value] of Object.entries(dto.credentials)) {
      if (value) {
        encryptedCreds[key] = this.encryption.encrypt(value);
      }
    }

    // Si es primary, desactivar otros primary
    if (dto.isPrimary) {
      await this.prisma.companyPacConfig.updateMany({
        where: { companyId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Crear o actualizar configuración
    const config = await this.prisma.companyPacConfig.upsert({
      where: {
        companyId_pacProviderId: {
          companyId,
          pacProviderId: dto.pacProviderId,
        },
      },
      create: {
        companyId,
        pacProviderId: dto.pacProviderId,
        credentials: encryptedCreds,
        mode: dto.mode || 'sandbox',
        isPrimary: dto.isPrimary ?? false,
        isActive: true,
        configuredBy: userId,
        notes: dto.notes,
      },
      update: {
        credentials: encryptedCreds,
        mode: dto.mode || 'sandbox',
        isPrimary: dto.isPrimary ?? false,
        isActive: true,
        configuredBy: userId,
        notes: dto.notes,
      },
      include: {
        pacProvider: {
          select: { code: true, name: true },
        },
      },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'CONFIGURE_PAC',
      entity: 'CompanyPacConfig',
      entityId: config.id,
      details: {
        description: `Configuración de PAC ${pacProvider.name} para empresa`,
        companyId,
        pacCode: pacProvider.code,
        mode: dto.mode || 'sandbox',
      },
    });

    return {
      ...config,
      credentials: undefined,
      hasCredentials: true,
    };
  }

  /**
   * Actualiza una configuración de PAC
   */
  async updatePacConfig(configId: string, dto: UpdatePacConfigDto, userId: string) {
    const existing = await this.prisma.companyPacConfig.findUnique({
      where: { id: configId },
      include: { pacProvider: true },
    });

    if (!existing) {
      throw new NotFoundException(`Configuración de PAC ${configId} no encontrada`);
    }

    // Si se envían credenciales, encriptarlas
    let encryptedCreds: Record<string, string> = (existing.credentials as Record<string, string>) || {};
    if (dto.credentials) {
      const requiredFields = existing.pacProvider.requiredFields as string[];
      for (const field of requiredFields) {
        if (!dto.credentials[field]) {
          throw new BadRequestException(`El campo '${field}' es requerido para este PAC`);
        }
      }

      encryptedCreds = {};
      for (const [key, value] of Object.entries(dto.credentials)) {
        if (value) {
          encryptedCreds[key] = this.encryption.encrypt(value);
        }
      }
    }

    // Si es primary, desactivar otros primary
    if (dto.isPrimary) {
      await this.prisma.companyPacConfig.updateMany({
        where: {
          companyId: existing.companyId,
          isPrimary: true,
          id: { not: configId },
        },
        data: { isPrimary: false },
      });
    }

    const config = await this.prisma.companyPacConfig.update({
      where: { id: configId },
      data: {
        ...(dto.credentials && { credentials: encryptedCreds }),
        ...(dto.mode !== undefined && { mode: dto.mode }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        pacProvider: {
          select: { code: true, name: true },
        },
      },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'UPDATE_PAC_CONFIG',
      entity: 'CompanyPacConfig',
      entityId: configId,
      details: {
        description: `Actualización de configuración de PAC`,
        companyId: existing.companyId,
        pacCode: existing.pacProvider.code,
      },
    });

    return {
      ...config,
      credentials: undefined,
      hasCredentials: Object.keys(encryptedCreds as object || {}).length > 0,
    };
  }

  /**
   * Elimina una configuración de PAC
   */
  async deletePacConfig(configId: string, userId: string) {
    const existing = await this.prisma.companyPacConfig.findUnique({
      where: { id: configId },
      include: { pacProvider: true },
    });

    if (!existing) {
      throw new NotFoundException(`Configuración de PAC ${configId} no encontrada`);
    }

    await this.prisma.companyPacConfig.delete({
      where: { id: configId },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'DELETE_PAC_CONFIG',
      entity: 'CompanyPacConfig',
      entityId: configId,
      details: {
        description: `Eliminación de configuración de PAC`,
        companyId: existing.companyId,
        pacCode: existing.pacProvider.code,
      },
    });

    return { message: 'Configuración de PAC eliminada correctamente' };
  }

  /**
   * Prueba la conexión con un PAC
   */
  async testConnection(configId: string, userId: string) {
    const config = await this.getConfigWithCredentials(configId);

    // Por ahora, solo actualizar el estado de prueba
    // TODO: Implementar prueba real de conexión según el tipo de PAC

    const testResult = {
      success: true,
      message: 'Conexión de prueba exitosa (simulada)',
      testedAt: new Date(),
    };

    // Si el PAC es SANDBOX, siempre pasa
    if (config.pacProvider.code === 'SANDBOX') {
      testResult.message = 'PAC de desarrollo - conexión simulada exitosa';
    } else if (!config.pacProvider.isImplemented) {
      testResult.success = false;
      testResult.message = `PAC ${config.pacProvider.name} no tiene implementación disponible aún`;
    }

    // Actualizar estado de prueba
    await this.prisma.companyPacConfig.update({
      where: { id: configId },
      data: {
        lastTestedAt: testResult.testedAt,
        testStatus: testResult.success ? 'SUCCESS' : 'FAILED',
        testMessage: testResult.message,
      },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'TEST_PAC_CONNECTION',
      entity: 'CompanyPacConfig',
      entityId: configId,
      details: {
        description: `Prueba de conexión con PAC ${config.pacProvider.name}`,
        result: testResult.success ? 'SUCCESS' : 'FAILED',
        message: testResult.message,
      },
    });

    return testResult;
  }

  /**
   * Establece un PAC como principal para una empresa
   */
  async setPrimaryPac(companyId: string, configId: string, userId: string) {
    const config = await this.prisma.companyPacConfig.findUnique({
      where: { id: configId },
      include: { pacProvider: true },
    });

    if (!config) {
      throw new NotFoundException(`Configuración de PAC ${configId} no encontrada`);
    }

    if (config.companyId !== companyId) {
      throw new BadRequestException('La configuración no pertenece a esta empresa');
    }

    // Desactivar otros primary
    await this.prisma.companyPacConfig.updateMany({
      where: { companyId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Activar este como primary
    await this.prisma.companyPacConfig.update({
      where: { id: configId },
      data: { isPrimary: true },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'SET_PRIMARY_PAC',
      entity: 'CompanyPacConfig',
      entityId: configId,
      details: {
        description: `PAC ${config.pacProvider.name} establecido como principal`,
        companyId,
      },
    });

    return { message: `PAC ${config.pacProvider.name} establecido como principal` };
  }
}
