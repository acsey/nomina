# Multi-Tenant Architecture

## Overview

This document describes the multi-tenant architecture of the Nomina payroll SaaS system. The system is designed to support two deployment models:

1. **Current Model**: Single database with logical tenant isolation via `companyId`
2. **Future Model**: Database-per-tenant for physical isolation (government/enterprise deployments)

The architecture allows seamless transition between models without breaking changes.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP Request                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      JwtAuthGuard                                    │
│         Validates JWT, extracts user info (including companyId)      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TenantMiddleware                                 │
│      Creates TenantContext from user, stores in AsyncLocalStorage   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CompanyGuard                                    │
│         Validates company access, sets request.companyFilter        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Controller                                     │
│            Uses @CurrentUser() decorator to access user              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Service                                      │
│              Can access TenantContextService if needed               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PrismaService + TenantIsolationMiddleware              │
│    Automatically injects companyId filters on tenant-scoped models  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL                                     │
│           Single database with companyId column isolation            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current Model: Shared Database

### How It Works

1. All tenants share a single PostgreSQL database
2. Each tenant has a `Company` record with a unique `id`
3. Tenant-scoped tables have a `companyId` foreign key
4. **Prisma middleware** automatically injects `companyId` filters

### Tenant-Scoped Models

The following models require tenant isolation (have `companyId` column):

```
Employee, PayrollPeriod, PayrollDetail, Incident, Attendance,
LeaveRequest, Department, Position, Benefit, EmployeeBenefit,
PayrollConcept, InfonavitCredit, PensionAlimenticia, CfdiNomina,
WorkSchedule, Holiday, PayrollIncident, PayrollPerception,
PayrollDeduction, IncidentConcept, EmployeeDocument, SalaryHistory,
FiscalRule, FiscalCalculationAudit, StampingAttempt
```

### System-Level Models (Not Tenant-Scoped)

```
Company, User, Role
```

### Automatic Isolation

The `TenantIsolationMiddleware` intercepts Prisma queries and:

1. **Read operations**: Adds `WHERE companyId = ?` automatically
2. **Write operations**: Validates `companyId` matches context
3. **Super admin**: Bypasses isolation when explicitly required

---

## Future Model: Database per Tenant

### When to Use

- Government deployments requiring physical data isolation
- Enterprise clients with strict compliance requirements
- Multi-region deployments with data residency rules

### How It Will Work

1. Each tenant gets a dedicated PostgreSQL database
2. `PrismaConnectionFactory` returns tenant-specific connection
3. Connection pool manages multiple database connections
4. Migrations run per-tenant database

### Migration Path

```typescript
// Current (shared database)
DATABASE_ISOLATION_MODE=SHARED_DATABASE

// Future (database per tenant)
DATABASE_ISOLATION_MODE=DATABASE_PER_TENANT
```

The code automatically adapts based on this configuration.

---

## Key Components

### 1. TenantContextService

Request-scoped service using Node.js `AsyncLocalStorage` to maintain tenant context across async operations.

```typescript
import { TenantContextService } from '@/common/tenant';

@Injectable()
export class MyService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async doWork() {
    // Get current company ID (from JWT/context)
    const companyId = this.tenantContext.getRequiredCompanyId();

    // Check if super admin
    if (this.tenantContext.isSuperAdmin()) {
      // Handle super admin case
    }
  }
}
```

### 2. TenantMiddleware

HTTP middleware that initializes tenant context from authenticated user.

```
Request → JwtAuthGuard → TenantMiddleware → Controller
                              ↓
                     Creates TenantContext
                     Stores in AsyncLocalStorage
```

### 3. PrismaConnectionFactory

Abstraction for database connections. Currently returns default connection, future-ready for multi-database support.

```typescript
import { PrismaConnectionFactory } from '@/common/tenant';

@Injectable()
export class MyService {
  constructor(private readonly prismaFactory: PrismaConnectionFactory) {}

  async doWork() {
    // Gets appropriate Prisma client for current tenant
    const prisma = this.prismaFactory.getClient();

    // Query is automatically scoped
    return prisma.employee.findMany();
  }
}
```

### 4. TenantIsolationMiddleware

Prisma middleware that auto-injects `companyId` filters.

```typescript
// Without middleware (manual filtering - ERROR PRONE)
prisma.employee.findMany({ where: { companyId: '...' } });

// With middleware (automatic - SAFE)
prisma.employee.findMany(); // companyId filter added automatically
```

---

## Configuration

### Environment Variables

```bash
# Database isolation mode (current: SHARED_DATABASE)
DATABASE_ISOLATION_MODE=SHARED_DATABASE

# Tenant isolation strictness
# - false (default): Log warnings, allow operation
# - true: Block cross-tenant access attempts
TENANT_ISOLATION_STRICT=false

# Debug logging for tenant operations
TENANT_ISOLATION_DEBUG=false
```

### Company-Specific Configuration

Tenant-specific configuration is stored in the database, NOT in `.env`:

| Configuration | Location | Why |
|---------------|----------|-----|
| PAC credentials | `Company.pacUser`, `Company.pacPassword` | Per-tenant CFDI signing |
| Certificates | `Company.certificadoCer`, etc. | Per-tenant fiscal identity |
| IMSS info | `Company.registroPatronal` | Per-tenant government ID |
| Branding | Future: `Company.logoUrl`, etc. | White-labeling |

**Rationale**: `.env` is for infrastructure (Redis, DB connection), not tenant data.

---

## Background Jobs & Workers

### Tenant Context in Jobs

Jobs **MUST** include tenant identifiers:

```typescript
// Enqueueing a job
await queueService.addStampingJob({
  cfdiId: '...',
  companyId: tenant.companyId,  // REQUIRED
  userId: user.id,              // For audit
  // ...
});
```

### Processing with Tenant Context

```typescript
@Processor(QUEUE_NAMES.CFDI_STAMPING)
export class CfdiStampingProcessor {
  constructor(private readonly tenantContext: TenantContextService) {}

  async process(job: Job<StampingJobData>) {
    const { companyId, userId } = job.data;

    // Create tenant context for this job
    const context = this.tenantContext.createJobContext({ companyId, userId });

    // Run all operations within tenant context
    return this.tenantContext.runWithContextAsync(context, async () => {
      // All Prisma queries here are automatically scoped
      await this.processStamping(job.data);
    });
  }
}
```

---

## Security Considerations

### 1. Defense in Depth

Multiple layers prevent cross-tenant access:

1. **JWT**: Contains `companyId` claim
2. **CompanyGuard**: Validates URL/body params
3. **TenantMiddleware**: Sets context
4. **Prisma Middleware**: Auto-filters queries

### 2. Super Admin Access

Super admin (SYSTEM_ADMIN without companyId) can bypass isolation:

```typescript
// Only super admin sees all companies
if (tenantContext.isSuperAdmin()) {
  return prisma.company.findMany(); // No filter applied
}
```

### 3. Raw Query Warning

Prisma middleware cannot intercept raw queries:

```typescript
// DANGEROUS: Not protected by middleware
prisma.$queryRaw`SELECT * FROM "Employee"`; // NO companyId filter!

// SAFE: Use Prisma query builder
prisma.employee.findMany(); // Automatic filter
```

---

## Migration to DB-per-Tenant

### Step 1: Enable Configuration

```bash
DATABASE_ISOLATION_MODE=DATABASE_PER_TENANT
```

### Step 2: Implement Connection Pool

```typescript
// In PrismaConnectionFactory
private async createTenantConnection(companyId: string): Promise<PrismaService> {
  const company = await this.systemPrisma.company.findUnique({
    where: { id: companyId },
    select: { databaseUrl: true }, // New field
  });

  const prisma = new PrismaService(company.databaseUrl);
  await prisma.$connect();

  return prisma;
}
```

### Step 3: Per-Tenant Migrations

```bash
# Run migrations for specific tenant
npx prisma migrate deploy --schema=./prisma/tenant.prisma \
  --datasource-url="postgresql://..."
```

### Step 4: Tenant Provisioning

```typescript
// When creating new company
async createCompany(data: CreateCompanyDto) {
  // 1. Create database
  await this.dbAdmin.createDatabase(companySlug);

  // 2. Run migrations
  await this.dbAdmin.runMigrations(companySlug);

  // 3. Create company record (in system DB)
  return this.prisma.company.create({
    data: {
      ...data,
      databaseUrl: `postgresql://.../${companySlug}`,
    },
  });
}
```

---

## Operational Implications

### Current Model (Shared Database)

| Aspect | Implication |
|--------|-------------|
| Backup | Single backup covers all tenants |
| Migration | One migration affects all tenants |
| Performance | Large tenants may affect others |
| Security | Logical isolation via companyId |

### Future Model (DB per Tenant)

| Aspect | Implication |
|--------|-------------|
| Backup | Per-tenant backup schedules possible |
| Migration | Can migrate tenants independently |
| Performance | Isolated, can scale individually |
| Security | Physical isolation, separate credentials |

---

## Testing

### Unit Tests

```typescript
describe('TenantContextService', () => {
  it('should isolate context per async operation', async () => {
    const tenant1 = { companyId: 'company-1', userId: 'user-1' };
    const tenant2 = { companyId: 'company-2', userId: 'user-2' };

    // Concurrent operations should have isolated contexts
    await Promise.all([
      service.runWithContextAsync(tenant1, async () => {
        expect(service.getCompanyId()).toBe('company-1');
      }),
      service.runWithContextAsync(tenant2, async () => {
        expect(service.getCompanyId()).toBe('company-2');
      }),
    ]);
  });
});
```

### Integration Tests

```typescript
describe('Tenant Isolation', () => {
  it('should filter employees by company', async () => {
    // Create employees in different companies
    const emp1 = await prisma.employee.create({ companyId: 'company-1', ... });
    const emp2 = await prisma.employee.create({ companyId: 'company-2', ... });

    // Set context for company-1
    const context = tenantContext.createJobContext({ companyId: 'company-1' });

    await tenantContext.runWithContextAsync(context, async () => {
      const employees = await prisma.employee.findMany();

      // Should only see company-1 employees
      expect(employees).toHaveLength(1);
      expect(employees[0].id).toBe(emp1.id);
    });
  });
});
```

---

## Summary

| Feature | Current State | Future Ready |
|---------|---------------|--------------|
| Tenant Context | ✅ AsyncLocalStorage | ✅ |
| HTTP Middleware | ✅ TenantMiddleware | ✅ |
| Prisma Isolation | ✅ Auto companyId filter | ✅ |
| Connection Factory | ✅ Returns default | ✅ Can return per-tenant |
| Worker Isolation | ✅ Job carries companyId | ✅ |
| Config Separation | ✅ DB for tenant, env for infra | ✅ |
| Super Admin Bypass | ✅ Supported | ✅ |
| DB per Tenant | ⏳ Not implemented | ✅ Architecture ready |

The system is ready for commercial SaaS deployment while being architecturally prepared for enterprise/government deployments requiring physical tenant isolation.
