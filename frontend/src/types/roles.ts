/**
 * System Roles
 *
 * RBAC (Role-Based Access Control) roles for the payroll system.
 */
export enum RoleName {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  HR_ADMIN = 'HR_ADMIN',
  PAYROLL_ADMIN = 'PAYROLL_ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  AUDITOR = 'AUDITOR',
}

/**
 * Role display information
 */
export const ROLE_INFO: Record<RoleName, { nameKey: string; descriptionKey: string; color: string }> = {
  [RoleName.SYSTEM_ADMIN]: {
    nameKey: 'auth.roles.SYSTEM_ADMIN',
    descriptionKey: 'auth.roles.SYSTEM_ADMIN_desc',
    color: 'red',
  },
  [RoleName.COMPANY_ADMIN]: {
    nameKey: 'auth.roles.COMPANY_ADMIN',
    descriptionKey: 'auth.roles.COMPANY_ADMIN_desc',
    color: 'purple',
  },
  [RoleName.HR_ADMIN]: {
    nameKey: 'auth.roles.HR_ADMIN',
    descriptionKey: 'auth.roles.HR_ADMIN_desc',
    color: 'blue',
  },
  [RoleName.PAYROLL_ADMIN]: {
    nameKey: 'auth.roles.PAYROLL_ADMIN',
    descriptionKey: 'auth.roles.PAYROLL_ADMIN_desc',
    color: 'green',
  },
  [RoleName.MANAGER]: {
    nameKey: 'auth.roles.MANAGER',
    descriptionKey: 'auth.roles.MANAGER_desc',
    color: 'yellow',
  },
  [RoleName.EMPLOYEE]: {
    nameKey: 'auth.roles.EMPLOYEE',
    descriptionKey: 'auth.roles.EMPLOYEE_desc',
    color: 'gray',
  },
  [RoleName.AUDITOR]: {
    nameKey: 'auth.roles.AUDITOR',
    descriptionKey: 'auth.roles.AUDITOR_desc',
    color: 'orange',
  },
};

/**
 * Roles that have access to the admin interface
 */
export const ADMIN_ROLES: RoleName[] = [
  RoleName.SYSTEM_ADMIN,
  RoleName.COMPANY_ADMIN,
  RoleName.HR_ADMIN,
  RoleName.PAYROLL_ADMIN,
  RoleName.AUDITOR,
];

/**
 * Roles that have access to the employee portal
 */
export const PORTAL_ROLES: RoleName[] = [
  RoleName.EMPLOYEE,
  RoleName.MANAGER,
  RoleName.HR_ADMIN,
  RoleName.PAYROLL_ADMIN,
  RoleName.COMPANY_ADMIN,
];

/**
 * Check if a role is an admin role
 */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as RoleName);
}

/**
 * Check if a role has portal access
 */
export function hasPortalAccess(role: string): boolean {
  return PORTAL_ROLES.includes(role as RoleName);
}

/**
 * Get role badge color class for Tailwind
 */
export function getRoleBadgeClass(role: string): string {
  const info = ROLE_INFO[role as RoleName];
  if (!info) return 'bg-gray-100 text-gray-800';

  const colorClasses: Record<string, string> = {
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800',
    orange: 'bg-orange-100 text-orange-800',
  };

  return colorClasses[info.color] || 'bg-gray-100 text-gray-800';
}
