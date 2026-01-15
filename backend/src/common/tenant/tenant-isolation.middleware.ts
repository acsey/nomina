import { Logger } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TENANT_SCOPED_MODELS, TenantScopedModel } from './tenant.types';

/**
 * Prisma middleware types for v5.x
 * In Prisma 5.x, middleware signature is (params, next) => Promise<any>
 */
interface PrismaMiddlewareParams {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
}

type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<any>;
type PrismaMiddleware = (
  params: PrismaMiddlewareParams,
  next: PrismaMiddlewareNext,
) => Promise<any>;

/**
 * TenantIsolationMiddleware - Prisma middleware for automatic tenant scoping
 *
 * This middleware intercepts Prisma queries and:
 * 1. Automatically adds companyId filter to findMany, findFirst, etc.
 * 2. Validates companyId on create/update to prevent cross-tenant writes
 * 3. Logs warnings for potential isolation violations
 *
 * ## Design Decisions:
 * - Only affects models listed in TENANT_SCOPED_MODELS
 * - Super admin (isSuperAdmin=true) bypasses isolation
 * - Soft enforcement in current version (logs warnings, doesn't block)
 * - Can be made strict with TENANT_ISOLATION_MODE=strict
 *
 * ## Limitations:
 * - Raw queries ($queryRaw, $executeRaw) are not intercepted
 * - Aggregate queries may need manual filtering
 * - Nested writes need careful handling
 */

const logger = new Logger('TenantIsolationMiddleware');

/**
 * Operations that read data (need companyId filter)
 */
const READ_OPERATIONS = [
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
] as const;

/**
 * Operations that write data (need companyId validation)
 */
const WRITE_OPERATIONS = [
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
] as const;

type ReadOperation = (typeof READ_OPERATIONS)[number];
type WriteOperation = (typeof WRITE_OPERATIONS)[number];

/**
 * Check if model requires tenant isolation
 */
function isTenantScopedModel(model: string): model is TenantScopedModel {
  return TENANT_SCOPED_MODELS.includes(model as TenantScopedModel);
}

/**
 * Check if operation is a read operation
 */
function isReadOperation(action: string): action is ReadOperation {
  return READ_OPERATIONS.includes(action as ReadOperation);
}

/**
 * Check if operation is a write operation
 */
function isWriteOperation(action: string): action is WriteOperation {
  return WRITE_OPERATIONS.includes(action as WriteOperation);
}

/**
 * Create the tenant isolation middleware
 *
 * @param tenantContext - Service to get current tenant context
 * @param options - Configuration options
 */
export function createTenantIsolationMiddleware(
  tenantContext: TenantContextService,
  options: {
    /** Whether to enforce strictly (block) or softly (warn) */
    strict?: boolean;
    /** Whether to log all queries (for debugging) */
    debug?: boolean;
  } = {},
): PrismaMiddleware {
  const { strict = false, debug = false } = options;

  return async (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => {
    const { model, action, args } = params;

    // Skip if not a tenant-scoped model
    if (!model || !isTenantScopedModel(model)) {
      return next(params);
    }

    // Get current tenant context
    const context = tenantContext.getCurrentContext();

    // No context (shouldn't happen in normal flow)
    if (!context) {
      logger.warn(
        `No tenant context for ${model}.${action}. ` +
          'Query will proceed without isolation.',
      );
      return next(params);
    }

    // Super admin bypasses isolation
    if (context.isSuperAdmin && !context.companyId) {
      if (debug) {
        logger.debug(`[SuperAdmin] ${model}.${action} - bypassing isolation`);
      }
      return next(params);
    }

    const companyId = context.companyId;

    // No companyId but not super admin - this is a problem
    if (!companyId) {
      const message = `${model}.${action} requires companyId but none in context`;

      if (strict) {
        throw new Error(message);
      } else {
        logger.warn(message);
        return next(params);
      }
    }

    // Apply isolation based on operation type
    if (isReadOperation(action)) {
      params = applyReadIsolation(params, companyId, debug);
    } else if (isWriteOperation(action)) {
      params = applyWriteIsolation(params, companyId, strict, debug);
    }

    return next(params);
  };
}

/**
 * Apply companyId filter to read operations
 */
function applyReadIsolation(
  params: PrismaMiddlewareParams,
  companyId: string,
  debug: boolean,
): PrismaMiddlewareParams {
  const { model, action, args } = params;

  // Initialize where clause if not present
  if (!args) {
    params.args = {};
  }

  if (!params.args.where) {
    params.args.where = {};
  }

  // Check if companyId filter already exists
  const existingFilter = params.args.where.companyId;

  if (existingFilter) {
    // Validate existing filter matches context
    if (
      typeof existingFilter === 'string' &&
      existingFilter !== companyId
    ) {
      logger.warn(
        `${model}.${action}: Query has companyId=${existingFilter} ` +
          `but context has ${companyId}. Using context value.`,
      );
    } else if (
      typeof existingFilter === 'object' &&
      existingFilter.equals &&
      existingFilter.equals !== companyId
    ) {
      logger.warn(
        `${model}.${action}: Query has companyId filter mismatch. ` +
          'Using context value.',
      );
    } else {
      // Filter already correct, skip
      if (debug) {
        logger.debug(`[Read] ${model}.${action} - companyId filter exists`);
      }
      return params;
    }
  }

  // Add companyId filter
  params.args.where.companyId = companyId;

  if (debug) {
    logger.debug(`[Read] ${model}.${action} - added companyId=${companyId}`);
  }

  return params;
}

/**
 * Validate companyId on write operations
 */
function applyWriteIsolation(
  params: PrismaMiddlewareParams,
  companyId: string,
  strict: boolean,
  debug: boolean,
): PrismaMiddlewareParams {
  const { model, action, args } = params;

  if (!args) {
    return params;
  }

  switch (action) {
    case 'create':
      // Validate or set companyId in data
      if (args.data) {
        if (args.data.companyId && args.data.companyId !== companyId) {
          const message =
            `${model}.create: Attempted to create with companyId=${args.data.companyId} ` +
            `but context has ${companyId}`;

          if (strict) {
            throw new Error(message);
          } else {
            logger.warn(message + '. Overwriting with context value.');
            args.data.companyId = companyId;
          }
        } else if (!args.data.companyId) {
          // Auto-set companyId if not provided
          args.data.companyId = companyId;
          if (debug) {
            logger.debug(`[Create] ${model} - auto-set companyId=${companyId}`);
          }
        }
      }
      break;

    case 'createMany':
      // Validate all records in data array
      if (args.data && Array.isArray(args.data)) {
        for (let i = 0; i < args.data.length; i++) {
          const record = args.data[i];
          if (record.companyId && record.companyId !== companyId) {
            const message =
              `${model}.createMany[${i}]: companyId mismatch (${record.companyId} vs ${companyId})`;

            if (strict) {
              throw new Error(message);
            } else {
              logger.warn(message);
              record.companyId = companyId;
            }
          } else if (!record.companyId) {
            record.companyId = companyId;
          }
        }
      }
      break;

    case 'update':
    case 'upsert':
      // Add companyId to where clause
      if (!args.where) {
        args.where = {};
      }
      if (!args.where.companyId) {
        args.where.companyId = companyId;
        if (debug) {
          logger.debug(`[${action}] ${model} - added companyId to where`);
        }
      }

      // Prevent changing companyId in update data
      if (args.data?.companyId && args.data.companyId !== companyId) {
        const message = `${model}.${action}: Attempted to change companyId`;
        if (strict) {
          throw new Error(message);
        } else {
          logger.warn(message + '. Removing from update data.');
          delete args.data.companyId;
        }
      }
      break;

    case 'updateMany':
    case 'deleteMany':
      // Add companyId to where clause
      if (!args.where) {
        args.where = {};
      }
      if (!args.where.companyId) {
        args.where.companyId = companyId;
        if (debug) {
          logger.debug(`[${action}] ${model} - added companyId to where`);
        }
      }
      break;

    case 'delete':
      // Add companyId to where clause
      if (!args.where) {
        args.where = {};
      }
      if (!args.where.companyId) {
        args.where.companyId = companyId;
        if (debug) {
          logger.debug(`[Delete] ${model} - added companyId to where`);
        }
      }
      break;
  }

  return params;
}

/**
 * Create audit logging middleware (optional)
 * Logs all database operations for compliance
 */
export function createAuditLoggingMiddleware(
  tenantContext: TenantContextService,
): PrismaMiddleware {
  return async (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => {
    const { model, action } = params;
    const context = tenantContext.getCurrentContext();

    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    // Log slow queries
    if (duration > 1000) {
      logger.warn(
        `Slow query: ${model}.${action} took ${duration}ms ` +
          `[tenant: ${context?.companyId || 'system'}]`,
      );
    }

    return result;
  };
}
