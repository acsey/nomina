import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CogIcon,
  SwatchIcon,
  ShieldCheckIcon,
  CloudIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { catalogsApi, api, pacApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import toast from 'react-hot-toast';

// Lista de regimenes fiscales del SAT
const REGIMENES_FISCALES = [
  { value: '', label: 'Seleccionar...' },
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Regimen de Enajenacion o Adquisicion de Bienes' },
  { value: '608', label: '608 - Demas ingresos' },
  { value: '610', label: '610 - Residentes en el Extranjero' },
  { value: '611', label: '611 - Ingresos por Dividendos' },
  { value: '612', label: '612 - Personas Fisicas con Actividades Empresariales' },
  { value: '614', label: '614 - Ingresos por intereses' },
  { value: '615', label: '615 - Regimen de los ingresos por obtencion de premios' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Produccion' },
  { value: '621', label: '621 - Incorporacion Fiscal' },
  { value: '622', label: '622 - Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras' },
  { value: '623', label: '623 - Opcional para Grupos de Sociedades' },
  { value: '624', label: '624 - Coordinados' },
  { value: '625', label: '625 - Regimen de las Actividades Empresariales (Plataformas)' },
  { value: '626', label: '626 - Regimen Simplificado de Confianza' },
];

// PAC providers interface
interface PacProvider {
  id: string;
  code: string;
  name: string;
  legalName: string;
  isImplemented: boolean;
  isFeatured: boolean;
  isOfficial: boolean;
  sortOrder: number;
}

interface ConfigFormData {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  regimenFiscal: string;
  certificadoCer: string;
  certificadoKey: string;
  certificadoPassword: string;
  noCertificado: string;
  pacProvider: string;
  pacUser: string;
  pacPassword: string;
  pacMode: string;
}

const defaultFormData: ConfigFormData = {
  logo: '',
  primaryColor: '#1E40AF',
  secondaryColor: '#3B82F6',
  regimenFiscal: '',
  certificadoCer: '',
  certificadoKey: '',
  certificadoPassword: '',
  noCertificado: '',
  pacProvider: '',
  pacUser: '',
  pacPassword: '',
  pacMode: 'sandbox',
};

export default function CompanyConfigPage() {
  const { user } = useAuth();
  const { multiCompanyEnabled } = useSystemConfig();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState<'branding' | 'cfdi' | 'pac'>('branding');
  const [formData, setFormData] = useState<ConfigFormData>(defaultFormData);

  const cerInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  // Obtener empresas
  const { data: companiesData, isLoading, isFetching } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
    select: (res) => res.data,
    staleTime: 0, // Always fetch fresh data on first load
    refetchOnMount: true,
  });

  const companies = companiesData || [];
  const isDataReady = !isLoading && !isFetching && companiesData !== undefined;

  // Obtener proveedores PAC del catálogo
  const { data: pacProvidersData } = useQuery({
    queryKey: ['pac-providers'],
    queryFn: () => pacApi.getAllProviders(),
    select: (res) => res.data as PacProvider[],
  });

  const pacProviders = pacProvidersData || [];

  // Seleccionar empresa por defecto
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Obtener empresa seleccionada
  const company = companies.find((c: any) => c.id === selectedCompanyId);

  // Cargar datos de la empresa seleccionada
  useEffect(() => {
    if (company) {
      setFormData({
        logo: company.logo || '',
        primaryColor: company.primaryColor || '#1E40AF',
        secondaryColor: company.secondaryColor || '#3B82F6',
        regimenFiscal: company.regimenFiscal || '',
        certificadoCer: company.certificadoCer ? '***CONFIGURADO***' : '',
        certificadoKey: company.certificadoKey ? '***CONFIGURADO***' : '',
        certificadoPassword: company.certificadoPassword ? '***CONFIGURADO***' : '',
        noCertificado: company.noCertificado || '',
        pacProvider: company.pacProvider || '',
        pacUser: company.pacUser || '',
        pacPassword: company.pacPassword ? '***CONFIGURADO***' : '',
        pacMode: company.pacMode || 'sandbox',
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ConfigFormData>) =>
      api.patch(`/catalogs/companies/${selectedCompanyId}`, data),
    onSuccess: () => {
      toast.success('Configuracion guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Actualizar el localStorage para reflejar cambios de tema (solo si es la empresa del usuario)
      if (user?.company?.id === selectedCompanyId) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData.company) {
            userData.company.primaryColor = formData.primaryColor;
            userData.company.secondaryColor = formData.secondaryColor;
            userData.company.logo = formData.logo;
            localStorage.setItem('user', JSON.stringify(userData));
          }
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar configuracion');
    },
  });

  const handleFileToBase64 = (file: File, field: 'certificadoCer' | 'certificadoKey') => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFormData((prev) => ({ ...prev, [field]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBrandingSave = () => {
    updateMutation.mutate({
      logo: formData.logo,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
    });
  };

  const handleCfdiSave = () => {
    const data: Partial<ConfigFormData> = {
      regimenFiscal: formData.regimenFiscal,
      noCertificado: formData.noCertificado,
    };
    if (formData.certificadoCer && !formData.certificadoCer.includes('***')) {
      data.certificadoCer = formData.certificadoCer;
    }
    if (formData.certificadoKey && !formData.certificadoKey.includes('***')) {
      data.certificadoKey = formData.certificadoKey;
    }
    if (formData.certificadoPassword && !formData.certificadoPassword.includes('***')) {
      data.certificadoPassword = formData.certificadoPassword;
    }
    updateMutation.mutate(data);
  };

  const handlePacSave = () => {
    const data: Partial<ConfigFormData> = {
      pacProvider: formData.pacProvider,
      pacUser: formData.pacUser,
      pacMode: formData.pacMode,
    };
    if (formData.pacPassword && !formData.pacPassword.includes('***')) {
      data.pacPassword = formData.pacPassword;
    }
    updateMutation.mutate(data);
  };

  // Show loading while fetching data
  if (isLoading || isFetching || !isDataReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Only show "no company" message after data is fully loaded
  if (isDataReady && companies.length === 0) {
    return (
      <div className="card text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-gray-500">
          No tienes una empresa asignada. Contacta al administrador.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'branding', name: 'Marca y Colores', icon: SwatchIcon },
    { id: 'cfdi', name: 'Certificados CFDI', icon: ShieldCheckIcon },
    { id: 'pac', name: 'Proveedor PAC', icon: CloudIcon },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CogIcon className="h-7 w-7" />
          Configuracion de Empresa
        </h1>
        <p className="text-gray-500 mt-1">
          Personaliza la configuracion de la empresa
        </p>
      </div>

      {/* Company Selector for Admin */}
      {isAdmin && multiCompanyEnabled && companies.length > 1 && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <BuildingOffice2Icon className="h-8 w-8 text-blue-600" />
            <div className="flex-1">
              <label className="label text-blue-800">Seleccionar Empresa a Configurar</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="input max-w-md"
              >
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.rfc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Company Info Banner */}
      {company && (
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            {company.logo ? (
              <img
                src={company.logo.startsWith('data:') ? company.logo : `data:image/png;base64,${company.logo}`}
                alt="Logo"
                className="h-12 w-12 object-contain rounded border"
              />
            ) : (
              <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                <BuildingOffice2Icon className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold">{company.name}</h2>
              <p className="text-sm text-gray-500">RFC: {company.rfc}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: company.primaryColor || '#1E40AF' }}
                title="Color Primario"
              />
              <div
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: company.secondaryColor || '#3B82F6' }}
                title="Color Secundario"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Personalizacion de Marca</h2>

          {/* Logo */}
          <div className="mb-6">
            <label className="label">Logo de la Empresa</label>
            <div className="flex items-center gap-4">
              {formData.logo ? (
                <img
                  src={formData.logo.startsWith('data:') ? formData.logo : `data:image/png;base64,${formData.logo}`}
                  alt="Logo"
                  className="h-16 w-16 object-contain border rounded"
                />
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                  <PhotoIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="logo-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setFormData((prev) => ({ ...prev, logo: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label htmlFor="logo-input" className="btn btn-secondary cursor-pointer">
                  Cambiar Logo
                </label>
                <p className="text-sm text-gray-500 mt-1">PNG o JPG, maximo 500KB</p>
              </div>
            </div>
          </div>

          {/* Colores */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">Color Primario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleChange}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleChange}
                  className="input w-32"
                  placeholder="#1E40AF"
                />
              </div>
            </div>
            <div>
              <label className="label">Color Secundario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleChange}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  name="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleChange}
                  className="input w-32"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
            <div className="flex items-center gap-2">
              <div
                className="w-20 h-8 rounded text-white text-xs flex items-center justify-center font-medium"
                style={{ backgroundColor: formData.primaryColor }}
              >
                Primario
              </div>
              <div
                className="w-20 h-8 rounded text-white text-xs flex items-center justify-center font-medium"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                Secundario
              </div>
            </div>
          </div>

          <button
            onClick={handleBrandingSave}
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}

      {/* CFDI Tab */}
      {activeTab === 'cfdi' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Certificados para Timbrado CFDI</h2>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">Certificados de Prueba</p>
                <p className="text-sm text-amber-700 mt-1">
                  Para pruebas, puedes usar los certificados de prueba del SAT disponibles en:{' '}
                  <a
                    href="https://portalsat.plataforma.sat.gob.mx/ConsultaCertificados/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Portal SAT - Certificados
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Regimen Fiscal */}
          <div className="mb-4">
            <label className="label">Regimen Fiscal</label>
            <select
              name="regimenFiscal"
              value={formData.regimenFiscal}
              onChange={handleChange}
              className="input"
            >
              {REGIMENES_FISCALES.map((reg) => (
                <option key={reg.value} value={reg.value}>
                  {reg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Certificado .cer */}
          <div className="mb-4">
            <label className="label">Certificado (.cer)</label>
            <div className="flex items-center gap-2">
              <input
                ref={cerInputRef}
                type="file"
                accept=".cer"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileToBase64(file, 'certificadoCer');
                }}
              />
              <button
                onClick={() => cerInputRef.current?.click()}
                className="btn btn-secondary"
              >
                Seleccionar archivo
              </button>
              {formData.certificadoCer && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  {formData.certificadoCer.includes('***') ? 'Configurado' : 'Nuevo archivo cargado'}
                </span>
              )}
            </div>
          </div>

          {/* Llave privada .key */}
          <div className="mb-4">
            <label className="label">Llave Privada (.key)</label>
            <div className="flex items-center gap-2">
              <input
                ref={keyInputRef}
                type="file"
                accept=".key"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileToBase64(file, 'certificadoKey');
                }}
              />
              <button
                onClick={() => keyInputRef.current?.click()}
                className="btn btn-secondary"
              >
                Seleccionar archivo
              </button>
              {formData.certificadoKey && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  {formData.certificadoKey.includes('***') ? 'Configurado' : 'Nuevo archivo cargado'}
                </span>
              )}
            </div>
          </div>

          {/* Contrasena del certificado */}
          <div className="mb-4">
            <label className="label">Contrasena del Certificado</label>
            <input
              type="password"
              name="certificadoPassword"
              value={formData.certificadoPassword}
              onChange={handleChange}
              className="input"
              placeholder={formData.certificadoPassword.includes('***') ? 'Ya configurada' : 'Ingresa la contrasena'}
            />
          </div>

          {/* Numero de certificado */}
          <div className="mb-6">
            <label className="label">Numero de Certificado</label>
            <input
              type="text"
              name="noCertificado"
              value={formData.noCertificado}
              onChange={handleChange}
              className="input"
              placeholder="Ej: 30001000000400002434"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se obtiene automaticamente del archivo .cer
            </p>
          </div>

          <button
            onClick={handleCfdiSave}
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Certificados'}
          </button>
        </div>
      )}

      {/* PAC Tab */}
      {activeTab === 'pac' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Configuracion del Proveedor PAC</h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              El PAC (Proveedor Autorizado de Certificacion) es necesario para el timbrado
              de los CFDIs de nomina. Configura tus credenciales segun el proveedor que utilices.
            </p>
          </div>

          {/* Proveedor */}
          <div className="mb-4">
            <label className="label">Proveedor PAC</label>
            <select
              name="pacProvider"
              value={formData.pacProvider}
              onChange={handleChange}
              className="input"
            >
              <option value="">Seleccionar...</option>
              {pacProviders
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((pac) => (
                  <option key={pac.code} value={pac.code}>
                    {pac.name}
                    {pac.isImplemented && ' ✓'}
                    {!pac.isOfficial && ' (Personalizado)'}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              ✓ indica proveedores con integración implementada
            </p>
          </div>

          {/* Usuario */}
          <div className="mb-4">
            <label className="label">Usuario PAC</label>
            <input
              type="text"
              name="pacUser"
              value={formData.pacUser}
              onChange={handleChange}
              className="input"
              placeholder="Usuario o API Key"
            />
          </div>

          {/* Contrasena */}
          <div className="mb-4">
            <label className="label">Contrasena PAC</label>
            <input
              type="password"
              name="pacPassword"
              value={formData.pacPassword}
              onChange={handleChange}
              className="input"
              placeholder={formData.pacPassword.includes('***') ? 'Ya configurada' : 'Contrasena o API Secret'}
            />
          </div>

          {/* Modo */}
          <div className="mb-6">
            <label className="label">Modo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pacMode"
                  value="sandbox"
                  checked={formData.pacMode === 'sandbox'}
                  onChange={handleChange}
                  className="text-primary-600"
                />
                <span className="text-sm">Sandbox (Pruebas)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pacMode"
                  value="production"
                  checked={formData.pacMode === 'production'}
                  onChange={handleChange}
                  className="text-primary-600"
                />
                <span className="text-sm">Produccion</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              En modo Sandbox los timbrados no son fiscalmente validos
            </p>
          </div>

          <button
            onClick={handlePacSave}
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Configuracion PAC'}
          </button>
        </div>
      )}
    </div>
  );
}
