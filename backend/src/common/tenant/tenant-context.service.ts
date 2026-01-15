import { Injectable, Logger, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import {
  TenantContext,
  TenantResolutionSource,
} from './tenant.types';

/**
 * TenantContextService - Request-scoped tenant context using AsyncLocalStorage
 *
 * This service provides a centralized way to access and manage tenant context
 * throughout the request lifecycle, including:
 * - HTTP requests
 * - Background jobs
 * - Event handlers
 *
 * Uses Node.js AsyncLocalStorage to maintain context across async operations
 * without explicitly passing tenant info through every function call.
 *
 * ## Current Model (Single Database)
 * - companyId is stored in context
 * - Used to filter queries and validate access
 *
 * ## Future Model (Database per Tenant)
 * - connectionId will point to tenant-specific database
 * - PrismaConnectionFactory will use this to select connection
 */
@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  /**
   * AsyncLocalStorage instance for request-scoped context
   * Survives across async/await boundaries within the same request
   */
  private static readonly storage = new AsyncLocalStorage<TenantContext>();

  /**
   * Get current tenant context
   * Returns null if no context is set (should not happen in normal flow)
   */
  getCurrentContext(): TenantContext | null {
    return TenantContextService.storage.getStore() || null;
  }

  /**
   * Get current tenant context or throw if not set
   * Use this when tenant context is required
   */
  getRequiredContext(): TenantContext {
    const context = this.getCurrentContext();
    if (!context) {
      throw new Error(
        'Tenant context not initialized. Ensure TenantMiddleware is applied.',
      );
    }
    return context;
  }

  /**
   * Get current company ID
   * Returns null for super admin or system context
   */
  getCompanyId(): string | null {
    return this.getCurrentContext()?.companyId || null;
  }

  /**
   * Get current company ID or throw if not set
   * Use this when company-scoped operation is required
   */
  getRequiredCompanyId(): string {
    const context = this.getRequiredContext();
    if (!context.companyId) {
      if (context.isSuperAdmin) {
        throw new Error(
          'Company ID required but user is super admin. Use explicit companyId parameter.',
        );
      }
      throw new Error('Company ID not set in tenant context.');
    }
    return context.companyId;
  }

  /**
   * Get current user ID (for audit)
   */
  getUserId(): string | null {
    return this.getCurrentContext()?.userId || null;
  }

  /**
   * Check if current context is super admin
   */
  isSuperAdmin(): boolean {
    return this.getCurrentContext()?.isSuperAdmin || false;
  }

  /**
   * Check if tenant isolation should be bypassed
   * Only super admin can bypass
   */
  shouldBypassIsolation(): boolean {
    const context = this.getCurrentContext();
    return context?.isSuperAdmin === true && !context?.companyId;
  }

  /**
   * Run a function within a specific tenant context
   * Used by middleware and job processors to set context
   *
   * @param context - Tenant context to set
   * @param fn - Function to run within context
   */
  runWithContext<T>(context: TenantContext, fn: () => T): T {
    return TenantContextService.storage.run(context, fn);
  }

  /**
   * Run async function within a specific tenant context
   */
  async runWithContextAsync<T>(
    context: TenantContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    return TenantContextService.storage.run(context, fn);
  }

  /**
   * Create context for authenticated user
   */
  createUserContext(user: {
    id: string;
    companyId: string | null;
    role: string;
  }): TenantContext {
    const isSuperAdmin = this.checkSuperAdmin(user.role, user.companyId);

    return {
      companyId: user.companyId,
      userId: user.id,
      isSuperAdmin,
      resolvedFrom: TenantResolutionSource.USER_AUTH,
    };
  }

  /**
   * Create context for background job
   */
  createJobContext(jobData: {
    companyId?: string;
    userId?: string;
  }): TenantContext {
    return {
      companyId: jobData.companyId || null,
      userId: jobData.userId || null,
      isSuperAdmin: false,
      resolvedFrom: TenantResolutionSource.JOB_DATA,
    };
  }

  /**
   * Create system context (no tenant restriction)
   * Use with caution - only for system-level operations
   */
  createSystemContext(userId?: string): TenantContext {
    this.logger.warn(
      'Creating system context without tenant isolation. ' +
        'Ensure this is intentional.',
    );

    return {
      companyId: null,
      userId: userId || 'SYSTEM',
      isSuperAdmin: true,
      resolvedFrom: TenantResolutionSource.SYSTEM,
    };
  }

  /**
   * Create context from header (for future API key auth)
   */
  createHeaderContext(
    tenantId: string,
    userId?: string,
  ): TenantContext {
    return {
      companyId: tenantId,
      userId: userId || null,
      isSuperAdmin: false,
      resolvedFrom: TenantResolutionSource.HEADER,
    };
  }

  /**
   * Check if user is super admin based on role and companyId
   */
  private checkSuperAdmin(
    role: string,
    companyId: string | null,
  ): boolean {
    // Super admin is identified by:
    // 1. SYSTEM_ADMIN role (or legacy 'admin')
    // 2. AND no companyId (not bound to any company)
    const isAdminRole =
      role === 'SYSTEM_ADMIN' ||
      role === 'admin' ||
      role === 'super_admin';

    return isAdminRole && !companyId;
  }

  /**
   * Get context debug info (safe for logging)
   */
  getDebugInfo(): string {
    const context = this.getCurrentContext();
    if (!context) {
      return 'No tenant context';
    }

    return JSON.stringify({
      companyId: context.companyId ? `${context.companyId.slice(0, 8)}...` : null,
      userId: context.userId ? `${context.userId.slice(0, 8)}...` : null,
      isSuperAdmin: context.isSuperAdmin,
      resolvedFrom: context.resolvedFrom,
    });
  }
}
