import { useState, Fragment, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import {
  Cog6ToothIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalculatorIcon,
  ChartBarIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { accountingConfigApi, catalogsApi } from '../services/api';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import toast from 'react-hot-toast';

type TabType = 'summary' | 'isn' | 'fiscal' | 'company' | 'isr' | 'imss';

const tabs = [
  { id: 'summary', name: 'Resumen', icon: ChartBarIcon },
  { id: 'isn', name: 'ISN por Estado', icon: MapPinIcon },
  { id: 'fiscal', name: 'Valores Fiscales', icon: CurrencyDollarIcon },
  { id: 'company', name: 'Config. Empresa', icon: BuildingOfficeIcon },
  { id: 'isr', name: 'Tablas ISR', icon: CalculatorIcon },
  { id: 'imss', name: 'Tasas IMSS', icon: Cog6ToothIcon },
];

// Mexican states for ISN
const MEXICAN_STATES = [
  { code: 'AGS', name: 'Aguascalientes' },
  { code: 'BC', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHIS', name: 'Chiapas' },
  { code: 'CHIH', name: 'Chihuahua' },
  { code: 'CDMX', name: 'Ciudad de México' },
  { code: 'COAH', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'DGO', name: 'Durango' },
  { code: 'GTO', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HGO', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'Estado de México' },
  { code: 'MICH', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NL', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QRO', name: 'Querétaro' },
  { code: 'QROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLAX', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
];

export default function AccountingConfigPage() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const { multiCompanyEnabled } = useSystemConfig();

  // Get companies for company config tab
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];

  // Auto-select first company when multi-company is disabled or there's only one
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      if (!multiCompanyEnabled || companies.length === 1) {
        setSelectedCompanyId(companies[0].id);
      }
    }
  }, [companies, selectedCompanyId, multiCompanyEnabled]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración Contable</h1>
        <p className="text-gray-500 mt-1">
          Administra tasas de impuestos, valores fiscales y configuración de nómina
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`
                flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && <SummaryTab />}
      {activeTab === 'isn' && <IsnTab />}
      {activeTab === 'fiscal' && <FiscalValuesTab />}
      {activeTab === 'company' && (
        <CompanyConfigTab
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onCompanyChange={setSelectedCompanyId}
          multiCompanyEnabled={multiCompanyEnabled}
        />
      )}
      {activeTab === 'isr' && <IsrTab />}
      {activeTab === 'imss' && <ImssTab />}
    </div>
  );
}

// ============================================
// MODAL COMPONENT
// ============================================

function Modal({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  {title}
                </Dialog.Title>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// ============================================
// CONFIRM DELETE MODAL
// ============================================

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemName, isLoading }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isLoading?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación">
      <p className="text-gray-600 mb-6">
        ¿Estás seguro de que deseas eliminar <strong>{itemName}</strong>? Esta acción no se puede deshacer.
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn btn-secondary" disabled={isLoading}>
          Cancelar
        </button>
        <button onClick={onConfirm} className="btn bg-red-600 text-white hover:bg-red-700" disabled={isLoading}>
          {isLoading ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </Modal>
  );
}

// ============================================
// SUMMARY TAB
// ============================================

function SummaryTab() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['accounting-summary'],
    queryFn: () => accountingConfigApi.getSummary(),
  });

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  const data = summary?.data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="card">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-blue-100">
            <MapPinIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Estados con ISN</p>
            <p className="text-2xl font-bold">{data?.stateIsnConfigs || 0}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-green-100">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Años Fiscales</p>
            <p className="text-2xl font-bold">{data?.fiscalValues?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-purple-100">
            <Cog6ToothIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Tasas IMSS</p>
            <p className="text-2xl font-bold">{data?.imssRatesCount || 0}</p>
          </div>
        </div>
      </div>

      {/* Fiscal Values Summary */}
      {data?.fiscalValues && data.fiscalValues.length > 0 && (
        <div className="card col-span-full">
          <h3 className="font-semibold mb-4">Valores Fiscales Recientes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Año</th>
                  <th className="text-right py-2">UMA Diaria</th>
                  <th className="text-right py-2">UMA Mensual</th>
                  <th className="text-right py-2">SMG Diario</th>
                  <th className="text-right py-2">SMG ZFN</th>
                </tr>
              </thead>
              <tbody>
                {data.fiscalValues.map((fv: any) => (
                  <tr key={fv.id} className="border-b">
                    <td className="py-2 font-medium">{fv.year}</td>
                    <td className="text-right">${Number(fv.umaDaily).toFixed(2)}</td>
                    <td className="text-right">${Number(fv.umaMonthly).toFixed(2)}</td>
                    <td className="text-right">${Number(fv.smgDaily).toFixed(2)}</td>
                    <td className="text-right">{fv.smgZfnDaily ? `$${Number(fv.smgZfnDaily).toFixed(2)}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ISN TAB
// ============================================

function IsnTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    stateCode: '',
    stateName: '',
    rate: '',
    isActive: true,
  });
  const queryClient = useQueryClient();

  const { data: isnConfigs, isLoading } = useQuery({
    queryKey: ['isn-configs'],
    queryFn: () => accountingConfigApi.getAllIsnConfigs(false),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingConfigApi.createIsnConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isn-configs'] });
      toast.success('Configuración ISN creada');
      closeModal();
    },
    onError: () => toast.error('Error al crear configuración'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ stateCode, data }: { stateCode: string; data: any }) =>
      accountingConfigApi.updateIsnConfig(stateCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isn-configs'] });
      toast.success('Configuración ISN actualizada');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const openModal = (config?: any) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        stateCode: config.stateCode,
        stateName: config.stateName,
        rate: (Number(config.rate) * 100).toFixed(2),
        isActive: config.isActive,
      });
    } else {
      setEditingConfig(null);
      setFormData({ stateCode: '', stateName: '', rate: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingConfig(null);
    setFormData({ stateCode: '', stateName: '', rate: '', isActive: true });
  };

  const handleStateChange = (code: string) => {
    const state = MEXICAN_STATES.find(s => s.code === code);
    setFormData(prev => ({
      ...prev,
      stateCode: code,
      stateName: state?.name || '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(formData.rate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 0.1) {
      toast.error('Tasa inválida (0-10%)');
      return;
    }
    const data = {
      stateCode: formData.stateCode,
      stateName: formData.stateName,
      rate,
      isActive: formData.isActive,
    };
    if (editingConfig) {
      updateMutation.mutate({ stateCode: editingConfig.stateCode, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  const configs = isnConfigs?.data || [];
  const existingStateCodes = configs.map((c: any) => c.stateCode);
  const availableStates = MEXICAN_STATES.filter(s => !existingStateCodes.includes(s.code) || editingConfig?.stateCode === s.code);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">Impuesto Sobre Nómina por Estado</h3>
          <p className="text-sm text-gray-500">
            Tasas de ISN vigentes para cada entidad federativa
          </p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Agregar Estado
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4">Código</th>
              <th className="text-left py-3 px-4">Estado</th>
              <th className="text-right py-3 px-4">Tasa</th>
              <th className="text-center py-3 px-4">Estado</th>
              <th className="text-right py-3 px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config: any) => (
              <tr key={config.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-mono text-sm">{config.stateCode}</td>
                <td className="py-3 px-4">{config.stateName}</td>
                <td className="py-3 px-4 text-right">
                  <span className="font-medium">{(Number(config.rate) * 100).toFixed(2)}%</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {config.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => openModal(config)}
                    className="p-1 text-gray-600 hover:text-primary-600"
                    title="Editar"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Add/Edit ISN */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingConfig ? 'Editar Configuración ISN' : 'Agregar Configuración ISN'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Estado</label>
            <select
              value={formData.stateCode}
              onChange={(e) => handleStateChange(e.target.value)}
              className="input w-full"
              disabled={!!editingConfig}
              required
            >
              <option value="">-- Seleccionar Estado --</option>
              {availableStates.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Tasa ISN (%)</label>
            <input
              type="number"
              value={formData.rate}
              onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
              className="input w-full"
              step="0.01"
              min="0"
              max="10"
              placeholder="Ej: 3.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Ingresa el porcentaje (0-10%)</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Activo</label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================
// FISCAL VALUES TAB
// ============================================

function FiscalValuesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    umaDaily: '',
    umaMonthly: '',
    umaYearly: '',
    smgDaily: '',
    smgZfnDaily: '',
    aguinaldoDays: '15',
    vacationPremiumPercent: '25',
  });
  const queryClient = useQueryClient();

  const { data: fiscalValues, isLoading } = useQuery({
    queryKey: ['fiscal-values'],
    queryFn: () => accountingConfigApi.getAllFiscalValues(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingConfigApi.createFiscalValues(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-values'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success('Valores fiscales creados');
      closeModal();
    },
    onError: () => toast.error('Error al crear valores fiscales'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ year, data }: { year: number; data: any }) =>
      accountingConfigApi.updateFiscalValues(year, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-values'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success('Valores fiscales actualizados');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const openModal = (value?: any) => {
    if (value) {
      setEditingValue(value);
      setFormData({
        year: value.year,
        umaDaily: Number(value.umaDaily).toString(),
        umaMonthly: Number(value.umaMonthly).toString(),
        umaYearly: Number(value.umaYearly).toString(),
        smgDaily: Number(value.smgDaily).toString(),
        smgZfnDaily: value.smgZfnDaily ? Number(value.smgZfnDaily).toString() : '',
        aguinaldoDays: value.aguinaldoDays?.toString() || '15',
        vacationPremiumPercent: value.vacationPremiumPercent
          ? (Number(value.vacationPremiumPercent) * 100).toString()
          : '25',
      });
    } else {
      setEditingValue(null);
      setFormData({
        year: new Date().getFullYear(),
        umaDaily: '',
        umaMonthly: '',
        umaYearly: '',
        smgDaily: '',
        smgZfnDaily: '',
        aguinaldoDays: '15',
        vacationPremiumPercent: '25',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingValue(null);
  };

  const handleUmaDailyChange = (value: string) => {
    const daily = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      umaDaily: value,
      umaMonthly: (daily * 30.4).toFixed(2),
      umaYearly: (daily * 365).toFixed(2),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      year: formData.year,
      umaDaily: parseFloat(formData.umaDaily),
      umaMonthly: parseFloat(formData.umaMonthly),
      umaYearly: parseFloat(formData.umaYearly),
      smgDaily: parseFloat(formData.smgDaily),
      smgZfnDaily: formData.smgZfnDaily ? parseFloat(formData.smgZfnDaily) : null,
      aguinaldoDays: parseInt(formData.aguinaldoDays),
      vacationPremiumPercent: parseFloat(formData.vacationPremiumPercent) / 100,
    };

    if (editingValue) {
      updateMutation.mutate({ year: editingValue.year, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  const values = fiscalValues?.data || [];

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">Valores Fiscales por Año</h3>
          <p className="text-sm text-gray-500">
            UMA (Unidad de Medida y Actualización) y SMG (Salario Mínimo General)
          </p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Agregar Año
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4">Año</th>
              <th className="text-right py-3 px-4">UMA Diaria</th>
              <th className="text-right py-3 px-4">UMA Mensual</th>
              <th className="text-right py-3 px-4">UMA Anual</th>
              <th className="text-right py-3 px-4">SMG Diario</th>
              <th className="text-right py-3 px-4">SMG ZFN</th>
              <th className="text-center py-3 px-4">Aguinaldo</th>
              <th className="text-center py-3 px-4">Prima Vac.</th>
              <th className="text-right py-3 px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {values.map((fv: any) => (
              <tr key={fv.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{fv.year}</td>
                <td className="py-3 px-4 text-right">${Number(fv.umaDaily).toFixed(4)}</td>
                <td className="py-3 px-4 text-right">${Number(fv.umaMonthly).toFixed(2)}</td>
                <td className="py-3 px-4 text-right">${Number(fv.umaYearly).toFixed(2)}</td>
                <td className="py-3 px-4 text-right">${Number(fv.smgDaily).toFixed(2)}</td>
                <td className="py-3 px-4 text-right">
                  {fv.smgZfnDaily ? `$${Number(fv.smgZfnDaily).toFixed(2)}` : '-'}
                </td>
                <td className="py-3 px-4 text-center">{fv.aguinaldoDays} días</td>
                <td className="py-3 px-4 text-center">
                  {(Number(fv.vacationPremiumPercent) * 100).toFixed(0)}%
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => openModal(fv)}
                    className="p-1 text-gray-600 hover:text-primary-600"
                    title="Editar"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Add/Edit Fiscal Values */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingValue ? 'Editar Valores Fiscales' : 'Agregar Valores Fiscales'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Año</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="input w-full"
                min="2020"
                max="2030"
                disabled={!!editingValue}
                required
              />
            </div>
            <div>
              <label className="label">UMA Diaria</label>
              <input
                type="number"
                value={formData.umaDaily}
                onChange={(e) => handleUmaDailyChange(e.target.value)}
                className="input w-full"
                step="0.01"
                placeholder="108.57"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">UMA Mensual (calculado)</label>
              <input
                type="number"
                value={formData.umaMonthly}
                onChange={(e) => setFormData(prev => ({ ...prev, umaMonthly: e.target.value }))}
                className="input w-full bg-gray-50"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">UMA Anual (calculado)</label>
              <input
                type="number"
                value={formData.umaYearly}
                onChange={(e) => setFormData(prev => ({ ...prev, umaYearly: e.target.value }))}
                className="input w-full bg-gray-50"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">SMG Diario (General)</label>
              <input
                type="number"
                value={formData.smgDaily}
                onChange={(e) => setFormData(prev => ({ ...prev, smgDaily: e.target.value }))}
                className="input w-full"
                step="0.01"
                placeholder="248.93"
                required
              />
            </div>
            <div>
              <label className="label">SMG Diario (Zona Libre Norte)</label>
              <input
                type="number"
                value={formData.smgZfnDaily}
                onChange={(e) => setFormData(prev => ({ ...prev, smgZfnDaily: e.target.value }))}
                className="input w-full"
                step="0.01"
                placeholder="374.89"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Días de Aguinaldo</label>
              <input
                type="number"
                value={formData.aguinaldoDays}
                onChange={(e) => setFormData(prev => ({ ...prev, aguinaldoDays: e.target.value }))}
                className="input w-full"
                min="15"
                required
              />
            </div>
            <div>
              <label className="label">Prima Vacacional (%)</label>
              <input
                type="number"
                value={formData.vacationPremiumPercent}
                onChange={(e) => setFormData(prev => ({ ...prev, vacationPremiumPercent: e.target.value }))}
                className="input w-full"
                min="25"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================
// COMPANY CONFIG TAB
// ============================================

function CompanyConfigTab({ companies, selectedCompanyId, onCompanyChange, multiCompanyEnabled }: {
  companies: any[];
  selectedCompanyId: string;
  onCompanyChange: (id: string) => void;
  multiCompanyEnabled: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const queryClient = useQueryClient();

  const { data: configData, isLoading } = useQuery({
    queryKey: ['company-payroll-config', selectedCompanyId],
    queryFn: () => accountingConfigApi.getCompanyPayrollConfig(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const config = configData?.data;

  const updateMutation = useMutation({
    mutationFn: (data: any) => accountingConfigApi.createOrUpdateCompanyPayrollConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-payroll-config', selectedCompanyId] });
      toast.success('Configuración actualizada');
      setIsModalOpen(false);
    },
    onError: () => toast.error('Error al actualizar configuración'),
  });

  const openModal = () => {
    if (config) {
      setFormData({
        companyId: selectedCompanyId,
        defaultPeriodType: config.defaultPeriodType || 'BIWEEKLY',
        stateCode: config.stateCode || '',
        applyIsn: config.applyIsn ?? true,
        applySubsidioEmpleo: config.applySubsidioEmpleo ?? true,
        aguinaldoDays: config.aguinaldoDays || 15,
        aguinaldoPayMonth: config.aguinaldoPayMonth || 12,
        vacationPremiumPercent: config.vacationPremiumPercent ? (Number(config.vacationPremiumPercent) * 100) : 25,
        applyPtu: config.applyPtu ?? true,
        ptuPercent: config.ptuPercent ? (Number(config.ptuPercent) * 100) : 10,
        ptuPayMonth: config.ptuPayMonth || 5,
        savingsFundEnabled: config.savingsFundEnabled ?? false,
        savingsFundEmployeePercent: config.savingsFundEmployeePercent ? (Number(config.savingsFundEmployeePercent) * 100) : 5,
        savingsFundCompanyPercent: config.savingsFundCompanyPercent ? (Number(config.savingsFundCompanyPercent) * 100) : 5,
        foodVouchersEnabled: config.foodVouchersEnabled ?? false,
        foodVouchersPercent: config.foodVouchersPercent ? (Number(config.foodVouchersPercent) * 100) : 10,
        overtimeDoubleAfter: config.overtimeDoubleAfter || 9,
        overtimeTripleAfter: config.overtimeTripleAfter || 9,
        maxOvertimeHoursWeek: config.maxOvertimeHoursWeek || 9,
      });
    } else {
      setFormData({
        companyId: selectedCompanyId,
        defaultPeriodType: 'BIWEEKLY',
        stateCode: '',
        applyIsn: true,
        applySubsidioEmpleo: true,
        aguinaldoDays: 15,
        aguinaldoPayMonth: 12,
        vacationPremiumPercent: 25,
        applyPtu: true,
        ptuPercent: 10,
        ptuPayMonth: 5,
        savingsFundEnabled: false,
        savingsFundEmployeePercent: 5,
        savingsFundCompanyPercent: 5,
        foodVouchersEnabled: false,
        foodVouchersPercent: 10,
        overtimeDoubleAfter: 9,
        overtimeTripleAfter: 9,
        maxOvertimeHoursWeek: 9,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      vacationPremiumPercent: formData.vacationPremiumPercent / 100,
      ptuPercent: formData.ptuPercent / 100,
      savingsFundEmployeePercent: formData.savingsFundEnabled ? formData.savingsFundEmployeePercent / 100 : null,
      savingsFundCompanyPercent: formData.savingsFundEnabled ? formData.savingsFundCompanyPercent / 100 : null,
      foodVouchersPercent: formData.foodVouchersEnabled ? formData.foodVouchersPercent / 100 : null,
    };
    updateMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Company Selector - only show when multi-company is enabled and there are multiple companies */}
      {multiCompanyEnabled && companies.length > 1 && (
        <div className="card">
          <label className="label">Seleccionar Empresa</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="input max-w-md"
          >
            <option value="">-- Seleccionar empresa --</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.rfc})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedCompanyId && isLoading && (
        <div className="text-center py-8">Cargando configuración...</div>
      )}

      {selectedCompanyId && !isLoading && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold">Configuración de Nómina</h3>
            <button onClick={openModal} className="btn btn-primary flex items-center gap-2">
              <PencilIcon className="h-5 w-5" />
              {config ? 'Editar Configuración' : 'Crear Configuración'}
            </button>
          </div>

          {!config && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay configuración de nómina para esta empresa.</p>
              <p className="text-sm text-gray-400 mt-2">Se usarán los valores predeterminados.</p>
            </div>
          )}

          {config && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* General Config */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-4">Configuración General</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo de Período:</span>
                    <span className="font-medium">{config.defaultPeriodType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estado (ISN):</span>
                    <span className="font-medium">{config.stateCode || 'No definido'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Aplica ISN:</span>
                    <span className={config.applyIsn ? 'text-green-600' : 'text-red-600'}>
                      {config.applyIsn ? 'Sí' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subsidio Empleo:</span>
                    <span className={config.applySubsidioEmpleo ? 'text-green-600' : 'text-red-600'}>
                      {config.applySubsidioEmpleo ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aguinaldo & Vacations */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-4">Aguinaldo y Vacaciones</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Días de Aguinaldo:</span>
                    <span className="font-medium">{config.aguinaldoDays} días</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mes de Pago:</span>
                    <span className="font-medium">
                      {new Date(2000, config.aguinaldoPayMonth - 1).toLocaleString('es-MX', { month: 'long' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prima Vacacional:</span>
                    <span className="font-medium">{(Number(config.vacationPremiumPercent) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* PTU */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-4">PTU (Reparto de Utilidades)</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Aplica PTU:</span>
                    <span className={config.applyPtu ? 'text-green-600' : 'text-red-600'}>
                      {config.applyPtu ? 'Sí' : 'No'}
                    </span>
                  </div>
                  {config.applyPtu && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Porcentaje PTU:</span>
                        <span className="font-medium">{(Number(config.ptuPercent) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mes de Pago:</span>
                        <span className="font-medium">
                          {new Date(2000, config.ptuPayMonth - 1).toLocaleString('es-MX', { month: 'long' })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Savings Fund */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-4">Fondo de Ahorro</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Habilitado:</span>
                    <span className={config.savingsFundEnabled ? 'text-green-600' : 'text-red-600'}>
                      {config.savingsFundEnabled ? 'Sí' : 'No'}
                    </span>
                  </div>
                  {config.savingsFundEnabled && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Aportación Empleado:</span>
                        <span className="font-medium">
                          {config.savingsFundEmployeePercent ? `${(Number(config.savingsFundEmployeePercent) * 100).toFixed(0)}%` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Aportación Empresa:</span>
                        <span className="font-medium">
                          {config.savingsFundCompanyPercent ? `${(Number(config.savingsFundCompanyPercent) * 100).toFixed(0)}%` : '-'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Overtime */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-4">Horas Extra</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dobles después de:</span>
                    <span className="font-medium">{config.overtimeDoubleAfter} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Triples después de:</span>
                    <span className="font-medium">{config.overtimeTripleAfter} hrs extra</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Máx. horas/semana:</span>
                    <span className="font-medium">{config.maxOvertimeHoursWeek} hrs</span>
                  </div>
                </div>
              </div>

              {/* Food Vouchers */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-4">Vales de Despensa</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Habilitado:</span>
                    <span className={config.foodVouchersEnabled ? 'text-green-600' : 'text-red-600'}>
                      {config.foodVouchersEnabled ? 'Sí' : 'No'}
                    </span>
                  </div>
                  {config.foodVouchersEnabled && config.foodVouchersPercent && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Porcentaje:</span>
                      <span className="font-medium">{(Number(config.foodVouchersPercent) * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={config ? 'Editar Configuración de Empresa' : 'Crear Configuración de Empresa'}
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* General */}
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-3">General</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo de Período</label>
                <select
                  value={formData.defaultPeriodType}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, defaultPeriodType: e.target.value }))}
                  className="input w-full"
                >
                  <option value="WEEKLY">Semanal</option>
                  <option value="BIWEEKLY">Quincenal</option>
                  <option value="MONTHLY">Mensual</option>
                </select>
              </div>
              <div>
                <label className="label">Estado (para ISN)</label>
                <select
                  value={formData.stateCode}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, stateCode: e.target.value }))}
                  className="input w-full"
                >
                  <option value="">-- Seleccionar --</option>
                  {MEXICAN_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.applyIsn}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, applyIsn: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm">Aplica ISN</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.applySubsidioEmpleo}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, applySubsidioEmpleo: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm">Aplica Subsidio al Empleo</span>
              </label>
            </div>
          </div>

          {/* Aguinaldo */}
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-3">Aguinaldo y Vacaciones</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Días de Aguinaldo</label>
                <input
                  type="number"
                  value={formData.aguinaldoDays}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, aguinaldoDays: parseInt(e.target.value) }))}
                  className="input w-full"
                  min="15"
                />
              </div>
              <div>
                <label className="label">Mes de Pago</label>
                <select
                  value={formData.aguinaldoPayMonth}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, aguinaldoPayMonth: parseInt(e.target.value) }))}
                  className="input w-full"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('es-MX', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Prima Vacacional (%)</label>
                <input
                  type="number"
                  value={formData.vacationPremiumPercent}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, vacationPremiumPercent: parseFloat(e.target.value) }))}
                  className="input w-full"
                  min="25"
                />
              </div>
            </div>
          </div>

          {/* PTU */}
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-3">PTU</h4>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formData.applyPtu}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, applyPtu: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="text-sm">Aplica PTU</span>
            </label>
            {formData.applyPtu && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Porcentaje PTU (%)</label>
                  <input
                    type="number"
                    value={formData.ptuPercent}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, ptuPercent: parseFloat(e.target.value) }))}
                    className="input w-full"
                    min="10"
                  />
                </div>
                <div>
                  <label className="label">Mes de Pago</label>
                  <select
                    value={formData.ptuPayMonth}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, ptuPayMonth: parseInt(e.target.value) }))}
                    className="input w-full"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('es-MX', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Fondo de Ahorro */}
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-3">Fondo de Ahorro</h4>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formData.savingsFundEnabled}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, savingsFundEnabled: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="text-sm">Habilitar Fondo de Ahorro</span>
            </label>
            {formData.savingsFundEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Aportación Empleado (%)</label>
                  <input
                    type="number"
                    value={formData.savingsFundEmployeePercent}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, savingsFundEmployeePercent: parseFloat(e.target.value) }))}
                    className="input w-full"
                    min="0"
                    max="13"
                  />
                </div>
                <div>
                  <label className="label">Aportación Empresa (%)</label>
                  <input
                    type="number"
                    value={formData.savingsFundCompanyPercent}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, savingsFundCompanyPercent: parseFloat(e.target.value) }))}
                    className="input w-full"
                    min="0"
                    max="13"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vales */}
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-3">Vales de Despensa</h4>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formData.foodVouchersEnabled}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, foodVouchersEnabled: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="text-sm">Habilitar Vales de Despensa</span>
            </label>
            {formData.foodVouchersEnabled && (
              <div className="w-1/2">
                <label className="label">Porcentaje (%)</label>
                <input
                  type="number"
                  value={formData.foodVouchersPercent}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, foodVouchersPercent: parseFloat(e.target.value) }))}
                  className="input w-full"
                  min="0"
                  max="40"
                />
              </div>
            )}
          </div>

          {/* Horas Extra */}
          <div>
            <h4 className="font-semibold mb-3">Horas Extra</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Dobles después de (hrs)</label>
                <input
                  type="number"
                  value={formData.overtimeDoubleAfter}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, overtimeDoubleAfter: parseInt(e.target.value) }))}
                  className="input w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="label">Triples después de (hrs)</label>
                <input
                  type="number"
                  value={formData.overtimeTripleAfter}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, overtimeTripleAfter: parseInt(e.target.value) }))}
                  className="input w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="label">Máx. hrs/semana</label>
                <input
                  type="number"
                  value={formData.maxOvertimeHoursWeek}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, maxOvertimeHoursWeek: parseInt(e.target.value) }))}
                  className="input w-full"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================
// ISR TAB
// ============================================

function IsrTab() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriodType, setSelectedPeriodType] = useState('MONTHLY');
  const [testIncome, setTestIncome] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    periodType: 'MONTHLY',
    lowerLimit: '',
    upperLimit: '',
    fixedFee: '',
    rateOnExcess: '',
  });
  const queryClient = useQueryClient();

  const { data: isrTables, isLoading } = useQuery({
    queryKey: ['isr-tables'],
    queryFn: () => accountingConfigApi.getAllIsrTables(),
  });

  const calculateMutation = useMutation({
    mutationFn: () =>
      accountingConfigApi.calculateIsr(parseFloat(testIncome), selectedYear, selectedPeriodType),
    onSuccess: (res) => setTestResult(res.data),
    onError: () => toast.error('Error al calcular ISR'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingConfigApi.createIsrTableRow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isr-tables'] });
      toast.success('Rango ISR creado');
      closeModal();
    },
    onError: () => toast.error('Error al crear rango'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      accountingConfigApi.updateIsrTableRow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isr-tables'] });
      toast.success('Rango ISR actualizado');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingConfigApi.deleteIsrTableRow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isr-tables'] });
      toast.success('Rango eliminado');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const tables = isrTables?.data || [];
  const currentTable = tables.find((t: any) => t.year === selectedYear && t.periodType === selectedPeriodType);

  const openModal = (row?: any) => {
    if (row) {
      setEditingRow(row);
      setFormData({
        year: selectedYear,
        periodType: selectedPeriodType,
        lowerLimit: Number(row.lowerLimit).toString(),
        upperLimit: Number(row.upperLimit).toString(),
        fixedFee: Number(row.fixedFee).toString(),
        rateOnExcess: (Number(row.rateOnExcess) * 100).toFixed(2),
      });
    } else {
      setEditingRow(null);
      setFormData({
        year: selectedYear,
        periodType: selectedPeriodType,
        lowerLimit: '',
        upperLimit: '',
        fixedFee: '',
        rateOnExcess: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRow(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      year: formData.year,
      periodType: formData.periodType,
      lowerLimit: parseFloat(formData.lowerLimit),
      upperLimit: parseFloat(formData.upperLimit),
      fixedFee: parseFloat(formData.fixedFee),
      rateOnExcess: parseFloat(formData.rateOnExcess) / 100,
    };
    if (editingRow) {
      updateMutation.mutate({ id: editingRow.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* ISR Calculator */}
      <div className="card">
        <h3 className="font-semibold mb-4">Calculadora de ISR</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Año</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input"
            >
              {[2025, 2024, 2023].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo Período</label>
            <select
              value={selectedPeriodType}
              onChange={(e) => setSelectedPeriodType(e.target.value)}
              className="input"
            >
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY">Quincenal</option>
              <option value="MONTHLY">Mensual</option>
            </select>
          </div>
          <div>
            <label className="label">Ingreso Gravable</label>
            <input
              type="number"
              value={testIncome}
              onChange={(e) => setTestIncome(e.target.value)}
              className="input"
              placeholder="0.00"
            />
          </div>
          <button
            onClick={() => calculateMutation.mutate()}
            disabled={!testIncome || calculateMutation.isPending}
            className="btn btn-primary"
          >
            Calcular
          </button>
        </div>

        {testResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">ISR Causado</p>
                <p className="text-xl font-bold">${testResult.isr.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subsidio al Empleo</p>
                <p className="text-xl font-bold text-green-600">-${testResult.subsidio.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ISR a Retener</p>
                <p className="text-xl font-bold text-primary-600">${testResult.netIsr.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ISR Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Tabla ISR {selectedYear} - {selectedPeriodType === 'MONTHLY' ? 'Mensual' : selectedPeriodType === 'BIWEEKLY' ? 'Quincenal' : 'Semanal'}</h3>
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Agregar Rango
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : currentTable ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right py-3 px-4">Límite Inferior</th>
                  <th className="text-right py-3 px-4">Límite Superior</th>
                  <th className="text-right py-3 px-4">Cuota Fija</th>
                  <th className="text-right py-3 px-4">% sobre Excedente</th>
                  <th className="text-right py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentTable.rows.map((row: any) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-right">${Number(row.lowerLimit).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">${Number(row.upperLimit).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">${Number(row.fixedFee).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">{(Number(row.rateOnExcess) * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(row)}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title="Editar"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(row)}
                          className="p-1 text-gray-600 hover:text-red-600"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay tabla ISR para {selectedYear} - {selectedPeriodType}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRow ? 'Editar Rango ISR' : 'Agregar Rango ISR'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Año</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="input w-full"
                disabled={!!editingRow}
              />
            </div>
            <div>
              <label className="label">Tipo Período</label>
              <select
                value={formData.periodType}
                onChange={(e) => setFormData(prev => ({ ...prev, periodType: e.target.value }))}
                className="input w-full"
                disabled={!!editingRow}
              >
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Límite Inferior ($)</label>
              <input
                type="number"
                value={formData.lowerLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, lowerLimit: e.target.value }))}
                className="input w-full"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">Límite Superior ($)</label>
              <input
                type="number"
                value={formData.upperLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, upperLimit: e.target.value }))}
                className="input w-full"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cuota Fija ($)</label>
              <input
                type="number"
                value={formData.fixedFee}
                onChange={(e) => setFormData(prev => ({ ...prev, fixedFee: e.target.value }))}
                className="input w-full"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">% sobre Excedente</label>
              <input
                type="number"
                value={formData.rateOnExcess}
                onChange={(e) => setFormData(prev => ({ ...prev, rateOnExcess: e.target.value }))}
                className="input w-full"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        itemName={`Rango $${Number(deleteConfirm?.lowerLimit || 0).toLocaleString()} - $${Number(deleteConfirm?.upperLimit || 0).toLocaleString()}`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// ============================================
// IMSS TAB
// ============================================

function ImssTab() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    concept: '',
    employerRate: '',
    employeeRate: '',
    salaryBase: 'SBC',
    description: '',
  });
  const queryClient = useQueryClient();

  const { data: imssRates, isLoading } = useQuery({
    queryKey: ['imss-rates', selectedYear],
    queryFn: () => accountingConfigApi.getImssRates(selectedYear),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingConfigApi.createImssRate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imss-rates', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success('Tasa IMSS creada');
      closeModal();
    },
    onError: () => toast.error('Error al crear tasa'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      accountingConfigApi.updateImssRate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imss-rates', selectedYear] });
      toast.success('Tasa IMSS actualizada');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingConfigApi.deleteImssRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imss-rates', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success('Tasa eliminada');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const openModal = (rate?: any) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        year: rate.year || selectedYear,
        concept: rate.concept,
        employerRate: (Number(rate.employerRate) * 100).toFixed(4),
        employeeRate: (Number(rate.employeeRate) * 100).toFixed(4),
        salaryBase: rate.salaryBase || 'SBC',
        description: rate.description || '',
      });
    } else {
      setEditingRate(null);
      setFormData({
        year: selectedYear,
        concept: '',
        employerRate: '',
        employeeRate: '',
        salaryBase: 'SBC',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRate(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      year: formData.year,
      concept: formData.concept,
      employerRate: parseFloat(formData.employerRate) / 100,
      employeeRate: parseFloat(formData.employeeRate) / 100,
      salaryBase: formData.salaryBase,
      description: formData.description,
    };
    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  const rates = imssRates?.data || [];

  // Group rates by category
  const categories = {
    'Enfermedades y Maternidad': rates.filter((r: any) => r.concept.startsWith('EYM')),
    'Invalidez y Vida': rates.filter((r: any) => r.concept === 'IV'),
    'Retiro, Cesantía y Vejez': rates.filter((r: any) => r.concept.startsWith('RCV')),
    'Riesgo de Trabajo': rates.filter((r: any) => r.concept.startsWith('RT')),
    'Guarderías e INFONAVIT': rates.filter((r: any) => r.concept === 'GUARDERIA' || r.concept === 'INFONAVIT'),
    'Otros': rates.filter((r: any) => !r.concept.startsWith('EYM') && r.concept !== 'IV' && !r.concept.startsWith('RCV') && !r.concept.startsWith('RT') && r.concept !== 'GUARDERIA' && r.concept !== 'INFONAVIT'),
  };

  const IMSS_CONCEPTS = [
    { code: 'EYM_CUOTA_FIJA', name: 'E y M - Cuota Fija' },
    { code: 'EYM_EXCEDENTE', name: 'E y M - Excedente 3 SMG' },
    { code: 'EYM_PRESTACIONES_DINERO', name: 'E y M - Prestaciones en Dinero' },
    { code: 'EYM_PENSIONADOS', name: 'E y M - Pensionados' },
    { code: 'IV', name: 'Invalidez y Vida' },
    { code: 'RCV_RETIRO', name: 'Retiro' },
    { code: 'RCV_CESANTIA_VEJEZ', name: 'Cesantía y Vejez' },
    { code: 'RT_CLASE_I', name: 'Riesgo Trabajo - Clase I' },
    { code: 'RT_CLASE_II', name: 'Riesgo Trabajo - Clase II' },
    { code: 'RT_CLASE_III', name: 'Riesgo Trabajo - Clase III' },
    { code: 'RT_CLASE_IV', name: 'Riesgo Trabajo - Clase IV' },
    { code: 'RT_CLASE_V', name: 'Riesgo Trabajo - Clase V' },
    { code: 'GUARDERIA', name: 'Guarderías y Prestaciones Sociales' },
    { code: 'INFONAVIT', name: 'INFONAVIT' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <label className="label">Año</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="input"
          >
            {[2025, 2024, 2023].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Agregar Tasa
        </button>
      </div>

      {Object.entries(categories).map(([category, categoryRates]) => (
        categoryRates.length > 0 && (
          <div key={category} className="card">
            <h3 className="font-semibold mb-4">{category}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Concepto</th>
                    <th className="text-right py-3 px-4">Tasa Patronal</th>
                    <th className="text-right py-3 px-4">Tasa Trabajador</th>
                    <th className="text-center py-3 px-4">Base</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRates.map((rate: any) => (
                    <tr key={rate.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{rate.concept.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {(Number(rate.employerRate) * 100).toFixed(4)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Number(rate.employeeRate) > 0 ? `${(Number(rate.employeeRate) * 100).toFixed(4)}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {rate.salaryBase}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openModal(rate)}
                            className="p-1 text-gray-600 hover:text-primary-600"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(rate)}
                            className="p-1 text-gray-600 hover:text-red-600"
                            title="Eliminar"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ))}

      {rates.length === 0 && (
        <div className="card text-center py-8 text-gray-500">
          No hay tasas IMSS configuradas para {selectedYear}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRate ? 'Editar Tasa IMSS' : 'Agregar Tasa IMSS'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Año</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="input w-full"
                disabled={!!editingRate}
              />
            </div>
            <div>
              <label className="label">Concepto</label>
              <select
                value={formData.concept}
                onChange={(e) => setFormData(prev => ({ ...prev, concept: e.target.value }))}
                className="input w-full"
                required
              >
                <option value="">-- Seleccionar --</option>
                {IMSS_CONCEPTS.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tasa Patronal (%)</label>
              <input
                type="number"
                value={formData.employerRate}
                onChange={(e) => setFormData(prev => ({ ...prev, employerRate: e.target.value }))}
                className="input w-full"
                step="0.0001"
                required
              />
            </div>
            <div>
              <label className="label">Tasa Trabajador (%)</label>
              <input
                type="number"
                value={formData.employeeRate}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeRate: e.target.value }))}
                className="input w-full"
                step="0.0001"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Base Salarial</label>
              <select
                value={formData.salaryBase}
                onChange={(e) => setFormData(prev => ({ ...prev, salaryBase: e.target.value }))}
                className="input w-full"
              >
                <option value="SBC">SBC (Salario Base Cotización)</option>
                <option value="SD">SD (Salario Diario)</option>
                <option value="SDI">SDI (Salario Diario Integrado)</option>
              </select>
            </div>
            <div>
              <label className="label">Descripción</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input w-full"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        itemName={deleteConfirm?.concept?.replace(/_/g, ' ') || ''}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
