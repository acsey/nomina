import { useState, useMemo, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import NotificationsDropdown from './NotificationsDropdown';
import ClockWidget from './ClockWidget';
import { isAdminRole } from '../types/roles';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ClockIcon,
  NewspaperIcon,
  ChartBarIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  ArrowsRightLeftIcon,
  RectangleGroupIcon,
  Cog8ToothIcon,
} from '@heroicons/react/24/outline';

interface PortalNavItem {
  nameKey: string;
  href: string;
  icon: typeof BanknotesIcon;
  adminOnly?: boolean; // Only show for admins
}

// Core navigation for all employees
const portalNavigation: PortalNavItem[] = [
  { nameKey: 'nav.portal.feed', href: '/portal/feed', icon: NewspaperIcon },
  { nameKey: 'nav.portal.myPayroll', href: '/portal/my-payroll', icon: BanknotesIcon },
  { nameKey: 'nav.portal.vacations', href: '/portal/vacations', icon: CalendarDaysIcon },
  { nameKey: 'nav.portal.attendance', href: '/portal/attendance', icon: ClockIcon },
  { nameKey: 'nav.portal.documents', href: '/portal/documents', icon: DocumentTextIcon },
  { nameKey: 'nav.portal.people', href: '/portal/people', icon: UsersIcon },
  { nameKey: 'nav.portal.orgChart', href: '/portal/org-chart', icon: RectangleGroupIcon },
  { nameKey: 'nav.portal.benefits', href: '/portal/benefits', icon: ChartBarIcon },
  { nameKey: 'nav.portal.recognition', href: '/portal/recognition', icon: TrophyIcon },
  { nameKey: 'nav.portal.surveys', href: '/portal/surveys', icon: ClipboardDocumentListIcon },
];

export default function PortalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { isDark, toggleDarkMode } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Check if user has admin access to show switch option
  const canSwitchToAdmin = useMemo(() => {
    return user?.role && isAdminRole(user.role);
  }, [user?.role]);

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

  const handleSwitchToAdmin = () => {
    navigate('/dashboard');
  };

  const renderNavItem = (item: PortalNavItem, onClick?: () => void) => (
    <NavLink
      key={item.href}
      to={item.href}
      onClick={onClick}
      end={item.href === '/portal'}
      className={({ isActive }) =>
        `flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 font-medium'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }`
      }
    >
      <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
      <span>{t(item.nameKey)}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />

        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b dark:border-gray-700">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary-600">Mi Portal</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
            {portalNavigation.map((item) => renderNavItem(item, () => setSidebarOpen(false)))}
          </nav>

          {/* Mobile user info */}
          <div className="border-t dark:border-gray-700 p-4">
            <div className="flex items-center">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
          {/* Logo */}
          <div className="flex h-16 items-center px-4 border-b dark:border-gray-700">
            <span className="text-xl font-bold text-primary-600">Mi Portal</span>
          </div>

          {/* User card */}
          <div className="px-4 py-4 border-b dark:border-gray-700">
            <div className="flex items-center">
              <UserCircleIcon className="h-12 w-12 text-gray-400" />
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
            {portalNavigation.map((item) => renderNavItem(item))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Clock Widget */}
          <div className="hidden md:block">
            <ClockWidget />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-x-3">
            {/* Notifications dropdown */}
            <NotificationsDropdown />

            {/* Theme toggle button */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? t('common.lightMode') : t('common.darkMode')}
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
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-3 border-b dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <NavLink
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Cog8ToothIcon className="h-4 w-4" />
                      {t('nav.user.profile')}
                    </NavLink>
                    {canSwitchToAdmin && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleSwitchToAdmin();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ArrowsRightLeftIcon className="h-4 w-4" />
                        {t('nav.user.switchToAdmin')}
                      </button>
                    )}
                  </div>

                  <div className="border-t dark:border-gray-700 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
