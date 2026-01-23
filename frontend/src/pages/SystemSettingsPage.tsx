import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { useTheme } from '../contexts/ThemeContext';
import { systemConfigApi, emailApi, authApi } from '../services/api';
import AIConfigurationSection from '../components/settings/AIConfigurationSection';
import { LANGUAGES, changeLanguage, getCurrentLanguage, type LanguageCode } from '../i18n';
import toast from 'react-hot-toast';
import {
  Cog6ToothIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  ShieldCheckIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  SwatchIcon,
  CloudIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

// Keys that require confirmation before changing
const CRITICAL_KEYS = [
  'AZURE_AD_ENABLED',
  'ENFORCE_SSO',
  'ALLOW_CLASSIC_LOGIN',
  'MFA_ENABLED',
  'ENFORCE_MFA',
];

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  dataType: string;
  category: string;
  isPublic: boolean;
}

export default function SystemSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refreshConfigs } = useSystemConfig();
  const { mode, setMode, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingAzure, setTestingAzure] = useState(false);
  const [azureTestResult, setAzureTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [justification, setJustification] = useState('');
  const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());

  // Super Admin = SYSTEM_ADMIN role WITHOUT companyId (system-wide admin)
  const isSuperAdmin = user?.role === 'SYSTEM_ADMIN' && !user?.companyId;

  const handleLanguageChange = (lang: LanguageCode) => {
    changeLanguage(lang);
    setCurrentLang(lang);
    toast.success(t('settings.actions.saved'));
  };

  // Redirect if not super admin (SYSTEM_ADMIN without companyId)
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheckIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            {t('settings.accessRestricted.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t('settings.accessRestricted.description')}
          </p>
        </div>
      </div>
    );
  }

  const { data: configs, isLoading } = useQuery({
    queryKey: ['system-configs'],
    queryFn: async () => {
      const response = await systemConfigApi.getAll();
      return response.data as SystemConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { configs: { key: string; value: string }[]; justification?: string }) =>
      systemConfigApi.updateMultiple(data.configs, data.justification),
    onSuccess: () => {
      toast.success(t('settings.actions.saved'));
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      setPendingChanges({});
      setJustification('');
      setShowConfirmModal(false);
      refreshConfigs();
    },
    onError: () => {
      toast.error(t('settings.actions.saveError'));
    },
  });

  const handleTestAzureConnection = async () => {
    setTestingAzure(true);
    setAzureTestResult(null);
    try {
      const response = await authApi.testMicrosoftConnection();
      setAzureTestResult(response.data);
      if (response.data.success) {
        toast.success(t('settings.azure.testSuccess'));
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t('settings.azure.testFailed');
      setAzureTestResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTestingAzure(false);
    }
  };

  // Check if there are critical changes pending
  const hasCriticalChanges = Object.keys(pendingChanges).some((key) =>
    CRITICAL_KEYS.includes(key),
  );

  const handleTestSmtpConnection = async () => {
    setTestingSmtp(true);
    try {
      const response = await emailApi.testConnection();
      if (response.data.success) {
        toast.success(t('settings.smtp.testSuccess'));
      } else {
        toast.error(t('settings.smtp.testFailed', { error: response.data.error }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t('settings.smtp.testFailed', { error: 'unknown' });
      toast.error(errorMsg);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error(t('settings.smtp.enterEmail'));
      return;
    }
    setTestingSmtp(true);
    try {
      const response = await emailApi.testSend(testEmail);
      if (response.data.success) {
        toast.success(t('settings.smtp.emailSent'));
        setTestEmail('');
      } else {
        toast.error(t('settings.smtp.emailFailed', { error: response.data.error }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t('settings.smtp.emailFailed', { error: 'unknown' });
      toast.error(errorMsg);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  };

  const getCurrentValue = (config: SystemConfig): string => {
    return pendingChanges[config.key] ?? config.value;
  };

  const handleSave = () => {
    const changes = Object.entries(pendingChanges).map(([key, value]) => ({
      key,
      value,
    }));

    if (changes.length === 0) {
      toast.error(t('settings.actions.noChanges'));
      return;
    }

    // If there are critical changes, show confirmation modal
    if (hasCriticalChanges) {
      setShowConfirmModal(true);
      return;
    }

    // Otherwise, save directly
    updateMutation.mutate({ configs: changes });
  };

  const handleConfirmedSave = () => {
    if (!justification.trim() && hasCriticalChanges) {
      toast.error(t('settings.confirmModal.justificationRequired'));
      return;
    }

    const changes = Object.entries(pendingChanges).map(([key, value]) => ({
      key,
      value,
    }));

    updateMutation.mutate({ configs: changes, justification: justification.trim() });
  };

  const getCriticalChangesList = () => {
    return Object.entries(pendingChanges)
      .filter(([key]) => CRITICAL_KEYS.includes(key))
      .map(([key, value]) => {
        const config = configs?.find((c) => c.key === key);
        const oldValue = config?.value || '';
        return { key, oldValue, newValue: value };
      });
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Group configs by category
  const groupedConfigs = configs?.reduce(
    (acc, config) => {
      const category = config.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(config);
      return acc;
    },
    {} as Record<string, SystemConfig[]>
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general':
        return <Cog6ToothIcon className="h-5 w-5" />;
      case 'branding':
        return <BuildingOffice2Icon className="h-5 w-5" />;
      case 'azure_ad':
        return <CloudIcon className="h-5 w-5" />;
      case 'security':
        return <ShieldCheckIcon className="h-5 w-5" />;
      case 'email':
        return <EnvelopeIcon className="h-5 w-5" />;
      case 'notifications':
        return <BellIcon className="h-5 w-5" />;
      default:
        return <GlobeAltIcon className="h-5 w-5" />;
    }
  };

  const getCategoryName = (category: string) => {
    const key = `settings.categories.${category}`;
    const translated = t(key);
    // Return translated if key exists, otherwise fallback to capitalized category name
    return translated !== key ? translated : category.charAt(0).toUpperCase() + category.slice(1);
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isSecretField = (key: string) => {
    return key.toLowerCase().includes('secret') || key.toLowerCase().includes('password');
  };

  const renderConfigInput = (config: SystemConfig) => {
    const value = getCurrentValue(config);

    switch (config.dataType) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() =>
                handleValueChange(config.key, value === 'true' ? 'false' : 'true')
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                value === 'true' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  value === 'true' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
              {value === 'true' ? t('settings.toggleStates.enabled') : t('settings.toggleStates.disabled')}
            </span>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(config.key, e.target.value)}
            className="input max-w-xs"
          />
        );

      default:
        // Check if it's a secret field
        if (isSecretField(config.key)) {
          return (
            <div className="relative max-w-md">
              <input
                type={showSecrets[config.key] ? 'text' : 'password'}
                value={value}
                onChange={(e) => handleValueChange(config.key, e.target.value)}
                className="input pr-10 w-full"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility(config.key)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showSecrets[config.key] ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(config.key, e.target.value)}
            className="input max-w-md"
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('settings.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('settings.subtitle')}
          </p>
        </div>

        {hasPendingChanges && (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? t('settings.actions.saving') : t('settings.actions.save')}
          </button>
        )}
      </div>

      {/* Theme Settings Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="text-primary-600">
            <SwatchIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.theme.title')}
          </h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('settings.theme.description')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Light Mode */}
            <button
              onClick={() => setMode('light')}
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                mode === 'light'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className={`p-3 rounded-full ${
                mode === 'light'
                  ? 'bg-primary-100 dark:bg-primary-800'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <SunIcon className={`h-6 w-6 ${
                  mode === 'light'
                    ? 'text-primary-600'
                    : 'text-gray-500 dark:text-gray-400'
                }`} />
              </div>
              <div className="text-center">
                <p className={`font-medium ${
                  mode === 'light'
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {t('settings.theme.light')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.theme.lightDescription')}
                </p>
              </div>
            </button>

            {/* Dark Mode */}
            <button
              onClick={() => setMode('dark')}
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                mode === 'dark'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className={`p-3 rounded-full ${
                mode === 'dark'
                  ? 'bg-primary-100 dark:bg-primary-800'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <MoonIcon className={`h-6 w-6 ${
                  mode === 'dark'
                    ? 'text-primary-600'
                    : 'text-gray-500 dark:text-gray-400'
                }`} />
              </div>
              <div className="text-center">
                <p className={`font-medium ${
                  mode === 'dark'
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {t('settings.theme.dark')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.theme.darkDescription')}
                </p>
              </div>
            </button>

            {/* System Mode */}
            <button
              onClick={() => setMode('system')}
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                mode === 'system'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className={`p-3 rounded-full ${
                mode === 'system'
                  ? 'bg-primary-100 dark:bg-primary-800'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <ComputerDesktopIcon className={`h-6 w-6 ${
                  mode === 'system'
                    ? 'text-primary-600'
                    : 'text-gray-500 dark:text-gray-400'
                }`} />
              </div>
              <div className="text-center">
                <p className={`font-medium ${
                  mode === 'system'
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {t('settings.theme.system')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.theme.systemDescription')}
                </p>
              </div>
            </button>
          </div>

          {mode === 'system' && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('settings.theme.currentlyUsing', { theme: isDark ? t('settings.theme.dark').toLowerCase() : t('settings.theme.light').toLowerCase() })}
            </p>
          )}
        </div>
      </div>

      {/* Language Settings Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="text-primary-600">
            <GlobeAltIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.language')}
          </h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('settings.languageDescription')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            {Object.values(LANGUAGES).map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as LanguageCode)}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  currentLang === lang.code
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="text-left">
                  <p className={`font-medium ${
                    currentLang === lang.code
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {lang.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lang.code}
                  </p>
                </div>
                {currentLang === lang.code && (
                  <CheckCircleIcon className="h-5 w-5 text-primary-500 ml-auto" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <GlobeAltIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t('settings.i18nAdd.title')}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {t('settings.i18nAdd.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Configuration Section */}
      <AIConfigurationSection />

      {/* Multi-company warning */}
      {pendingChanges['MULTI_COMPANY_ENABLED'] === 'false' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {t('settings.multiCompany.disabledTitle')}
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                {t('settings.multiCompany.disabledDescription')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Config sections */}
      <div className="space-y-6">
        {groupedConfigs &&
          Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
            <div
              key={category}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="text-primary-600">{getCategoryIcon(category)}</div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getCategoryName(category)}
                </h2>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categoryConfigs.map((config) => (
                  <div key={config.id} className="px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">
                          {config.key.replace(/_/g, ' ')}
                        </label>
                        {config.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {config.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">{renderConfigInput(config)}</div>
                    </div>
                  </div>
                ))}

                {/* Email category: Test SMTP buttons */}
                {category === 'email' && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {t('settings.smtp.test.title')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          {t('settings.smtp.test.description')}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={handleTestSmtpConnection}
                          disabled={testingSmtp}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {testingSmtp ? (
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                          ) : (
                            <EnvelopeIcon className="h-4 w-4" />
                          )}
                          {t('settings.smtp.test.connection')}
                        </button>

                        <div className="flex flex-1 gap-2">
                          <input
                            type="email"
                            placeholder={t('settings.smtp.test.emailPlaceholder')}
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="input flex-1"
                          />
                          <button
                            onClick={handleSendTestEmail}
                            disabled={testingSmtp || !testEmail}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {testingSmtp ? (
                              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            ) : (
                              <EnvelopeIcon className="h-4 w-4" />
                            )}
                            {t('settings.smtp.test.sendTest')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Azure AD category: Test connection button */}
                {category === 'azure_ad' && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {t('settings.azure.test.title')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          {t('settings.azure.test.description')}
                        </p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <button
                          onClick={handleTestAzureConnection}
                          disabled={testingAzure}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors w-fit"
                        >
                          {testingAzure ? (
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                          ) : (
                            <CloudIcon className="h-4 w-4" />
                          )}
                          {t('settings.azure.test.button')}
                        </button>

                        {azureTestResult && (
                          <div
                            className={`p-4 rounded-lg ${
                              azureTestResult.success
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {azureTestResult.success ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p
                                  className={`font-medium ${
                                    azureTestResult.success
                                      ? 'text-green-800 dark:text-green-200'
                                      : 'text-red-800 dark:text-red-200'
                                  }`}
                                >
                                  {azureTestResult.message}
                                </p>
                                {azureTestResult.details && (
                                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    <p>
                                      <span className="font-medium">Issuer:</span>{' '}
                                      {azureTestResult.details.issuer}
                                    </p>
                                    <p>
                                      <span className="font-medium">Tenant ID:</span>{' '}
                                      {azureTestResult.details.tenantId}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Security category: Warning about MFA enforcement */}
                {category === 'security' && (
                  <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                          {t('settings.security.warning.title')}
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          {t('settings.security.warning.description')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Confirmation Modal for Critical Changes */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('settings.confirmModal.title')}
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('settings.confirmModal.description')}
              </p>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t('settings.confirmModal.changesLabel')}
                </p>
                <ul className="space-y-1">
                  {getCriticalChangesList().map((change) => (
                    <li key={change.key} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{change.key.replace(/_/g, ' ')}:</span>{' '}
                      <span className="text-red-500">{change.oldValue || t('settings.confirmModal.empty')}</span>
                      {' -> '}
                      <span className="text-green-500">{change.newValue}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.confirmModal.justification')}
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder={t('settings.confirmModal.justificationPlaceholder')}
                  className="input w-full h-24 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setJustification('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t('settings.actions.cancel')}
                </button>
                <button
                  onClick={handleConfirmedSave}
                  disabled={!justification.trim() || updateMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? t('settings.actions.saving') : t('settings.confirmModal.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
