import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserGroupIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  TrophyIcon,
  CakeIcon,
  GiftIcon,
  ChevronRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  HeartIcon,
  StarIcon,
  HandThumbUpIcon,
} from '@heroicons/react/24/outline';
import { notificationsApi, portalApi } from '../../services/api';
import toast from 'react-hot-toast';

interface FeedItem {
  id: string;
  type: 'announcement' | 'birthday' | 'anniversary' | 'payroll' | 'recognition' | 'newHire' | 'vacation';
  title: string;
  description: string;
  date: Date;
  icon: typeof UserGroupIcon;
  iconBg: string;
  metadata?: {
    employeeId?: string;
    employeeName?: string;
    receiptId?: string;
    recognitionId?: string;
    requestId?: string;
  };
}

const RECOGNITION_TYPES = [
  { id: 'BIRTHDAY', icon: CakeIcon, label: 'Feliz cumpleaños', color: 'bg-pink-100 text-pink-600' },
  { id: 'ANNIVERSARY', icon: GiftIcon, label: 'Feliz aniversario', color: 'bg-purple-100 text-purple-600' },
  { id: 'KUDOS', icon: HandThumbUpIcon, label: 'Buen trabajo', color: 'bg-blue-100 text-blue-600' },
  { id: 'STAR', icon: StarIcon, label: 'Eres estrella', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'HEART', icon: HeartIcon, label: 'Gracias', color: 'bg-red-100 text-red-600' },
];

export default function FeedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [recognitionType, setRecognitionType] = useState('KUDOS');
  const [recognitionMessage, setRecognitionMessage] = useState('');
  const [preselectedType, setPreselectedType] = useState<string | null>(null);

  // Fetch notifications from API
  const { data: notificationsData } = useQuery({
    queryKey: ['feed-notifications'],
    queryFn: async () => {
      const response = await notificationsApi.getMyNotifications({ take: 20 });
      return response.data;
    },
  });

  // Send recognition mutation
  const sendRecognitionMutation = useMutation({
    mutationFn: async (data: { employeeId: string; type: string; title: string; message: string }) => {
      return portalApi.giveRecognition(data);
    },
    onSuccess: () => {
      toast.success('¡Reconocimiento enviado!');
      setShowRecognitionModal(false);
      setSelectedEmployee(null);
      setRecognitionMessage('');
      queryClient.invalidateQueries({ queryKey: ['feed-notifications'] });
    },
    onError: () => {
      toast.error('Error al enviar reconocimiento');
    },
  });

  // Transform notifications to feed items
  const transformNotificationsToFeed = (): FeedItem[] => {
    const items: FeedItem[] = [];
    const notifications = notificationsData?.data || [];

    notifications.forEach((notif: any) => {
      let feedItem: FeedItem | null = null;

      switch (notif.type) {
        case 'EMPLOYEE_BIRTHDAY':
          feedItem = {
            id: notif.id,
            type: 'birthday',
            title: t('notifications.types.birthday'),
            description: notif.message,
            date: new Date(notif.createdAt),
            icon: CakeIcon,
            iconBg: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
            metadata: {
              employeeId: notif.metadata?.employeeId,
              employeeName: notif.metadata?.employeeName,
            },
          };
          break;
        case 'EMPLOYEE_ANNIVERSARY':
          feedItem = {
            id: notif.id,
            type: 'anniversary',
            title: t('notifications.types.anniversary'),
            description: notif.message,
            date: new Date(notif.createdAt),
            icon: GiftIcon,
            iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            metadata: {
              employeeId: notif.metadata?.employeeId,
              employeeName: notif.metadata?.employeeName,
            },
          };
          break;
        case 'PAYROLL_READY':
          feedItem = {
            id: notif.id,
            type: 'payroll',
            title: t('notifications.messages.payrollReady'),
            description: notif.message,
            date: new Date(notif.createdAt),
            icon: BanknotesIcon,
            iconBg: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            metadata: {
              receiptId: notif.metadata?.receiptId,
            },
          };
          break;
        case 'NEW_EMPLOYEE':
          feedItem = {
            id: notif.id,
            type: 'newHire',
            title: t('portal.feed.newHires'),
            description: notif.message,
            date: new Date(notif.createdAt),
            icon: UserGroupIcon,
            iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            metadata: {
              employeeId: notif.metadata?.employeeId,
              employeeName: notif.metadata?.employeeName,
            },
          };
          break;
        case 'RECOGNITION_RECEIVED':
          feedItem = {
            id: notif.id,
            type: 'recognition',
            title: t('portal.recognition.title'),
            description: notif.message,
            date: new Date(notif.createdAt),
            icon: TrophyIcon,
            iconBg: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
            metadata: {
              recognitionId: notif.metadata?.recognitionId,
            },
          };
          break;
        case 'VACATION_APPROVED':
        case 'VACATION_REJECTED':
          feedItem = {
            id: notif.id,
            type: 'vacation',
            title: notif.title,
            description: notif.message,
            date: new Date(notif.createdAt),
            icon: CalendarDaysIcon,
            iconBg: notif.type === 'VACATION_APPROVED'
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            metadata: {
              requestId: notif.metadata?.requestId,
            },
          };
          break;
      }

      if (feedItem) {
        items.push(feedItem);
      }
    });

    // If no notifications, show demo data
    if (items.length === 0) {
      return getDemoFeedItems();
    }

    return items;
  };

  // Demo feed items for when no real notifications exist
  const getDemoFeedItems = (): FeedItem[] => [
    {
      id: 'demo-1',
      type: 'newHire',
      title: t('portal.feed.newHires'),
      description: 'Maria Garcia se ha unido al equipo de Desarrollo',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: UserGroupIcon,
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      metadata: { employeeName: 'Maria Garcia' },
    },
    {
      id: 'demo-2',
      type: 'payroll',
      title: t('notifications.messages.payrollReady'),
      description: 'Tu recibo de nómina del periodo Enero 2026 está disponible',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      icon: BanknotesIcon,
      iconBg: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      id: 'demo-3',
      type: 'birthday',
      title: t('notifications.types.birthday'),
      description: 'Hoy es cumpleaños de Carlos Rodriguez',
      date: new Date(),
      icon: CakeIcon,
      iconBg: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
      metadata: { employeeName: 'Carlos Rodriguez' },
    },
    {
      id: 'demo-4',
      type: 'anniversary',
      title: t('notifications.types.anniversary'),
      description: 'Ana Lopez cumple 5 años en la empresa',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      icon: GiftIcon,
      iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      metadata: { employeeName: 'Ana Lopez' },
    },
    {
      id: 'demo-5',
      type: 'recognition',
      title: t('portal.recognition.title'),
      description: 'Juan Perez recibió un reconocimiento por Trabajo en equipo',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      icon: TrophyIcon,
      iconBg: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
  ];

  const feedItems = transformNotificationsToFeed();

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.firstName || '';
    if (hour < 12) return t('portal.welcome.goodMorning', { name });
    if (hour < 18) return t('portal.welcome.goodAfternoon', { name });
    return t('portal.welcome.goodEvening', { name });
  };

  // Handle action for each feed item type
  const handleItemAction = (item: FeedItem) => {
    switch (item.type) {
      case 'newHire':
        navigate('/portal/people');
        break;
      case 'payroll':
        navigate('/portal/payroll');
        break;
      case 'birthday':
        if (item.metadata?.employeeId || item.metadata?.employeeName) {
          setSelectedEmployee({
            id: item.metadata.employeeId || '',
            name: item.metadata.employeeName || 'Compañero',
          });
          setPreselectedType('BIRTHDAY');
          setRecognitionType('BIRTHDAY');
          setRecognitionMessage('¡Muchas felicidades en tu día! 🎂');
          setShowRecognitionModal(true);
        }
        break;
      case 'anniversary':
        if (item.metadata?.employeeId || item.metadata?.employeeName) {
          setSelectedEmployee({
            id: item.metadata.employeeId || '',
            name: item.metadata.employeeName || 'Compañero',
          });
          setPreselectedType('ANNIVERSARY');
          setRecognitionType('ANNIVERSARY');
          setRecognitionMessage('¡Felicidades por tu aniversario en la empresa! 🎉');
          setShowRecognitionModal(true);
        }
        break;
      case 'recognition':
        navigate('/portal/recognitions');
        break;
      case 'vacation':
        navigate('/portal/vacations');
        break;
    }
  };

  // Get action button text for each type
  const getActionButtonText = (type: FeedItem['type']) => {
    switch (type) {
      case 'newHire':
        return 'Ver directorio';
      case 'payroll':
        return 'Ver recibo';
      case 'birthday':
        return 'Felicitar';
      case 'anniversary':
        return 'Felicitar';
      case 'recognition':
        return 'Ver reconocimientos';
      case 'vacation':
        return 'Ver solicitudes';
      default:
        return 'Ver más';
    }
  };

  // Get action button icon for each type
  const getActionIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'birthday':
      case 'anniversary':
        return SparklesIcon;
      default:
        return ChevronRightIcon;
    }
  };

  const handleSendRecognition = () => {
    if (!selectedEmployee || !recognitionMessage.trim()) return;

    const typeInfo = RECOGNITION_TYPES.find(t => t.id === recognitionType);

    sendRecognitionMutation.mutate({
      employeeId: selectedEmployee.id,
      type: recognitionType,
      title: typeInfo?.label || 'Reconocimiento',
      message: recognitionMessage,
    });
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
        {feedItems.map((item) => {
          const ActionIcon = getActionIcon(item.type);
          return (
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
                  {/* Action Button */}
                  <button
                    onClick={() => handleItemAction(item)}
                    className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      item.type === 'birthday' || item.type === 'anniversary'
                        ? 'text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300'
                        : 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300'
                    }`}
                  >
                    {getActionButtonText(item.type)}
                    <ActionIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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

      {/* Recognition Modal */}
      {showRecognitionModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowRecognitionModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 z-10">
              {/* Close button */}
              <button
                onClick={() => setShowRecognitionModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mb-3">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Enviar felicitación
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Para: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedEmployee.name}</span>
                </p>
              </div>

              {/* Recognition Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de mensaje
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {RECOGNITION_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setRecognitionType(type.id)}
                      className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                        recognitionType === type.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                      title={type.label}
                    >
                      <div className={`p-2 rounded-full ${type.color}`}>
                        <type.icon className="h-5 w-5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tu mensaje
                </label>
                <textarea
                  value={recognitionMessage}
                  onChange={(e) => setRecognitionMessage(e.target.value)}
                  placeholder="Escribe tu mensaje de felicitación..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRecognitionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendRecognition}
                  disabled={!recognitionMessage.trim() || sendRecognitionMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendRecognitionMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
