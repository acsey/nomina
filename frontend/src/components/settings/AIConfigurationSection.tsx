import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { aiConfigApi } from '../../services/api';

interface AIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  envKey: string;
  modelEnvKey: string;
  apiKeyPrefix: string;
  apiKeyUrl: string;
  docsUrl: string;
  pricing: string;
  models: { id: string; name: string; description: string }[];
  defaultModel: string;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Modelos Claude de Anthropic. Excelente para tareas de razonamiento y análisis.',
    icon: '🟣',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    envKey: 'ANTHROPIC_API_KEY',
    modelEnvKey: 'ANTHROPIC_MODEL',
    apiKeyPrefix: 'sk-ant-',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com/',
    pricing: '~$5 USD créditos iniciales',
    models: [
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Rápido y económico - Recomendado' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Equilibrado' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Último modelo Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Más capaz, costoso' },
    ],
    defaultModel: 'claude-3-haiku-20240307',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    description: 'Modelos GPT de OpenAI. Ampliamente utilizado y documentado.',
    icon: '🟢',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    envKey: 'OPENAI_API_KEY',
    modelEnvKey: 'OPENAI_MODEL',
    apiKeyPrefix: 'sk-',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    pricing: 'Pay-as-you-go',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Rápido y económico - Recomendado' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Equilibrado' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Rápido y capaz' },
      { id: 'gpt-4', name: 'GPT-4', description: 'Modelo original' },
    ],
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Modelos Gemini de Google. Tier gratuito generoso disponible.',
    icon: '🔵',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    envKey: 'GOOGLE_AI_API_KEY',
    modelEnvKey: 'GEMINI_MODEL',
    apiKeyPrefix: 'AIza',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
    pricing: 'Tier gratuito (1,500 req/día)',
    models: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido y económico - Recomendado' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Equilibrado' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'Estable' },
    ],
    defaultModel: 'gemini-1.5-flash',
  },
];

interface AIConfig {
  defaultProvider: string;
  providers: {
    [key: string]: {
      apiKey: string;
      model: string;
      isConfigured: boolean;
    };
  };
}

export default function AIConfigurationSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [localConfig, setLocalConfig] = useState<Record<string, { apiKey: string; model: string }>>({});
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Fetch current AI configuration
  const { data: aiConfig, isLoading } = useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const response = await aiConfigApi.getConfig();
      return response.data as AIConfig;
    },
  });

  // Update AI configuration mutation
  const updateMutation = useMutation({
    mutationFn: (data: { provider: string; apiKey: string; model: string }) =>
      aiConfigApi.updateProvider(data.provider, data.apiKey, data.model),
    onSuccess: () => {
      toast.success(t('settings.ai.saved'));
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('settings.ai.saveError'));
    },
  });

  // Set default provider mutation
  const setDefaultMutation = useMutation({
    mutationFn: (provider: string) => aiConfigApi.setDefaultProvider(provider),
    onSuccess: () => {
      toast.success(t('settings.ai.defaultSet'));
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('settings.ai.defaultError'));
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: (provider: string) => aiConfigApi.testConnection(provider),
    onSuccess: (response, provider) => {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { success: true, message: response.data.message || t('settings.ai.testSuccess') },
      }));
      toast.success(t('settings.ai.testSuccess'));
    },
    onError: (error: any, provider) => {
      const message = error.response?.data?.message || t('settings.ai.testFailed');
      setTestResults((prev) => ({
        ...prev,
        [provider]: { success: false, message },
      }));
      toast.error(message);
    },
    onSettled: () => {
      setTestingProvider(null);
    },
  });

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const getProviderConfig = (providerId: string) => {
    if (localConfig[providerId]) {
      return localConfig[providerId];
    }
    return aiConfig?.providers?.[providerId] || { apiKey: '', model: '' };
  };

  const handleApiKeyChange = (providerId: string, value: string) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);
    setLocalConfig((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        apiKey: value,
        model: prev[providerId]?.model || provider?.defaultModel || '',
      },
    }));
  };

  const handleModelChange = (providerId: string, value: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        apiKey: prev[providerId]?.apiKey || '',
        model: value,
      },
    }));
  };

  const handleSaveProvider = (providerId: string) => {
    const config = getProviderConfig(providerId);
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);

    if (!config.apiKey) {
      toast.error(t('settings.ai.apiKeyRequired'));
      return;
    }

    updateMutation.mutate({
      provider: providerId,
      apiKey: config.apiKey,
      model: config.model || provider?.defaultModel || '',
    });
  };

  const handleTestConnection = (providerId: string) => {
    setTestingProvider(providerId);
    setTestResults((prev) => ({ ...prev, [providerId]: undefined as any }));
    testConnectionMutation.mutate(providerId);
  };

  const handleSetDefault = (providerId: string) => {
    setDefaultMutation.mutate(providerId);
  };

  const isProviderConfigured = (providerId: string): boolean => {
    return aiConfig?.providers?.[providerId]?.isConfigured || false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <div className="text-primary-600">
          <SparklesIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.ai.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('settings.ai.subtitle')}
          </p>
        </div>
      </div>

      {/* Current Default Provider Badge */}
      {aiConfig?.defaultProvider && (
        <div className="px-6 py-3 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-primary-600" />
            <span className="text-sm text-primary-700 dark:text-primary-300">
              {t('settings.ai.currentDefault')}:{' '}
              <strong>
                {AI_PROVIDERS.find((p) => p.id === aiConfig.defaultProvider)?.name || aiConfig.defaultProvider}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Providers Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {AI_PROVIDERS.map((provider) => {
            const config = getProviderConfig(provider.id);
            const isConfigured = isProviderConfigured(provider.id);
            const isDefault = aiConfig?.defaultProvider === provider.id;
            const testResult = testResults[provider.id];

            return (
              <div
                key={provider.id}
                className={`rounded-lg border-2 transition-all ${
                  isDefault
                    ? `${provider.borderColor} ${provider.bgColor}`
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Provider Header */}
                <div className={`p-4 border-b ${provider.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <h3 className={`font-semibold ${provider.color}`}>{provider.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{provider.pricing}</p>
                      </div>
                    </div>
                    {isConfigured && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-700 dark:text-green-300">
                          {t('settings.ai.configured')}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{provider.description}</p>
                </div>

                {/* Provider Body */}
                <div className="p-4 space-y-4">
                  {/* API Key Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKeys[provider.id] ? 'text' : 'password'}
                        value={config.apiKey}
                        onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                        placeholder={`${provider.apiKeyPrefix}...`}
                        className="input w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleApiKeyVisibility(provider.id)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showApiKeys[provider.id] ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Model Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.ai.model')}
                    </label>
                    <select
                      value={config.model || provider.defaultModel}
                      onChange={(e) => handleModelChange(provider.id, e.target.value)}
                      className="input w-full"
                    >
                      {provider.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* External Links */}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={provider.apiKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg ${provider.bgColor} ${provider.color} hover:opacity-80 transition-opacity`}
                    >
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      {t('settings.ai.getApiKey')}
                    </a>
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:opacity-80 transition-opacity"
                    >
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      {t('settings.ai.docs')}
                    </a>
                  </div>

                  {/* Test Result */}
                  {testResult && (
                    <div
                      className={`p-3 rounded-lg ${
                        testResult.success
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-600" />
                        )}
                        <span
                          className={`text-sm ${
                            testResult.success
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}
                        >
                          {testResult.message}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveProvider(provider.id)}
                        disabled={updateMutation.isPending}
                        className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        {updateMutation.isPending ? t('settings.ai.saving') : t('settings.ai.save')}
                      </button>
                      <button
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={testingProvider === provider.id || !isConfigured}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                        title={!isConfigured ? t('settings.ai.saveFirst') : t('settings.ai.testConnection')}
                      >
                        {testingProvider === provider.id ? (
                          <span className="animate-spin inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></span>
                        ) : (
                          <BeakerIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {isConfigured && !isDefault && (
                      <button
                        onClick={() => handleSetDefault(provider.id)}
                        disabled={setDefaultMutation.isPending}
                        className={`w-full px-3 py-2 text-sm font-medium rounded-lg border-2 ${provider.borderColor} ${provider.color} hover:${provider.bgColor} transition-colors`}
                      >
                        {t('settings.ai.setAsDefault')}
                      </button>
                    )}

                    {isDefault && (
                      <div className="flex items-center justify-center gap-1 py-2 text-sm text-primary-600 dark:text-primary-400">
                        <CheckCircleIcon className="h-4 w-4" />
                        {t('settings.ai.isDefault')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {t('settings.ai.securityNote.title')}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {t('settings.ai.securityNote.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <SparklesIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {t('settings.ai.features.title')}
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 list-disc list-inside space-y-1">
                <li>{t('settings.ai.features.chatbot')}</li>
                <li>{t('settings.ai.features.fallback')}</li>
                <li>{t('settings.ai.features.n8n')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
