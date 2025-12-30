import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';
import {
  CreatePayrollConceptDto,
  UpdatePayrollConceptDto,
  CreateCompanyConceptDto,
  UpdateCompanyConceptDto,
  CreateIncidentMappingDto,
  UpdateIncidentMappingDto,
  CreateCustomConceptDto,
} from '../dto/company-concept.dto';

/**
 * CompanyConceptService - Gestión de conceptos de nómina por empresa
 *
 * Este servicio permite a RH/Contadores:
 * - Crear conceptos personalizados para su empresa
 * - Configurar montos y fórmulas por empresa
 * - Mapear incidencias a conceptos específicos
 * - Gestionar el catálogo de percepciones/deducciones
 */
@Injectable()
export class CompanyConceptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ============================================
  // CONCEPTOS GLOBALES (Solo Admin)
  // ============================================

  /**
   * Lista todos los conceptos globales de nómina
   */
  async getAllConcepts(includeInactive = false) {
    return this.prisma.payrollConcept.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * Obtiene un concepto global por ID
   */
  async getConceptById(id: string) {
    const concept = await this.prisma.payrollConcept.findUnique({
      where: { id },
      include: {
        companyConfigs: {
          include: { company: { select: { id: true, name: true } } },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException(`Concepto ${id} no encontrado`);
    }

    return concept;
  }

  /**
   * Crea un nuevo concepto global (Solo Admin)
   */
  async createConcept(dto: CreatePayrollConceptDto, userId: string) {
    // Verificar código único
    const existing = await this.prisma.payrollConcept.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un concepto con código ${dto.code}`);
    }

    const concept = await this.prisma.payrollConcept.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        satCode: dto.satCode,
        isTaxable: dto.isTaxable ?? false,
        isFixed: dto.isFixed ?? false,
        defaultAmount: dto.defaultAmount,
        formula: dto.formula,
        isActive: true,
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'PayrollConcept',
      entityId: concept.id,
      newValues: dto,
      description: `Creación de concepto de nómina: ${dto.code} - ${dto.name}`,
    });

    return concept;
  }

  /**
   * Actualiza un concepto global (Solo Admin)
   */
  async updateConcept(id: string, dto: UpdatePayrollConceptDto, userId: string) {
    const existing = await this.getConceptById(id);

    const concept = await this.prisma.payrollConcept.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.satCode !== undefined && { satCode: dto.satCode }),
        ...(dto.isTaxable !== undefined && { isTaxable: dto.isTaxable }),
        ...(dto.isFixed !== undefined && { isFixed: dto.isFixed }),
        ...(dto.defaultAmount !== undefined && { defaultAmount: dto.defaultAmount }),
        ...(dto.formula !== undefined && { formula: dto.formula }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'PayrollConcept',
      entityId: id,
      oldValues: existing,
      newValues: dto,
      description: `Actualización de concepto: ${existing.code}`,
    });

    return concept;
  }

  // ============================================
  // CONFIGURACIÓN DE CONCEPTOS POR EMPRESA
  // ============================================

  /**
   * Lista todos los conceptos configurados para una empresa
   */
  async getCompanyConcepts(companyId: string, type?: 'PERCEPTION' | 'DEDUCTION') {
    // Obtener todos los conceptos globales activos
    const globalConcepts = await this.prisma.payrollConcept.findMany({
      where: {
        isActive: true,
        ...(type && { type }),
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });

    // Obtener configuraciones de la empresa
    const companyConfigs = await this.prisma.companyPayrollConcept.findMany({
      where: { companyId },
      include: { concept: true },
    });

    // Crear mapa de configuraciones
    const configMap = new Map(companyConfigs.map(c => [c.conceptId, c]));

    // Combinar conceptos globales con configuración de empresa
    return globalConcepts.map(concept => {
      const config = configMap.get(concept.id);
      return {
        id: concept.id,
        code: config?.customCode || concept.code,
        name: config?.customName || concept.name,
        originalCode: concept.code,
        originalName: concept.name,
        type: concept.type,
        satCode: concept.satCode,
        isTaxable: concept.isTaxable,
        isFixed: concept.isFixed,
        defaultAmount: config?.defaultAmount || concept.defaultAmount,
        formula: config?.formula || concept.formula,
        appliesTo: config?.appliesTo || 'ALL',
        sortOrder: config?.sortOrder || 0,
        isActive: config?.isActive ?? true,
        hasCustomConfig: !!config,
        companyConfigId: config?.id,
      };
    });
  }

  /**
   * Obtiene solo las percepciones de una empresa
   */
  async getCompanyPerceptions(companyId: string) {
    return this.getCompanyConcepts(companyId, 'PERCEPTION');
  }

  /**
   * Obtiene solo las deducciones de una empresa
   */
  async getCompanyDeductions(companyId: string) {
    return this.getCompanyConcepts(companyId, 'DEDUCTION');
  }

  /**
   * Crea o actualiza la configuración de un concepto para una empresa
   */
  async upsertCompanyConcept(
    companyId: string,
    dto: CreateCompanyConceptDto,
    userId: string,
  ) {
    // Verificar que el concepto existe
    const concept = await this.prisma.payrollConcept.findUnique({
      where: { id: dto.conceptId },
    });

    if (!concept) {
      throw new NotFoundException(`Concepto ${dto.conceptId} no encontrado`);
    }

    // Verificar que la empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Empresa ${companyId} no encontrada`);
    }

    const data = {
      customName: dto.customName,
      customCode: dto.customCode,
      defaultAmount: dto.defaultAmount,
      formula: dto.formula,
      appliesTo: dto.appliesTo || 'ALL',
      sortOrder: dto.sortOrder || 0,
      isActive: true,
    };

    const config = await this.prisma.companyPayrollConcept.upsert({
      where: {
        companyId_conceptId: {
          companyId,
          conceptId: dto.conceptId,
        },
      },
      create: {
        companyId,
        conceptId: dto.conceptId,
        ...data,
      },
      update: data,
      include: { concept: true },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'CompanyPayrollConcept',
      entityId: config.id,
      newValues: dto,
      description: `Configuración de concepto ${concept.code} para empresa ${company.name}`,
    });

    return config;
  }

  /**
   * Actualiza la configuración de un concepto para una empresa
   */
  async updateCompanyConcept(
    companyId: string,
    conceptId: string,
    dto: UpdateCompanyConceptDto,
    userId: string,
  ) {
    const existing = await this.prisma.companyPayrollConcept.findUnique({
      where: {
        companyId_conceptId: { companyId, conceptId },
      },
      include: { concept: true, company: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `Configuración de concepto no encontrada para esta empresa`,
      );
    }

    const config = await this.prisma.companyPayrollConcept.update({
      where: { id: existing.id },
      data: {
        ...(dto.customName !== undefined && { customName: dto.customName }),
        ...(dto.customCode !== undefined && { customCode: dto.customCode }),
        ...(dto.defaultAmount !== undefined && { defaultAmount: dto.defaultAmount }),
        ...(dto.formula !== undefined && { formula: dto.formula }),
        ...(dto.appliesTo !== undefined && { appliesTo: dto.appliesTo }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { concept: true },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'CompanyPayrollConcept',
      entityId: config.id,
      oldValues: existing,
      newValues: dto,
      description: `Actualización de concepto ${existing.concept.code} para empresa ${existing.company.name}`,
    });

    return config;
  }

  /**
   * Elimina la configuración personalizada de un concepto (vuelve a usar valores globales)
   */
  async deleteCompanyConcept(
    companyId: string,
    conceptId: string,
    userId: string,
  ) {
    const existing = await this.prisma.companyPayrollConcept.findUnique({
      where: {
        companyId_conceptId: { companyId, conceptId },
      },
      include: { concept: true, company: true },
    });

    if (!existing) {
      throw new NotFoundException(`Configuración no encontrada`);
    }

    await this.prisma.companyPayrollConcept.delete({
      where: { id: existing.id },
    });

    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'CompanyPayrollConcept',
      entityId: existing.id,
      oldValues: existing,
      description: `Eliminación de configuración personalizada de ${existing.concept.code}`,
    });

    return { message: 'Configuración eliminada, se usarán valores globales' };
  }

  /**
   * Crea un concepto personalizado completo para una empresa
   * (Crea el concepto global y la configuración de empresa en una sola operación)
   */
  async createCustomConcept(
    companyId: string,
    dto: CreateCustomConceptDto,
    userId: string,
  ) {
    // Verificar que la empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Empresa ${companyId} no encontrada`);
    }

    // Generar código único si es necesario
    let code = dto.code;
    const existingCode = await this.prisma.payrollConcept.findUnique({
      where: { code },
    });

    if (existingCode) {
      // Agregar prefijo de empresa al código
      code = `${company.rfc.slice(0, 4)}_${dto.code}`;
      const stillExists = await this.prisma.payrollConcept.findUnique({
        where: { code },
      });
      if (stillExists) {
        throw new ConflictException(`El código ${dto.code} ya existe`);
      }
    }

    // Crear concepto y configuración en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // Crear concepto global
      const concept = await tx.payrollConcept.create({
        data: {
          code,
          name: dto.name,
          type: dto.type,
          satCode: dto.satCode,
          isTaxable: dto.isTaxable ?? true,
          isFixed: !!dto.defaultAmount,
          defaultAmount: dto.defaultAmount,
          formula: dto.formula,
          isActive: true,
        },
      });

      // Crear configuración de empresa
      const config = await tx.companyPayrollConcept.create({
        data: {
          companyId,
          conceptId: concept.id,
          customName: dto.name,
          customCode: dto.code,
          defaultAmount: dto.defaultAmount,
          formula: dto.formula,
          appliesTo: dto.appliesTo || 'ALL',
          sortOrder: 0,
          isActive: true,
        },
      });

      return { concept, config };
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'PayrollConcept',
      entityId: result.concept.id,
      newValues: dto,
      description: `Creación de concepto personalizado ${code} para ${company.name}`,
    });

    return {
      ...result.concept,
      companyConfig: result.config,
    };
  }

  // ============================================
  // MAPEO DE INCIDENCIAS A CONCEPTOS
  // ============================================

  /**
   * Lista todos los mapeos de incidencias para una empresa
   */
  async getIncidentMappings(companyId: string | null) {
    return this.prisma.incidentConceptMapping.findMany({
      where: { companyId },
      include: {
        incidentType: true,
        concept: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Obtiene los mapeos globales (sin empresa)
   */
  async getGlobalIncidentMappings() {
    return this.getIncidentMappings(null);
  }

  /**
   * Crea un mapeo de incidencia a concepto
   */
  async createIncidentMapping(
    companyId: string | null,
    dto: CreateIncidentMappingDto,
    userId: string,
  ) {
    // Verificar que el tipo de incidencia existe
    const incidentType = await this.prisma.incidentType.findUnique({
      where: { id: dto.incidentTypeId },
    });

    if (!incidentType) {
      throw new NotFoundException(`Tipo de incidencia ${dto.incidentTypeId} no encontrado`);
    }

    // Verificar que el concepto existe
    const concept = await this.prisma.payrollConcept.findUnique({
      where: { id: dto.conceptId },
    });

    if (!concept) {
      throw new NotFoundException(`Concepto ${dto.conceptId} no encontrado`);
    }

    // Verificar que no existe ya un mapeo para esta combinación
    const existing = await this.prisma.incidentConceptMapping.findUnique({
      where: {
        companyId_incidentTypeId_isRetroactive: {
          companyId: companyId ?? '',
          incidentTypeId: dto.incidentTypeId,
          isRetroactive: dto.isRetroactive ?? false,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un mapeo para este tipo de incidencia${dto.isRetroactive ? ' (retroactivo)' : ''}`,
      );
    }

    const mapping = await this.prisma.incidentConceptMapping.create({
      data: {
        companyId,
        incidentTypeId: dto.incidentTypeId,
        conceptId: dto.conceptId,
        isRetroactive: dto.isRetroactive ?? false,
        priority: dto.priority ?? 0,
        isActive: true,
      },
      include: {
        incidentType: true,
        concept: true,
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'IncidentConceptMapping',
      entityId: mapping.id,
      newValues: dto,
      description: `Mapeo de incidencia ${incidentType.name} a concepto ${concept.code}`,
    });

    return mapping;
  }

  /**
   * Actualiza un mapeo de incidencia
   */
  async updateIncidentMapping(
    mappingId: string,
    dto: UpdateIncidentMappingDto,
    userId: string,
  ) {
    const existing = await this.prisma.incidentConceptMapping.findUnique({
      where: { id: mappingId },
      include: { incidentType: true, concept: true },
    });

    if (!existing) {
      throw new NotFoundException(`Mapeo ${mappingId} no encontrado`);
    }

    // Si se cambia el concepto, verificar que existe
    if (dto.conceptId) {
      const concept = await this.prisma.payrollConcept.findUnique({
        where: { id: dto.conceptId },
      });
      if (!concept) {
        throw new NotFoundException(`Concepto ${dto.conceptId} no encontrado`);
      }
    }

    const mapping = await this.prisma.incidentConceptMapping.update({
      where: { id: mappingId },
      data: {
        ...(dto.conceptId !== undefined && { conceptId: dto.conceptId }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        incidentType: true,
        concept: true,
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'IncidentConceptMapping',
      entityId: mappingId,
      oldValues: existing,
      newValues: dto,
      description: `Actualización de mapeo de incidencia`,
    });

    return mapping;
  }

  /**
   * Elimina un mapeo de incidencia
   */
  async deleteIncidentMapping(mappingId: string, userId: string) {
    const existing = await this.prisma.incidentConceptMapping.findUnique({
      where: { id: mappingId },
      include: { incidentType: true, concept: true },
    });

    if (!existing) {
      throw new NotFoundException(`Mapeo ${mappingId} no encontrado`);
    }

    await this.prisma.incidentConceptMapping.delete({
      where: { id: mappingId },
    });

    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'IncidentConceptMapping',
      entityId: mappingId,
      oldValues: existing,
      description: `Eliminación de mapeo ${existing.incidentType.name} -> ${existing.concept.code}`,
    });

    return { message: 'Mapeo eliminado correctamente' };
  }

  /**
   * Obtiene el concepto correcto para una incidencia
   * (busca primero configuración de empresa, luego global)
   */
  async getConceptForIncident(
    companyId: string,
    incidentTypeId: string,
    isRetroactive = false,
  ) {
    // Primero buscar mapeo específico de la empresa
    let mapping = await this.prisma.incidentConceptMapping.findFirst({
      where: {
        companyId,
        incidentTypeId,
        isRetroactive,
        isActive: true,
      },
      include: { concept: true },
      orderBy: { priority: 'desc' },
    });

    // Si no hay mapeo de empresa, buscar mapeo global
    if (!mapping) {
      mapping = await this.prisma.incidentConceptMapping.findFirst({
        where: {
          companyId: null,
          incidentTypeId,
          isRetroactive,
          isActive: true,
        },
        include: { concept: true },
        orderBy: { priority: 'desc' },
      });
    }

    return mapping?.concept || null;
  }

  // ============================================
  // ESTADÍSTICAS Y REPORTES
  // ============================================

  /**
   * Obtiene estadísticas de uso de conceptos por empresa
   */
  async getConceptUsageStats(companyId: string) {
    const [perceptionCount, deductionCount, customCount] = await Promise.all([
      this.prisma.payrollConcept.count({
        where: { type: 'PERCEPTION', isActive: true },
      }),
      this.prisma.payrollConcept.count({
        where: { type: 'DEDUCTION', isActive: true },
      }),
      this.prisma.companyPayrollConcept.count({
        where: { companyId },
      }),
    ]);

    return {
      totalPerceptions: perceptionCount,
      totalDeductions: deductionCount,
      customizedConcepts: customCount,
      total: perceptionCount + deductionCount,
    };
  }
}
