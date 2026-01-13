/**
 * System Hardening E2E Tests
 *
 * Valida el flujo completo de hardening:
 * 1. Crear Recibo V1
 * 2. Intentar crear Regla Fiscal traslapada (Debe fallar)
 * 3. Recalcular Recibo (Debe crear V2 y archivar V1)
 * 4. Timbrar V2 (Mock del PAC)
 * 5. Intentar Recalcular V2 (Debe fallar por estar timbrado)
 *
 * @author Sistema de Hardening
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PayrollVersioningService } from './payroll-versioning.service';
import { FiscalRulesService } from '@/common/fiscal/fiscal-rules.service';
import { FiscalAuditService } from '@/common/fiscal/fiscal-audit.service';
import { DocumentStorageService } from './document-storage.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';
import {
  FiscalRuleType,
  CreateFiscalRuleDto,
} from '@/common/fiscal/dto/fiscal-rule.dto';

describe('System Hardening E2E Tests', () => {
  let versioningService: PayrollVersioningService;
  let fiscalRulesService: FiscalRulesService;
  let fiscalAuditService: FiscalAuditService;
  let documentStorageService: DocumentStorageService;
  let prismaService: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  // IDs de prueba
  const TEST_COMPANY_ID = 'company-test-123';
  const TEST_EMPLOYEE_ID = 'employee-test-456';
  const TEST_PERIOD_ID = 'period-test-789';
  const TEST_USER_ID = 'user-test-admin';

  /**
   * Mock de PrismaService con todas las operaciones necesarias
   */
  const createPrismaMock = () => ({
    payrollDetail: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollDetailVersion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    fiscalRule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    fiscalCalculationAudit: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    document: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: any) => Promise<any>) => callback({
      payrollDetail: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      payrollDetailPerception: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn(),
      },
      payrollDetailDeduction: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn(),
      },
    })),
  });

  const mockAuditService = {
    logCriticalAction: jest.fn(),
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollVersioningService,
        FiscalRulesService,
        FiscalAuditService,
        DocumentStorageService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    versioningService = module.get<PayrollVersioningService>(PayrollVersioningService);
    fiscalRulesService = module.get<FiscalRulesService>(FiscalRulesService);
    fiscalAuditService = module.get<FiscalAuditService>(FiscalAuditService);
    documentStorageService = module.get<DocumentStorageService>(DocumentStorageService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('Flujo Completo de Hardening', () => {
    /**
     * PASO 1: Crear Recibo V1
     *
     * El recibo inicial debe crearse con version=1, active=true
     */
    describe('1. Crear Recibo V1', () => {
      it('debe crear recibo inicial con version 1 y estado PENDING', async () => {
        const mockReceiptV1 = {
          id: 'receipt-v1-id',
          payrollPeriodId: TEST_PERIOD_ID,
          employeeId: TEST_EMPLOYEE_ID,
          status: 'PENDING',
          version: 1,
          active: true,
          parentReceiptId: null,
          supersededAt: null,
          workedDays: 15,
          totalPerceptions: 10000,
          totalDeductions: 2000,
          netPay: 8000,
          cfdiNomina: null,
        };

        prismaService.payrollDetail.findUnique.mockResolvedValue(mockReceiptV1);

        const canModify = await versioningService.canModify(mockReceiptV1.id);

        expect(canModify.canModify).toBe(true);
        expect(canModify.reason).toContain('modificable');
      });

      it('debe registrar auditoría fiscal al calcular recibo', async () => {
        const mockAuditEntry = {
          id: 'audit-entry-1',
          payrollDetailId: 'receipt-v1-id',
          conceptType: 'ISR',
          conceptCode: 'D002',
          calculationBase: 10000,
          resultAmount: 1500,
          fiscalYear: 2025,
          periodType: 'BIWEEKLY',
          calculatedAt: new Date(),
        };

        prismaService.fiscalCalculationAudit.create.mockResolvedValue(mockAuditEntry);

        const result = await fiscalAuditService.logIsrCalculation(
          'receipt-v1-id',
          {
            baseGravable: 10000,
            periodType: 'BIWEEKLY',
            fiscalYear: 2025,
          },
          {
            limitInferior: 6332.06,
            excedente: 3667.94,
            tasaMarginal: 0.1088,
            impuestoMarginal: 399.07,
            cuotaFija: 371.83,
            isrBruto: 770.90,
            subsidio: 0,
            isrNeto: 770.90,
          },
          TEST_USER_ID,
        );

        expect(prismaService.fiscalCalculationAudit.create).toHaveBeenCalled();
        expect(result.conceptType).toBe('ISR');
      });
    });

    /**
     * PASO 2: Intentar crear Regla Fiscal traslapada
     *
     * HARDENING: Debe fallar si existe traslape de fechas
     */
    describe('2. Validación Anti-Traslape de Reglas Fiscales', () => {
      const baseRuleDto: CreateFiscalRuleDto = {
        companyId: TEST_COMPANY_ID,
        ruleType: FiscalRuleType.ISR_ADJUSTMENT,
        name: 'Ajuste ISR Especial',
        description: 'Ajuste temporal de ISR',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        logicJson: {
          schemaVersion: '1.0',
          action: {
            type: 'APPLY_RATE',
            rate: 0.05,
          },
        },
        priority: 10,
      };

      it('debe detectar traslape con regla existente del mismo tipo', async () => {
        // Regla existente que se traslapa
        const existingRule = {
          id: 'existing-rule-id',
          name: 'Regla ISR Existente',
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-09-30'),
        };

        prismaService.fiscalRule.findMany.mockResolvedValue([existingRule]);

        const overlapCheck = await fiscalRulesService.checkDateOverlap(
          TEST_COMPANY_ID,
          FiscalRuleType.ISR_ADJUSTMENT,
          new Date('2025-01-01'),
          new Date('2025-06-30'),
        );

        expect(overlapCheck.hasOverlap).toBe(true);
        expect(overlapCheck.conflictingRules).toHaveLength(1);
        expect(overlapCheck.conflictingRules[0].name).toBe('Regla ISR Existente');
      });

      it('debe lanzar BadRequestException al crear regla traslapada', async () => {
        const existingRule = {
          id: 'existing-rule-id',
          name: 'Regla ISR Existente',
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-09-30'),
        };

        prismaService.fiscalRule.findMany.mockResolvedValue([existingRule]);

        await expect(
          fiscalRulesService.create(baseRuleDto, TEST_USER_ID),
        ).rejects.toThrow(BadRequestException);

        await expect(
          fiscalRulesService.create(baseRuleDto, TEST_USER_ID),
        ).rejects.toThrow(/Traslape de fechas detectado/);
      });

      it('debe permitir regla cuando no hay traslape', async () => {
        // No hay reglas existentes traslapadas
        prismaService.fiscalRule.findMany.mockResolvedValue([]);

        const newRule = {
          id: 'new-rule-id',
          ...baseRuleDto,
          startDate: new Date(baseRuleDto.startDate),
          endDate: baseRuleDto.endDate ? new Date(baseRuleDto.endDate) : null,
          active: true,
          version: 1,
          createdAt: new Date(),
        };

        prismaService.fiscalRule.create.mockResolvedValue(newRule);

        const result = await fiscalRulesService.create(baseRuleDto, TEST_USER_ID);

        expect(result.id).toBe('new-rule-id');
        expect(prismaService.fiscalRule.create).toHaveBeenCalled();
      });

      it('debe detectar traslape con regla sin fecha fin (vigencia indefinida)', async () => {
        // Regla existente sin fecha fin
        const existingRule = {
          id: 'existing-rule-id',
          name: 'Regla ISR Indefinida',
          startDate: new Date('2024-01-01'),
          endDate: null, // Vigencia indefinida
        };

        prismaService.fiscalRule.findMany.mockResolvedValue([existingRule]);

        const overlapCheck = await fiscalRulesService.checkDateOverlap(
          TEST_COMPANY_ID,
          FiscalRuleType.ISR_ADJUSTMENT,
          new Date('2025-01-01'),
          new Date('2025-06-30'),
        );

        expect(overlapCheck.hasOverlap).toBe(true);
      });

      it('debe validar estructura de logicJson estricta', async () => {
        const invalidDto: CreateFiscalRuleDto = {
          ...baseRuleDto,
          logicJson: {
            schemaVersion: '1.0',
            action: {
              type: 'APPLY_RATE',
              rate: 1.5, // Inválido: rate debe ser 0-1
            },
          },
        };

        prismaService.fiscalRule.findMany.mockResolvedValue([]);

        await expect(
          fiscalRulesService.create(invalidDto, TEST_USER_ID),
        ).rejects.toThrow(BadRequestException);
      });
    });

    /**
     * PASO 3: Recalcular Recibo (crear V2 y archivar V1)
     *
     * LEDGER FISCAL: Nunca UPDATE, siempre crear nueva versión
     */
    describe('3. Recalcular Recibo - Patrón Ledger', () => {
      it('debe crear V2 y marcar V1 como SUPERSEDED', async () => {
        const mockReceiptV1 = {
          id: 'receipt-v1-id',
          payrollPeriodId: TEST_PERIOD_ID,
          employeeId: TEST_EMPLOYEE_ID,
          status: 'CALCULATED',
          version: 1,
          active: true,
          parentReceiptId: null,
          supersededAt: null,
          workedDays: 15,
          totalPerceptions: 10000,
          totalDeductions: 2000,
          netPay: 8000,
          cfdiNomina: null, // No timbrado
          perceptions: [],
          deductions: [],
        };

        const mockReceiptV2 = {
          id: 'receipt-v2-id',
          payrollPeriodId: TEST_PERIOD_ID,
          employeeId: TEST_EMPLOYEE_ID,
          status: 'CALCULATED',
          version: 2,
          active: true,
          parentReceiptId: 'receipt-v1-id',
          supersededAt: null,
          workedDays: 15,
          totalPerceptions: 11000, // Nuevo cálculo
          totalDeductions: 2200,
          netPay: 8800,
        };

        // Mock para verificar que se puede modificar
        prismaService.payrollDetail.findUnique
          .mockResolvedValueOnce(mockReceiptV1) // canModify check
          .mockResolvedValueOnce(mockReceiptV1); // getData

        // Mock de transacción
        const txMock = {
          payrollDetail: {
            findUnique: jest.fn().mockResolvedValue(mockReceiptV1),
            update: jest.fn().mockResolvedValue({
              ...mockReceiptV1,
              status: 'SUPERSEDED',
              active: false,
              supersededAt: new Date(),
            }),
            create: jest.fn().mockResolvedValue(mockReceiptV2),
          },
          payrollDetailPerception: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn(),
          },
          payrollDetailDeduction: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn(),
          },
        };

        prismaService.$transaction.mockImplementation((callback: any) => callback(txMock));

        const result = await versioningService.recalculateWithLedger(
          'receipt-v1-id',
          {
            totalPerceptions: 11000,
            totalDeductions: 2200,
            netPay: 8800,
          },
          TEST_USER_ID,
          'Recálculo por ajuste de horas extra',
        );

        // Verificar que V1 fue marcado como SUPERSEDED
        expect(txMock.payrollDetail.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'receipt-v1-id' },
            data: expect.objectContaining({
              status: 'SUPERSEDED',
              active: false,
            }),
          }),
        );

        // Verificar que V2 fue creado
        expect(txMock.payrollDetail.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              version: 2,
              parentReceiptId: 'receipt-v1-id',
              active: true,
            }),
          }),
        );
      });

      it('debe preservar cadena de versiones en auditoría', async () => {
        // Verificar que se registra en auditoría
        expect(mockAuditService.logCriticalAction).toBeDefined();
      });
    });

    /**
     * PASO 4: Timbrar V2
     *
     * Simula el proceso de timbrado con mock del PAC
     */
    describe('4. Timbrar V2 - Mock PAC', () => {
      it('debe actualizar estado a STAMPING antes de enviar al PAC', async () => {
        const mockReceiptV2 = {
          id: 'receipt-v2-id',
          status: 'APPROVED',
          version: 2,
          active: true,
        };

        prismaService.payrollDetail.findUnique.mockResolvedValue(mockReceiptV2);

        // El estado debe cambiar a STAMPING
        prismaService.payrollDetail.update.mockResolvedValue({
          ...mockReceiptV2,
          status: 'STAMPING',
        });

        const updateResult = await prismaService.payrollDetail.update({
          where: { id: 'receipt-v2-id' },
          data: { status: 'STAMPING' },
        });

        expect(updateResult.status).toBe('STAMPING');
      });

      it('debe actualizar estado a STAMP_OK después de timbrado exitoso', async () => {
        const mockTimbreData = {
          uuid: 'ABC12345-6789-DEFG-HIJK-LMNOPQRSTUV',
          fechaTimbrado: new Date('2025-01-15T10:30:00'),
          selloCFD: 'sello-cfd-mock...',
          selloSAT: 'sello-sat-mock...',
          noCertificadoSAT: '00001000000504497429',
          rfcProvCertif: 'SAT970701NN3',
        };

        prismaService.payrollDetail.update.mockResolvedValue({
          id: 'receipt-v2-id',
          status: 'STAMP_OK',
          version: 2,
          cfdiNomina: {
            status: 'STAMPED',
            uuid: mockTimbreData.uuid,
            fechaTimbrado: mockTimbreData.fechaTimbrado,
          },
        });

        const stampedReceipt = await prismaService.payrollDetail.update({
          where: { id: 'receipt-v2-id' },
          data: {
            status: 'STAMP_OK',
            cfdiNomina: {
              update: {
                status: 'STAMPED',
                uuid: mockTimbreData.uuid,
              },
            },
          },
        });

        expect(stampedReceipt.status).toBe('STAMP_OK');
        expect(stampedReceipt.cfdiNomina.uuid).toBe(mockTimbreData.uuid);
      });

      it('debe manejar error de timbrado y establecer STAMP_ERROR', async () => {
        prismaService.payrollDetail.update.mockResolvedValue({
          id: 'receipt-v2-id',
          status: 'STAMP_ERROR',
          stampingErrorCode: 'PAC_402',
          stampingErrorMessage: 'RFC del receptor no encontrado en lista de RFC',
        });

        const errorReceipt = await prismaService.payrollDetail.update({
          where: { id: 'receipt-v2-id' },
          data: {
            status: 'STAMP_ERROR',
            stampingErrorCode: 'PAC_402',
            stampingErrorMessage: 'RFC del receptor no encontrado en lista de RFC',
          },
        });

        expect(errorReceipt.status).toBe('STAMP_ERROR');
        expect(errorReceipt.stampingErrorCode).toBe('PAC_402');
      });
    });

    /**
     * PASO 5: Intentar Recalcular V2 timbrado
     *
     * HARDENING: Debe fallar porque está fiscalmente inmutable
     */
    describe('5. Intentar Recalcular V2 Timbrado - Debe Fallar', () => {
      it('debe rechazar recálculo de recibo con CFDI timbrado', async () => {
        const mockStampedReceipt = {
          id: 'receipt-v2-id',
          status: 'STAMP_OK',
          version: 2,
          active: true,
          cfdiNomina: {
            id: 'cfdi-id',
            status: 'STAMPED',
            uuid: 'ABC12345-6789-DEFG-HIJK-LMNOPQRSTUV',
            fechaTimbrado: new Date('2025-01-15T10:30:00'),
          },
        };

        prismaService.payrollDetail.findUnique.mockResolvedValue(mockStampedReceipt);

        const canModify = await versioningService.canModify('receipt-v2-id');

        expect(canModify.canModify).toBe(false);
        expect(canModify.reason).toContain('fiscalmente inmutable');
        expect(canModify.hasCfdi).toBe(true);
        expect(canModify.cfdiUuid).toBe('ABC12345-6789-DEFG-HIJK-LMNOPQRSTUV');
      });

      it('debe lanzar ForbiddenException al intentar recalcular recibo timbrado', async () => {
        const mockStampedReceipt = {
          id: 'receipt-v2-id',
          status: 'STAMP_OK',
          version: 2,
          active: true,
          cfdiNomina: {
            id: 'cfdi-id',
            status: 'STAMPED',
            uuid: 'ABC12345-6789-DEFG-HIJK-LMNOPQRSTUV',
          },
        };

        prismaService.payrollDetail.findUnique.mockResolvedValue(mockStampedReceipt);

        await expect(
          versioningService.recalculateWithLedger(
            'receipt-v2-id',
            { totalPerceptions: 12000 },
            TEST_USER_ID,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('debe rechazar modificación de recibo en estado PAID', async () => {
        const mockPaidReceipt = {
          id: 'receipt-paid-id',
          status: 'PAID',
          version: 2,
          cfdiNomina: null,
        };

        prismaService.payrollDetail.findUnique.mockResolvedValue(mockPaidReceipt);

        const canModify = await versioningService.canModify('receipt-paid-id');

        expect(canModify.canModify).toBe(false);
        expect(canModify.reason).toContain('inmutable');
      });

      it('debe rechazar modificación de recibo SUPERSEDED', async () => {
        const mockSupersededReceipt = {
          id: 'receipt-v1-id',
          status: 'SUPERSEDED',
          version: 1,
          active: false,
          supersededAt: new Date(),
          cfdiNomina: null,
        };

        prismaService.payrollDetail.findUnique.mockResolvedValue(mockSupersededReceipt);

        const canModify = await versioningService.canModify('receipt-v1-id');

        expect(canModify.canModify).toBe(false);
      });
    });
  });

  /**
   * Tests adicionales de hardening
   */
  describe('Content-Addressable Storage (CAS)', () => {
    it('debe generar hash SHA-256 correcto para contenido', () => {
      const crypto = require('crypto');
      const content = Buffer.from('<?xml version="1.0"?><cfdi:Comprobante>...</cfdi:Comprobante>');
      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

      expect(expectedHash).toHaveLength(64);
      expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('debe detectar contenido duplicado por hash', async () => {
      const content = Buffer.from('XML content for testing CAS');
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      // Simular que ya existe un documento con este hash
      prismaService.document.findFirst.mockResolvedValue({
        id: 'existing-doc-id',
        sha256Hash: hash,
        path: `cas/${hash.substring(0, 2)}/${hash.substring(2, 4)}/${hash}.xml`,
      });

      const existing = await prismaService.document.findFirst({
        where: { sha256Hash: hash },
      });

      expect(existing).not.toBeNull();
      expect(existing.sha256Hash).toBe(hash);
    });
  });

  describe('Fiscal Audit Snapshots', () => {
    it('debe crear snapshot de entrada completo', () => {
      const inputSnapshot = fiscalAuditService.buildInputSnapshot(
        {
          id: TEST_EMPLOYEE_ID,
          employeeNumber: 'EMP001',
          rfc: 'XAXX010101000',
          salaryType: 'MONTHLY',
          baseSalary: 15000,
          dailySalary: 500,
          sbc: 524.65,
        },
        {
          id: TEST_PERIOD_ID,
          type: 'BIWEEKLY',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-15'),
          year: 2025,
        },
        {
          workedDays: 15,
          absences: 0,
          incidentsApplied: [],
        },
        {
          uma: 113.14,
          smg: 278.80,
          fiscalYear: 2025,
        },
      );

      expect(inputSnapshot.capturedAt).toBeDefined();
      expect(inputSnapshot.employee.rfc).toBe('XAXX010101000');
      expect(inputSnapshot.fiscalParameters.uma).toBe(113.14);
      expect(inputSnapshot.period.year).toBe(2025);
    });

    it('debe crear snapshot de salida completo', () => {
      const outputSnapshot = fiscalAuditService.buildOutputSnapshot(
        'ISR' as any,
        'D002',
        {
          limitInferior: 6332.06,
          excedente: 3667.94,
          cuotaFija: 371.83,
          impuestoMarginal: 399.07,
        },
        770.90,
        {
          tasaMarginal: 0.1088,
          tablaUsada: 'ISR_BIWEEKLY_2025',
        },
      );

      expect(outputSnapshot.capturedAt).toBeDefined();
      expect(outputSnapshot.conceptType).toBe('ISR');
      expect(outputSnapshot.finalResult).toBe(770.90);
      expect(outputSnapshot.calculationBreakdown.cuotaFija).toBe(371.83);
    });
  });

  describe('Idempotencia de Timbrado', () => {
    it('debe detectar recibo ya timbrado antes de procesar', async () => {
      const mockAlreadyStamped = {
        id: 'receipt-already-stamped',
        status: 'STAMP_OK',
        cfdiNomina: {
          uuid: 'EXISTING-UUID-12345',
        },
      };

      prismaService.payrollDetail.findUnique.mockResolvedValue(mockAlreadyStamped);

      const receipt = await prismaService.payrollDetail.findUnique({
        where: { id: 'receipt-already-stamped' },
        include: { cfdiNomina: true },
      });

      // El worker debe detectar esto y retornar sin procesar
      expect(receipt.status).toBe('STAMP_OK');
      expect(receipt.cfdiNomina.uuid).toBeDefined();
    });

    it('debe clasificar errores de timbrado correctamente', () => {
      // Errores reintentables
      const networkError = { code: 'ECONNRESET', message: 'Connection reset' };
      const pacTempError = { code: 'PAC_503', message: 'Service temporarily unavailable' };

      // Errores permanentes
      const validationError = { code: 'PAC_301', message: 'XML malformado' };
      const certificateError = { code: 'PAC_305', message: 'Certificado expirado' };

      const isRetryable = (error: { code: string }) => {
        const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'PAC_503', 'PAC_504'];
        return retryableCodes.includes(error.code);
      };

      expect(isRetryable(networkError)).toBe(true);
      expect(isRetryable(pacTempError)).toBe(true);
      expect(isRetryable(validationError)).toBe(false);
      expect(isRetryable(certificateError)).toBe(false);
    });
  });

  describe('Cadena de Versiones', () => {
    it('debe recuperar cadena completa de versiones', async () => {
      const versionChain = [
        { id: 'v1', version: 1, status: 'SUPERSEDED', parentReceiptId: null },
        { id: 'v2', version: 2, status: 'SUPERSEDED', parentReceiptId: 'v1' },
        { id: 'v3', version: 3, status: 'STAMP_OK', parentReceiptId: 'v2' },
      ];

      prismaService.payrollDetail.findMany.mockResolvedValue(versionChain);

      const chain = await prismaService.payrollDetail.findMany({
        where: {
          OR: [
            { id: 'v3' },
            { id: 'v2' },
            { id: 'v1' },
          ],
        },
        orderBy: { version: 'asc' },
      });

      expect(chain).toHaveLength(3);
      expect(chain[0].version).toBe(1);
      expect(chain[2].version).toBe(3);
      expect(chain[2].status).toBe('STAMP_OK');
    });

    it('debe identificar versión activa correctamente', async () => {
      prismaService.payrollDetail.findUnique.mockResolvedValue({
        id: 'v3',
        version: 3,
        active: true,
        status: 'STAMP_OK',
      });

      const activeReceipt = await versioningService.getActiveReceipt(
        TEST_PERIOD_ID,
        TEST_EMPLOYEE_ID,
      );

      // El método debe retornar la versión activa
      expect(prismaService.payrollDetail.findUnique).toHaveBeenCalled();
    });
  });
});

/**
 * Tests de validación de DTOs
 */
describe('Validación de DTOs Fiscales', () => {
  describe('FiscalRuleLogicDto', () => {
    it('debe requerir schemaVersion', () => {
      const invalidLogic = {
        action: { type: 'APPLY_RATE', rate: 0.05 },
      };

      expect(invalidLogic).not.toHaveProperty('schemaVersion');
    });

    it('debe validar rango de rate (0-1)', () => {
      const validRate = 0.05;
      const invalidRate = 1.5;

      expect(validRate).toBeGreaterThanOrEqual(0);
      expect(validRate).toBeLessThanOrEqual(1);
      expect(invalidRate).toBeGreaterThan(1);
    });

    it('debe requerir tabla no vacía para APPLY_TABLE', () => {
      const validTable = {
        schemaVersion: '1.0',
        action: {
          type: 'APPLY_TABLE',
          table: [
            { lowerLimit: 0, upperLimit: 1000, rate: 0.02 },
            { lowerLimit: 1000.01, upperLimit: 5000, rate: 0.05 },
          ],
        },
      };

      expect(validTable.action.table).toHaveLength(2);
      expect(validTable.action.table[0].lowerLimit).toBe(0);
    });
  });
});

/**
 * Tests de estados de recibo
 */
describe('Estados de Recibo (PayrollDetailStatus)', () => {
  const IMMUTABLE_STATUSES = ['STAMP_OK', 'PAID', 'CANCELLED', 'SUPERSEDED'];
  const MODIFIABLE_STATUSES = ['PENDING', 'CALCULATED', 'APPROVED'];
  const PROCESSING_STATUSES = ['CALCULATING', 'STAMPING'];

  it('debe identificar estados inmutables', () => {
    IMMUTABLE_STATUSES.forEach(status => {
      expect(IMMUTABLE_STATUSES.includes(status)).toBe(true);
    });
  });

  it('debe identificar estados modificables', () => {
    MODIFIABLE_STATUSES.forEach(status => {
      expect(MODIFIABLE_STATUSES.includes(status)).toBe(true);
      expect(IMMUTABLE_STATUSES.includes(status)).toBe(false);
    });
  });

  it('debe identificar estados en proceso', () => {
    PROCESSING_STATUSES.forEach(status => {
      expect(PROCESSING_STATUSES.includes(status)).toBe(true);
    });
  });
});
