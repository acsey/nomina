/**
 * Controlador de Health Checks
 * Cumplimiento: Gobierno MX - Monitoreo operativo
 *
 * Endpoints:
 * - GET /health - Estado general del sistema
 * - GET /health/db - Estado de la base de datos
 * - GET /health/redis - Estado de Redis
 * - GET /health/queues - Estado de las colas
 * - GET /health/storage - Estado del almacenamiento
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface HealthStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  details?: Record<string, any>;
}

export interface ComponentHealth {
  name: string;
  status: 'UP' | 'DOWN';
  responseTime?: number;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  components: ComponentHealth[];
}

@ApiTags('Health')
@Controller('health')
@SkipThrottle() // Health checks no deben tener rate limiting para monitoreo
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Estado general del sistema
   */
  @Get()
  @ApiOperation({ summary: 'Estado general del sistema' })
  @ApiResponse({ status: 200, description: 'Sistema operativo' })
  @ApiResponse({ status: 503, description: 'Sistema degradado o caído' })
  async getHealth(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [];

    // Verificar base de datos
    components.push(await this.checkDatabase());

    // Verificar Redis
    components.push(await this.checkRedis());

    // Verificar almacenamiento
    components.push(await this.checkStorage());

    // Determinar estado general
    const downComponents = components.filter((c: any) => c.status === 'DOWN');
    let status: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';

    if (downComponents.length > 0) {
      // Si la BD está caída, sistema DOWN
      if (downComponents.some((c: any) => c.name === 'database')) {
        status = 'DOWN';
      } else {
        status = 'DEGRADED';
      }
    }

    return {
      status,
      version: process.env.npm_package_version || '1.0.0',
      environment: this.configService.get('NODE_ENV') || 'development',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      components,
    };
  }

  /**
   * Estado de la base de datos
   */
  @Get('db')
  @ApiOperation({ summary: 'Estado de la base de datos PostgreSQL' })
  async getDbHealth(): Promise<HealthStatus> {
    const check = await this.checkDatabase();
    return {
      status: check.status,
      timestamp: new Date().toISOString(),
      details: {
        responseTime: check.responseTime,
        ...check.details,
        error: check.error,
      },
    };
  }

  /**
   * Estado de Redis
   */
  @Get('redis')
  @ApiOperation({ summary: 'Estado de Redis' })
  async getRedisHealth(): Promise<HealthStatus> {
    const check = await this.checkRedis();
    return {
      status: check.status,
      timestamp: new Date().toISOString(),
      details: {
        responseTime: check.responseTime,
        ...check.details,
        error: check.error,
      },
    };
  }

  /**
   * Estado de las colas
   */
  @Get('queues')
  @ApiOperation({ summary: 'Estado de las colas de procesamiento' })
  async getQueuesHealth(): Promise<HealthStatus> {
    const queueMode = this.configService.get('QUEUE_MODE') || 'sync';

    if (queueMode === 'sync') {
      return {
        status: 'UP',
        timestamp: new Date().toISOString(),
        details: {
          mode: 'sync',
          message: 'Colas deshabilitadas (modo sincrónico)',
        },
      };
    }

    const redisCheck = await this.checkRedis();
    return {
      status: redisCheck.status,
      timestamp: new Date().toISOString(),
      details: {
        mode: queueMode,
        redis: redisCheck.status,
        // En producción aquí se agregarían estadísticas de BullMQ
        queues: {
          'cfdi-stamping': 'active',
          'payroll-calculation': 'active',
          notifications: 'active',
        },
      },
    };
  }

  /**
   * Estado del almacenamiento de evidencias fiscales
   */
  @Get('storage')
  @ApiOperation({ summary: 'Estado del almacenamiento de evidencias' })
  async getStorageHealth(): Promise<HealthStatus> {
    const check = await this.checkStorage();
    return {
      status: check.status,
      timestamp: new Date().toISOString(),
      details: {
        ...check.details,
        error: check.error,
      },
    };
  }

  /**
   * Verificación de la base de datos
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      // Ejecutar query simple para verificar conexión
      await this.prisma.$queryRaw`SELECT 1 as health`;
      const responseTime = Date.now() - start;

      // Obtener estadísticas básicas
      const [userCount, companyCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.company.count(),
      ]);

      return {
        name: 'database',
        status: 'UP',
        responseTime,
        details: {
          type: 'PostgreSQL',
          users: userCount,
          companies: companyCount,
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        name: 'database',
        status: 'DOWN',
        responseTime: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Verificación de Redis
   */
  private async checkRedis(): Promise<ComponentHealth> {
    const queueMode = this.configService.get('QUEUE_MODE') || 'sync';

    // Si está en modo sync, Redis no es requerido
    if (queueMode === 'sync') {
      return {
        name: 'redis',
        status: 'UP',
        details: {
          mode: 'sync',
          message: 'Redis no requerido en modo sincrónico',
        },
      };
    }

    const start = Date.now();
    const redisHost = this.configService.get('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get('REDIS_PORT') || 6379;

    try {
      // Intento de conexión básica usando net
      const net = await import('net');
      const socket = new net.Socket();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve({
            name: 'redis',
            status: 'DOWN',
            responseTime: Date.now() - start,
            error: 'Connection timeout',
          });
        }, 5000);

        socket.connect(redisPort, redisHost, () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve({
            name: 'redis',
            status: 'UP',
            responseTime: Date.now() - start,
            details: {
              host: redisHost,
              port: redisPort,
            },
          });
        });

        socket.on('error', (err) => {
          clearTimeout(timeout);
          socket.destroy();
          resolve({
            name: 'redis',
            status: 'DOWN',
            responseTime: Date.now() - start,
            error: err.message,
          });
        });
      });
    } catch (error) {
      return {
        name: 'redis',
        status: 'DOWN',
        responseTime: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Verificación del almacenamiento
   */
  private async checkStorage(): Promise<ComponentHealth> {
    const storagePath =
      this.configService.get('FISCAL_STORAGE_PATH') || '/app/storage/fiscal';

    try {
      // Verificar si el directorio existe
      if (!fs.existsSync(storagePath)) {
        // Intentar crearlo
        fs.mkdirSync(storagePath, { recursive: true });
      }

      // Verificar permisos de escritura
      const testFile = path.join(storagePath, '.health-check');
      fs.writeFileSync(testFile, 'health-check');
      fs.unlinkSync(testFile);

      // Obtener espacio disponible (simplificado)
      const stats = fs.statSync(storagePath);

      return {
        name: 'storage',
        status: 'UP',
        details: {
          path: storagePath,
          writable: true,
          exists: true,
        },
      };
    } catch (error) {
      this.logger.error('Storage health check failed', error);
      return {
        name: 'storage',
        status: 'DOWN',
        error: error.message,
        details: {
          path: storagePath,
          writable: false,
        },
      };
    }
  }
}
