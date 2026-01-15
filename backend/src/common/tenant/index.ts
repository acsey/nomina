/**
 * Multi-Tenant Architecture Module
 *
 * Provides tenant isolation and context management for the payroll SaaS system.
 *
 * ## Quick Start:
 * ```typescript
 * // In AppModule
 * @Module({
 *   imports: [TenantModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 *
 * ## Usage in Services:
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private readonly tenantContext: TenantContextService,
 *     private readonly prismaFactory: PrismaConnectionFactory,
 *   ) {}
 *
 *   async getMyData() {
 *     // Get company ID from context
 *     const companyId = this.tenantContext.getRequiredCompanyId();
 *
 *     // Get Prisma client (auto-scoped in future DB-per-tenant)
 *     const prisma = this.prismaFactory.getClient();
 *
 *     // Query is automatically filtered by companyId via middleware
 *     return prisma.employee.findMany();
 *   }
 * }
 * ```
 *
 * ## Usage in Background Jobs:
 * ```typescript
 * async process(job: Job<MyJobData>) {
 *   const context = this.tenantContext.createJobContext({
 *     companyId: job.data.companyId,
 *     userId: job.data.userId,
 *   });
 *
 *   return this.tenantContext.runWithContextAsync(context, async () => {
 *     // All Prisma queries here are tenant-scoped
 *     await this.myService.doWork();
 *   });
 * }
 * ```
 */

// Types
export * from './tenant.types';

// Services
export { TenantContextService } from './tenant-context.service';
export { PrismaConnectionFactory } from './prisma-connection.factory';

// Middleware
export { TenantMiddleware, createTenantMiddleware } from './tenant.middleware';
export {
  createTenantIsolationMiddleware,
  createAuditLoggingMiddleware,
} from './tenant-isolation.middleware';

// Module
export { TenantModule } from './tenant.module';
