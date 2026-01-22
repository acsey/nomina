import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSystemModuleDto, UpdateSystemModuleDto, UpdateCompanyModuleDto } from './dto';
import { Prisma } from '@prisma/client';

// Módulos predefinidos del sistema
export const DEFAULT_SYSTEM_MODULES = [
  { code: 'employees', name: 'Empleados', category: 'CORE', isCore: true, defaultEnabled: true, icon: 'users', sortOrder: 1 },
  { code: 'users', name: 'Usuarios', category: 'CORE', isCore: true, defaultEnabled: true, icon: 'user-circle', sortOrder: 2 },
  { code: 'departments', name: 'Departamentos', category: 'CORE', isCore: true, defaultEnabled: true, icon: 'building-office', sortOrder: 3 },
  { code: 'payroll', name: 'Nómina', category: 'PAYROLL', isCore: false, defaultEnabled: true, icon: 'currency-dollar', sortOrder: 10 },
  { code: 'cfdi', name: 'Timbrado CFDI', category: 'PAYROLL', isCore: false, defaultEnabled: true, icon: 'document-check', sortOrder: 11 },
  { code: 'attendance', name: 'Control de Asistencia', category: 'ATTENDANCE', isCore: false, defaultEnabled: true, icon: 'clock', sortOrder: 20 },
  { code: 'biometric', name: 'Dispositivos Biométricos', category: 'ATTENDANCE', isCore: false, defaultEnabled: false, icon: 'finger-print', sortOrder: 21 },
  { code: 'whatsapp_attendance', name: 'Checador por WhatsApp', category: 'INTEGRATION', isCore: false, defaultEnabled: false, icon: 'chat-bubble-left-right', sortOrder: 22 },
  { code: 'vacations', name: 'Vacaciones y Permisos', category: 'HR', isCore: false, defaultEnabled: true, icon: 'sun', sortOrder: 30 },
  { code: 'benefits', name: 'Beneficios', category: 'HR', isCore: false, defaultEnabled: true, icon: 'gift', sortOrder: 31 },
  { code: 'incidents', name: 'Incidencias', category: 'HR', isCore: false, defaultEnabled: true, icon: 'exclamation-triangle', sortOrder: 32 },
  { code: 'portal', name: 'Portal del Empleado', category: 'PORTAL', isCore: false, defaultEnabled: true, icon: 'user-group', sortOrder: 40 },
  { code: 'reports', name: 'Reportes Avanzados', category: 'REPORTS', isCore: false, defaultEnabled: true, icon: 'chart-bar', sortOrder: 50 },
  { code: 'ai_chatbot', name: 'ChatBot IA para RRHH', category: 'INTEGRATION', isCore: false, defaultEnabled: false, icon: 'sparkles', sortOrder: 60 },
  { code: 'n8n_integration', name: 'Integración n8n', category: 'INTEGRATION', isCore: false, defaultEnabled: false, icon: 'puzzle-piece', sortOrder: 61 },
];

@Injectable()
export class SystemModulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Inicializa los módulos predefinidos del sistema
   */
  async seedDefaultModules() {
    for (const module of DEFAULT_SYSTEM_MODULES) {
      await this.prisma.systemModule.upsert({
        where: { code: module.code },
        update: {},
        create: {
          code: module.code,
          name: module.name,
          category: module.category as any,
          isCore: module.isCore,
          defaultEnabled: module.defaultEnabled,
          icon: module.icon,
          sortOrder: module.sortOrder,
        },
      });
    }
  }

  /**
   * Obtiene todos los módulos del sistema
   */
  async findAllSystemModules() {
    return this.prisma.systemModule.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Obtiene un módulo del sistema por código
   */
  async findSystemModuleByCode(code: string) {
    const module = await this.prisma.systemModule.findUnique({
      where: { code },
    });
    if (!module) {
      throw new NotFoundException(`Módulo ${code} no encontrado`);
    }
    return module;
  }

  /**
   * Crea un nuevo módulo del sistema (solo super admin)
   */
  async createSystemModule(dto: CreateSystemModuleDto) {
    return this.prisma.systemModule.create({
      data: dto as any,
    });
  }

  /**
   * Actualiza un módulo del sistema
   */
  async updateSystemModule(id: string, dto: UpdateSystemModuleDto) {
    return this.prisma.systemModule.update({
      where: { id },
      data: dto as any,
    });
  }

  // =============================================
  // COMPANY MODULES (Módulos por empresa)
  // =============================================

  /**
   * Obtiene los módulos habilitados para una empresa
   */
  async getCompanyModules(companyId: string) {
    // Obtener todos los módulos del sistema
    const systemModules = await this.prisma.systemModule.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Obtener la configuración de la empresa
    const companyModules = await this.prisma.companyModule.findMany({
      where: { companyId },
      include: { module: true },
    });

    // Mapear el estado de cada módulo
    const companyModuleMap = new Map(
      companyModules.map((cm) => [cm.moduleId, cm])
    );

    return systemModules.map((module) => {
      const companyModule = companyModuleMap.get(module.id);
      return {
        ...module,
        isEnabled: companyModule ? companyModule.isEnabled : module.defaultEnabled,
        config: companyModule?.config || null,
        companyModuleId: companyModule?.id || null,
      };
    });
  }

  /**
   * Verifica si un módulo está habilitado para una empresa
   */
  async isModuleEnabled(companyId: string, moduleCode: string): Promise<boolean> {
    const systemModule = await this.prisma.systemModule.findUnique({
      where: { code: moduleCode },
    });

    if (!systemModule) {
      return false;
    }

    // Los módulos core siempre están habilitados
    if (systemModule.isCore) {
      return true;
    }

    const companyModule = await this.prisma.companyModule.findUnique({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId: systemModule.id,
        },
      },
    });

    // Si no existe configuración específica, usar el valor por defecto
    return companyModule ? companyModule.isEnabled : systemModule.defaultEnabled;
  }

  /**
   * Habilita o deshabilita un módulo para una empresa
   */
  async updateCompanyModule(
    companyId: string,
    moduleCode: string,
    dto: UpdateCompanyModuleDto,
    userId?: string
  ) {
    const systemModule = await this.prisma.systemModule.findUnique({
      where: { code: moduleCode },
    });

    if (!systemModule) {
      throw new NotFoundException(`Módulo ${moduleCode} no encontrado`);
    }

    if (systemModule.isCore && dto.isEnabled === false) {
      throw new BadRequestException(`El módulo ${moduleCode} es esencial y no puede deshabilitarse`);
    }

    const now = new Date();

    return this.prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId: systemModule.id,
        },
      },
      update: {
        isEnabled: dto.isEnabled,
        config: dto.config as Prisma.InputJsonValue,
        enabledAt: dto.isEnabled ? now : undefined,
        disabledAt: !dto.isEnabled ? now : undefined,
        enabledById: userId,
      },
      create: {
        companyId,
        moduleId: systemModule.id,
        isEnabled: dto.isEnabled,
        config: dto.config as Prisma.InputJsonValue,
        enabledAt: dto.isEnabled ? now : null,
        enabledById: userId,
      },
      include: { module: true },
    });
  }

  /**
   * Inicializa módulos para una nueva empresa
   */
  async initializeCompanyModules(companyId: string) {
    const systemModules = await this.prisma.systemModule.findMany();

    const modulesToCreate = systemModules
      .filter((m) => m.defaultEnabled)
      .map((module) => ({
        companyId,
        moduleId: module.id,
        isEnabled: true,
        enabledAt: new Date(),
      }));

    await this.prisma.companyModule.createMany({
      data: modulesToCreate,
      skipDuplicates: true,
    });

    return this.getCompanyModules(companyId);
  }

  /**
   * Obtiene las empresas que tienen un módulo específico habilitado
   */
  async getCompaniesWithModule(moduleCode: string) {
    const systemModule = await this.prisma.systemModule.findUnique({
      where: { code: moduleCode },
    });

    if (!systemModule) {
      throw new NotFoundException(`Módulo ${moduleCode} no encontrado`);
    }

    return this.prisma.companyModule.findMany({
      where: {
        moduleId: systemModule.id,
        isEnabled: true,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            rfc: true,
          },
        },
      },
    });
  }
}
