import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, RETRY_CONFIG } from './queue.constants';
import { CfdiStampingProcessor } from './processors/cfdi-stamping.processor';
import { PayrollCalculationProcessor } from './processors/payroll-calculation.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { QueueEventsService } from './services/queue-events.service';
import { QueueService } from './services/queue.service';
// CfdiStampingProcessor services (for worker mode)
import { StampingService } from '@/modules/cfdi/services/stamping.service';
import { StampingIdempotencyService } from '@/modules/cfdi/services/stamping-idempotency.service';
// Tenant context for job processing
import { TenantContextService } from '@/common/tenant/tenant-context.service';

// Re-exportar constantes para compatibilidad
export { QUEUE_NAMES, RETRY_CONFIG } from './queue.constants';

/**
 * Modos de operación del módulo de colas
 *
 * - api: Solo registra colas para enqueue (NO procesa jobs)
 * - worker: Solo registra procesadores (NO expone API)
 * - both: Registra colas Y procesadores (desarrollo/instancia única)
 * - sync: Modo síncrono sin colas reales (desarrollo local)
 */
export type QueueMode = 'api' | 'worker' | 'both' | 'sync';

/**
 * Módulo global de colas
 *
 * Cumple con: Documento de Requerimientos - Sección 9. Escalabilidad
 * - Procesos asíncronos
 * - Colas de timbrado
 * - Workers independientes
 * - Reintentos automáticos controlados
 *
 * Configuración vía QUEUE_MODE:
 * - api: Backend API (solo enqueue, no procesa)
 * - worker: Worker standalone (solo procesa, no API)
 * - both: Modo combinado (desarrollo)
 * - sync: Sin colas reales (desarrollo local)
 */
@Global()
@Module({})
export class QueuesModule {
  private static readonly logger = new Logger('QueuesModule');

  /**
   * Determina el modo de operación desde variables de entorno
   */
  static getQueueMode(): QueueMode {
    const mode = (process.env.QUEUE_MODE || 'both').toLowerCase() as QueueMode;
    const validModes: QueueMode[] = ['api', 'worker', 'both', 'sync'];

    if (!validModes.includes(mode)) {
      this.logger.warn(`QUEUE_MODE inválido: ${mode}, usando 'both'`);
      return 'both';
    }

    return mode;
  }

  /**
   * Registra el módulo dinámicamente según QUEUE_MODE
   */
  static forRoot(): DynamicModule {
    const mode = this.getQueueMode();
    this.logger.log(`Inicializando QueuesModule en modo: ${mode}`);

    // Modo sync: no usar colas reales
    if (mode === 'sync') {
      return this.forSyncMode();
    }

    // Configuración base de BullMQ
    const bullImports = [
      BullModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD', undefined),
            db: configService.get('REDIS_DB', 0),
          },
          defaultJobOptions: {
            removeOnComplete: { count: 100, age: 24 * 3600 },
            removeOnFail: { count: 500, age: 7 * 24 * 3600 },
          },
        }),
        inject: [ConfigService],
      }),

      // Registrar todas las colas
      BullModule.registerQueue(
        { name: QUEUE_NAMES.CFDI_STAMPING, defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.CFDI_STAMPING] },
        { name: QUEUE_NAMES.CFDI_CANCELLATION, defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.CFDI_CANCELLATION] },
        { name: QUEUE_NAMES.PAYROLL_CALCULATION, defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.PAYROLL_CALCULATION] },
        { name: QUEUE_NAMES.REPORTS_GENERATION, defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.REPORTS_GENERATION] },
        { name: QUEUE_NAMES.NOTIFICATIONS, defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.NOTIFICATIONS] },
        { name: QUEUE_NAMES.IMSS_SYNC, defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.IMSS_SYNC] },
      ),
    ];

    // Providers base (siempre incluidos)
    const baseProviders = [QueueEventsService, QueueService];

    // Services needed for CfdiStampingProcessor (only in worker/both mode)
    const stampingServices = mode === 'api' ? [] : [
      TenantContextService, // Tenant isolation for job processing
      StampingService,
      StampingIdempotencyService,
    ];

    // Procesadores (solo en modo worker o both)
    const processors = mode === 'api' ? [] : [
      CfdiStampingProcessor, // CFDI stamping with real PAC integration
      PayrollCalculationProcessor,
      NotificationsProcessor,
    ];

    if (mode === 'api') {
      this.logger.log('Modo API: colas registradas, procesadores deshabilitados');
    } else if (mode === 'worker') {
      this.logger.log('Modo Worker: procesadores activos');
    } else {
      this.logger.log('Modo Both: colas y procesadores activos');
    }

    return {
      module: QueuesModule,
      imports: bullImports,
      providers: [...baseProviders, ...stampingServices, ...processors],
      exports: [BullModule, QueueEventsService, QueueService],
    };
  }

  /**
   * Modo síncrono sin Redis (desarrollo local)
   */
  private static forSyncMode(): DynamicModule {
    this.logger.log('Modo SYNC: procesamiento síncrono sin Redis');

    return {
      module: QueuesModule,
      providers: [
        // Proveer servicios mock para modo sync
        {
          provide: QueueService,
          useValue: {
            addStampingJob: async () => ({ id: 'sync-mock' }),
            addCalculationJob: async () => ({ id: 'sync-mock' }),
            addNotificationJob: async () => ({ id: 'sync-mock' }),
          },
        },
        {
          provide: QueueEventsService,
          useValue: {
            onModuleInit: () => {},
          },
        },
      ],
      exports: [QueueService, QueueEventsService],
    };
  }
}
