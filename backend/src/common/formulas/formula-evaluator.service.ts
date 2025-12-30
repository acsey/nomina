import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { FiscalValuesService } from '@/common/fiscal/fiscal-values.service';

/**
 * Variables disponibles para fórmulas de cálculo de nómina
 */
export interface FormulaContext {
  // Salarios
  baseSalary: number;          // Salario base mensual
  dailySalary: number;         // Salario diario (baseSalary / 30)
  hourlyRate: number;          // Salario por hora (dailySalary / 8)
  integratedSalary: number;    // Salario diario integrado (SBC)

  // Días y tiempo
  workedDays: number;          // Días trabajados en el período
  periodDays: number;          // Días totales del período
  absenceDays: number;         // Días de ausencia
  overtimeHours: number;       // Horas extra trabajadas
  doubleOvertimeHours: number; // Horas extra dobles
  tripleOvertimeHours: number; // Horas extra triples

  // Antigüedad
  seniority: number;           // Años de antigüedad
  seniorityDays: number;       // Días de antigüedad
  vacationDays: number;        // Días de vacaciones según antigüedad

  // Valores fiscales (del año actual)
  umaDaily: number;            // UMA diaria
  umaMonthly: number;          // UMA mensual
  smgDaily: number;            // Salario mínimo diario

  // Percepciones acumuladas del período
  totalPerceptions: number;    // Total de percepciones
  taxableIncome: number;       // Base gravable

  // Deducciones acumuladas
  totalDeductions: number;     // Total de deducciones

  // Valores personalizados (configurables por empresa)
  custom1?: number;
  custom2?: number;
  custom3?: number;
  custom4?: number;
  custom5?: number;

  // Beneficios específicos
  savingsFundPercent?: number;
  foodVouchersPercent?: number;
  attendanceBonusAmount?: number;
  punctualityBonusAmount?: number;
}

/**
 * Resultado de evaluación de fórmula
 */
export interface FormulaResult {
  value: number;
  taxableAmount: number;
  exemptAmount: number;
  formula: string;
  variables: Record<string, number>;
}

/**
 * FormulaEvaluatorService - Evaluador seguro de fórmulas matemáticas
 *
 * Este servicio permite evaluar expresiones matemáticas de forma segura,
 * sin usar eval() o Function(), para calcular percepciones y deducciones
 * personalizadas.
 *
 * Operadores soportados:
 * - Aritméticos: +, -, *, /, %
 * - Comparación: >, <, >=, <=, ==, !=
 * - Lógicos: &&, ||, !
 * - Condicionales: condition ? trueValue : falseValue
 * - Funciones: min(), max(), round(), floor(), ceil(), abs()
 *
 * Ejemplos de fórmulas válidas:
 * - "baseSalary * 0.15"
 * - "workedDays * dailySalary"
 * - "overtimeHours * hourlyRate * 2"
 * - "min(baseSalary * 0.13, umaMonthly * 1.3)"
 * - "seniority > 1 ? baseSalary * 0.05 : 0"
 */
@Injectable()
export class FormulaEvaluatorService {
  // Operadores permitidos
  private readonly ALLOWED_OPERATORS = [
    '+', '-', '*', '/', '%',
    '>', '<', '>=', '<=', '==', '!=',
    '&&', '||', '!',
    '?', ':',
    '(', ')',
    ',', '.',
  ];

  // Funciones matemáticas permitidas
  private readonly ALLOWED_FUNCTIONS: Record<string, (...args: number[]) => number> = {
    min: (...args) => Math.min(...args),
    max: (...args) => Math.max(...args),
    round: (n, decimals = 2) => Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals),
    floor: (n) => Math.floor(n),
    ceil: (n) => Math.ceil(n),
    abs: (n) => Math.abs(n),
    pow: (base, exp) => Math.pow(base, exp),
    sqrt: (n) => Math.sqrt(n),
    // Funciones específicas de nómina
    proportional: (amount, worked, total) => (amount * worked) / total,
    dailyToMonthly: (daily) => daily * 30,
    monthlyToDaily: (monthly) => monthly / 30,
    hourlyToDaily: (hourly) => hourly * 8,
    dailyToHourly: (daily) => daily / 8,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalValues: FiscalValuesService,
  ) {}

  /**
   * Evalúa una fórmula con el contexto dado
   */
  evaluate(formula: string, context: FormulaContext): number {
    // Validar la fórmula
    this.validateFormula(formula);

    // Tokenizar la fórmula
    const tokens = this.tokenize(formula);

    // Reemplazar variables por valores
    const expression = this.replaceVariables(tokens, context);

    // Evaluar la expresión
    const result = this.evaluateExpression(expression);

    // Redondear a 2 decimales
    return Math.round(result * 100) / 100;
  }

  /**
   * Evalúa una fórmula y calcula partes gravables/exentas
   */
  evaluateWithTax(
    formula: string,
    context: FormulaContext,
    isTaxable: boolean,
    exemptLimit?: number,
    exemptLimitType?: string,
  ): FormulaResult {
    const value = this.evaluate(formula, context);

    let exemptAmount = 0;
    let taxableAmount = value;

    if (!isTaxable) {
      // Todo es exento
      exemptAmount = value;
      taxableAmount = 0;
    } else if (exemptLimit && exemptLimit > 0) {
      // Hay límite de exención
      let limit = exemptLimit;

      if (exemptLimitType === 'UMA') {
        limit = context.umaDaily * exemptLimit;
      } else if (exemptLimitType === 'SMG') {
        limit = context.smgDaily * exemptLimit;
      } else if (exemptLimitType === 'UMA_MONTHLY') {
        limit = context.umaMonthly * exemptLimit;
      }

      exemptAmount = Math.min(value, limit);
      taxableAmount = Math.max(0, value - exemptAmount);
    }

    return {
      value: Math.round(value * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      exemptAmount: Math.round(exemptAmount * 100) / 100,
      formula,
      variables: this.extractUsedVariables(formula, context),
    };
  }

  /**
   * Valida que una fórmula sea segura para evaluar
   */
  validateFormula(formula: string): { valid: boolean; error?: string } {
    if (!formula || typeof formula !== 'string') {
      return { valid: false, error: 'La fórmula es requerida' };
    }

    // Verificar longitud máxima
    if (formula.length > 1000) {
      return { valid: false, error: 'La fórmula es demasiado larga (máx 1000 caracteres)' };
    }

    // Verificar caracteres peligrosos
    const dangerousPatterns = [
      /\beval\b/i,
      /\bfunction\b/i,
      /\bnew\b/i,
      /\bthis\b/i,
      /\bwindow\b/i,
      /\bglobal\b/i,
      /\bprocess\b/i,
      /\brequire\b/i,
      /\bimport\b/i,
      /\bexport\b/i,
      /\bconstructor\b/i,
      /\bprototype\b/i,
      /\b__proto__\b/i,
      /`/,           // Template literals
      /\$\{/,        // Template expressions
      /\[.*\]/,      // Bracket notation (puede usarse para acceso malicioso)
      /;/,           // Multiple statements
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        return { valid: false, error: `Patrón no permitido en la fórmula: ${pattern}` };
      }
    }

    // Verificar paréntesis balanceados
    let depth = 0;
    for (const char of formula) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth < 0) {
        return { valid: false, error: 'Paréntesis no balanceados' };
      }
    }
    if (depth !== 0) {
      return { valid: false, error: 'Paréntesis no balanceados' };
    }

    // Verificar operadores ternarios balanceados
    const questionMarks = (formula.match(/\?/g) || []).length;
    const colons = (formula.match(/:/g) || []).length;
    if (questionMarks !== colons) {
      return { valid: false, error: 'Operador ternario incompleto' };
    }

    return { valid: true };
  }

  /**
   * Obtiene la lista de variables disponibles
   */
  getAvailableVariables(): string[] {
    return [
      'baseSalary',
      'dailySalary',
      'hourlyRate',
      'integratedSalary',
      'workedDays',
      'periodDays',
      'absenceDays',
      'overtimeHours',
      'doubleOvertimeHours',
      'tripleOvertimeHours',
      'seniority',
      'seniorityDays',
      'vacationDays',
      'umaDaily',
      'umaMonthly',
      'smgDaily',
      'totalPerceptions',
      'taxableIncome',
      'totalDeductions',
      'custom1',
      'custom2',
      'custom3',
      'custom4',
      'custom5',
      'savingsFundPercent',
      'foodVouchersPercent',
      'attendanceBonusAmount',
      'punctualityBonusAmount',
    ];
  }

  /**
   * Obtiene la lista de funciones disponibles
   */
  getAvailableFunctions(): string[] {
    return Object.keys(this.ALLOWED_FUNCTIONS);
  }

  /**
   * Crea un contexto de fórmula a partir de datos del empleado y período
   */
  async createContext(
    employee: any,
    period: any,
    additionalData: Partial<FormulaContext> = {},
  ): Promise<FormulaContext> {
    const year = period.year || new Date().getFullYear();
    const fiscalData = await this.fiscalValues.getValuesForYear(year);

    const baseSalary = Number(employee.baseSalary);
    const dailySalary = baseSalary / 30;
    const hourlyRate = dailySalary / 8;

    // Calcular antigüedad
    const hireDate = new Date(employee.hireDate);
    const now = new Date();
    const seniorityMs = now.getTime() - hireDate.getTime();
    const seniority = Math.floor(seniorityMs / (365.25 * 24 * 60 * 60 * 1000));
    const seniorityDays = Math.floor(seniorityMs / (24 * 60 * 60 * 1000));

    // Días de vacaciones según antigüedad (LFT)
    const vacationDays = this.getVacationDaysByYears(seniority);

    // Factor de integración
    const factorIntegracion = 1 + (fiscalData.aguinaldoDays / 365) + (vacationDays * fiscalData.vacationPremiumPercent / 365);
    const integratedSalary = dailySalary * factorIntegracion;

    // Días del período
    const periodDays = this.getPeriodDays(period.periodType);

    return {
      baseSalary,
      dailySalary: Math.round(dailySalary * 100) / 100,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      integratedSalary: Math.round(integratedSalary * 100) / 100,
      workedDays: additionalData.workedDays ?? periodDays,
      periodDays,
      absenceDays: additionalData.absenceDays ?? 0,
      overtimeHours: additionalData.overtimeHours ?? 0,
      doubleOvertimeHours: additionalData.doubleOvertimeHours ?? 0,
      tripleOvertimeHours: additionalData.tripleOvertimeHours ?? 0,
      seniority,
      seniorityDays,
      vacationDays,
      umaDaily: fiscalData.umaDaily,
      umaMonthly: fiscalData.umaMonthly,
      smgDaily: fiscalData.smgDaily,
      totalPerceptions: additionalData.totalPerceptions ?? 0,
      taxableIncome: additionalData.taxableIncome ?? 0,
      totalDeductions: additionalData.totalDeductions ?? 0,
      custom1: additionalData.custom1,
      custom2: additionalData.custom2,
      custom3: additionalData.custom3,
      custom4: additionalData.custom4,
      custom5: additionalData.custom5,
      savingsFundPercent: additionalData.savingsFundPercent,
      foodVouchersPercent: additionalData.foodVouchersPercent,
      attendanceBonusAmount: additionalData.attendanceBonusAmount,
      punctualityBonusAmount: additionalData.punctualityBonusAmount,
    };
  }

  /**
   * Prueba una fórmula con valores de ejemplo
   */
  testFormula(
    formula: string,
    testContext?: Partial<FormulaContext>,
  ): { success: boolean; result?: number; error?: string; context: FormulaContext } {
    // Crear contexto de prueba
    const context: FormulaContext = {
      baseSalary: testContext?.baseSalary ?? 15000,
      dailySalary: testContext?.dailySalary ?? 500,
      hourlyRate: testContext?.hourlyRate ?? 62.5,
      integratedSalary: testContext?.integratedSalary ?? 520,
      workedDays: testContext?.workedDays ?? 15,
      periodDays: testContext?.periodDays ?? 15,
      absenceDays: testContext?.absenceDays ?? 0,
      overtimeHours: testContext?.overtimeHours ?? 0,
      doubleOvertimeHours: testContext?.doubleOvertimeHours ?? 0,
      tripleOvertimeHours: testContext?.tripleOvertimeHours ?? 0,
      seniority: testContext?.seniority ?? 2,
      seniorityDays: testContext?.seniorityDays ?? 730,
      vacationDays: testContext?.vacationDays ?? 14,
      umaDaily: testContext?.umaDaily ?? 113.14,
      umaMonthly: testContext?.umaMonthly ?? 3439.46,
      smgDaily: testContext?.smgDaily ?? 278.80,
      totalPerceptions: testContext?.totalPerceptions ?? 7500,
      taxableIncome: testContext?.taxableIncome ?? 7000,
      totalDeductions: testContext?.totalDeductions ?? 1500,
      custom1: testContext?.custom1,
      custom2: testContext?.custom2,
      custom3: testContext?.custom3,
      custom4: testContext?.custom4,
      custom5: testContext?.custom5,
    };

    const validation = this.validateFormula(formula);
    if (!validation.valid) {
      return { success: false, error: validation.error, context };
    }

    try {
      const result = this.evaluate(formula, context);
      return { success: true, result, context };
    } catch (error: any) {
      return { success: false, error: error.message, context };
    }
  }

  // ============================================
  // Métodos privados de parsing y evaluación
  // ============================================

  private tokenize(formula: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let i = 0;

    while (i < formula.length) {
      const char = formula[i];

      // Espacios en blanco
      if (/\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        i++;
        continue;
      }

      // Números (incluyendo decimales)
      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(formula[i + 1]))) {
        if (current && !/[0-9.]/.test(current)) {
          tokens.push(current);
          current = '';
        }
        current += char;
        i++;
        continue;
      }

      // Operadores de dos caracteres
      const twoChar = formula.slice(i, i + 2);
      if (['>=', '<=', '==', '!=', '&&', '||'].includes(twoChar)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(twoChar);
        i += 2;
        continue;
      }

      // Operadores de un carácter
      if (['+', '-', '*', '/', '%', '>', '<', '!', '?', ':', '(', ')', ','].includes(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(char);
        i++;
        continue;
      }

      // Identificadores (variables y funciones)
      if (/[a-zA-Z_]/.test(char)) {
        if (current && /[0-9]/.test(current[0])) {
          tokens.push(current);
          current = '';
        }
        current += char;
        i++;
        continue;
      }

      current += char;
      i++;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  private replaceVariables(tokens: string[], context: FormulaContext): string[] {
    return tokens.map(token => {
      // Es un número?
      if (/^[0-9.]+$/.test(token)) {
        return token;
      }

      // Es un operador?
      if (this.ALLOWED_OPERATORS.some(op => op === token)) {
        return token;
      }

      // Es una función permitida?
      if (token in this.ALLOWED_FUNCTIONS) {
        return `__fn_${token}`;
      }

      // Es una variable del contexto?
      if (token in context) {
        const value = context[token as keyof FormulaContext];
        if (value === undefined || value === null) {
          return '0';
        }
        return String(value);
      }

      throw new BadRequestException(`Variable no reconocida: ${token}`);
    });
  }

  private evaluateExpression(tokens: string[]): number {
    // Convertir a string para parsear con el evaluador recursivo
    const expression = tokens.join(' ');
    return this.parseExpression(expression);
  }

  private parseExpression(expr: string): number {
    expr = expr.trim();

    // Manejar operador ternario
    const ternaryMatch = this.findTernaryOperator(expr);
    if (ternaryMatch) {
      const condition = this.parseExpression(ternaryMatch.condition);
      if (condition) {
        return this.parseExpression(ternaryMatch.trueValue);
      } else {
        return this.parseExpression(ternaryMatch.falseValue);
      }
    }

    // Manejar OR lógico
    const orParts = this.splitByOperator(expr, '||');
    if (orParts.length > 1) {
      for (const part of orParts) {
        if (this.parseExpression(part)) {
          return 1;
        }
      }
      return 0;
    }

    // Manejar AND lógico
    const andParts = this.splitByOperator(expr, '&&');
    if (andParts.length > 1) {
      for (const part of andParts) {
        if (!this.parseExpression(part)) {
          return 0;
        }
      }
      return 1;
    }

    // Manejar comparaciones
    const compOps = ['>=', '<=', '!=', '==', '>', '<'];
    for (const op of compOps) {
      const compParts = this.splitByOperator(expr, op);
      if (compParts.length === 2) {
        const left = this.parseExpression(compParts[0]);
        const right = this.parseExpression(compParts[1]);
        switch (op) {
          case '>=': return left >= right ? 1 : 0;
          case '<=': return left <= right ? 1 : 0;
          case '!=': return left !== right ? 1 : 0;
          case '==': return left === right ? 1 : 0;
          case '>': return left > right ? 1 : 0;
          case '<': return left < right ? 1 : 0;
        }
      }
    }

    // Manejar suma y resta
    const addParts = this.splitByOperatorKeepSign(expr, ['+', '-']);
    if (addParts.length > 1) {
      return addParts.reduce((sum, part) => sum + this.parseExpression(part), 0);
    }

    // Manejar multiplicación, división y módulo
    const mulParts = this.splitByOperator(expr, '*');
    if (mulParts.length > 1) {
      return mulParts.reduce((prod, part) => prod * this.parseExpression(part), 1);
    }

    const divParts = this.splitByOperator(expr, '/');
    if (divParts.length > 1) {
      const values = divParts.map(p => this.parseExpression(p));
      return values.reduce((a, b) => a / b);
    }

    const modParts = this.splitByOperator(expr, '%');
    if (modParts.length > 1) {
      const values = modParts.map(p => this.parseExpression(p));
      return values.reduce((a, b) => a % b);
    }

    // Manejar negación
    if (expr.startsWith('!')) {
      return this.parseExpression(expr.slice(1)) ? 0 : 1;
    }

    // Manejar paréntesis
    if (expr.startsWith('(') && expr.endsWith(')')) {
      return this.parseExpression(expr.slice(1, -1));
    }

    // Manejar funciones
    const fnMatch = expr.match(/^__fn_(\w+)\s*\((.*)\)$/);
    if (fnMatch) {
      const fnName = fnMatch[1];
      const argsStr = fnMatch[2];
      const args = this.parseArguments(argsStr);
      const fn = this.ALLOWED_FUNCTIONS[fnName];
      if (fn) {
        return fn(...args);
      }
    }

    // Es un número
    const num = parseFloat(expr);
    if (!isNaN(num)) {
      return num;
    }

    throw new BadRequestException(`Expresión no válida: ${expr}`);
  }

  private findTernaryOperator(expr: string): { condition: string; trueValue: string; falseValue: string } | null {
    let depth = 0;
    let questionPos = -1;
    let colonPos = -1;

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth === 0 && char === '?' && questionPos === -1) {
        questionPos = i;
      }
      if (depth === 0 && char === ':' && questionPos !== -1) {
        colonPos = i;
        break;
      }
    }

    if (questionPos !== -1 && colonPos !== -1) {
      return {
        condition: expr.slice(0, questionPos),
        trueValue: expr.slice(questionPos + 1, colonPos),
        falseValue: expr.slice(colonPos + 1),
      };
    }

    return null;
  }

  private splitByOperator(expr: string, operator: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if (char === '(') depth++;
      if (char === ')') depth--;

      if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
        parts.push(current.trim());
        current = '';
        i += operator.length - 1;
      } else {
        current += char;
      }
    }

    parts.push(current.trim());
    return parts.filter(p => p.length > 0);
  }

  private splitByOperatorKeepSign(expr: string, operators: string[]): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if (char === '(') depth++;
      if (char === ')') depth--;

      if (depth === 0 && operators.includes(char) && current.trim().length > 0) {
        parts.push(current.trim());
        current = char;
      } else {
        current += char;
      }
    }

    if (current.trim().length > 0) {
      parts.push(current.trim());
    }

    return parts;
  }

  private parseArguments(argsStr: string): number[] {
    const args: number[] = [];
    let depth = 0;
    let current = '';

    for (const char of argsStr) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth === 0 && char === ',') {
        args.push(this.parseExpression(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim().length > 0) {
      args.push(this.parseExpression(current.trim()));
    }

    return args;
  }

  private extractUsedVariables(formula: string, context: FormulaContext): Record<string, number> {
    const used: Record<string, number> = {};
    const variables = this.getAvailableVariables();

    for (const variable of variables) {
      if (formula.includes(variable) && variable in context) {
        const value = context[variable as keyof FormulaContext];
        if (typeof value === 'number') {
          used[variable] = value;
        }
      }
    }

    return used;
  }

  private getVacationDaysByYears(years: number): number {
    const table = [
      { years: 1, days: 12 },
      { years: 2, days: 14 },
      { years: 3, days: 16 },
      { years: 4, days: 18 },
      { years: 5, days: 20 },
      { years: 6, days: 22 },
      { years: 10, days: 24 },
      { years: 15, days: 26 },
      { years: 20, days: 28 },
      { years: 25, days: 30 },
      { years: 30, days: 32 },
    ];

    if (years < 1) return 12;
    for (let i = table.length - 1; i >= 0; i--) {
      if (years >= table[i].years) {
        return table[i].days;
      }
    }
    return 12;
  }

  private getPeriodDays(periodType: string): number {
    switch (periodType) {
      case 'WEEKLY': return 7;
      case 'BIWEEKLY': return 15;
      case 'MONTHLY': return 30;
      default: return 15;
    }
  }
}
