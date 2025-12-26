import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * CompanyGuard - Ensures users can only access data from their own company
 *
 * This guard checks:
 * 1. Super admin (admin without companyId) - can access all companies
 * 2. Company-bound users - can only access their own company's data
 *
 * It automatically injects companyId filter into requests for company-bound users.
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Super admin (admin role without companyId) can access all companies
    if (user.role === 'admin' && !user.companyId) {
      // Inject a flag to indicate super admin access
      request.isSuperAdmin = true;
      return true;
    }

    // User must have a companyId to access company-scoped resources
    if (!user.companyId) {
      throw new ForbiddenException('Usuario no asociado a ninguna empresa');
    }

    // Inject the companyId filter into the request for use in controllers
    request.companyFilter = { companyId: user.companyId };
    request.isSuperAdmin = false;

    // If there's a companyId in the URL params, verify it matches user's company
    const params = request.params;
    if (params.companyId && params.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a los datos de esta empresa');
    }

    // If there's a companyId in the query, verify it matches
    const query = request.query;
    if (query.companyId && query.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a los datos de esta empresa');
    }

    // If there's a companyId in the body, verify it matches
    const body = request.body;
    if (body && body.companyId && body.companyId !== user.companyId) {
      // Allow setting companyId to user's own company
      if (body.companyId === user.companyId) {
        return true;
      }
      throw new ForbiddenException('No puedes crear/modificar datos para otra empresa');
    }

    return true;
  }
}
