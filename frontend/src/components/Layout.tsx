import { useState, useMemo, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { useTheme } from '../contexts/ThemeContext';
import { canAccessPortal } from './guards';
import NotificationsDropdown from './NotificationsDropdown';
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
  ClipboardDocumentListIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  i18nKey: string;
  href: string;
  icon: typeof HomeIcon;
  roles?: string[];
  requiresMultiCompany?: boolean;
  requiresSuperAdmin?: boolean; // Requires SYSTEM_ADMIN without companyId
  requiresEmployeeId?: boolean; // Requires user to have an employeeId
  category: string;
}

const navigation: NavItem[] = [
  { i18nKey: 'nav.main.dashboard', href: '/dashboard', icon: HomeIcon, category: 'principal' },
  // Mi Portal visible for EMPLOYEE role OR any user with employeeId
  { i18nKey: 'nav.main.myPortal', href: '/portal', icon: UserIcon, requiresEmployeeId: true, category: 'principal' },
  { i18nKey: 'nav.main.employees', href: '/employees', icon: UsersIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'MANAGER', 'admin', 'rh', 'manager'], category: 'personal' },
  { i18nKey: 'nav.main.departments', href: '/departments', icon: BuildingOfficeIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh'], category: 'personal' },
  { i18nKey: 'nav.main.users', href: '/users', icon: UserGroupIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'MANAGER', 'admin', 'rh', 'manager'], category: 'personal' },
  { i18nKey: 'nav.main.orgChart', href: '/org-chart', icon: RectangleGroupIcon, category: 'personal' },
  { i18nKey: 'nav.main.surveys', href: '/surveys', icon: ClipboardDocumentListIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh'], category: 'personal' },
  { i18nKey: 'nav.main.documents', href: '/documents-management', icon: DocumentTextIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh'], category: 'personal' },
  { i18nKey: 'nav.main.payroll', href: '/payroll', icon: BanknotesIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN', 'admin', 'rh'], category: 'nomina' },
  { i18nKey: 'nav.main.receipts', href: '/payroll/receipts', icon: DocumentTextIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN', 'admin', 'rh'], category: 'nomina' },
  { i18nKey: 'nav.main.incidents', href: '/incidents', icon: ExclamationTriangleIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'MANAGER', 'admin', 'rh', 'manager'], category: 'nomina' },
  { i18nKey: 'nav.main.webClock', href: '/timeclock', icon: ClockIcon, category: 'principal' },
  { i18nKey: 'nav.main.attendance', href: '/attendance', icon: ClockIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'MANAGER', 'admin', 'rh', 'manager'], category: 'control' },
  { i18nKey: 'nav.main.workSchedules', href: '/work-schedules', icon: ClockIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh', 'company_admin'], category: 'control' },
  { i18nKey: 'nav.main.devices', href: '/devices', icon: ComputerDesktopIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh', 'company_admin'], category: 'control' },
  { i18nKey: 'nav.main.vacations', href: '/vacations', icon: CalendarDaysIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'MANAGER', 'admin', 'rh', 'manager'], category: 'prestaciones' },
  { i18nKey: 'nav.main.benefits', href: '/benefits', icon: GiftIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh'], category: 'prestaciones' },
  { i18nKey: 'nav.main.reports', href: '/reports', icon: DocumentChartBarIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN', 'AUDITOR', 'admin', 'rh', 'company_admin'], category: 'reportes' },
  { i18nKey: 'nav.main.bulkUpload', href: '/bulk-upload', icon: ArrowUpTrayIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh'], category: 'reportes' },
  { i18nKey: 'nav.main.companies', href: '/companies', icon: BuildingOffice2Icon, roles: ['SYSTEM_ADMIN', 'admin'], requiresMultiCompany: true, category: 'config' },
  { i18nKey: 'nav.main.companyConfig', href: '/company-config', icon: CogIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh'], category: 'config' },
  { i18nKey: 'nav.main.accountingConfig', href: '/accounting-config', icon: CalculatorIcon, roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'admin', 'company_admin'], category: 'config' },
  { i18nKey: 'nav.main.systemSettings', href: '/system-settings', icon: Cog8ToothIcon, roles: ['SYSTEM_ADMIN'], requiresSuperAdmin: true, category: 'config' },
  { i18nKey: 'nav.main.help', href: '/help', icon: QuestionMarkCircleIcon, category: 'ayuda' },
];

// Category configuration with i18n keys
const categoryConfig: Record<string, { i18nKey: string; defaultOpen: boolean }> = {
  principal: { i18nKey: 'nav.sections.principal', defaultOpen: true },
  personal: { i18nKey: 'nav.sections.personal', defaultOpen: true },
  nomina: { i18nKey: 'nav.sections.payroll', defaultOpen: true },
  control: { i18nKey: 'nav.sections.control', defaultOpen: false },
  prestaciones: { i18nKey: 'nav.sections.benefits', defaultOpen: false },
  reportes: { i18nKey: 'nav.sections.reports', defaultOpen: false },
  config: { i18nKey: 'nav.sections.config', defaultOpen: false },
  ayuda: { i18nKey: 'nav.sections.help', defaultOpen: true },
};

const SIDEBAR_COLLAPSED_KEY = 'nomina-sidebar-collapsed';
const SIDEBAR_CATEGORIES_KEY = 'nomina-sidebar-categories';

export default function Layout() {
  const { t } = useTranslation();
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
      // Super admin requirement: must be SYSTEM_ADMIN without companyId
      const meetsSuperAdminReq = !item.requiresSuperAdmin || (user?.role === 'SYSTEM_ADMIN' && !user?.companyId);
      // Employee ID requirement: usa canAccessPortal (regla única)
      const meetsEmployeeIdReq = !item.requiresEmployeeId || canAccessPortal(user);
      return hasRoleAccess && meetsMultiCompanyReq && meetsSuperAdminReq && meetsEmployeeIdReq;
    });
  }, [user?.role, user?.companyId, user?.employeeId, multiCompanyEnabled]);

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

  const renderNavItem = (item: NavItem, onClick?: () => void) => {
    const itemName = t(item.i18nKey);
    return (
      <NavLink
        key={item.i18nKey}
        to={item.href}
        onClick={onClick}
        title={sidebarCollapsed ? itemName : undefined}
        className={({ isActive }) =>
          `flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-2'} py-1.5 text-sm rounded-md transition-colors ${
            isActive
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 font-medium'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
          }`
        }
      >
        <item.icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'} flex-shrink-0`} />
        {!sidebarCollapsed && <span className="truncate">{itemName}</span>}
      </NavLink>
    );
  };

  const renderCategorySection = (category: string, items: NavItem[], isMobile?: boolean) => {
    const config = categoryConfig[category];
    const isExpanded = expandedCategories[category] ?? config?.defaultOpen ?? true;
    const isActive = isActiveCategory(items);
    const categoryLabel = config?.i18nKey ? t(config.i18nKey) : category;

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
          <span>{categoryLabel}</span>
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
            <span className="text-base font-bold text-primary-600">{t('nav.brand')}</span>
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
              <span className="text-base font-bold text-primary-600">{t('nav.brand')}</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              title={sidebarCollapsed ? t('nav.actions.expand') : t('nav.actions.collapse')}
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
            {/* Notifications dropdown */}
            <NotificationsDropdown />

            {/* Theme toggle button */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? t('nav.actions.lightMode') : t('nav.actions.darkMode')}
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
                    {/* Mi Portal - usa canAccessPortal (regla única) */}
                    {canAccessPortal(user) && (
                      <NavLink
                        to="/portal"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <UserIcon className="h-4 w-4" />
                        {t('nav.main.myPortal')}
                      </NavLink>
                    )}
                    <NavLink
                      to="/help"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <QuestionMarkCircleIcon className="h-4 w-4" />
                      {t('nav.user.help')}
                    </NavLink>
                  </div>
                  <div className="border-t dark:border-gray-700 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      {t('nav.user.logout')}
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
