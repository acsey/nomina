import { useState, useMemo, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { useTheme } from '../contexts/ThemeContext';
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
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: typeof HomeIcon;
  roles?: string[];
  requiresMultiCompany?: boolean;
  category?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, category: 'principal' },
  { name: 'Mi Portal', href: '/my-portal', icon: UserIcon, category: 'principal' },
  { name: 'Empleados', href: '/employees', icon: UsersIcon, roles: ['admin', 'rh', 'manager'], category: 'personal' },
  { name: 'Departamentos', href: '/departments', icon: BuildingOfficeIcon, roles: ['admin', 'rh'], category: 'personal' },
  { name: 'Usuarios', href: '/users', icon: UserGroupIcon, roles: ['admin', 'rh', 'manager'], category: 'personal' },
  { name: 'Nomina', href: '/payroll', icon: BanknotesIcon, roles: ['admin', 'rh'], category: 'nomina' },
  { name: 'Recibos', href: '/payroll/receipts', icon: DocumentTextIcon, roles: ['admin', 'rh'], category: 'nomina' },
  { name: 'Incidencias', href: '/incidents', icon: ExclamationTriangleIcon, roles: ['admin', 'rh', 'manager'], category: 'nomina' },
  { name: 'Asistencia', href: '/attendance', icon: ClockIcon, roles: ['admin', 'rh', 'manager'], category: 'control' },
  { name: 'Horarios', href: '/work-schedules', icon: ClockIcon, roles: ['admin', 'rh', 'company_admin'], category: 'control' },
  { name: 'Dispositivos', href: '/devices', icon: ComputerDesktopIcon, roles: ['admin', 'rh', 'company_admin'], category: 'control' },
  { name: 'Vacaciones', href: '/vacations', icon: CalendarDaysIcon, roles: ['admin', 'rh', 'manager'], category: 'prestaciones' },
  { name: 'Prestaciones', href: '/benefits', icon: GiftIcon, roles: ['admin', 'rh'], category: 'prestaciones' },
  { name: 'Reportes', href: '/reports', icon: DocumentChartBarIcon, roles: ['admin', 'rh', 'company_admin'], category: 'reportes' },
  { name: 'Carga Masiva', href: '/bulk-upload', icon: ArrowUpTrayIcon, roles: ['admin', 'rh'], category: 'reportes' },
  { name: 'Empresas', href: '/companies', icon: BuildingOffice2Icon, roles: ['admin'], requiresMultiCompany: true, category: 'config' },
  { name: 'Config. Empresa', href: '/company-config', icon: CogIcon, roles: ['admin', 'rh'], category: 'config' },
  { name: 'Config. Contable', href: '/accounting-config', icon: CalculatorIcon, roles: ['admin', 'company_admin'], category: 'config' },
  { name: 'Config. Sistema', href: '/system-settings', icon: Cog8ToothIcon, roles: ['admin'], category: 'config' },
  { name: 'Ayuda', href: '/help', icon: QuestionMarkCircleIcon, category: 'ayuda' },
];

const categoryLabels: Record<string, string> = {
  principal: 'Principal',
  personal: 'Personal',
  nomina: 'Nomina',
  control: 'Control',
  prestaciones: 'Prestaciones',
  reportes: 'Reportes',
  config: 'Configuracion',
  ayuda: 'Ayuda',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { multiCompanyEnabled } = useSystemConfig();
  const { isDark, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter navigation based on role and multiCompany setting
  const filteredNavigation = useMemo(() => {
    return navigation.filter((item) => {
      const hasRoleAccess = !item.roles || item.roles.includes(user?.role || '');
      const meetsMultiCompanyReq = !item.requiresMultiCompany || multiCompanyEnabled;
      return hasRoleAccess && meetsMultiCompanyReq;
    });
  }, [user?.role, multiCompanyEnabled]);

  // Group navigation by category
  const groupedNavigation = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    filteredNavigation.forEach((item) => {
      const category = item.category || 'otros';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [filteredNavigation]);

  const renderNavItem = (item: NavItem, onClick?: () => void) => (
    <NavLink
      key={item.name}
      to={item.href}
      onClick={onClick}
      title={sidebarCollapsed ? item.name : undefined}
      className={({ isActive }) =>
        `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }`
      }
    >
      <item.icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
      {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />

        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800">
          <div className="flex h-14 items-center justify-between px-4 border-b dark:border-gray-700">
            <span className="text-lg font-bold text-primary-600">Nomina</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
            {Object.entries(groupedNavigation).map(([category, items]) => (
              <div key={category}>
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {categoryLabels[category] || category}
                </p>
                <div className="space-y-1">
                  {items.map((item) => renderNavItem(item, () => setSidebarOpen(false)))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-56'
      }`}>
        <div className="flex flex-col flex-1 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
          <div className={`flex h-14 items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between px-4'} border-b dark:border-gray-700`}>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-primary-600">Nomina</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              title={sidebarCollapsed ? 'Expandir menu' : 'Colapsar menu'}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="h-5 w-5" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto">
            {Object.entries(groupedNavigation).map(([category, items]) => (
              <div key={category}>
                {!sidebarCollapsed && (
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {categoryLabels[category] || category}
                  </p>
                )}
                {sidebarCollapsed && (
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2 mx-2" />
                )}
                <div className="space-y-0.5">
                  {items.map((item) => renderNavItem(item))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 items-center gap-x-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-x-3">
            {/* Theme toggle button */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* User menu dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <UserCircleIcon className="h-7 w-7 text-gray-400" />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
                </div>
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-3 border-b dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <NavLink
                      to="/my-portal"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <UserIcon className="h-4 w-4" />
                      Mi Portal
                    </NavLink>
                    <NavLink
                      to="/help"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <QuestionMarkCircleIcon className="h-4 w-4" />
                      Ayuda
                    </NavLink>
                  </div>
                  <div className="border-t dark:border-gray-700 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Cerrar sesion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
