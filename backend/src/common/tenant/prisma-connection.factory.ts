import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { DatabaseIsolationMode } from './tenant.types';

/**
 * PrismaConnectionFactory - Abstracts database connection management
 *
 * ## Current Implementation (Single Database)
 * Returns the default PrismaService for all tenants.
 * Tenant isolation is handled via Prisma middleware that filters by companyId.
 *
 * ## Future Implementation (Database per Tenant)
 * Will maintain a pool of connections per tenant and return the appropriate one
 * based on the current tenant context.
 *
 * This abstraction allows the rest of the application to remain unchanged
 * when switching between isolation models.
 */
@Injectable()
export class PrismaConnectionFactory implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaConnectionFactory.name);

  /** Current isolation mode - configurable via env */
  private readonly isolationMode: DatabaseIsolationMode;

  /**
   * Connection pool for future DB-per-tenant support
   * Map<connectionId, PrismaService>
   */
  private readonly connectionPool = new Map<string, PrismaService>();

  /** Default connection ID */
  private readonly DEFAULT_CONNECTION_ID = 'default';

  constructor(
    private readonly defaultPrisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly configService: ConfigService,
  ) {
    // Read isolation mode from config
    const mode = this.configService.get<string>(
      'DATABASE_ISOLATION_MODE',
      'SHARED_DATABASE',
    );

    this.isolationMode =
      mode === 'DATABASE_PER_TENANT'
        ? DatabaseIsolationMode.DATABASE_PER_TENANT
        : DatabaseIsolationMode.SHARED_DATABASE;

    this.logger.log(`Database isolation mode: ${this.isolationMode}`);

    // Register default connection
    this.connectionPool.set(this.DEFAULT_CONNECTION_ID, this.defaultPrisma);
  }

  /**
   * Get Prisma client for current tenant context
   *
   * Current behavior: Always returns default connection
   * Future behavior: Returns tenant-specific connection if DB_PER_TENANT mode
   */
  getClient(): PrismaService {
    if (this.isolationMode === DatabaseIsolationMode.SHARED_DATABASE) {
      // Current model: Single database, use default connection
      return this.defaultPrisma;
    }

    // Future model: Database per tenant
    return this.getClientForTenant();
  }

  /**
   * Get Prisma client explicitly for a specific tenant
   * Useful for system operations that need to access specific tenant data
   */
  getClientForCompany(companyId: string): PrismaService {
    if (this.isolationMode === DatabaseIsolationMode.SHARED_DATABASE) {
      // In shared mode, all companies use same connection
      return this.defaultPrisma;
    }

    // Future: Look up tenant-specific connection
    const connectionId = this.getConnectionIdForCompany(companyId);
    return this.getOrCreateConnection(connectionId);
  }

  /**
   * Get the default Prisma client (bypasses tenant isolation)
   * Use with caution - only for system-level operations
   */
  getDefaultClient(): PrismaService {
    return this.defaultPrisma;
  }

  /**
   * Get current isolation mode
   */
  getIsolationMode(): DatabaseIsolationMode {
    return this.isolationMode;
  }

  /**
   * Check if using shared database model
   */
  isSharedDatabase(): boolean {
    return this.isolationMode === DatabaseIsolationMode.SHARED_DATABASE;
  }

  /**
   * FUTURE: Get client for tenant from context
   * Not fully implemented - placeholder for DB-per-tenant migration
   */
  private getClientForTenant(): PrismaService {
    const context = this.tenantContext.getCurrentContext();

    if (!context?.companyId) {
      // No tenant context - use default (for super admin)
      this.logger.debug('No tenant in context, using default connection');
      return this.defaultPrisma;
    }

    const connectionId = this.getConnectionIdForCompany(context.companyId);
    return this.getOrCreateConnection(connectionId);
  }

  /**
   * FUTURE: Get or create connection for a specific ID
   * Placeholder for connection pool management
   */
  private getOrCreateConnection(connectionId: string): PrismaService {
    // For now, always return default
    // Future: Implement connection pooling per tenant
    let connection = this.connectionPool.get(connectionId);

    if (!connection) {
      this.logger.warn(
        `Connection ${connectionId} not found, using default. ` +
          'DB-per-tenant not fully implemented.',
      );
      connection = this.defaultPrisma;
    }

    return connection;
  }

  /**
   * FUTURE: Map company ID to connection ID
   * In DB-per-tenant mode, this would look up the company's database config
   */
  private getConnectionIdForCompany(companyId: string): string {
    // Future implementation:
    // 1. Look up company in system database
    // 2. Get connection string from company config
    // 3. Return connection ID (could be company ID itself)

    // For now, always use default
    return this.DEFAULT_CONNECTION_ID;
  }

  /**
   * FUTURE: Provision a new database for a tenant
   * Called when creating a new company in DB-per-tenant mode
   */
  async provisionTenantDatabase(companyId: string): Promise<void> {
    if (this.isolationMode === DatabaseIsolationMode.SHARED_DATABASE) {
      // Nothing to do in shared mode
      return;
    }

    // Future implementation:
    // 1. Create new database
    // 2. Run migrations
    // 3. Store connection string in company config
    // 4. Add to connection pool

    throw new Error('DB-per-tenant provisioning not implemented');
  }

  /**
   * Cleanup connections on module destroy
   */
  async onModuleDestroy() {
    // Disconnect all pooled connections except default
    for (const [id, connection] of this.connectionPool.entries()) {
      if (id !== this.DEFAULT_CONNECTION_ID) {
        try {
          await connection.$disconnect();
          this.logger.log(`Disconnected tenant connection: ${id}`);
        } catch (error) {
          this.logger.error(`Error disconnecting ${id}:`, error);
        }
      }
    }
    this.connectionPool.clear();
  }
}
