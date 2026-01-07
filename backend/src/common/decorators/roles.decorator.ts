import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../constants/roles';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles can access a route
 * @param roles - Array of RoleName values
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

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
