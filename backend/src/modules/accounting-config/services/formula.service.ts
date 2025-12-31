import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';
import { FormulaEvaluatorService, FormulaContext } from '@/common/formulas/formula-evaluator.service';

/**
 * DTO para crear una fórmula de cálculo
 * MEJORA: Incluye campos de versionado fiscal
 */
export interface CreateFormulaDto {
  conceptCode: string;
  conceptType: 'PERCEPTION' | 'DEDUCTION';
  name: string;
  description?: string;
  formula: string;
  isTaxable?: boolean;
  isExempt?: boolean;
  exemptLimit?: number;
  exemptLimitType?: 'UMA' | 'SMG' | 'UMA_MONTHLY' | 'FIXED';
  satConceptKey?: string;
  // MEJORA: Versionado fiscal
  fiscalYear?: number;
  validFrom?: Date;
  validTo?: Date;
}

/**
 * DTO para actualizar una fórmula
 */
export interface UpdateFormulaDto {
  name?: string;
  description?: string;
  formula?: string;
  isTaxable?: boolean;
  isExempt?: boolean;
  exemptLimit?: number;
  exemptLimitType?: string;
  satConceptKey?: string;
  isActive?: boolean;
  // MEJORA: Versionado fiscal
  fiscalYear?: number;
  validFrom?: Date;
  validTo?: Date;
}

/**
 * Resultado de resolución de fórmula con metadata
 */
export interface FormulaResolutionResult {
  formula: any;
  version: number;
  resolvedAt: Date;
  fiscalYear?: number;
}

/**
 * FormulaService - Gestión de fórmulas de cálculo por empresa
 *
 * Este servicio permite a las empresas definir fórmulas personalizadas
 * para calcular percepciones y deducciones específicas.
 */
@Injectable()
export class FormulaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly formulaEvaluator: FormulaEvaluatorService,
  ) {}

  // ============================================
  // CRUD DE FÓRMULAS
  // ============================================

  /**
   * Lista todas las fórmulas de una empresa
   */
  async getCompanyFormulas(companyId: string, type?: 'PERCEPTION' | 'DEDUCTION') {
    return this.prisma.companyCalculationFormula.findMany({
      where: {
        companyId,
        ...(type && { conceptType: type }),
      },
      orderBy: [{ conceptType: 'asc' }, { conceptCode: 'asc' }],
    });
  }

  /**
   * Obtiene una fórmula por ID
   */
  async getFormulaById(id: string) {
    const formula = await this.prisma.companyCalculationFormula.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    if (!formula) {
      throw new NotFoundException(`Fórmula ${id} no encontrada`);
    }

    return formula;
  }

  /**
   * Obtiene una fórmula por código de concepto
   */
  async getFormulaByCode(companyId: string, conceptCode: string) {
    return this.prisma.companyCalculationFormula.findUnique({
      where: {
        companyId_conceptCode: { companyId, conceptCode },
      },
    });
  }

  /**
   * Crea una nueva fórmula de cálculo
   */
  async createFormula(companyId: string, dto: CreateFormulaDto, userId: string) {
    // Verificar que la empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Empresa ${companyId} no encontrada`);
    }

    // Verificar que no existe ya una fórmula para este código
    const existing = await this.prisma.companyCalculationFormula.findUnique({
      where: {
        companyId_conceptCode: { companyId, conceptCode: dto.conceptCode },
      },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una fórmula para el concepto ${dto.conceptCode}`);
    }

    // Validar la fórmula
    const validation = this.formulaEvaluator.validateFormula(dto.formula);
    if (!validation.valid) {
      throw new BadRequestException(`Fórmula inválida: ${validation.error}`);
    }

    // Probar la fórmula
    const test = this.formulaEvaluator.testFormula(dto.formula);
    if (!test.success) {
      throw new BadRequestException(`Error al evaluar fórmula: ${test.error}`);
    }

    const formula = await this.prisma.companyCalculationFormula.create({
      data: {
        companyId,
        conceptCode: dto.conceptCode,
        conceptType: dto.conceptType,
        name: dto.name,
        description: dto.description,
        formula: dto.formula,
        availableVariables: this.formulaEvaluator.getAvailableVariables(),
        isTaxable: dto.isTaxable ?? true,
        isExempt: dto.isExempt ?? false,
        exemptLimit: dto.exemptLimit,
        exemptLimitType: dto.exemptLimitType,
        satConceptKey: dto.satConceptKey,
        isActive: true,
      },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'CREATE',
      entity: 'CompanyCalculationFormula',
      entityId: formula.id,
      newValues: { ...dto },
      details: { description: `Creación de fórmula ${dto.conceptCode}: ${dto.name}` },
    });

    return formula;
  }

  /**
   * Actualiza una fórmula existente
   */
  async updateFormula(id: string, dto: UpdateFormulaDto, userId: string) {
    const existing = await this.getFormulaById(id);

    // Si se actualiza la fórmula, validarla
    if (dto.formula) {
      const validation = this.formulaEvaluator.validateFormula(dto.formula);
      if (!validation.valid) {
        throw new BadRequestException(`Fórmula inválida: ${validation.error}`);
      }

      const test = this.formulaEvaluator.testFormula(dto.formula);
      if (!test.success) {
        throw new BadRequestException(`Error al evaluar fórmula: ${test.error}`);
      }
    }

    const formula = await this.prisma.companyCalculationFormula.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.formula !== undefined && { formula: dto.formula }),
        ...(dto.isTaxable !== undefined && { isTaxable: dto.isTaxable }),
        ...(dto.isExempt !== undefined && { isExempt: dto.isExempt }),
        ...(dto.exemptLimit !== undefined && { exemptLimit: dto.exemptLimit }),
        ...(dto.exemptLimitType !== undefined && { exemptLimitType: dto.exemptLimitType }),
        ...(dto.satConceptKey !== undefined && { satConceptKey: dto.satConceptKey }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'UPDATE',
      entity: 'CompanyCalculationFormula',
      entityId: id,
      oldValues: existing,
      newValues: { ...dto },
      details: { description: `Actualización de fórmula ${existing.conceptCode}` },
    });

    return formula;
  }

  /**
   * Elimina una fórmula
   */
  async deleteFormula(id: string, userId: string) {
    const existing = await this.getFormulaById(id);

    await this.prisma.companyCalculationFormula.delete({
      where: { id },
    });

    await this.audit.logCriticalAction({
      userId,
      action: 'DELETE',
      entity: 'CompanyCalculationFormula',
      entityId: id,
      oldValues: existing,
      details: { description: `Eliminación de fórmula ${existing.conceptCode}` },
    });

    return { message: 'Fórmula eliminada correctamente' };
  }

  // ============================================
  // EVALUACIÓN DE FÓRMULAS
  // ============================================

  /**
   * Evalúa una fórmula para un empleado específico
   */
  async evaluateForEmployee(
    formulaId: string,
    employee: any,
    period: any,
    additionalContext?: Partial<FormulaContext>,
  ) {
    const formula = await this.getFormulaById(formulaId);

    if (!formula.isActive) {
      throw new BadRequestException('La fórmula no está activa');
    }

    const context = await this.formulaEvaluator.createContext(employee, period, additionalContext);

    return this.formulaEvaluator.evaluateWithTax(
      formula.formula,
      context,
      formula.isTaxable,
      formula.exemptLimit ? Number(formula.exemptLimit) : undefined,
      formula.exemptLimitType || undefined,
    );
  }

  /**
   * Evalúa una fórmula con contexto proporcionado directamente
   */
  async evaluateWithContext(formulaId: string, context: FormulaContext) {
    const formula = await this.getFormulaById(formulaId);

    if (!formula.isActive) {
      throw new BadRequestException('La fórmula no está activa');
    }

    return this.formulaEvaluator.evaluateWithTax(
      formula.formula,
      context,
      formula.isTaxable,
      formula.exemptLimit ? Number(formula.exemptLimit) : undefined,
      formula.exemptLimitType || undefined,
    );
  }

  /**
   * Evalúa todas las fórmulas activas de una empresa para un empleado
   */
  async evaluateAllForEmployee(
    companyId: string,
    employee: any,
    period: any,
    type?: 'PERCEPTION' | 'DEDUCTION',
  ) {
    const formulas = await this.prisma.companyCalculationFormula.findMany({
      where: {
        companyId,
        isActive: true,
        ...(type && { conceptType: type }),
      },
    });

    const context = await this.formulaEvaluator.createContext(employee, period);
    const results: Array<{
      formulaId: string;
      conceptCode: string;
      conceptType: string;
      name: string;
      result: {
        value: number;
        taxableAmount: number;
        exemptAmount: number;
      };
    }> = [];

    for (const formula of formulas) {
      try {
        const result = this.formulaEvaluator.evaluateWithTax(
          formula.formula,
          context,
          formula.isTaxable,
          formula.exemptLimit ? Number(formula.exemptLimit) : undefined,
          formula.exemptLimitType || undefined,
        );

        results.push({
          formulaId: formula.id,
          conceptCode: formula.conceptCode,
          conceptType: formula.conceptType,
          name: formula.name,
          result: {
            value: result.value,
            taxableAmount: result.taxableAmount,
            exemptAmount: result.exemptAmount,
          },
        });
      } catch (error: any) {
        // Log error pero continúa con las demás fórmulas
        console.error(`Error evaluando fórmula ${formula.conceptCode}: ${error.message}`);
      }
    }

    return results;
  }

  // ============================================
  // VALIDACIÓN Y PRUEBAS
  // ============================================

  /**
   * Valida una fórmula sin guardarla
   */
  validateFormula(formula: string) {
    return this.formulaEvaluator.validateFormula(formula);
  }

  /**
   * Prueba una fórmula con valores de ejemplo
   */
  testFormula(formula: string, testContext?: Partial<FormulaContext>) {
    return this.formulaEvaluator.testFormula(formula, testContext);
  }

  /**
   * Obtiene las variables disponibles para fórmulas
   */
  getAvailableVariables() {
    return {
      variables: this.formulaEvaluator.getAvailableVariables(),
      functions: this.formulaEvaluator.getAvailableFunctions(),
      examples: [
        { formula: 'baseSalary * 0.15', description: '15% del salario base' },
        { formula: 'workedDays * dailySalary', description: 'Salario proporcional a días trabajados' },
        { formula: 'overtimeHours * hourlyRate * 2', description: 'Horas extra dobles' },
        { formula: 'min(baseSalary * 0.13, umaMonthly * 1.3)', description: 'Fondo de ahorro con límite' },
        { formula: 'seniority > 1 ? baseSalary * 0.05 : 0', description: 'Bono de antigüedad condicional' },
        { formula: 'round(taxableIncome * 0.025, 2)', description: 'ISN al 2.5% redondeado' },
        { formula: 'proportional(baseSalary, workedDays, 30)', description: 'Salario proporcional' },
      ],
    };
  }

  // ============================================
  // PLANTILLAS DE FÓRMULAS
  // ============================================

  /**
   * Obtiene plantillas de fórmulas comunes
   */
  getFormulaTemplates() {
    return {
      perceptions: [
        {
          code: 'P_SUELDO',
          name: 'Sueldo base',
          formula: 'dailySalary * workedDays',
          isTaxable: true,
          description: 'Sueldo proporcional a días trabajados',
        },
        {
          code: 'P_HORAS_EXTRA_DOBLES',
          name: 'Horas extra dobles',
          formula: 'overtimeHours * hourlyRate * 2',
          isTaxable: true,
          exemptLimit: 5, // UMAs
          exemptLimitType: 'UMA',
          description: 'Horas extra al doble (primeras 9 semanales exentas)',
        },
        {
          code: 'P_HORAS_EXTRA_TRIPLES',
          name: 'Horas extra triples',
          formula: 'tripleOvertimeHours * hourlyRate * 3',
          isTaxable: true,
          description: 'Horas extra al triple',
        },
        {
          code: 'P_AGUINALDO',
          name: 'Aguinaldo',
          formula: 'dailySalary * 15',
          isTaxable: true,
          exemptLimit: 30, // UMAs
          exemptLimitType: 'UMA',
          description: 'Aguinaldo (15 días mínimo por ley)',
        },
        {
          code: 'P_PRIMA_VACACIONAL',
          name: 'Prima vacacional',
          formula: 'dailySalary * vacationDays * 0.25',
          isTaxable: true,
          exemptLimit: 15, // UMAs
          exemptLimitType: 'UMA',
          description: 'Prima vacacional (25% sobre vacaciones)',
        },
        {
          code: 'P_VALES_DESPENSA',
          name: 'Vales de despensa',
          formula: 'baseSalary * 0.10',
          isTaxable: true,
          exemptLimit: 0.4, // 40% UMA mensual
          exemptLimitType: 'UMA_MONTHLY',
          description: 'Vales de despensa (exento hasta 40% UMA)',
        },
        {
          code: 'P_FONDO_AHORRO',
          name: 'Fondo de ahorro empresa',
          formula: 'min(baseSalary * 0.13, umaMonthly * 1.3)',
          isTaxable: false,
          description: 'Aportación empresa al fondo de ahorro (exento)',
        },
        {
          code: 'P_BONO_ANTIGUEDAD',
          name: 'Bono de antigüedad',
          formula: 'seniority >= 1 ? seniority * dailySalary : 0',
          isTaxable: true,
          description: 'Un día de salario por año de antigüedad',
        },
        {
          code: 'P_BONO_PUNTUALIDAD',
          name: 'Bono de puntualidad',
          formula: 'absenceDays == 0 ? baseSalary * 0.05 : 0',
          isTaxable: true,
          description: '5% si no tiene faltas',
        },
        {
          code: 'P_BONO_ASISTENCIA',
          name: 'Bono de asistencia',
          formula: 'absenceDays == 0 ? baseSalary * 0.03 : 0',
          isTaxable: true,
          description: '3% si no tiene faltas',
        },
      ],
      deductions: [
        {
          code: 'D_FONDO_AHORRO_EMP',
          name: 'Fondo de ahorro empleado',
          formula: 'min(baseSalary * 0.13, umaMonthly * 1.3)',
          isTaxable: false,
          description: 'Aportación empleado al fondo de ahorro',
        },
        {
          code: 'D_CAJA_AHORRO',
          name: 'Caja de ahorro',
          formula: 'baseSalary * (custom1 / 100)',
          isTaxable: false,
          description: 'Porcentaje personalizado (usar custom1)',
        },
        {
          code: 'D_PRESTAMO',
          name: 'Descuento por préstamo',
          formula: 'custom2',
          isTaxable: false,
          description: 'Monto fijo de préstamo (usar custom2)',
        },
        {
          code: 'D_COMEDOR',
          name: 'Servicio de comedor',
          formula: 'workedDays * 50',
          isTaxable: false,
          description: '$50 por día trabajado',
        },
      ],
    };
  }

  /**
   * Crea fórmulas a partir de una plantilla
   */
  async createFromTemplate(
    companyId: string,
    templateCode: string,
    userId: string,
    customizations?: Partial<CreateFormulaDto>,
  ) {
    const templates = this.getFormulaTemplates();
    const allTemplates = [...templates.perceptions, ...templates.deductions];
    const template = allTemplates.find(t => t.code === templateCode);

    if (!template) {
      throw new NotFoundException(`Plantilla ${templateCode} no encontrada`);
    }

    const conceptType = templates.perceptions.find(t => t.code === templateCode)
      ? 'PERCEPTION'
      : 'DEDUCTION';

    return this.createFormula(
      companyId,
      {
        conceptCode: customizations?.conceptCode || template.code,
        conceptType: customizations?.conceptType || conceptType,
        name: customizations?.name || template.name,
        description: customizations?.description || template.description,
        formula: customizations?.formula || template.formula,
        isTaxable: customizations?.isTaxable ?? template.isTaxable,
        exemptLimit: customizations?.exemptLimit ?? (template as any).exemptLimit,
        exemptLimitType: customizations?.exemptLimitType ?? (template as any).exemptLimitType,
        satConceptKey: customizations?.satConceptKey,
      },
      userId,
    );
  }

  // ============================================
  // MEJORA: VERSIONADO FISCAL Y VALIDACIONES
  // ============================================

  /**
   * Valida que no haya traslape de vigencia con fórmulas existentes
   * Solo una fórmula puede estar activa por concepto/año fiscal
   */
  async validateNoOverlap(
    companyId: string,
    conceptCode: string,
    validFrom?: Date,
    validTo?: Date,
    fiscalYear?: number,
    excludeId?: string,
  ): Promise<{ valid: boolean; conflicts: any[] }> {
    const existingFormulas = await this.prisma.companyCalculationFormula.findMany({
      where: {
        companyId,
        conceptCode,
        isActive: true,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    const conflicts: any[] = [];

    for (const existing of existingFormulas) {
      // Si ambas tienen fiscalYear definido, verificar coincidencia
      if (fiscalYear && existing.fiscalYear) {
        if (fiscalYear === existing.fiscalYear) {
          conflicts.push({
            id: existing.id,
            reason: `Traslape de ejercicio fiscal ${fiscalYear}`,
            existing: {
              fiscalYear: existing.fiscalYear,
              validFrom: existing.validFrom,
              validTo: existing.validTo,
            },
          });
          continue;
        }
      }

      // Verificar traslape de fechas
      if (validFrom && existing.validFrom) {
        const newStart = validFrom.getTime();
        const newEnd = validTo?.getTime() ?? Infinity;
        const existingStart = existing.validFrom.getTime();
        const existingEnd = existing.validTo?.getTime() ?? Infinity;

        // Hay traslape si los rangos se superponen
        if (newStart <= existingEnd && newEnd >= existingStart) {
          conflicts.push({
            id: existing.id,
            reason: 'Traslape de fechas de vigencia',
            existing: {
              validFrom: existing.validFrom,
              validTo: existing.validTo,
            },
          });
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Resuelve la fórmula activa para una fecha específica
   * Útil para cálculos retroactivos o históricos
   */
  async resolveFormulaForDate(
    companyId: string,
    conceptCode: string,
    targetDate: Date,
  ): Promise<FormulaResolutionResult | null> {
    const targetTime = targetDate.getTime();
    const targetYear = targetDate.getFullYear();

    // Buscar por ejercicio fiscal primero
    let formula = await this.prisma.companyCalculationFormula.findFirst({
      where: {
        companyId,
        conceptCode,
        isActive: true,
        fiscalYear: targetYear,
      },
      orderBy: { version: 'desc' },
    });

    // Si no hay por ejercicio fiscal, buscar por rango de fechas
    if (!formula) {
      const candidates = await this.prisma.companyCalculationFormula.findMany({
        where: {
          companyId,
          conceptCode,
          isActive: true,
          fiscalYear: null, // Sin año fiscal específico
        },
      });

      // Filtrar por rango de fechas
      formula = candidates.find(f => {
        if (!f.validFrom) return true; // Sin fecha = siempre válida
        const start = f.validFrom.getTime();
        const end = f.validTo?.getTime() ?? Infinity;
        return targetTime >= start && targetTime <= end;
      }) || null;
    }

    // Fallback: cualquier fórmula activa
    if (!formula) {
      formula = await this.prisma.companyCalculationFormula.findFirst({
        where: {
          companyId,
          conceptCode,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!formula) return null;

    return {
      formula,
      version: formula.version,
      resolvedAt: new Date(),
      fiscalYear: formula.fiscalYear || undefined,
    };
  }

  /**
   * Crea una nueva versión de una fórmula existente
   * La versión anterior se desactiva automáticamente
   */
  async createNewVersion(
    formulaId: string,
    dto: UpdateFormulaDto,
    userId: string,
  ): Promise<any> {
    const existing = await this.getFormulaById(formulaId);

    // Validar nueva fórmula si se proporciona
    if (dto.formula) {
      const validation = this.formulaEvaluator.validateFormula(dto.formula);
      if (!validation.valid) {
        throw new BadRequestException(`Fórmula inválida: ${validation.error}`);
      }
    }

    // Validar traslape si cambian fechas
    if (dto.validFrom || dto.validTo || dto.fiscalYear) {
      const overlap = await this.validateNoOverlap(
        existing.companyId,
        existing.conceptCode,
        dto.validFrom,
        dto.validTo,
        dto.fiscalYear,
        formulaId,
      );
      if (!overlap.valid) {
        throw new ConflictException({
          message: 'Traslape de vigencia detectado',
          conflicts: overlap.conflicts,
        });
      }
    }

    // Usar transacción para atomicidad
    return this.prisma.$transaction(async (tx) => {
      // Desactivar versión anterior
      await tx.companyCalculationFormula.update({
        where: { id: formulaId },
        data: { isActive: false },
      });

      // Crear nueva versión
      const newFormula = await tx.companyCalculationFormula.create({
        data: {
          companyId: existing.companyId,
          conceptCode: existing.conceptCode,
          conceptType: existing.conceptType,
          name: dto.name ?? existing.name,
          description: dto.description ?? existing.description,
          formula: dto.formula ?? existing.formula,
          availableVariables: existing.availableVariables,
          fiscalYear: dto.fiscalYear ?? existing.fiscalYear,
          validFrom: dto.validFrom ?? existing.validFrom,
          validTo: dto.validTo ?? existing.validTo,
          version: existing.version + 1,
          isTaxable: dto.isTaxable ?? existing.isTaxable,
          isExempt: dto.isExempt ?? existing.isExempt,
          exemptLimit: dto.exemptLimit ?? existing.exemptLimit,
          exemptLimitType: dto.exemptLimitType ?? existing.exemptLimitType,
          satConceptKey: dto.satConceptKey ?? existing.satConceptKey,
          isActive: true,
        },
      });

      // Auditar
      await this.audit.logCriticalAction({
        userId,
        action: 'CREATE_VERSION',
        entity: 'CompanyCalculationFormula',
        entityId: newFormula.id,
        oldValues: { previousId: formulaId, previousVersion: existing.version },
        newValues: { newVersion: newFormula.version },
        details: {
          description: `Nueva versión ${newFormula.version} de fórmula ${existing.conceptCode}`,
        },
      });

      return newFormula;
    });
  }

  /**
   * Obtiene el historial de versiones de una fórmula
   */
  async getFormulaVersionHistory(companyId: string, conceptCode: string) {
    return this.prisma.companyCalculationFormula.findMany({
      where: {
        companyId,
        conceptCode,
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
