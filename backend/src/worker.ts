import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

/**
 * Entry point para el worker de procesamiento asíncrono.
 *
 * Ejecuta los procesadores de colas sin levantar servidor HTTP.
 * Uso: node dist/worker.js
 *
 * Configuración:
 * - WORKER_CONCURRENCY: Número de jobs concurrentes (default: 3)
 * - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD: Conexión a Redis
 * - DATABASE_URL: Conexión a PostgreSQL
 */
async function bootstrap() {
  const logger = new Logger('Worker');

  logger.log('Iniciando worker de procesamiento asíncrono...');

  // Crear contexto de aplicación sin servidor HTTP
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Manejar señales de terminación graceful
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Recibida señal ${signal}, cerrando worker...`);
      await app.close();
      process.exit(0);
    });
  }

  // Manejar errores no capturados
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  const concurrency = process.env.WORKER_CONCURRENCY || '3';
  logger.log(`Worker iniciado con concurrencia: ${concurrency}`);
  logger.log('Esperando jobs en las colas...');
}

bootstrap().catch((error) => {
  console.error('Error fatal al iniciar worker:', error);
  process.exit(1);
});
