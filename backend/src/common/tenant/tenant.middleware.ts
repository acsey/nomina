import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';
import { TenantResolutionSource } from './tenant.types';

/**
 * Extended Request interface with user info from JWT
 */
interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    id?: string;
    companyId: string | null;
    role: string;
    email?: string;
  };
}

/**
 * TenantMiddleware - Initializes tenant context for each HTTP request
 *
 * This middleware runs AFTER authentication (JwtAuthGuard) to:
 * 1. Extract tenant info from authenticated user
 * 2. Check for X-Tenant-Id header (for future API key support)
 * 3. Initialize AsyncLocalStorage context for the request
 *
 * Order matters: AuthGuard -> TenantMiddleware -> Controllers
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  /** Header name for explicit tenant ID (for future use) */
  private readonly TENANT_HEADER = 'x-tenant-id';

  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Check if user is authenticated (from JWT)
    const user = req.user;

    if (user) {
      // Create context from authenticated user
      const context = this.tenantContext.createUserContext({
        id: user.sub || user.id || 'unknown',
        companyId: user.companyId,
        role: user.role,
      });

      // Run rest of request within tenant context
      this.tenantContext.runWithContext(context, () => {
        // Attach context to request for guards/controllers
        (req as any).tenantContext = context;
        next();
      });
    } else {
      // Check for tenant header (future: API key auth)
      const headerTenantId = req.headers[this.TENANT_HEADER] as string;

      if (headerTenantId) {
        // Create context from header
        const context = this.tenantContext.createHeaderContext(headerTenantId);

        this.tenantContext.runWithContext(context, () => {
          (req as any).tenantContext = context;
          next();
        });
      } else {
        // No auth context - public route or pre-auth
        // Create empty context for logging purposes
        const context = {
          companyId: null,
          userId: null,
          isSuperAdmin: false,
          resolvedFrom: TenantResolutionSource.SYSTEM,
        };

        this.tenantContext.runWithContext(context, () => {
          (req as any).tenantContext = context;
          next();
        });
      }
    }
  }
}

/**
 * Functional middleware for applying tenant context
 * Use this when you need middleware in module configuration
 */
export function createTenantMiddleware(
  tenantContext: TenantContextService,
): (req: Request, res: Response, next: NextFunction) => void {
  const middleware = new TenantMiddleware(tenantContext);
  return middleware.use.bind(middleware);
}
