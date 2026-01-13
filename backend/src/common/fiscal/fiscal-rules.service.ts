import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateFiscalRuleDto,
  UpdateFiscalRuleDto,
  FiscalRuleType,
  FiscalRuleLogicDto,
  OverlapCheckResult,
} from './dto/fiscal-rule.dto';

/**
 * HARDENING: Servicio de Reglas Fiscales
 *
 * Gestiona las reglas fiscales personalizadas por empresa con:
 * - Validación anti-traslapes de fechas
 * - Tipado estricto de lógica JSON
 * - Versionado para auditoría
 *
 * @author Sistema de Hardening
 */
@Injectable()
export class FiscalRulesService {
  private readonly logger = new Logger(FiscalRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una nueva regla fiscal con validación anti-traslape
   *
   * @throws BadRequestException si existe traslape de fechas con otra regla activa
   */
  async create(dto: CreateFiscalRuleDto, userId?: string) {
    this.logger.log(`Creando regla fiscal tipo ${dto.ruleType} para empresa ${dto.companyId}`);

    // Validar que logicJson cumple con el esquema estricto
    this.validateRuleLogic(dto.logicJson);

    // Verificar traslape de fechas con reglas activas del mismo tipo
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    const overlapCheck = await this.checkDateOverlap(
      dto.companyId,
      dto.ruleType,
      startDate,
      endDate,
    );

    if (overlapCheck.hasOverlap) {
      const conflicts = overlapCheck.conflictingRules
        .map(r => `"${r.name}" (${r.startDate.toISOString().split('T')[0]} - ${r.endDate?.toISOString().split('T')[0] || 'indefinido'})`)
        .join(', ');

      throw new BadRequestException(
        `HARDENING: Traslape de fechas detectado. La nueva regla entra en conflicto con: ${conflicts}. ` +
        `Desactive las reglas conflictivas o ajuste las fechas de vigencia.`
      );
    }

    // Crear la regla
    const rule = await this.prisma.fiscalRule.create({
      data: {
        companyId: dto.companyId,
        ruleType: dto.ruleType as any,
        name: dto.name,
        description: dto.description,
        startDate,
        endDate,
        logicJson: dto.logicJson as any,
        priority: dto.priority || 0,
        active: true,
        version: 1,
        createdBy: userId,
        legalLaw: dto.legalLaw,
        legalArticle: dto.legalArticle,
        legalSource: dto.legalSource,
      },
    });

    this.logger.log(`Regla fiscal ${rule.id} creada exitosamente`);
    return rule;
  }

  /**
   * Actualiza una regla fiscal existente con validación anti-traslape
   *
   * Si se modifican las fechas, verifica que no exista traslape
   * Incrementa la versión para auditoría
   */
  async update(ruleId: string, dto: UpdateFiscalRuleDto, userId?: string) {
    const existing = await this.prisma.fiscalRule.findUnique({
      where: { id: ruleId },
    });

    if (!existing) {
      throw new NotFoundException(`Regla fiscal ${ruleId} no encontrada`);
    }

    // Si se modifican las fechas, verificar traslapes
    if (dto.startDate || dto.endDate !== undefined) {
      const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
      const endDate = dto.endDate !== undefined
        ? (dto.endDate ? new Date(dto.endDate) : null)
        : existing.endDate;

      const overlapCheck = await this.checkDateOverlap(
        existing.companyId,
        existing.ruleType as FiscalRuleType,
        startDate,
        endDate,
        ruleId, // Excluir la regla actual del check
      );

      if (overlapCheck.hasOverlap) {
        const conflicts = overlapCheck.conflictingRules
          .map(r => `"${r.name}" (${r.startDate.toISOString().split('T')[0]} - ${r.endDate?.toISOString().split('T')[0] || 'indefinido'})`)
          .join(', ');

        throw new BadRequestException(
          `HARDENING: Traslape de fechas detectado al actualizar. Conflicto con: ${conflicts}`
        );
      }
    }

    // Validar logicJson si se proporciona
    if (dto.logicJson) {
      this.validateRuleLogic(dto.logicJson);
    }

    // Actualizar incrementando versión
    const rule = await this.prisma.fiscalRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate !== undefined
          ? (dto.endDate ? new Date(dto.endDate) : null)
          : undefined,
        logicJson: dto.logicJson as any,
        priority: dto.priority,
        active: dto.active,
        version: { increment: 1 },
        updatedBy: userId,
        legalLaw: dto.legalLaw,
        legalArticle: dto.legalArticle,
        legalSource: dto.legalSource,
      },
    });

    this.logger.log(`Regla fiscal ${ruleId} actualizada a versión ${rule.version}`);
    return rule;
  }

  /**
   * HARDENING: Verificación de traslape de fechas
   *
   * Busca reglas activas del mismo tipo que se traslapen con el rango dado.
   * Lógica: WHERE companyId = X AND ruleType = Y AND active = true
   *         AND (startDate <= newEnd AND endDate >= newStart)
   *
   * Maneja el caso de endDate = null (vigencia indefinida)
   */
  async checkDateOverlap(
    companyId: string,
    ruleType: FiscalRuleType,
    newStartDate: Date,
    newEndDate: Date | null,
    excludeRuleId?: string,
  ): Promise<OverlapCheckResult> {
    // Construir la condición de traslape
    // Una regla existente se traslapa si:
    // - Su inicio es <= al fin de la nueva (o la nueva no tiene fin)
    // - Su fin es >= al inicio de la nueva (o la existente no tiene fin)

    const whereConditions: Prisma.FiscalRuleWhereInput[] = [
      { companyId },
      { ruleType: ruleType as any },
      { active: true },
    ];

    // Excluir la regla actual si se está actualizando
    if (excludeRuleId) {
      whereConditions.push({ id: { not: excludeRuleId } });
    }

    // Condición de traslape de fechas
    // Traslape ocurre cuando: existingStart <= newEnd AND existingEnd >= newStart
    // Considerando nulls (vigencia indefinida):
    const dateOverlapCondition: Prisma.FiscalRuleWhereInput = {
      AND: [
        // La regla existente empieza antes o cuando termina la nueva
        newEndDate
          ? { startDate: { lte: newEndDate } }
          : {}, // Si newEndDate es null, siempre podría traslaparse
        // La regla existente termina después o cuando empieza la nueva
        // (o no tiene fin, representado por endDate = null)
        {
          OR: [
            { endDate: null }, // Vigencia indefinida siempre puede traslaparse
            { endDate: { gte: newStartDate } },
          ],
        },
      ],
    };

    whereConditions.push(dateOverlapCondition);

    const conflictingRules = await this.prisma.fiscalRule.findMany({
      where: { AND: whereConditions },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    return {
      hasOverlap: conflictingRules.length > 0,
      conflictingRules,
    };
  }

  /**
   * Valida que logicJson cumpla con la estructura estricta
   */
  private validateRuleLogic(logic: FiscalRuleLogicDto): void {
    // Validar versión de esquema
    if (!logic.schemaVersion) {
      throw new BadRequestException(
        'HARDENING: logicJson debe incluir schemaVersion'
      );
    }

    // Validar que existe una acción
    if (!logic.action) {
      throw new BadRequestException(
        'HARDENING: logicJson debe incluir una acción (action)'
      );
    }

    // Validar tipo de acción
    const validActions = ['APPLY_RATE', 'APPLY_FIXED', 'APPLY_TABLE', 'APPLY_FORMULA', 'EXEMPT', 'CAP', 'FLOOR'];
    if (!validActions.includes(logic.action.type)) {
      throw new BadRequestException(
        `HARDENING: Tipo de acción inválido: ${logic.action.type}. Valores permitidos: ${validActions.join(', ')}`
      );
    }

    // Validaciones específicas por tipo de acción
    switch (logic.action.type) {
      case 'APPLY_RATE':
        if (logic.action.rate === undefined || logic.action.rate < 0 || logic.action.rate > 1) {
          throw new BadRequestException(
            'HARDENING: APPLY_RATE requiere rate entre 0 y 1 (decimal)'
          );
        }
        break;
      case 'APPLY_TABLE':
        if (!logic.action.table || !Array.isArray(logic.action.table) || logic.action.table.length === 0) {
          throw new BadRequestException(
            'HARDENING: APPLY_TABLE requiere una tabla de rangos no vacía'
          );
        }
        // Validar que los rangos no se traslapen entre sí
        this.validateTableRanges(logic.action.table);
        break;
      case 'APPLY_FORMULA':
        if (!logic.action.formula || typeof logic.action.formula !== 'string') {
          throw new BadRequestException(
            'HARDENING: APPLY_FORMULA requiere una fórmula válida'
          );
        }
        break;
    }

    // Validar condiciones si existen
    if (logic.conditions && Array.isArray(logic.conditions)) {
      const validOperators = ['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN', 'IN', 'NOT_IN'];
      for (const condition of logic.conditions) {
        if (!condition.field || !condition.operator) {
          throw new BadRequestException(
            'HARDENING: Cada condición debe tener field y operator'
          );
        }
        if (!validOperators.includes(condition.operator)) {
          throw new BadRequestException(
            `HARDENING: Operador inválido: ${condition.operator}`
          );
        }
      }
    }
  }

  /**
   * Valida que los rangos de una tabla no se traslapen
   */
  private validateTableRanges(table: any[]): void {
    const sorted = [...table].sort((a, b) => a.lowerLimit - b.lowerLimit);

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].lowerLimit < sorted[i - 1].upperLimit) {
        throw new BadRequestException(
          `HARDENING: Traslape en tabla de rangos entre ${sorted[i - 1].lowerLimit}-${sorted[i - 1].upperLimit} y ${sorted[i].lowerLimit}-${sorted[i].upperLimit}`
        );
      }
    }
  }

  /**
   * Obtiene reglas fiscales activas para una empresa y tipo
   */
  async getActiveRules(companyId: string, ruleType?: FiscalRuleType, date?: Date) {
    const where: Prisma.FiscalRuleWhereInput = {
      companyId,
      active: true,
    };

    if (ruleType) {
      where.ruleType = ruleType as any;
    }

    // Filtrar por fecha de vigencia si se proporciona
    if (date) {
      where.AND = [
        { startDate: { lte: date } },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: date } },
          ],
        },
      ];
    }

    return this.prisma.fiscalRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { startDate: 'desc' },
      ],
    });
  }

  /**
   * Obtiene una regla por ID
   */
  async findById(ruleId: string) {
    return this.prisma.fiscalRule.findUnique({
      where: { id: ruleId },
    });
  }

  /**
   * Lista todas las reglas de una empresa
   */
  async findByCompany(companyId: string, includeInactive = false) {
    return this.prisma.fiscalRule.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: [
        { ruleType: 'asc' },
        { priority: 'desc' },
        { startDate: 'desc' },
      ],
    });
  }

  /**
   * Desactiva una regla (soft delete)
   */
  async deactivate(ruleId: string, userId?: string) {
    return this.prisma.fiscalRule.update({
      where: { id: ruleId },
      data: {
        active: false,
        version: { increment: 1 },
        updatedBy: userId,
      },
    });
  }

  /**
   * Obtiene el snapshot de reglas para auditoría
   * Usado para guardar en FiscalCalculationAudit.appliedRulesSnapshot
   */
  async getRulesSnapshot(companyId: string, ruleTypes: FiscalRuleType[], date: Date) {
    const rules = await this.prisma.fiscalRule.findMany({
      where: {
        companyId,
        ruleType: { in: ruleTypes as any[] },
        active: true,
        startDate: { lte: date },
        OR: [
          { endDate: null },
          { endDate: { gte: date } },
        ],
      },
      select: {
        id: true,
        ruleType: true,
        name: true,
        version: true,
        logicJson: true,
        startDate: true,
        endDate: true,
        legalLaw: true,
        legalArticle: true,
      },
    });

    return {
      capturedAt: new Date().toISOString(),
      ruleCount: rules.length,
      rules: rules.map(r => ({
        id: r.id,
        type: r.ruleType,
        name: r.name,
        version: r.version,
        vigencia: {
          desde: r.startDate.toISOString(),
          hasta: r.endDate?.toISOString() || null,
        },
        referenciaLegal: r.legalLaw ? `${r.legalLaw} Art. ${r.legalArticle}` : null,
        logicHash: this.hashLogic(r.logicJson),
      })),
    };
  }

  /**
   * Genera un hash de la lógica para verificación de integridad
   */
  private hashLogic(logic: any): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(logic))
      .digest('hex')
      .substring(0, 16);
  }
}
