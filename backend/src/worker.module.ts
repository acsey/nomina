import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './common/prisma/prisma.module';
import { SecurityModule } from './common/security/security.module';
import { FiscalModule } from './common/fiscal/fiscal.module';
import { FormulaModule } from './common/formulas/formula.module';
import { UtilsModule } from './common/utils/utils.module';
import { TenantContextService } from './common/tenant/tenant-context.service';
import { QUEUE_NAMES, RETRY_CONFIG } from './common/queues/queue.constants';
// CFDI Stamping processor from common/queues (canonical location)
import { CfdiStampingProcessor } from './common/queues/processors/cfdi-stamping.processor';
import { StampingService } from './modules/cfdi/services/stamping.service';
import { StampingIdempotencyService } from './modules/cfdi/services/stamping-idempotency.service';
import { PayrollCalculationProcessor } from './common/queues/processors/payroll-calculation.processor';
import { NotificationsProcessor } from './common/queues/processors/notifications.processor';
import { QueueEventsService } from './common/queues/services/queue-events.service';

/**
 * Módulo para el Worker de procesamiento asíncrono.
 *
 * Este módulo:
 * - NO levanta servidor HTTP
 * - Registra SOLO los procesadores de colas
 * - Incluye dependencias mínimas necesarias para procesar jobs
 *
 * Uso: Ejecutar con `node dist/worker.js`
 */
@Module({
  imports: [
    // Configuración
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Eventos
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Dependencias core
    PrismaModule,
    SecurityModule,
    FiscalModule,
    FormulaModule,
    UtilsModule,

    // Configuración BullMQ con Redis
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
  ],
  providers: [
    // Tenant context for job isolation
    TenantContextService,
    // Servicios necesarios para CfdiStampingProcessor
    StampingService,
    StampingIdempotencyService,
    // Procesadores de colas
    CfdiStampingProcessor, // CFDI stamping from common/queues (canonical location)
    PayrollCalculationProcessor,
    NotificationsProcessor,
    // Servicio de eventos de cola
    QueueEventsService,
    // Logger
    {
      provide: 'WORKER_LOGGER',
      useFactory: () => new Logger('WorkerModule'),
    },
  ],
})
export class WorkerModule {
  private readonly logger = new Logger(WorkerModule.name);

  constructor() {
    this.logger.log('WorkerModule inicializado - procesadores de cola activos');
  }
}
