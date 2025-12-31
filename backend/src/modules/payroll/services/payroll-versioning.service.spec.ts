import { Test, TestingModule } from '@nestjs/testing';
import { PayrollVersioningService, VersionReason } from './payroll-versioning.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';
import { ForbiddenException } from '@nestjs/common';

describe('PayrollVersioningService', () => {
  let service: PayrollVersioningService;
  let prismaService: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  const mockPrismaService = {
    payrollDetail: {
      findUnique: jest.fn(),
    },
    payrollDetailVersion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockAuditService = {
    logCriticalAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollVersioningService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PayrollVersioningService>(PayrollVersioningService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('canModify', () => {
    it('debe retornar false para recibos con CFDI timbrado', async () => {
      mockPrismaService.payrollDetail.findUnique.mockResolvedValue({
        status: 'CALCULATED',
        cfdiNomina: { status: 'STAMPED', uuid: 'ABC-123' },
      });

      const result = await service.canModify('detail-1');

      expect(result.canModify).toBe(false);
      expect(result.reason).toContain('fiscalmente inmutable');
      expect(result.hasCfdi).toBe(true);
    });

    it('debe retornar false para recibos en estado PAID', async () => {
      mockPrismaService.payrollDetail.findUnique.mockResolvedValue({
        status: 'PAID',
        cfdiNomina: null,
      });

      const result = await service.canModify('detail-1');

      expect(result.canModify).toBe(false);
      expect(result.reason).toContain('inmutable');
    });

    it('debe retornar true para recibos en estado PENDING', async () => {
      mockPrismaService.payrollDetail.findUnique.mockResolvedValue({
        status: 'PENDING',
        cfdiNomina: null,
      });

      const result = await service.canModify('detail-1');

      expect(result.canModify).toBe(true);
    });

    it('debe retornar true para recibos en estado CALCULATED sin CFDI', async () => {
      mockPrismaService.payrollDetail.findUnique.mockResolvedValue({
        status: 'CALCULATED',
        cfdiNomina: null,
      });

      const result = await service.canModify('detail-1');

      expect(result.canModify).toBe(true);
    });
  });

  describe('createVersion', () => {
    it('debe lanzar ForbiddenException si el recibo no se puede modificar', async () => {
      mockPrismaService.payrollDetail.findUnique.mockResolvedValue({
        status: 'CALCULATED',
        cfdiNomina: { status: 'STAMPED', uuid: 'ABC-123' },
      });

      await expect(
        service.createVersion('detail-1', VersionReason.RECALCULATION, 'user-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe crear versión correctamente para recibos modificables', async () => {
      // Mock para canModify
      mockPrismaService.payrollDetail.findUnique
        .mockResolvedValueOnce({
          status: 'PENDING',
          cfdiNomina: null,
        })
        // Mock para obtener detalle completo
        .mockResolvedValueOnce({
          id: 'detail-1',
          status: 'PENDING',
          workedDays: 15,
          totalPerceptions: 10000,
          totalDeductions: 2000,
          netPay: 8000,
          perceptions: [
            { conceptId: 'c1', concept: { code: 'P001', name: 'Sueldo' }, amount: 10000, taxableAmount: 10000, exemptAmount: 0 },
          ],
          deductions: [
            { conceptId: 'c2', concept: { code: 'D001', name: 'ISR' }, amount: 2000 },
          ],
          cfdiNomina: null,
        });

      mockPrismaService.payrollDetailVersion.findFirst.mockResolvedValue({ version: 1 });
      mockPrismaService.payrollDetailVersion.create.mockResolvedValue({
        id: 'version-1',
        version: 2,
        payrollDetailId: 'detail-1',
      });

      const result = await service.createVersion('detail-1', VersionReason.RECALCULATION, 'user-1');

      expect(result.version).toBe(2);
      expect(mockAuditService.logCriticalAction).toHaveBeenCalled();
    });
  });

  describe('compareVersions', () => {
    it('debe detectar percepciones añadidas', async () => {
      mockPrismaService.payrollDetailVersion.findFirst
        .mockResolvedValueOnce({
          version: 1,
          netPay: 8000,
          totalPerceptions: 10000,
          totalDeductions: 2000,
          createdAt: new Date(),
          createdReason: 'INITIAL',
          perceptionsSnapshot: [
            { conceptCode: 'P001', conceptName: 'Sueldo', amount: 10000 },
          ],
          deductionsSnapshot: [],
        })
        .mockResolvedValueOnce({
          version: 2,
          netPay: 9500,
          totalPerceptions: 11500,
          totalDeductions: 2000,
          createdAt: new Date(),
          createdReason: 'RECALCULATION',
          perceptionsSnapshot: [
            { conceptCode: 'P001', conceptName: 'Sueldo', amount: 10000 },
            { conceptCode: 'P002', conceptName: 'Bono', amount: 1500 },
          ],
          deductionsSnapshot: [],
        });

      const result = await service.compareVersions('detail-1', 1, 2);

      expect(result.perceptionsDiff).toContainEqual(
        expect.objectContaining({
          type: 'ADDED',
          conceptCode: 'P002',
        })
      );
      expect(result.netPayDifference).toBe(1500);
    });
  });
});
