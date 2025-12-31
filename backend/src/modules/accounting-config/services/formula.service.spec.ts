import { Test, TestingModule } from '@nestjs/testing';
import { FormulaService } from './formula.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';
import { FormulaEvaluatorService } from '@/common/formulas/formula-evaluator.service';
import { ConflictException } from '@nestjs/common';

describe('FormulaService', () => {
  let service: FormulaService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    company: {
      findUnique: jest.fn(),
    },
    companyCalculationFormula: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrismaService)),
  };

  const mockAuditService = {
    logCriticalAction: jest.fn(),
  };

  const mockFormulaEvaluator = {
    validateFormula: jest.fn().mockReturnValue({ valid: true }),
    testFormula: jest.fn().mockReturnValue({ success: true, result: 100 }),
    getAvailableVariables: jest.fn().mockReturnValue(['baseSalary', 'workedDays']),
    getAvailableFunctions: jest.fn().mockReturnValue(['min', 'max', 'round']),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormulaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: FormulaEvaluatorService, useValue: mockFormulaEvaluator },
      ],
    }).compile();

    service = module.get<FormulaService>(FormulaService);
    prismaService = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('validateNoOverlap', () => {
    it('debe detectar traslape de ejercicio fiscal', async () => {
      mockPrismaService.companyCalculationFormula.findMany.mockResolvedValue([
        {
          id: 'formula-1',
          fiscalYear: 2025,
          validFrom: null,
          validTo: null,
          isActive: true,
        },
      ]);

      const result = await service.validateNoOverlap(
        'company-1',
        'P_SUELDO',
        undefined, // validFrom
        undefined, // validTo
        2025, // fiscalYear
      );

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toContain('ejercicio fiscal 2025');
    });

    it('debe detectar traslape de fechas de vigencia', async () => {
      mockPrismaService.companyCalculationFormula.findMany.mockResolvedValue([
        {
          id: 'formula-1',
          fiscalYear: null,
          validFrom: new Date('2025-01-01'),
          validTo: new Date('2025-06-30'),
          isActive: true,
        },
      ]);

      const result = await service.validateNoOverlap(
        'company-1',
        'P_SUELDO',
        new Date('2025-03-01'), // Se traslapa con la existente
        new Date('2025-12-31'),
        undefined,
      );

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toContain('fechas de vigencia');
    });

    it('debe permitir fórmulas sin traslape', async () => {
      mockPrismaService.companyCalculationFormula.findMany.mockResolvedValue([
        {
          id: 'formula-1',
          fiscalYear: 2024, // Año diferente
          validFrom: null,
          validTo: null,
          isActive: true,
        },
      ]);

      const result = await service.validateNoOverlap(
        'company-1',
        'P_SUELDO',
        undefined,
        undefined,
        2025, // Año diferente al existente
      );

      expect(result.valid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('debe excluir la fórmula actual al validar actualización', async () => {
      mockPrismaService.companyCalculationFormula.findMany.mockResolvedValue([]);

      const result = await service.validateNoOverlap(
        'company-1',
        'P_SUELDO',
        undefined,
        undefined,
        2025,
        'formula-1', // Excluir esta fórmula
      );

      expect(result.valid).toBe(true);
      expect(mockPrismaService.companyCalculationFormula.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'formula-1' },
          }),
        })
      );
    });
  });

  describe('resolveFormulaForDate', () => {
    it('debe resolver fórmula por ejercicio fiscal', async () => {
      const formula = {
        id: 'formula-1',
        conceptCode: 'P_SUELDO',
        fiscalYear: 2025,
        version: 2,
        isActive: true,
      };

      mockPrismaService.companyCalculationFormula.findFirst.mockResolvedValue(formula);

      const result = await service.resolveFormulaForDate(
        'company-1',
        'P_SUELDO',
        new Date('2025-06-15'),
      );

      expect(result).not.toBeNull();
      expect(result?.fiscalYear).toBe(2025);
      expect(result?.version).toBe(2);
    });

    it('debe resolver fórmula por rango de fechas si no hay ejercicio fiscal', async () => {
      // Primer llamado por fiscalYear retorna null
      mockPrismaService.companyCalculationFormula.findFirst.mockResolvedValueOnce(null);

      // Segundo llamado para buscar por fechas
      mockPrismaService.companyCalculationFormula.findMany.mockResolvedValueOnce([
        {
          id: 'formula-2',
          conceptCode: 'P_SUELDO',
          fiscalYear: null,
          validFrom: new Date('2025-01-01'),
          validTo: new Date('2025-12-31'),
          version: 1,
          isActive: true,
        },
      ]);

      const result = await service.resolveFormulaForDate(
        'company-1',
        'P_SUELDO',
        new Date('2025-06-15'),
      );

      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);
    });

    it('debe retornar null si no hay fórmula válida', async () => {
      mockPrismaService.companyCalculationFormula.findFirst.mockResolvedValue(null);
      mockPrismaService.companyCalculationFormula.findMany.mockResolvedValue([]);

      const result = await service.resolveFormulaForDate(
        'company-1',
        'P_INEXISTENTE',
        new Date('2025-06-15'),
      );

      expect(result).toBeNull();
    });
  });

  describe('createNewVersion', () => {
    it('debe crear nueva versión desactivando la anterior', async () => {
      const existingFormula = {
        id: 'formula-1',
        companyId: 'company-1',
        conceptCode: 'P_SUELDO',
        conceptType: 'PERCEPTION',
        name: 'Sueldo',
        formula: 'baseSalary * workedDays / 30',
        version: 1,
        isActive: true,
        availableVariables: [],
        fiscalYear: 2025,
        validFrom: null,
        validTo: null,
        isTaxable: true,
        isExempt: false,
        exemptLimit: null,
        exemptLimitType: null,
        satConceptKey: null,
      };

      const newFormula = {
        ...existingFormula,
        id: 'formula-2',
        version: 2,
        formula: 'baseSalary * workedDays / 30 * 1.1',
      };

      mockPrismaService.companyCalculationFormula.findUnique.mockResolvedValue(existingFormula);
      mockPrismaService.companyCalculationFormula.findMany.mockResolvedValue([]); // Sin traslapes
      mockPrismaService.companyCalculationFormula.update.mockResolvedValue({ ...existingFormula, isActive: false });
      mockPrismaService.companyCalculationFormula.create.mockResolvedValue(newFormula);

      const result = await service.createNewVersion(
        'formula-1',
        { formula: 'baseSalary * workedDays / 30 * 1.1' },
        'user-1',
      );

      expect(result.version).toBe(2);
      expect(mockPrismaService.companyCalculationFormula.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'formula-1' },
          data: { isActive: false },
        })
      );
    });

    it('debe lanzar ConflictException si hay traslape de vigencia', async () => {
      const existingFormula = {
        id: 'formula-1',
        companyId: 'company-1',
        conceptCode: 'P_SUELDO',
        conceptType: 'PERCEPTION',
        name: 'Sueldo',
        formula: 'baseSalary',
        version: 1,
        isActive: true,
        fiscalYear: null,
        validFrom: null,
        validTo: null,
      };

      const anotherFormula = {
        id: 'formula-3',
        fiscalYear: 2026, // Mismo año que se intenta asignar
        isActive: true,
      };

      mockPrismaService.companyCalculationFormula.findUnique.mockResolvedValue(existingFormula);
      mockPrismaService.companyCalculationFormula.findMany.mockResolvedValue([anotherFormula]);

      await expect(
        service.createNewVersion('formula-1', { fiscalYear: 2026 }, 'user-1')
      ).rejects.toThrow(ConflictException);
    });
  });
});
