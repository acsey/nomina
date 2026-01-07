import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ClockIcon,
  UserGroupIcon,
  GiftIcon,
  ArrowRightIcon,
  SunIcon,
} from '@heroicons/react/24/outline';

export default function PortalHomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.firstName || '';

    if (hour < 12) {
      return t('portal.welcome.goodMorning', { name });
    } else if (hour < 18) {
      return t('portal.welcome.goodAfternoon', { name });
    } else {
      return t('portal.welcome.goodEvening', { name });
    }
  };

  const quickAccessItems = [
    {
      nameKey: 'portal.quickAccess.viewPaystub',
      href: '/portal/my-payroll',
      icon: BanknotesIcon,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      nameKey: 'portal.quickAccess.requestVacation',
      href: '/portal/vacations',
      icon: CalendarDaysIcon,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      nameKey: 'portal.quickAccess.updateProfile',
      href: '/portal/settings',
      icon: DocumentTextIcon,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      nameKey: 'portal.quickAccess.viewBenefits',
      href: '/portal/benefits',
      icon: GiftIcon,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    },
  ];

  // Mock data for widgets
  const vacationBalance = {
    available: 12,
    used: 3,
    pending: 2,
  };

  const nextPayday = new Date();
  nextPayday.setDate(15);
  if (nextPayday < new Date()) {
    nextPayday.setMonth(nextPayday.getMonth() + 1);
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}</h1>
            <p className="mt-1 text-primary-100">
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <SunIcon className="h-16 w-16 text-primary-200 opacity-50" />
        </div>
      </div>

      {/* Quick Access Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('portal.quickAccess.title')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickAccessItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className={`p-3 rounded-full ${item.color}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <span className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200 text-center">
                {t(item.nameKey)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Widgets Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Vacation Balance Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('portal.widgets.vacationBalance')}
            </h3>
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('vacations.balance.availableDays')}
              </span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {vacationBalance.available}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{t('vacations.balance.usedDays')}</span>
              <span className="text-gray-700 dark:text-gray-300">{vacationBalance.used}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{t('vacations.balance.pendingApproval')}</span>
              <span className="text-yellow-600">{vacationBalance.pending}</span>
            </div>
          </div>
          <Link
            to="/portal/vacations"
            className="mt-4 flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('vacations.dashboard.requestVacation')}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {/* Next Payday Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('portal.widgets.nextPayday')}
            </h3>
            <BanknotesIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {nextPayday.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {Math.ceil((nextPayday.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} {t('common.day')}s
            </p>
          </div>
          <Link
            to="/portal/my-payroll"
            className="mt-2 flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('payroll.myPayroll.viewDetails')}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {/* Today's Schedule Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('portal.widgets.todaySchedule')}
            </h3>
            <ClockIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('common.from')}</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">09:00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('common.to')}</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">18:00</span>
            </div>
            <div className="pt-2 border-t dark:border-gray-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{t('portal.clock.todayHours')}</span>
                <span className="font-medium text-green-600">8h 00m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity / Feed Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('portal.feed.whatsNew')}
          </h3>
          <Link
            to="/portal/feed"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('notifications.viewAll')}
          </Link>
        </div>
        <div className="space-y-4">
          {/* Sample feed items */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {t('portal.feed.newHires')}: <strong>Maria Garcia</strong> {t('employees.timeline.hired')}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('notifications.time.hoursAgo', { hours: 2 })}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex-shrink-0 p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <BanknotesIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {t('notifications.messages.payrollReady')}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('notifications.time.yesterday')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
