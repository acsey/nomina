import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { systemConfigApi } from '../services/api';

interface SystemConfig {
  key: string;
  value: string;
  description?: string;
  dataType: string;
  category: string;
}

interface SystemConfigContextType {
  configs: SystemConfig[];
  loading: boolean;
  multiCompanyEnabled: boolean;
  getConfigValue: (key: string) => any;
  refreshConfigs: () => Promise<void>;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export function SystemConfigProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConfigs = async () => {
    try {
      const response = await systemConfigApi.getPublic();
      setConfigs(response.data);
    } catch (error) {
      console.error('Error loading system config:', error);
      // Set defaults if can't load
      setConfigs([
        { key: 'MULTI_COMPANY_ENABLED', value: 'true', dataType: 'boolean', category: 'general' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const getConfigValue = (key: string): any => {
    const config = configs.find((c) => c.key === key);
    if (!config) return null;

    switch (config.dataType) {
      case 'boolean':
        return config.value === 'true';
      case 'number':
        return Number(config.value);
      case 'json':
        try {
          return JSON.parse(config.value);
        } catch {
          return null;
        }
      default:
        return config.value;
    }
  };

  const multiCompanyEnabled = getConfigValue('MULTI_COMPANY_ENABLED') ?? true;

  return (
    <SystemConfigContext.Provider
      value={{
        configs,
        loading,
        multiCompanyEnabled,
        getConfigValue,
        refreshConfigs: loadConfigs,
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
}

export function useSystemConfig() {
  const context = useContext(SystemConfigContext);
  if (context === undefined) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
}
