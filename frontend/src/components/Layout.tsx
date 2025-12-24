import { useState, useMemo, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  RectangleGroupIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: typeof HomeIcon;
  roles?: string[];
  requiresMultiCompany?: boolean;
  category: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, category: 'principal' },
  { name: 'Mi Portal', href: '/my-portal', icon: UserIcon, category: 'principal' },
  { name: 'Empleados', href: '/employees', icon: UsersIcon, roles: ['admin', 'rh', 'manager'], category: 'personal' },
  { name: 'Departamentos', href: '/departments', icon: BuildingOfficeIcon, roles: ['admin', 'rh'], category: 'personal' },
  { name: 'Usuarios', href: '/users', icon: UserGroupIcon, roles: ['admin', 'rh', 'manager'], category: 'personal' },
  { name: 'Organigrama', href: '/org-chart', icon: RectangleGroupIcon, category: 'personal' },
  { name: 'Nomina', href: '/payroll', icon: BanknotesIcon, roles: ['admin', 'rh'], category: 'nomina' },
  { name: 'Recibos', href: '/payroll/receipts', icon: DocumentTextIcon, roles: ['admin', 'rh'], category: 'nomina' },
  { name: 'Incidencias', href: '/incidents', icon: ExclamationTriangleIcon, roles: ['admin', 'rh', 'manager'], category: 'nomina' },
  { name: 'Checador Web', href: '/timeclock', icon: ClockIcon, category: 'principal' },
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

const categoryConfig: Record<string, { label: string; defaultOpen: boolean }> = {
  principal: { label: 'Principal', defaultOpen: true },
  personal: { label: 'Personal', defaultOpen: true },
  nomina: { label: 'Nomina', defaultOpen: true },
  control: { label: 'Control', defaultOpen: false },
  prestaciones: { label: 'Prestaciones', defaultOpen: false },
  reportes: { label: 'Reportes', defaultOpen: false },
  config: { label: 'Configuracion', defaultOpen: false },
  ayuda: { label: 'Ayuda', defaultOpen: true },
};

const SIDEBAR_COLLAPSED_KEY = 'nomina-sidebar-collapsed';
const SIDEBAR_CATEGORIES_KEY = 'nomina-sidebar-categories';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(SIDEBAR_CATEGORIES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return Object.fromEntries(
          Object.entries(categoryConfig).map(([key, config]) => [key, config.defaultOpen])
        );
      }
    }
    return Object.fromEntries(
      Object.entries(categoryConfig).map(([key, config]) => [key, config.defaultOpen])
    );
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { multiCompanyEnabled } = useSystemConfig();
  const { isDark, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Save sidebar collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Save expanded categories state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_CATEGORIES_KEY, JSON.stringify(expandedCategories));
  }, [expandedCategories]);

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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
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

  // Check if current route is in a category
  const isActiveCategory = (items: NavItem[]) => {
    return items.some(item => location.pathname.startsWith(item.href));
  };

  const renderNavItem = (item: NavItem, onClick?: () => void, compact?: boolean) => (
    <NavLink
      key={item.name}
      to={item.href}
      onClick={onClick}
      title={sidebarCollapsed ? item.name : undefined}
      className={({ isActive }) =>
        `flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-2'} py-1.5 text-sm rounded-md transition-colors ${
          isActive
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 font-medium'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }`
      }
    >
      <item.icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'} flex-shrink-0`} />
      {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
    </NavLink>
  );

  const renderCategorySection = (category: string, items: NavItem[], isMobile?: boolean) => {
    const config = categoryConfig[category];
    const isExpanded = expandedCategories[category] ?? config?.defaultOpen ?? true;
    const isActive = isActiveCategory(items);

    if (sidebarCollapsed && !isMobile) {
      // When collapsed, show only icons with tooltip
      return (
        <div key={category} className="py-1">
          {items.map((item) => renderNavItem(item))}
        </div>
      );
    }

    return (
      <div key={category} className="mb-1">
        <button
          onClick={() => toggleCategory(category)}
          className={`w-full flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
            isActive
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <span>{config?.label || category}</span>
          <ChevronDownIcon
            className={`h-3 w-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
          />
        </button>
        {isExpanded && (
          <div className="mt-0.5 space-y-0.5 pl-1">
            {items.map((item) => renderNavItem(item, isMobile ? () => setSidebarOpen(false) : undefined))}
          </div>
        )}
      </div>
    );
  };

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

        <div className="fixed inset-y-0 left-0 flex w-56 flex-col bg-white dark:bg-gray-800">
          <div className="flex h-12 items-center justify-between px-3 border-b dark:border-gray-700">
            <span className="text-base font-bold text-primary-600">Nomina</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-2 overflow-y-auto">
            {Object.entries(groupedNavigation).map(([category, items]) =>
              renderCategorySection(category, items, true)
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-200 ${
        sidebarCollapsed ? 'lg:w-14' : 'lg:w-48'
      }`}>
        <div className="flex flex-col flex-1 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
          <div className={`flex h-12 items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between px-3'} border-b dark:border-gray-700`}>
            {!sidebarCollapsed && (
              <span className="text-base font-bold text-primary-600">Nomina</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="h-4 w-4" />
              ) : (
                <ChevronLeftIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="flex-1 px-1.5 py-2 overflow-y-auto">
            {Object.entries(groupedNavigation).map(([category, items]) =>
              renderCategorySection(category, items)
            )}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-14' : 'lg:pl-48'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-12 items-center gap-x-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-3 lg:px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-x-2">
            {/* Theme toggle button */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
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
                className="flex items-center gap-1.5 p-1.5 rounded text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <UserCircleIcon className="h-6 w-6 text-gray-400" />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-tight">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
                </div>
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
                  <div className="px-3 py-2 border-b dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <NavLink
                      to="/my-portal"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <UserIcon className="h-4 w-4" />
                      Mi Portal
                    </NavLink>
                    <NavLink
                      to="/help"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <QuestionMarkCircleIcon className="h-4 w-4" />
                      Ayuda
                    </NavLink>
                  </div>
                  <div className="border-t dark:border-gray-700 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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
        <main className="p-3 lg:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
