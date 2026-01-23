import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
  ArrowPathIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  SunIcon,
  GiftIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  SparklesIcon,
  PuzzlePieceIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentCheckIcon,
  FingerPrintIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { systemModulesApi } from '../../services/api';

interface SystemModule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  isCore: boolean;
  defaultEnabled: boolean;
  icon: string | null;
  sortOrder: number;
}

// Map icon names to components
const ICON_MAP: Record<string, React.ElementType> = {
  'users': UsersIcon,
  'user-circle': UserCircleIcon,
  'building-office': BuildingOfficeIcon,
  'currency-dollar': CurrencyDollarIcon,
  'document-check': DocumentCheckIcon,
  'clock': ClockIcon,
  'finger-print': FingerPrintIcon,
  'chat-bubble-left-right': ChatBubbleLeftRightIcon,
  'sun': SunIcon,
  'gift': GiftIcon,
  'exclamation-triangle': ExclamationTriangleIcon,
  'user-group': UserGroupIcon,
  'chart-bar': ChartBarIcon,
  'sparkles': SparklesIcon,
  'puzzle-piece': PuzzlePieceIcon,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CORE: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
  PAYROLL: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  ATTENDANCE: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  HR: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  PORTAL: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  REPORTS: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  INTEGRATION: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
};

const CATEGORY_NAMES: Record<string, string> = {
  CORE: 'Núcleo',
  PAYROLL: 'Nómina',
  ATTENDANCE: 'Asistencia',
  HR: 'Recursos Humanos',
  PORTAL: 'Portal',
  REPORTS: 'Reportes',
  INTEGRATION: 'Integraciones',
};

export default function SystemModulesSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Fetch all system modules
  const { data: modules, isLoading, error } = useQuery({
    queryKey: ['system-modules'],
    queryFn: async () => {
      const response = await systemModulesApi.getAll();
      return response.data as SystemModule[];
    },
  });

  // Seed default modules mutation
  const seedMutation = useMutation({
    mutationFn: () => systemModulesApi.seed(),
    onSuccess: (response) => {
      const data = response.data as { created: number; existing: number };
      toast.success(t('settings.modules.seedSuccess', { created: data.created, existing: data.existing }));
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
    },
    onError: () => {
      toast.error(t('settings.modules.seedError'));
    },
  });

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: (data: { id: string; defaultEnabled: boolean }) =>
      systemModulesApi.update(data.id, { defaultEnabled: data.defaultEnabled }),
    onSuccess: () => {
      toast.success(t('settings.modules.updated'));
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
    },
    onError: () => {
      toast.error(t('settings.modules.updateError'));
    },
  });

  const getIconComponent = (iconName: string | null): React.ElementType => {
    if (!iconName) return CubeIcon;
    return ICON_MAP[iconName] || CubeIcon;
  };

  const getCategoryStyle = (category: string) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.CORE;
  };

  const getCategoryName = (category: string) => {
    return CATEGORY_NAMES[category] || category;
  };

  const handleToggleDefaultEnabled = (module: SystemModule) => {
    if (module.isCore) {
      toast.error(t('settings.modules.cannotDisableCore'));
      return;
    }
    updateModuleMutation.mutate({ id: module.id, defaultEnabled: !module.defaultEnabled });
  };

  // Group modules by category
  const groupedModules = modules?.reduce(
    (acc, module) => {
      const category = module.category || 'CORE';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(module);
      return acc;
    },
    {} as Record<string, SystemModule[]>
  );

  // Sort categories in a logical order
  const categoryOrder = ['CORE', 'PAYROLL', 'ATTENDANCE', 'HR', 'PORTAL', 'REPORTS', 'INTEGRATION'];
  const sortedCategories = groupedModules
    ? categoryOrder.filter((cat) => groupedModules[cat]?.length > 0)
    : [];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="text-primary-600">
            <CubeIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.modules.title')}
          </h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="text-primary-600">
            <CubeIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.modules.title')}
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.modules.loadError')}
            </p>
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {seedMutation.isPending ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-4 w-4" />
              )}
              {t('settings.modules.initializeModules')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-primary-600">
            <CubeIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.modules.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.modules.subtitle')}
            </p>
          </div>
        </div>
        {(!modules || modules.length === 0) && (
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {seedMutation.isPending ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-4 w-4" />
            )}
            {t('settings.modules.initializeModules')}
          </button>
        )}
      </div>

      {/* Modules Summary */}
      {modules && modules.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">{t('settings.modules.total')}:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{modules.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              <span className="text-gray-500 dark:text-gray-400">{t('settings.modules.enabledByDefault')}:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {modules.filter((m) => m.defaultEnabled).length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LockClosedIcon className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">{t('settings.modules.core')}:</span>
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                {modules.filter((m) => m.isCore).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modules by Category */}
      <div className="p-6">
        {modules && modules.length > 0 ? (
          <div className="space-y-4">
            {sortedCategories.map((category) => {
              const categoryModules = groupedModules![category];
              const style = getCategoryStyle(category);
              const isExpanded = expandedCategory === category || expandedCategory === null;

              return (
                <div key={category} className={`rounded-lg border ${style.border} overflow-hidden`}>
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                    className={`w-full px-4 py-3 ${style.bg} flex items-center justify-between hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${style.text}`}>
                        {getCategoryName(category)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                        {categoryModules.length} {t('settings.modules.modulesCount')}
                      </span>
                    </div>
                    <svg
                      className={`h-5 w-5 ${style.text} transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Category Modules */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {categoryModules
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((module) => {
                          const IconComponent = getIconComponent(module.icon);

                          return (
                            <div
                              key={module.id}
                              className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${style.bg}`}>
                                  <IconComponent className={`h-5 w-5 ${style.text}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {module.name}
                                    </span>
                                    {module.isCore && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                        <LockClosedIcon className="h-3 w-3" />
                                        {t('settings.modules.coreLabel')}
                                      </span>
                                    )}
                                  </div>
                                  {module.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {module.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {t('settings.modules.code')}: {module.code}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Default Enabled Toggle */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('settings.modules.defaultEnabled')}
                                  </span>
                                  <button
                                    onClick={() => handleToggleDefaultEnabled(module)}
                                    disabled={module.isCore || updateModuleMutation.isPending}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                      module.defaultEnabled
                                        ? 'bg-primary-600'
                                        : 'bg-gray-200 dark:bg-gray-600'
                                    } ${module.isCore ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={module.isCore ? t('settings.modules.cannotDisableCore') : ''}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        module.defaultEnabled ? 'translate-x-5' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                </div>

                                {/* Status Icon */}
                                {module.defaultEnabled ? (
                                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircleIcon className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CubeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.modules.noModules')}
            </p>
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {seedMutation.isPending ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-4 w-4" />
              )}
              {t('settings.modules.initializeModules')}
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <CubeIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {t('settings.modules.info.title')}
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 list-disc list-inside space-y-1">
                <li>{t('settings.modules.info.defaultEnabled')}</li>
                <li>{t('settings.modules.info.coreModules')}</li>
                <li>{t('settings.modules.info.companyOverride')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
