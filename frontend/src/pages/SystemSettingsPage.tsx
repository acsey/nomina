import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { useTheme } from '../contexts/ThemeContext';
import { systemConfigApi } from '../services/api';
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
} from '@heroicons/react/24/outline';

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  dataType: string;
  category: string;
  isPublic: boolean;
}

type ThemeMode = 'light' | 'dark' | 'system';

export default function SystemSettingsPage() {
  const { user } = useAuth();
  const { refreshConfigs } = useSystemConfig();
  const { mode, setMode, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

  const isAdmin = user?.role === 'admin';

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheckIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Acceso Restringido
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Solo los administradores pueden acceder a esta pagina.
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
    mutationFn: (data: { key: string; value: string }[]) =>
      systemConfigApi.updateMultiple(data),
    onSuccess: () => {
      toast.success('Configuracion guardada');
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      setPendingChanges({});
      refreshConfigs();
    },
    onError: () => {
      toast.error('Error al guardar configuracion');
    },
  });

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
      toast.error('No hay cambios para guardar');
      return;
    }

    updateMutation.mutate(changes);
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
      default:
        return <GlobeAltIcon className="h-5 w-5" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'general':
        return 'General';
      case 'branding':
        return 'Marca y Apariencia';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
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
              {value === 'true' ? 'Habilitado' : 'Deshabilitado'}
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
            Configuracion del Sistema
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Administra la configuracion global del sistema
          </p>
        </div>

        {hasPendingChanges && (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
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
            Tema de la Interfaz
          </h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Selecciona el tema de la interfaz. Esta preferencia se guarda en tu navegador.
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
                  Claro
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tema claro
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
                  Oscuro
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tema oscuro
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
                  Sistema
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Segun tu dispositivo
                </p>
              </div>
            </button>
          </div>

          {mode === 'system' && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Actualmente usando tema {isDark ? 'oscuro' : 'claro'} basado en la preferencia del sistema.
            </p>
          )}
        </div>
      </div>

      {/* Multi-company warning */}
      {pendingChanges['MULTI_COMPANY_ENABLED'] === 'false' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Modo Empresa Unica
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Al deshabilitar el modo multiempresa, los selectores de empresa se ocultaran
                y los usuarios solo veran datos de su empresa asignada.
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
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
