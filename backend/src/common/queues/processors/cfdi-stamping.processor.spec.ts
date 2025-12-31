import { Test, TestingModule } from '@nestjs/testing';
import { CfdiStampingProcessor, PacErrorType } from './cfdi-stamping.processor';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SecretsService } from '@/common/security/secrets.service';
import { AuditService } from '@/common/security/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';

describe('CfdiStampingProcessor', () => {
  let processor: CfdiStampingProcessor;

  const mockPrismaService = {
    cfdiNomina: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSecretsService = {
    getCompanyCertificates: jest.fn(),
    getPacCredentials: jest.fn(),
  };

  const mockAuditService = {
    logCfdiStamp: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CfdiStampingProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SecretsService, useValue: mockSecretsService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    processor = module.get<CfdiStampingProcessor>(CfdiStampingProcessor);
    jest.clearAllMocks();
  });

  describe('classifyError', () => {
    // Acceder al método privado para pruebas
    const classifyError = (errorMessage: string): PacErrorType => {
      return (processor as any).classifyError(errorMessage);
    };

    describe('errores temporales', () => {
      it('debe clasificar timeout como TEMPORARY', () => {
        expect(classifyError('Connection timeout after 30000ms')).toBe(PacErrorType.TEMPORARY);
      });

      it('debe clasificar ECONNREFUSED como TEMPORARY', () => {
        expect(classifyError('connect ECONNREFUSED 127.0.0.1:443')).toBe(PacErrorType.TEMPORARY);
      });

      it('debe clasificar errores de red como TEMPORARY', () => {
        expect(classifyError('Network error: unable to reach server')).toBe(PacErrorType.TEMPORARY);
      });

      it('debe clasificar 503 como TEMPORARY', () => {
        expect(classifyError('Error 503: Service temporarily unavailable')).toBe(PacErrorType.TEMPORARY);
      });

      it('debe clasificar 429 (rate limit) como TEMPORARY', () => {
        expect(classifyError('Error 429: Too many requests')).toBe(PacErrorType.TEMPORARY);
      });
    });

    describe('errores permanentes', () => {
      it('debe clasificar certificado vencido como PERMANENT', () => {
        expect(classifyError('El certificado ha vencido')).toBe(PacErrorType.PERMANENT);
      });

      it('debe clasificar certificado inválido como PERMANENT', () => {
        expect(classifyError('Certificado inválido o corrupto')).toBe(PacErrorType.PERMANENT);
      });

      it('debe clasificar RFC inválido como PERMANENT', () => {
        expect(classifyError('RFC del emisor inválido')).toBe(PacErrorType.PERMANENT);
      });

      it('debe clasificar 401 como PERMANENT', () => {
        expect(classifyError('Error 401: Unauthorized')).toBe(PacErrorType.PERMANENT);
      });
    });

    describe('errores de validación', () => {
      it('debe clasificar errores SAT CCE como VALIDATION', () => {
        expect(classifyError('Error CCE401: Sello no coincide')).toBe(PacErrorType.VALIDATION);
      });

      it('debe clasificar errores de estructura como VALIDATION', () => {
        expect(classifyError('Estructura del XML inválida')).toBe(PacErrorType.VALIDATION);
      });
    });

    it('debe clasificar errores desconocidos como TEMPORARY por defecto', () => {
      expect(classifyError('Error desconocido xyz')).toBe(PacErrorType.TEMPORARY);
    });
  });

  describe('calculateBackoffDelay', () => {
    const calculateBackoff = (attempt: number): number => {
      return (processor as any).calculateBackoffDelay(attempt);
    };

    it('debe retornar delay base para primer intento', () => {
      const delay = calculateBackoff(1);
      // Base es 2000ms, con jitter +/- 20%, rango: 1600-2400
      expect(delay).toBeGreaterThanOrEqual(1600);
      expect(delay).toBeLessThanOrEqual(2400);
    });

    it('debe aumentar exponencialmente el delay', () => {
      const delay1 = calculateBackoff(1);
      const delay2 = calculateBackoff(2);
      const delay3 = calculateBackoff(3);

      // Verificar tendencia exponencial (aproximado por jitter)
      // Intento 2 debería ser ~4000ms, intento 3 ~8000ms
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('debe respetar el límite máximo de delay', () => {
      const delay = calculateBackoff(10); // Muy alto para exceder límite
      expect(delay).toBeLessThanOrEqual(300000); // 5 minutos máx
    });
  });

  describe('shouldRetry', () => {
    const shouldRetry = (errorType: PacErrorType, attempt: number): boolean => {
      return (processor as any).shouldRetry(errorType, attempt);
    };

    it('debe permitir reintento para errores temporales', () => {
      expect(shouldRetry(PacErrorType.TEMPORARY, 1)).toBe(true);
      expect(shouldRetry(PacErrorType.TEMPORARY, 3)).toBe(true);
    });

    it('NO debe permitir reintento para errores permanentes', () => {
      expect(shouldRetry(PacErrorType.PERMANENT, 1)).toBe(false);
    });

    it('NO debe permitir reintento para errores de validación', () => {
      expect(shouldRetry(PacErrorType.VALIDATION, 1)).toBe(false);
    });

    it('NO debe permitir reintento si se excede máximo de intentos', () => {
      expect(shouldRetry(PacErrorType.TEMPORARY, 5)).toBe(false);
      expect(shouldRetry(PacErrorType.TEMPORARY, 6)).toBe(false);
    });
  });

  describe('idempotencia', () => {
    it('debe saltar timbrado si CFDI ya está timbrado', async () => {
      const mockJob = {
        data: { cfdiId: 'cfdi-1', userId: 'user-1' },
        attemptsMade: 0,
        updateProgress: jest.fn(),
      };

      mockPrismaService.cfdiNomina.findUnique.mockResolvedValue({
        id: 'cfdi-1',
        status: 'STAMPED',
        uuid: 'ABC-123-456',
        employee: { company: { id: 'company-1' } },
      });

      const result = await processor.process(mockJob as any);

      expect(result.success).toBe(true);
      expect(result.uuid).toBe('ABC-123-456');
      expect(mockPrismaService.cfdiNomina.update).not.toHaveBeenCalled();
    });
  });
});
