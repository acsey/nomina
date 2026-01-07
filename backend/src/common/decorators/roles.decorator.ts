import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../constants/roles';

export const ROLES_KEY = 'roles';

/**
 * Role type that accepts both new RoleName enum values and legacy string values
 * This provides backward compatibility during migration
 */
export type RoleType = RoleName | string;

/**
 * Mapping of legacy role names to new role names
 */
export const LEGACY_ROLE_MAP: Record<string, RoleName> = {
  admin: RoleName.SYSTEM_ADMIN,
  company_admin: RoleName.COMPANY_ADMIN,
  rh: RoleName.HR_ADMIN,
  manager: RoleName.MANAGER,
  employee: RoleName.EMPLOYEE,
};

/**
 * Normalize a role to the new RoleName format
 */
export const normalizeRole = (role: RoleType): RoleName | string => {
  // If it's already a RoleName enum value, return as-is
  if (Object.values(RoleName).includes(role as RoleName)) {
    return role;
  }
  // If it's a legacy role name, map it to the new name
  if (LEGACY_ROLE_MAP[role]) {
    return LEGACY_ROLE_MAP[role];
  }
  // Return original for unknown roles
  return role;
};

/**
 * Decorator to specify which roles can access a route
 * Accepts both new RoleName enum values and legacy string values for backward compatibility
 * @param roles - Array of RoleName values or legacy role strings
 */
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator for routes that require admin access
 */
export const AdminOnly = () =>
  Roles(
    RoleName.SYSTEM_ADMIN,
    RoleName.COMPANY_ADMIN,
    RoleName.HR_ADMIN,
    RoleName.PAYROLL_ADMIN,
  );

/**
 * Decorator for routes that require system admin access
 */
export const SystemAdminOnly = () => Roles(RoleName.SYSTEM_ADMIN);

/**
 * Decorator for routes that require company admin or higher
 */
export const CompanyAdminOnly = () =>
  Roles(RoleName.SYSTEM_ADMIN, RoleName.COMPANY_ADMIN);

/**
 * Decorator for routes that require HR admin access
 */
export const HRAdminOnly = () =>
  Roles(RoleName.SYSTEM_ADMIN, RoleName.COMPANY_ADMIN, RoleName.HR_ADMIN);

/**
 * Decorator for routes that require payroll admin access
 */
export const PayrollAdminOnly = () =>
  Roles(RoleName.SYSTEM_ADMIN, RoleName.COMPANY_ADMIN, RoleName.PAYROLL_ADMIN);

/**
 * Decorator for routes that require manager or higher access
 */
export const ManagerOrAbove = () =>
  Roles(
    RoleName.SYSTEM_ADMIN,
    RoleName.COMPANY_ADMIN,
    RoleName.HR_ADMIN,
    RoleName.PAYROLL_ADMIN,
    RoleName.MANAGER,
  );

/**
 * Decorator for routes accessible by all authenticated employees
 */
export const AllEmployees = () =>
  Roles(
    RoleName.SYSTEM_ADMIN,
    RoleName.COMPANY_ADMIN,
    RoleName.HR_ADMIN,
    RoleName.PAYROLL_ADMIN,
    RoleName.MANAGER,
    RoleName.EMPLOYEE,
  );

/**
 * Decorator for audit-enabled routes (auditors + admins)
 */
export const AuditAccess = () =>
  Roles(
    RoleName.SYSTEM_ADMIN,
    RoleName.COMPANY_ADMIN,
    RoleName.AUDITOR,
  );
