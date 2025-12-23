import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cog6ToothIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalculatorIcon,
  ChartBarIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { accountingConfigApi, catalogsApi } from '../services/api';
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

export default function AccountingConfigPage() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const queryClient = useQueryClient();

  // Get companies for company config tab
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];

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
        />
      )}
      {activeTab === 'isr' && <IsrTab />}
      {activeTab === 'imss' && <ImssTab />}
    </div>
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
  const [editingState, setEditingState] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');
  const queryClient = useQueryClient();

  const { data: isnConfigs, isLoading } = useQuery({
    queryKey: ['isn-configs'],
    queryFn: () => accountingConfigApi.getAllIsnConfigs(false),
  });

  const updateMutation = useMutation({
    mutationFn: ({ stateCode, data }: { stateCode: string; data: any }) =>
      accountingConfigApi.updateIsnConfig(stateCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isn-configs'] });
      toast.success('Tasa ISN actualizada');
      setEditingState(null);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const handleEdit = (stateCode: string, currentRate: number) => {
    setEditingState(stateCode);
    setEditRate((currentRate * 100).toFixed(2));
  };

  const handleSave = (stateCode: string) => {
    const rate = parseFloat(editRate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 0.1) {
      toast.error('Tasa inválida (0-10%)');
      return;
    }
    updateMutation.mutate({ stateCode, data: { rate } });
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  const configs = isnConfigs?.data || [];

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Impuesto Sobre Nómina por Estado</h3>
      <p className="text-sm text-gray-500 mb-4">
        Tasas de ISN vigentes para cada entidad federativa
      </p>

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
                  {editingState === config.stateCode ? (
                    <input
                      type="number"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      className="input w-24 text-right"
                      step="0.01"
                      min="0"
                      max="10"
                    />
                  ) : (
                    <span className="font-medium">{(Number(config.rate) * 100).toFixed(2)}%</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {config.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {editingState === config.stateCode ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSave(config.stateCode)}
                        className="p-1 text-green-600 hover:text-green-800"
                        disabled={updateMutation.isPending}
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingState(null)}
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(config.stateCode, Number(config.rate))}
                      className="p-1 text-gray-600 hover:text-primary-600"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// FISCAL VALUES TAB
// ============================================

function FiscalValuesTab() {
  const { data: fiscalValues, isLoading } = useQuery({
    queryKey: ['fiscal-values'],
    queryFn: () => accountingConfigApi.getAllFiscalValues(),
  });

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  const values = fiscalValues?.data || [];

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Valores Fiscales por Año</h3>
      <p className="text-sm text-gray-500 mb-4">
        UMA (Unidad de Medida y Actualización) y SMG (Salario Mínimo General)
      </p>

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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// COMPANY CONFIG TAB
// ============================================

function CompanyConfigTab({ companies, selectedCompanyId, onCompanyChange }: {
  companies: any[];
  selectedCompanyId: string;
  onCompanyChange: (id: string) => void;
}) {
  const queryClient = useQueryClient();

  const { data: configData, isLoading } = useQuery({
    queryKey: ['company-payroll-config', selectedCompanyId],
    queryFn: () => accountingConfigApi.getCompanyPayrollConfig(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const config = configData?.data;

  return (
    <div className="space-y-6">
      {/* Company Selector */}
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

      {selectedCompanyId && isLoading && (
        <div className="text-center py-8">Cargando configuración...</div>
      )}

      {selectedCompanyId && !isLoading && !config && (
        <div className="card text-center py-8">
          <p className="text-gray-500">No hay configuración de nómina para esta empresa.</p>
          <p className="text-sm text-gray-400 mt-2">Se usarán los valores predeterminados.</p>
        </div>
      )}

      {config && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* General Config */}
          <div className="card">
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
          <div className="card">
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
          <div className="card">
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
          <div className="card">
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
          <div className="card">
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
          <div className="card">
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
  );
}

// ============================================
// ISR TAB
// ============================================

function IsrTab() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [testIncome, setTestIncome] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const { data: isrTables, isLoading } = useQuery({
    queryKey: ['isr-tables'],
    queryFn: () => accountingConfigApi.getAllIsrTables(),
  });

  const calculateMutation = useMutation({
    mutationFn: () =>
      accountingConfigApi.calculateIsr(parseFloat(testIncome), selectedYear, 'MONTHLY'),
    onSuccess: (res) => setTestResult(res.data),
    onError: () => toast.error('Error al calcular ISR'),
  });

  const tables = isrTables?.data || [];
  const currentTable = tables.find((t: any) => t.year === selectedYear && t.periodType === 'MONTHLY');

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
            <label className="label">Ingreso Gravable (Mensual)</label>
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
      {currentTable && (
        <div className="card">
          <h3 className="font-semibold mb-4">Tabla ISR {selectedYear} - Mensual</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right py-3 px-4">Límite Inferior</th>
                  <th className="text-right py-3 px-4">Límite Superior</th>
                  <th className="text-right py-3 px-4">Cuota Fija</th>
                  <th className="text-right py-3 px-4">% sobre Excedente</th>
                </tr>
              </thead>
              <tbody>
                {currentTable.rows.map((row: any) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-right">${Number(row.lowerLimit).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">${Number(row.upperLimit).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">${Number(row.fixedFee).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">{(Number(row.rateOnExcess) * 100).toFixed(2)}%</td>
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
// IMSS TAB
// ============================================

function ImssTab() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: imssRates, isLoading } = useQuery({
    queryKey: ['imss-rates', selectedYear],
    queryFn: () => accountingConfigApi.getImssRates(selectedYear),
  });

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
  };

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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ))}
    </div>
  );
}
