/**
 * Sistema de Permisos Granulares para Nómina Mexicana
 *
 * Formato: "RESOURCE_ACTION" o con scope "RESOURCE_ACTION_SCOPE"
 *
 * Scopes disponibles:
 * - OWN: Solo recursos propios del usuario
 * - COMPANY: Recursos de la empresa del usuario
 * - SUBORDINATES: Recursos de subordinados directos
 * - ALL: Todos los recursos (super admin)
 */

// ============================================
// PERMISOS DE EMPLEADOS
// ============================================
export const EMPLOYEE_PERMISSIONS = {
  READ: 'employees:read',
  READ_OWN: 'employees:read:own',
  READ_COMPANY: 'employees:read:company',
  READ_SUBORDINATES: 'employees:read:subordinates',
  CREATE: 'employees:create',
  UPDATE: 'employees:update',
  UPDATE_OWN: 'employees:update:own',
  DELETE: 'employees:delete',
  FULL_ACCESS: 'employees:*',
} as const;

// ============================================
// PERMISOS DE NÓMINA
// ============================================
export const PAYROLL_PERMISSIONS = {
  // Lectura
  READ: 'payroll:read',
  READ_OWN: 'payroll:read:own', // Ver solo sus propios recibos
  READ_COMPANY: 'payroll:read:company',

  // Cálculo
  CALCULATE: 'payroll:calculate', // Puede ejecutar cálculo de nómina
  PREVIEW: 'payroll:preview', // Puede previsualizar sin guardar

  // Aprobación
  APPROVE: 'payroll:approve', // Puede aprobar nómina calculada

  // Autorización de timbrado (separado de aprobación)
  AUTHORIZE_STAMPING: 'payroll:authorize_stamping', // Puede autorizar timbrado
  REVOKE_STAMPING_AUTH: 'payroll:revoke_stamping_auth', // Puede revocar autorización

  // Timbrado
  STAMP: 'payroll:stamp', // Puede ejecutar timbrado
  CANCEL_STAMP: 'payroll:cancel_stamp', // Puede cancelar CFDI

  // Cierre
  CLOSE: 'payroll:close', // Puede cerrar período

  // Recibos
  DOWNLOAD_RECEIPT: 'payroll:download_receipt',
  DOWNLOAD_RECEIPT_OWN: 'payroll:download_receipt:own',

  // Versionado
  VIEW_VERSIONS: 'payroll:view_versions',
  COMPARE_VERSIONS: 'payroll:compare_versions',

  // Auditoría fiscal
  VIEW_FISCAL_AUDIT: 'payroll:view_fiscal_audit',
  EXPORT_FISCAL_AUDIT: 'payroll:export_fiscal_audit',

  // Administración completa
  FULL_ACCESS: 'payroll:*',
} as const;

// ============================================
// PERMISOS DE INCIDENCIAS
// ============================================
export const INCIDENT_PERMISSIONS = {
  READ: 'incidents:read',
  READ_OWN: 'incidents:read:own',
  READ_SUBORDINATES: 'incidents:read:subordinates',
  CREATE: 'incidents:create',
  CREATE_SUBORDINATES: 'incidents:create:subordinates',
  UPDATE: 'incidents:update',
  DELETE: 'incidents:delete',
  APPROVE: 'incidents:approve',
  FULL_ACCESS: 'incidents:*',
} as const;

// ============================================
// PERMISOS DE VACACIONES
// ============================================
export const VACATION_PERMISSIONS = {
  READ: 'vacations:read',
  READ_OWN: 'vacations:read:own',
  READ_SUBORDINATES: 'vacations:read:subordinates',
  REQUEST: 'vacations:request',
  APPROVE: 'vacations:approve',
  REJECT: 'vacations:reject',
  CANCEL: 'vacations:cancel',
  FULL_ACCESS: 'vacations:*',
} as const;

// ============================================
// PERMISOS DE PRESTACIONES
// ============================================
export const BENEFIT_PERMISSIONS = {
  READ: 'benefits:read',
  CREATE: 'benefits:create',
  UPDATE: 'benefits:update',
  DELETE: 'benefits:delete',
  ASSIGN: 'benefits:assign',
  APPROVE: 'benefits:approve',
  FULL_ACCESS: 'benefits:*',
} as const;

// ============================================
// PERMISOS DE CONFIGURACIÓN CONTABLE
// ============================================
export const ACCOUNTING_CONFIG_PERMISSIONS = {
  READ: 'accounting_config:read',
  UPDATE: 'accounting_config:update',
  CREATE_FORMULA: 'accounting_config:create_formula',
  UPDATE_FORMULA: 'accounting_config:update_formula',
  DELETE_FORMULA: 'accounting_config:delete_formula',
  VERSION_FORMULA: 'accounting_config:version_formula',
  FULL_ACCESS: 'accounting_config:*',
} as const;

// ============================================
// PERMISOS DE CFDI
// ============================================
export const CFDI_PERMISSIONS = {
  READ: 'cfdi:read',
  GENERATE: 'cfdi:generate',
  STAMP: 'cfdi:stamp',
  CANCEL: 'cfdi:cancel',
  DOWNLOAD_XML: 'cfdi:download_xml',
  DOWNLOAD_PDF: 'cfdi:download_pdf',
  VIEW_ERRORS: 'cfdi:view_errors',
  RETRY_STAMP: 'cfdi:retry_stamp',
  FULL_ACCESS: 'cfdi:*',
} as const;

// ============================================
// PERMISOS DE DOCUMENTOS FISCALES
// ============================================
export const FISCAL_DOCUMENT_PERMISSIONS = {
  READ: 'fiscal_docs:read',
  DOWNLOAD: 'fiscal_docs:download',
  VERIFY_INTEGRITY: 'fiscal_docs:verify_integrity',
  DELETE: 'fiscal_docs:delete',
  FULL_ACCESS: 'fiscal_docs:*',
} as const;

// ============================================
// PERMISOS DE REPORTES
// ============================================
export const REPORT_PERMISSIONS = {
  VIEW_PAYROLL: 'reports:payroll',
  VIEW_IMSS: 'reports:imss',
  VIEW_ISR: 'reports:isr',
  VIEW_ANALYTICS: 'reports:analytics',
  EXPORT: 'reports:export',
  FULL_ACCESS: 'reports:*',
} as const;

// ============================================
// PERMISOS DE ADMINISTRACIÓN
// ============================================
export const ADMIN_PERMISSIONS = {
  MANAGE_USERS: 'admin:users',
  MANAGE_ROLES: 'admin:roles',
  MANAGE_COMPANY: 'admin:company',
  MANAGE_PAC: 'admin:pac',
  MANAGE_CERTIFICATES: 'admin:certificates',
  VIEW_AUDIT_LOGS: 'admin:audit_logs',
  SYSTEM_CONFIG: 'admin:system_config',
  FULL_ACCESS: 'admin:*',
} as const;

// ============================================
// SUPER ADMIN (ACCESO TOTAL)
// ============================================
export const SUPER_ADMIN_PERMISSION = '*';

// ============================================
// ROLES PREDEFINIDOS
// ============================================
export const PREDEFINED_ROLES = {
  SUPER_ADMIN: {
    name: 'super_admin',
    description: 'Acceso total al sistema',
    permissions: [SUPER_ADMIN_PERMISSION],
  },
  COMPANY_ADMIN: {
    name: 'company_admin',
    description: 'Administrador de empresa',
    permissions: [
      EMPLOYEE_PERMISSIONS.FULL_ACCESS,
      PAYROLL_PERMISSIONS.FULL_ACCESS,
      INCIDENT_PERMISSIONS.FULL_ACCESS,
      VACATION_PERMISSIONS.FULL_ACCESS,
      BENEFIT_PERMISSIONS.FULL_ACCESS,
      ACCOUNTING_CONFIG_PERMISSIONS.FULL_ACCESS,
      CFDI_PERMISSIONS.FULL_ACCESS,
      FISCAL_DOCUMENT_PERMISSIONS.FULL_ACCESS,
      REPORT_PERMISSIONS.FULL_ACCESS,
      ADMIN_PERMISSIONS.MANAGE_USERS,
      ADMIN_PERMISSIONS.MANAGE_COMPANY,
      ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
    ],
  },
  RH_MANAGER: {
    name: 'rh_manager',
    description: 'Gerente de Recursos Humanos',
    permissions: [
      EMPLOYEE_PERMISSIONS.READ_COMPANY,
      EMPLOYEE_PERMISSIONS.CREATE,
      EMPLOYEE_PERMISSIONS.UPDATE,
      PAYROLL_PERMISSIONS.READ_COMPANY,
      PAYROLL_PERMISSIONS.CALCULATE,
      PAYROLL_PERMISSIONS.PREVIEW,
      PAYROLL_PERMISSIONS.APPROVE,
      PAYROLL_PERMISSIONS.VIEW_VERSIONS,
      PAYROLL_PERMISSIONS.VIEW_FISCAL_AUDIT,
      INCIDENT_PERMISSIONS.FULL_ACCESS,
      VACATION_PERMISSIONS.FULL_ACCESS,
      BENEFIT_PERMISSIONS.FULL_ACCESS,
      REPORT_PERMISSIONS.FULL_ACCESS,
    ],
  },
  PAYROLL_AUTHORIZER: {
    name: 'payroll_authorizer',
    description: 'Autorizador de nómina y timbrado',
    permissions: [
      PAYROLL_PERMISSIONS.READ_COMPANY,
      PAYROLL_PERMISSIONS.APPROVE,
      PAYROLL_PERMISSIONS.AUTHORIZE_STAMPING,
      PAYROLL_PERMISSIONS.REVOKE_STAMPING_AUTH,
      PAYROLL_PERMISSIONS.VIEW_VERSIONS,
      PAYROLL_PERMISSIONS.COMPARE_VERSIONS,
      PAYROLL_PERMISSIONS.VIEW_FISCAL_AUDIT,
      CFDI_PERMISSIONS.READ,
      FISCAL_DOCUMENT_PERMISSIONS.READ,
      FISCAL_DOCUMENT_PERMISSIONS.VERIFY_INTEGRITY,
    ],
  },
  PAYROLL_OPERATOR: {
    name: 'payroll_operator',
    description: 'Operador de nómina',
    permissions: [
      EMPLOYEE_PERMISSIONS.READ_COMPANY,
      PAYROLL_PERMISSIONS.READ_COMPANY,
      PAYROLL_PERMISSIONS.CALCULATE,
      PAYROLL_PERMISSIONS.PREVIEW,
      PAYROLL_PERMISSIONS.STAMP,
      PAYROLL_PERMISSIONS.VIEW_VERSIONS,
      INCIDENT_PERMISSIONS.READ,
      INCIDENT_PERMISSIONS.CREATE,
      CFDI_PERMISSIONS.READ,
      CFDI_PERMISSIONS.GENERATE,
      CFDI_PERMISSIONS.STAMP,
      CFDI_PERMISSIONS.VIEW_ERRORS,
      CFDI_PERMISSIONS.RETRY_STAMP,
      REPORT_PERMISSIONS.VIEW_PAYROLL,
    ],
  },
  SUPERVISOR: {
    name: 'supervisor',
    description: 'Supervisor de departamento',
    permissions: [
      EMPLOYEE_PERMISSIONS.READ_SUBORDINATES,
      PAYROLL_PERMISSIONS.READ_OWN,
      INCIDENT_PERMISSIONS.READ_SUBORDINATES,
      INCIDENT_PERMISSIONS.CREATE_SUBORDINATES,
      INCIDENT_PERMISSIONS.APPROVE,
      VACATION_PERMISSIONS.READ_SUBORDINATES,
      VACATION_PERMISSIONS.APPROVE,
      VACATION_PERMISSIONS.REJECT,
    ],
  },
  EMPLOYEE: {
    name: 'employee',
    description: 'Empleado estándar',
    permissions: [
      EMPLOYEE_PERMISSIONS.READ_OWN,
      EMPLOYEE_PERMISSIONS.UPDATE_OWN,
      PAYROLL_PERMISSIONS.READ_OWN,
      PAYROLL_PERMISSIONS.DOWNLOAD_RECEIPT_OWN,
      INCIDENT_PERMISSIONS.READ_OWN,
      VACATION_PERMISSIONS.READ_OWN,
      VACATION_PERMISSIONS.REQUEST,
    ],
  },
  AUDITOR: {
    name: 'auditor',
    description: 'Auditor fiscal/contable (solo lectura)',
    permissions: [
      EMPLOYEE_PERMISSIONS.READ_COMPANY,
      PAYROLL_PERMISSIONS.READ_COMPANY,
      PAYROLL_PERMISSIONS.VIEW_VERSIONS,
      PAYROLL_PERMISSIONS.COMPARE_VERSIONS,
      PAYROLL_PERMISSIONS.VIEW_FISCAL_AUDIT,
      PAYROLL_PERMISSIONS.EXPORT_FISCAL_AUDIT,
      CFDI_PERMISSIONS.READ,
      CFDI_PERMISSIONS.DOWNLOAD_XML,
      CFDI_PERMISSIONS.DOWNLOAD_PDF,
      FISCAL_DOCUMENT_PERMISSIONS.READ,
      FISCAL_DOCUMENT_PERMISSIONS.DOWNLOAD,
      FISCAL_DOCUMENT_PERMISSIONS.VERIFY_INTEGRITY,
      REPORT_PERMISSIONS.FULL_ACCESS,
      ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
    ],
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verifica si un permiso tiene acceso a un recurso
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  // Permiso total
  if (userPermissions.includes(SUPER_ADMIN_PERMISSION)) {
    return true;
  }

  // Match exacto
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Parse del permiso requerido
  const [resource, action, scope] = requiredPermission.split(':');

  // Wildcard de recurso (e.g., "payroll:*" permite "payroll:read")
  if (userPermissions.includes(`${resource}:*`)) {
    return true;
  }

  // Si el usuario tiene permiso sin scope, tiene acceso a todos los scopes
  // e.g., "payroll:read" permite "payroll:read:own"
  if (scope && userPermissions.includes(`${resource}:${action}`)) {
    return true;
  }

  return false;
}

/**
 * Verifica si el usuario tiene al menos uno de los permisos requeridos
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((perm) =>
    hasPermission(userPermissions, perm),
  );
}

/**
 * Verifica si el usuario tiene todos los permisos requeridos
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.every((perm) =>
    hasPermission(userPermissions, perm),
  );
}

/**
 * Obtiene el scope de un permiso del usuario para un recurso específico
 */
export function getPermissionScope(
  userPermissions: string[],
  resource: string,
  action: string,
): 'all' | 'company' | 'subordinates' | 'own' | null {
  // Super admin
  if (userPermissions.includes(SUPER_ADMIN_PERMISSION)) {
    return 'all';
  }

  // Wildcard de recurso
  if (userPermissions.includes(`${resource}:*`)) {
    return 'all';
  }

  // Permiso sin scope = acceso completo a esa acción
  if (userPermissions.includes(`${resource}:${action}`)) {
    return 'all';
  }

  // Buscar el scope más amplio
  if (userPermissions.includes(`${resource}:${action}:company`)) {
    return 'company';
  }

  if (userPermissions.includes(`${resource}:${action}:subordinates`)) {
    return 'subordinates';
  }

  if (userPermissions.includes(`${resource}:${action}:own`)) {
    return 'own';
  }

  return null;
}

// Exportar todos los permisos como un objeto único
export const ALL_PERMISSIONS = {
  EMPLOYEE: EMPLOYEE_PERMISSIONS,
  PAYROLL: PAYROLL_PERMISSIONS,
  INCIDENT: INCIDENT_PERMISSIONS,
  VACATION: VACATION_PERMISSIONS,
  BENEFIT: BENEFIT_PERMISSIONS,
  ACCOUNTING_CONFIG: ACCOUNTING_CONFIG_PERMISSIONS,
  CFDI: CFDI_PERMISSIONS,
  FISCAL_DOCUMENT: FISCAL_DOCUMENT_PERMISSIONS,
  REPORT: REPORT_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
} as const;
