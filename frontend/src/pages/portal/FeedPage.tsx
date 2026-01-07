import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserGroupIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  TrophyIcon,
  CakeIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';

interface FeedItem {
  id: string;
  type: 'announcement' | 'birthday' | 'anniversary' | 'payroll' | 'recognition' | 'newHire';
  title: string;
  description: string;
  date: Date;
  icon: typeof UserGroupIcon;
  iconBg: string;
}

export default function FeedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Mock feed data - in real app this would come from API
  const feedItems: FeedItem[] = [
    {
      id: '1',
      type: 'newHire',
      title: t('portal.feed.newHires'),
      description: 'Maria Garcia se ha unido al equipo de Desarrollo',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: UserGroupIcon,
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      id: '2',
      type: 'payroll',
      title: t('notifications.messages.payrollReady'),
      description: 'Tu recibo de nomina del periodo Enero 2026 esta disponible',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      icon: BanknotesIcon,
      iconBg: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      id: '3',
      type: 'birthday',
      title: t('notifications.types.birthday'),
      description: 'Hoy es cumpleanos de Carlos Rodriguez',
      date: new Date(),
      icon: CakeIcon,
      iconBg: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    },
    {
      id: '4',
      type: 'anniversary',
      title: t('notifications.types.anniversary'),
      description: 'Ana Lopez cumple 5 anos en la empresa',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      icon: GiftIcon,
      iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      id: '5',
      type: 'recognition',
      title: t('portal.recognition.title'),
      description: 'Juan Perez recibio un reconocimiento por Trabajo en equipo',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      icon: TrophyIcon,
      iconBg: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
  ];

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('notifications.time.justNow');
    if (diffMins < 60) return t('notifications.time.minutesAgo', { minutes: diffMins });
    if (diffHours < 24) return t('notifications.time.hoursAgo', { hours: diffHours });
    if (diffDays === 1) return t('notifications.time.yesterday');
    return t('notifications.time.daysAgo', { days: diffDays });
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.firstName || '';
    if (hour < 12) return t('portal.welcome.goodMorning', { name });
    if (hour < 18) return t('portal.welcome.goodAfternoon', { name });
    return t('portal.welcome.goodEvening', { name });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
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

      {/* Feed Title */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('portal.feed.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('portal.feed.whatsNew')}
        </p>
      </div>

      {/* Feed Items */}
      <div className="space-y-4">
        {feedItems.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 p-3 rounded-full ${item.iconBg}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(item.date)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {feedItems.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {t('portal.feed.noPostsYet')}
          </h3>
        </div>
      )}
    </div>
  );
}
