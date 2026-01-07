/**
 * System Roles
 *
 * RBAC (Role-Based Access Control) roles for the payroll system.
 * Each role has specific permissions and scope.
 */
export enum RoleName {
  /**
   * System Administrator
   * - Full system access across all companies
   * - System configuration and maintenance
   * - User management for all companies
   * - No company association required
   */
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',

  /**
   * Company Administrator
   * - Full access within their company scope
   * - Approve payroll, vacations, incidents
   * - Manage company settings
   * - User management for their company
   */
  COMPANY_ADMIN = 'COMPANY_ADMIN',

  /**
   * HR Administrator
   * - Employee lifecycle management
   * - Vacation and leave management
   * - Incident processing
   * - Benefits administration
   * - Reports (employee-focused)
   */
  HR_ADMIN = 'HR_ADMIN',

  /**
   * Payroll Administrator
   * - Payroll processing and calculation
   * - CFDI generation and stamping
   * - Tax calculations (ISR, IMSS, etc.)
   * - Payroll reports
   * - Cannot approve (requires COMPANY_ADMIN)
   */
  PAYROLL_ADMIN = 'PAYROLL_ADMIN',

  /**
   * Manager / Supervisor
   * - View subordinate information
   * - Approve subordinate vacations
   * - Create incidents for team
   * - View team payroll (read-only)
   * - Own employee features
   */
  MANAGER = 'MANAGER',

  /**
   * Employee
   * - View own profile and payroll
   * - Request vacations and leaves
   * - View own benefits
   * - Update contact information
   */
  EMPLOYEE = 'EMPLOYEE',

  /**
   * Auditor
   * - Read-only access to all data
   * - Audit logs access
   * - Reports and analytics
   * - Cannot modify any data
   */
  AUDITOR = 'AUDITOR',
}

/**
 * Role hierarchy for permission inheritance
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<RoleName, RoleName[]> = {
  [RoleName.SYSTEM_ADMIN]: [
    RoleName.COMPANY_ADMIN,
    RoleName.HR_ADMIN,
    RoleName.PAYROLL_ADMIN,
    RoleName.MANAGER,
    RoleName.EMPLOYEE,
    RoleName.AUDITOR,
  ],
  [RoleName.COMPANY_ADMIN]: [
    RoleName.HR_ADMIN,
    RoleName.PAYROLL_ADMIN,
    RoleName.MANAGER,
    RoleName.EMPLOYEE,
  ],
  [RoleName.HR_ADMIN]: [RoleName.EMPLOYEE],
  [RoleName.PAYROLL_ADMIN]: [RoleName.EMPLOYEE],
  [RoleName.MANAGER]: [RoleName.EMPLOYEE],
  [RoleName.EMPLOYEE]: [],
  [RoleName.AUDITOR]: [],
};

/**
 * Role permissions definitions
 */
export const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  [RoleName.SYSTEM_ADMIN]: [
    '*', // Full access
    'system:config',
    'system:maintenance',
    'companies:*',
    'users:*',
    'employees:*',
    'payroll:*',
    'incidents:*',
    'vacations:*',
    'benefits:*',
    'reports:*',
    'settings:*',
    'audit:*',
  ],

  [RoleName.COMPANY_ADMIN]: [
    'users:read:company',
    'users:write:company',
    'users:create:company',
    'employees:*:company',
    'payroll:*:company',
    'payroll:approve',
    'incidents:*:company',
    'incidents:approve',
    'vacations:*:company',
    'vacations:approve',
    'benefits:*:company',
    'benefits:approve',
    'reports:*:company',
    'settings:read:company',
    'settings:write:company',
    'audit:read:company',
  ],

  [RoleName.HR_ADMIN]: [
    'employees:read:company',
    'employees:write:company',
    'employees:create:company',
    'employees:deactivate:company',
    'incidents:*:company',
    'vacations:*:company',
    'vacations:approve:company',
    'benefits:read:company',
    'benefits:write:company',
    'benefits:assign:company',
    'reports:read:company',
    'reports:export:company',
    'profile:read:own',
    'profile:write:own',
    'attendance:*:company',
  ],

  [RoleName.PAYROLL_ADMIN]: [
    'employees:read:company',
    'payroll:read:company',
    'payroll:write:company',
    'payroll:calculate:company',
    'payroll:preview:company',
    'payroll:stamp:company',
    'payroll:cancel:company',
    'incidents:read:company',
    'vacations:read:company',
    'benefits:read:company',
    'reports:read:company',
    'reports:export:company',
    'profile:read:own',
    'profile:write:own',
  ],

  [RoleName.MANAGER]: [
    'employees:read:subordinates',
    'incidents:read:subordinates',
    'incidents:create:subordinates',
    'vacations:read:subordinates',
    'vacations:approve:subordinates',
    'payroll:read:subordinates',
    'reports:read:subordinates',
    'attendance:read:subordinates',
    'attendance:approve:subordinates',
    'profile:read:own',
    'profile:write:own',
    'payroll:read:own',
    'vacations:create:own',
    'vacations:read:own',
    'incidents:read:own',
    'benefits:read:own',
    'attendance:read:own',
    'attendance:clock:own',
  ],

  [RoleName.EMPLOYEE]: [
    'profile:read:own',
    'profile:write:own',
    'payroll:read:own',
    'vacations:create:own',
    'vacations:read:own',
    'vacations:cancel:own',
    'incidents:read:own',
    'benefits:read:own',
    'attendance:read:own',
    'attendance:clock:own',
    'documents:read:own',
    'documents:download:own',
  ],

  [RoleName.AUDITOR]: [
    'employees:read:company',
    'payroll:read:company',
    'incidents:read:company',
    'vacations:read:company',
    'benefits:read:company',
    'reports:read:company',
    'reports:export:company',
    'audit:read:company',
    'audit:export:company',
    'settings:read:company',
  ],
};

/**
 * Role display information for UI
 */
export const ROLE_INFO: Record<RoleName, { name: string; description: string; color: string }> = {
  [RoleName.SYSTEM_ADMIN]: {
    name: 'Administrador del Sistema',
    description: 'Acceso total al sistema',
    color: 'red',
  },
  [RoleName.COMPANY_ADMIN]: {
    name: 'Administrador de Empresa',
    description: 'Gestión completa de la empresa',
    color: 'purple',
  },
  [RoleName.HR_ADMIN]: {
    name: 'Administrador de RH',
    description: 'Gestión de empleados y RH',
    color: 'blue',
  },
  [RoleName.PAYROLL_ADMIN]: {
    name: 'Administrador de Nómina',
    description: 'Procesamiento de nómina',
    color: 'green',
  },
  [RoleName.MANAGER]: {
    name: 'Gerente',
    description: 'Gestión de equipo',
    color: 'yellow',
  },
  [RoleName.EMPLOYEE]: {
    name: 'Empleado',
    description: 'Acceso a información propia',
    color: 'gray',
  },
  [RoleName.AUDITOR]: {
    name: 'Auditor',
    description: 'Acceso de solo lectura para auditoría',
    color: 'orange',
  },
};

/**
 * Admin roles that have access to admin interface
 */
export const ADMIN_ROLES: RoleName[] = [
  RoleName.SYSTEM_ADMIN,
  RoleName.COMPANY_ADMIN,
  RoleName.HR_ADMIN,
  RoleName.PAYROLL_ADMIN,
  RoleName.AUDITOR,
];

/**
 * Portal roles that have access to employee portal
 */
export const PORTAL_ROLES: RoleName[] = [
  RoleName.EMPLOYEE,
  RoleName.MANAGER,
  RoleName.HR_ADMIN,
  RoleName.PAYROLL_ADMIN,
  RoleName.COMPANY_ADMIN,
];

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: RoleName, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];

  // Check for wildcard
  if (rolePermissions.includes('*')) {
    return true;
  }

  // Direct match
  if (rolePermissions.includes(permission)) {
    return true;
  }

  // Check wildcard patterns (e.g., 'employees:*' matches 'employees:read')
  const [resource, action] = permission.split(':');
  if (rolePermissions.includes(`${resource}:*`)) {
    return true;
  }
  if (rolePermissions.includes(`${resource}:*:company`)) {
    return true;
  }

  return false;
}

/**
 * Check if user role is an admin role
 */
export function isAdminRole(role: RoleName): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Check if user role has portal access
 */
export function hasPortalAccess(role: RoleName): boolean {
  return PORTAL_ROLES.includes(role);
}
