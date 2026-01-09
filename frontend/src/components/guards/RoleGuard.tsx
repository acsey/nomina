import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * Role names matching the backend RoleName enum
 */
export type RoleName =
  | 'SYSTEM_ADMIN'
  | 'COMPANY_ADMIN'
  | 'HR_ADMIN'
  | 'PAYROLL_ADMIN'
  | 'MANAGER'
  | 'EMPLOYEE'
  | 'AUDITOR'
  // Legacy role names (for backward compatibility)
  | 'admin'
  | 'company_admin'
  | 'rh'
  | 'manager'
  | 'employee';

/**
 * Map legacy role names to new role names
 */
const LEGACY_ROLE_MAP: Record<string, RoleName> = {
  admin: 'SYSTEM_ADMIN',
  company_admin: 'COMPANY_ADMIN',
  rh: 'HR_ADMIN',
  manager: 'MANAGER',
  employee: 'EMPLOYEE',
};

/**
 * Normalize a role to the new format
 */
export function normalizeRole(role: string): RoleName {
  if (LEGACY_ROLE_MAP[role]) {
    return LEGACY_ROLE_MAP[role];
  }
  return role as RoleName;
}

/**
 * Role hierarchy - higher roles inherit permissions from lower roles
 */
const ROLE_HIERARCHY: Record<RoleName, RoleName[]> = {
  SYSTEM_ADMIN: ['COMPANY_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN', 'MANAGER', 'EMPLOYEE', 'AUDITOR'],
  COMPANY_ADMIN: ['HR_ADMIN', 'PAYROLL_ADMIN', 'MANAGER', 'EMPLOYEE'],
  HR_ADMIN: ['EMPLOYEE'],
  PAYROLL_ADMIN: ['EMPLOYEE'],
  MANAGER: ['EMPLOYEE'],
  EMPLOYEE: [],
  AUDITOR: [],
  // Legacy roles map to their equivalents
  admin: [],
  company_admin: [],
  rh: [],
  manager: [],
  employee: [],
};

/**
 * Check if a user role has access to a required role
 */
export function hasRoleAccess(userRole: string, requiredRoles: RoleName[]): boolean {
  const normalizedUserRole = normalizeRole(userRole);

  // Check direct match
  if (requiredRoles.includes(normalizedUserRole)) {
    return true;
  }

  // Check role hierarchy
  const inheritedRoles = ROLE_HIERARCHY[normalizedUserRole] || [];
  return requiredRoles.some((required) => inheritedRoles.includes(required));
}

/**
 * Operational roles that don't have direct portal access
 */
export const OPERATIONAL_ROLES: RoleName[] = [
  'SYSTEM_ADMIN',
  'COMPANY_ADMIN',
  'HR_ADMIN',
  'PAYROLL_ADMIN',
  'MANAGER',
  'AUDITOR',
];

/**
 * Check if a role is an operational role
 */
export function isOperationalRole(role: string): boolean {
  const normalizedRole = normalizeRole(role);
  return OPERATIONAL_ROLES.includes(normalizedRole);
}

// ============================================================
// PORTAL ACCESS - REGLA ÚNICA CENTRALIZADA
// ============================================================

interface UserLike {
  employeeId?: string | null;
  role?: string;
}

/**
 * canAccessPortal - REGLA ÚNICA para acceso al portal del empleado
 *
 * REGLA: El usuario DEBE tener un employeeId válido (no null/undefined/empty)
 *
 * NO usar role === 'EMPLOYEE' para decidir acceso al portal.
 * Un EMPLOYEE sin employeeId NO puede acceder al portal.
 * Un MANAGER con employeeId SÍ puede acceder al portal.
 *
 * @param user - Usuario autenticado
 * @returns true si el usuario puede acceder al portal
 */
export function canAccessPortal(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  return Boolean(user.employeeId);
}

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: RoleName[];
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * RoleGuard - Route protection component based on user roles
 *
 * Usage:
 * <RoleGuard allowedRoles={['SYSTEM_ADMIN', 'COMPANY_ADMIN']}>
 *   <AdminPage />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  redirectTo = '/dashboard',
  fallback,
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRoleAccess(user.role, allowedRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

interface PortalGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * PortalGuard - Asegura que solo usuarios con employeeId puedan acceder al portal
 *
 * REGLA ÚNICA: canAccessPortal(user) === true
 *
 * NO se usa el role para decidir acceso. Solo employeeId.
 *
 * Usage:
 * <PortalGuard>
 *   <PortalPage />
 * </PortalGuard>
 */
export function PortalGuard({ children, redirectTo = '/dashboard' }: PortalGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // REGLA ÚNICA: El usuario debe tener employeeId
  if (!canAccessPortal(user)) {
    // Redirigir a dashboard con mensaje implícito
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

interface AdminGuardProps {
  children: ReactNode;
  showToast?: boolean;
}

/**
 * Roles permitidos para rutas administrativas
 */
export const ADMIN_ALLOWED_ROLES: RoleName[] = [
  'SYSTEM_ADMIN',
  'COMPANY_ADMIN',
  'HR_ADMIN',
  'PAYROLL_ADMIN',
  'MANAGER',
  'AUDITOR',
];

/**
 * AdminGuard - Protege rutas administrativas
 *
 * Roles permitidos: SYSTEM_ADMIN, COMPANY_ADMIN, HR_ADMIN, PAYROLL_ADMIN, MANAGER, AUDITOR
 * EMPLOYEE puro NO tiene acceso.
 *
 * Redirige a:
 * - /portal/feed si el usuario tiene employeeId
 * - /dashboard si no tiene employeeId
 */
export function AdminGuard({ children, showToast = true }: AdminGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const hasShownToast = useRef(false);

  // Determinar redirect basado en employeeId
  const redirectTo = canAccessPortal(user) ? '/portal/feed' : '/dashboard';

  // Verificar acceso
  const hasAccess = user && hasRoleAccess(user.role, ADMIN_ALLOWED_ROLES);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !hasAccess && showToast && !hasShownToast.current) {
      toast.error('No tienes permisos para acceder a esta sección');
      hasShownToast.current = true;
    }
  }, [isLoading, isAuthenticated, user, hasAccess, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * RequireRole - Higher-order component for role-based access
 */
export function RequireRole(allowedRoles: RoleName[]) {
  return function WithRoleGuard<P extends object>(Component: React.ComponentType<P>) {
    return function WrappedComponent(props: P) {
      return (
        <RoleGuard allowedRoles={allowedRoles}>
          <Component {...props} />
        </RoleGuard>
      );
    };
  };
}

export default RoleGuard;
