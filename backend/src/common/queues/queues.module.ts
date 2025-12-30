import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, RETRY_CONFIG } from './queue.constants';
import { CfdiStampingProcessor } from './processors/cfdi-stamping.processor';
import { PayrollCalculationProcessor } from './processors/payroll-calculation.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { QueueEventsService } from './services/queue-events.service';
import { QueueService } from './services/queue.service';

// Re-exportar constantes para compatibilidad
export { QUEUE_NAMES, RETRY_CONFIG } from './queue.constants';

/**
 * Módulo global de colas
 *
 * Cumple con: Documento de Requerimientos - Sección 9. Escalabilidad
 * - Procesos asíncronos
 * - Colas de timbrado
 * - Workers independientes
 * - Reintentos automáticos controlados
 */
@Global()
@Module({
  imports: [
    // Configuración global de BullMQ con Redis
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
          removeOnComplete: {
            count: 100, // Mantener últimos 100 jobs completados
            age: 24 * 3600, // Máximo 24 horas
          },
          removeOnFail: {
            count: 500, // Mantener últimos 500 jobs fallidos para análisis
            age: 7 * 24 * 3600, // Máximo 7 días
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Cola de timbrado CFDI
    BullModule.registerQueue({
      name: QUEUE_NAMES.CFDI_STAMPING,
      defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.CFDI_STAMPING],
    }),

    // Cola de cancelación CFDI
    BullModule.registerQueue({
      name: QUEUE_NAMES.CFDI_CANCELLATION,
      defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.CFDI_CANCELLATION],
    }),

    // Cola de cálculo de nómina
    BullModule.registerQueue({
      name: QUEUE_NAMES.PAYROLL_CALCULATION,
      defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.PAYROLL_CALCULATION],
    }),

    // Cola de generación de reportes
    BullModule.registerQueue({
      name: QUEUE_NAMES.REPORTS_GENERATION,
      defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.REPORTS_GENERATION],
    }),

    // Cola de notificaciones
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATIONS,
      defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.NOTIFICATIONS],
    }),

    // Cola de sincronización IMSS
    BullModule.registerQueue({
      name: QUEUE_NAMES.IMSS_SYNC,
      defaultJobOptions: RETRY_CONFIG[QUEUE_NAMES.IMSS_SYNC],
    }),
  ],
  providers: [
    // Procesadores
    CfdiStampingProcessor,
    PayrollCalculationProcessor,
    NotificationsProcessor,
    // Servicios
    QueueEventsService,
    QueueService,
  ],
  exports: [BullModule, QueueEventsService, QueueService],
})
export class QueuesModule {}
