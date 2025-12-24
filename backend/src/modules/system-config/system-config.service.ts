import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

// Default system configurations
const DEFAULT_CONFIGS = [
  {
    key: 'MULTI_COMPANY_ENABLED',
    value: 'true',
    description: 'Habilita el modo multiempresa. Cuando está deshabilitado, los usuarios solo ven su empresa asignada.',
    dataType: 'boolean',
    category: 'general',
    isPublic: true,
  },
  {
    key: 'SYSTEM_NAME',
    value: 'Sistema de Nómina',
    description: 'Nombre del sistema mostrado en la interfaz',
    dataType: 'string',
    category: 'branding',
    isPublic: true,
  },
  {
    key: 'DEFAULT_LANGUAGE',
    value: 'es',
    description: 'Idioma por defecto del sistema',
    dataType: 'string',
    category: 'general',
    isPublic: true,
  },
];

@Injectable()
export class SystemConfigService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Initialize default configurations if they don't exist
    await this.initializeDefaults();
  }

  private async initializeDefaults() {
    for (const config of DEFAULT_CONFIGS) {
      const existing = await this.prisma.systemConfig.findUnique({
        where: { key: config.key },
      });

      if (!existing) {
        await this.prisma.systemConfig.create({
          data: config,
        });
      }
    }
  }

  async getAll() {
    return this.prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async getPublic() {
    return this.prisma.systemConfig.findMany({
      where: { isPublic: true },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async getByKey(key: string) {
    return this.prisma.systemConfig.findUnique({
      where: { key },
    });
  }

  async getValue(key: string): Promise<any> {
    const config = await this.getByKey(key);
    if (!config) return null;

    switch (config.dataType) {
      case 'boolean':
        return config.value === 'true';
      case 'number':
        return Number(config.value);
      case 'json':
        try {
          return JSON.parse(config.value);
        } catch {
          return null;
        }
      default:
        return config.value;
    }
  }

  async update(key: string, value: string) {
    return this.prisma.systemConfig.update({
      where: { key },
      data: { value },
    });
  }

  async updateMultiple(configs: { key: string; value: string }[]) {
    const updates = configs.map((config) =>
      this.prisma.systemConfig.update({
        where: { key: config.key },
        data: { value: config.value },
      }),
    );

    return this.prisma.$transaction(updates);
  }

  async isMultiCompanyEnabled(): Promise<boolean> {
    const value = await this.getValue('MULTI_COMPANY_ENABLED');
    return value === true;
  }
}
