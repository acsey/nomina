import {
  Module,
  Global,
  MiddlewareConsumer,
  NestModule,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';
import { PrismaConnectionFactory } from './prisma-connection.factory';
import {
  createTenantIsolationMiddleware,
  createAuditLoggingMiddleware,
} from './tenant-isolation.middleware';

/**
 * TenantModule - Multi-tenant architecture foundation
 *
 * This module provides:
 * - TenantContextService: Request-scoped tenant context via AsyncLocalStorage
 * - TenantMiddleware: HTTP middleware to initialize tenant context
 * - PrismaConnectionFactory: Abstraction for database connections
 * - Prisma Middleware: Automatic tenant isolation on queries
 *
 * ## Usage:
 * Import TenantModule.forRoot() in AppModule.
 * The module is global, so services are available everywhere.
 *
 * ## Configuration (via .env):
 * - DATABASE_ISOLATION_MODE: 'SHARED_DATABASE' (default) or 'DATABASE_PER_TENANT'
 * - TENANT_ISOLATION_STRICT: 'true' to block cross-tenant access (default: warn only)
 * - TENANT_ISOLATION_DEBUG: 'true' to log all queries
 */
@Global()
@Module({})
export class TenantModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(TenantModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Configure the module with dependencies
   */
  static forRoot() {
    return {
      module: TenantModule,
      imports: [ConfigModule, PrismaModule],
      providers: [TenantContextService, PrismaConnectionFactory],
      exports: [TenantContextService, PrismaConnectionFactory],
    };
  }

  /**
   * Configure HTTP middleware
   */
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes
    // It runs after auth guard has populated req.user
    consumer.apply(TenantMiddleware).forRoutes('*');

    this.logger.log('TenantMiddleware configured for all routes');
  }

  /**
   * Initialize Prisma middleware on module init
   */
  onModuleInit() {
    this.setupPrismaMiddleware();
  }

  /**
   * Setup Prisma middlewares for tenant isolation and audit
   */
  private setupPrismaMiddleware() {
    const strict =
      this.configService.get<string>('TENANT_ISOLATION_STRICT', 'false') ===
      'true';
    const debug =
      this.configService.get<string>('TENANT_ISOLATION_DEBUG', 'false') ===
      'true';

    // Add tenant isolation middleware
    const isolationMiddleware = createTenantIsolationMiddleware(
      this.tenantContext,
      { strict, debug },
    );

    // Cast to any to satisfy Prisma's strict ModelName type requirement
    // Our middleware handles string model names which is more flexible
    this.prisma.$use(isolationMiddleware as any);

    this.logger.log(
      `Tenant isolation middleware installed (strict: ${strict}, debug: ${debug})`,
    );

    // Add audit logging middleware (for slow queries)
    const auditMiddleware = createAuditLoggingMiddleware(this.tenantContext);
    this.prisma.$use(auditMiddleware as any);

    this.logger.log('Audit logging middleware installed');
  }
}
