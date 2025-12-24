import { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  ClockIcon,
  CalendarDaysIcon,
  GiftIcon,
  DocumentChartBarIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  UserGroupIcon,
  CogIcon,
  DocumentTextIcon,
  CalculatorIcon,
  QuestionMarkCircleIcon,
  ComputerDesktopIcon,
  Cog8ToothIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: typeof HomeIcon;
  roles?: string[];
  requiresMultiCompany?: boolean; // Only show when multi-company mode is enabled
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Mi Portal', href: '/my-portal', icon: UserIcon },
  { name: 'Usuarios', href: '/users', icon: UserGroupIcon, roles: ['admin', 'rh', 'manager'] },
  { name: 'Empresas', href: '/companies', icon: BuildingOffice2Icon, roles: ['admin'], requiresMultiCompany: true },
  { name: 'Config. Empresa', href: '/company-config', icon: CogIcon, roles: ['admin', 'rh'] },
  { name: 'Empleados', href: '/employees', icon: UsersIcon, roles: ['admin', 'rh', 'manager'] },
  { name: 'Departamentos', href: '/departments', icon: BuildingOfficeIcon, roles: ['admin', 'rh'] },
  { name: 'Nomina', href: '/payroll', icon: BanknotesIcon, roles: ['admin', 'rh'] },
  { name: 'Recibos Nomina', href: '/payroll/receipts', icon: DocumentTextIcon, roles: ['admin', 'rh'] },
  { name: 'Incidencias', href: '/incidents', icon: ExclamationTriangleIcon, roles: ['admin', 'rh', 'manager'] },
  { name: 'Asistencia', href: '/attendance', icon: ClockIcon, roles: ['admin', 'rh', 'manager'] },
  { name: 'Horarios', href: '/work-schedules', icon: ClockIcon, roles: ['admin', 'rh', 'company_admin'] },
  { name: 'Dispositivos', href: '/devices', icon: ComputerDesktopIcon, roles: ['admin', 'rh', 'company_admin'] },
  { name: 'Vacaciones', href: '/vacations', icon: CalendarDaysIcon, roles: ['admin', 'rh', 'manager'] },
  { name: 'Prestaciones', href: '/benefits', icon: GiftIcon, roles: ['admin', 'rh'] },
  { name: 'Carga Masiva', href: '/bulk-upload', icon: ArrowUpTrayIcon, roles: ['admin', 'rh'] },
  { name: 'Reportes', href: '/reports', icon: DocumentChartBarIcon, roles: ['admin', 'rh', 'company_admin'] },
  { name: 'Config. Contable', href: '/accounting-config', icon: CalculatorIcon, roles: ['admin', 'company_admin'] },
  { name: 'Config. Sistema', href: '/system-settings', icon: Cog8ToothIcon, roles: ['admin'] },
  { name: 'Ayuda', href: '/help', icon: QuestionMarkCircleIcon },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { multiCompanyEnabled } = useSystemConfig();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter navigation based on role and multiCompany setting
  const filteredNavigation = useMemo(() => {
    return navigation.filter((item) => {
      // Check role permission
      const hasRoleAccess = !item.roles || item.roles.includes(user?.role || '');
      // Check multi-company requirement
      const meetsMultiCompanyReq = !item.requiresMultiCompany || multiCompanyEnabled;
      return hasRoleAccess && meetsMultiCompanyReq;
    });
  }, [user?.role, multiCompanyEnabled]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />

        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <span className="text-xl font-bold text-primary-600">Nómina</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r">
          <div className="flex h-16 items-center px-6 border-b">
            <span className="text-xl font-bold text-primary-600">
              Sistema de Nómina
            </span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
            >
              <ArrowRightOnRectangleIcon className="mr-2 h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 bg-white border-b px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-x-4">
            <span className="hidden sm:block text-sm text-gray-500">
              {user?.email}
            </span>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
