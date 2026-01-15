/**
 * Multi-Tenant Architecture Types
 *
 * This module defines the core types for tenant resolution and context management.
 * Designed to support:
 * - Current: Single database with companyId logical isolation
 * - Future: Database-per-tenant physical isolation
 */

/**
 * Tenant context containing all information needed for tenant scoping
 */
export interface TenantContext {
  /** Company ID - primary tenant identifier */
  companyId: string | null;

  /** User ID - for audit trails */
  userId: string | null;

  /** Whether this is a super admin (bypasses tenant isolation) */
  isSuperAdmin: boolean;

  /** Tenant resolution source for debugging/audit */
  resolvedFrom: TenantResolutionSource;

  /** Optional: Database connection identifier (for future DB-per-tenant) */
  connectionId?: string;
}

/**
 * How the tenant was resolved - useful for debugging and audit
 */
export enum TenantResolutionSource {
  /** Resolved from authenticated user's companyId */
  USER_AUTH = 'USER_AUTH',

  /** Resolved from X-Tenant-Id header (for future API key auth) */
  HEADER = 'HEADER',

  /** Resolved from job/queue data */
  JOB_DATA = 'JOB_DATA',

  /** System context (no tenant - super admin or system process) */
  SYSTEM = 'SYSTEM',

  /** Explicitly set (for testing or special cases) */
  EXPLICIT = 'EXPLICIT',
}

/**
 * Tenant configuration stored in database (Company model)
 * This interface documents what tenant-specific config is stored in DB
 */
export interface TenantConfiguration {
  // PAC (Timbrado CFDI)
  pacProvider?: string;
  pacUser?: string;
  pacPassword?: string; // Encrypted
  pacMode?: string;

  // Certificates
  certificadoCer?: string;
  certificadoKey?: string;
  certificadoPassword?: string; // Encrypted
  noCertificado?: string;

  // Company info
  rfc?: string;
  razonSocial?: string;
  regimenFiscal?: string;
  codigoPostal?: string;

  // IMSS
  registroPatronal?: string;
  riskLevel?: string;

  // Branding (for future)
  logoUrl?: string;
  primaryColor?: string;
}

/**
 * Options for tenant resolution
 */
export interface TenantResolutionOptions {
  /** Allow system context (no tenant) */
  allowSystem?: boolean;

  /** Require tenant to be resolved */
  requireTenant?: boolean;

  /** Header name to check for tenant ID */
  headerName?: string;
}

/**
 * Database isolation mode
 */
export enum DatabaseIsolationMode {
  /** Single database with companyId column (current) */
  SHARED_DATABASE = 'SHARED_DATABASE',

  /** Separate database per tenant (future) */
  DATABASE_PER_TENANT = 'DATABASE_PER_TENANT',
}

/**
 * Models that require tenant isolation (have companyId column)
 */
export const TENANT_SCOPED_MODELS = [
  'Employee',
  'PayrollPeriod',
  'PayrollDetail',
  'Incident',
  'Attendance',
  'LeaveRequest',
  'Department',
  'Position',
  'Benefit',
  'EmployeeBenefit',
  'PayrollConcept',
  'InfonavitCredit',
  'PensionAlimenticia',
  'CfdiNomina',
  'WorkSchedule',
  'Holiday',
  'PayrollIncident',
  'PayrollPerception',
  'PayrollDeduction',
  'IncidentConcept',
  'EmployeeDocument',
  'PayrollConceptDetail',
  'SalaryHistory',
  'FiscalRule',
  'FiscalCalculationAudit',
  'StampingAttempt',
  // Note: Company, User, Role are NOT tenant-scoped
  // They exist at system level
] as const;

/**
 * Models that have indirect tenant association (through relationships)
 */
export const INDIRECT_TENANT_MODELS = [
  'CfdiNomina', // via employee.companyId
  'PayrollDetail', // via payrollPeriod.companyId
  'PayrollPerception', // via payrollDetail
  'PayrollDeduction', // via payrollDetail
  'EmployeeBenefit', // via employee
  'Attendance', // via employee
  'LeaveRequest', // via employee
  'EmployeeDocument', // via employee
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];
