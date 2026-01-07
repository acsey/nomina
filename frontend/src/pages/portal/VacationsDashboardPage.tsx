import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDaysIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface VacationRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

// Mock data
const mockBalance = {
  earnedDays: 18,
  usedDays: 5,
  pendingDays: 3,
  availableDays: 10,
  expiringDays: 2,
  expiringDate: '2026-06-30',
  seniorityYears: 3,
};

const mockRequests: VacationRequest[] = [
  {
    id: '1',
    startDate: '2026-02-15',
    endDate: '2026-02-17',
    days: 3,
    reason: 'Viaje familiar',
    status: 'pending',
  },
  {
    id: '2',
    startDate: '2026-01-02',
    endDate: '2026-01-03',
    days: 2,
    status: 'approved',
    approvedBy: 'Juan Perez',
    approvedAt: '2025-12-20',
  },
  {
    id: '3',
    startDate: '2025-12-23',
    endDate: '2025-12-25',
    days: 3,
    status: 'approved',
    approvedBy: 'Juan Perez',
    approvedAt: '2025-12-15',
  },
];

const statusConfig: Record<RequestStatus, { icon: typeof CheckCircleIcon; color: string; bgColor: string }> = {
  pending: {
    icon: ClockIcon,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  approved: {
    icon: CheckCircleIcon,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  rejected: {
    icon: XCircleIcon,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  cancelled: {
    icon: XCircleIcon,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
  },
};

function RequestVacationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call API to submit request
    console.log({ startDate, endDate, reason });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('vacations.request.title')}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('vacations.request.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('vacations.request.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('vacations.request.reason')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('vacations.request.reasonPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('vacations.request.submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VacationsDashboardPage() {
  const { t } = useTranslation();
  const [showRequestModal, setShowRequestModal] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('vacations.dashboard.title')}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t('vacations.title')}
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          {t('vacations.dashboard.requestVacation')}
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Available Days - Main highlight */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-sm">{t('vacations.balance.availableDays')}</span>
            <CalendarDaysIcon className="h-5 w-5 text-green-200" />
          </div>
          <p className="text-4xl font-bold">{mockBalance.availableDays}</p>
          <p className="text-green-100 text-sm mt-1">{t('vacations.balance.availableTooltip')}</p>
        </div>

        {/* Earned Days */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t('vacations.balance.earnedDays')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockBalance.earnedDays}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('vacations.balance.seniorityYears')}: {mockBalance.seniorityYears}
          </p>
        </div>

        {/* Used Days */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t('vacations.balance.usedDays')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockBalance.usedDays}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('vacations.balance.usedTooltip')}</p>
        </div>

        {/* Pending Approval */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t('vacations.balance.pendingApproval')}</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{mockBalance.pendingDays}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('vacations.balance.pendingTooltip')}</p>
        </div>
      </div>

      {/* Expiring Warning */}
      {mockBalance.expiringDays > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-200">
              {t('vacations.balance.expiring')}: {mockBalance.expiringDays} {t('vacations.request.days')}
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
              {t('vacations.balance.expiringTooltip')} {formatDate(mockBalance.expiringDate)}
            </p>
          </div>
        </div>
      )}

      {/* Vacation Entitlement Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          {t('vacations.entitlement.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {t('vacations.entitlement.byLaw')}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
            <span className="text-gray-500">Ano 1:</span> <strong>12 dias</strong>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
            <span className="text-gray-500">Ano 2:</span> <strong>14 dias</strong>
          </div>
          <div className={`p-2 rounded ${mockBalance.seniorityYears === 3 ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
            <span className="text-gray-500">Ano 3:</span> <strong>16 dias</strong>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
            <span className="text-gray-500">Ano 4:</span> <strong>18 dias</strong>
          </div>
        </div>
      </div>

      {/* Request History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('vacations.history.title')}
          </h3>
        </div>
        <div className="divide-y dark:divide-gray-700">
          {mockRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {t('vacations.history.noRecords')}
            </div>
          ) : (
            mockRequests.map((request) => {
              const config = statusConfig[request.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={request.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${config.bgColor}`}>
                      <StatusIcon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {request.days} {t('vacations.request.days')}
                        {request.reason && ` - ${request.reason}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                      {t(`vacations.status.${request.status}`)}
                    </span>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Request Modal */}
      <RequestVacationModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />
    </div>
  );
}
