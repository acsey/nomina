import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  CalculatorIcon,
  CheckIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  DocumentTextIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { payrollApi, reportsApi, catalogsApi } from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
  PROCESSING: { label: 'Procesando', color: 'bg-yellow-100 text-yellow-800' },
  CALCULATED: { label: 'Calculada', color: 'bg-blue-100 text-blue-800' },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  PAID: { label: 'Pagada', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Cerrada', color: 'bg-gray-100 text-gray-800' },
};

const periodTypeLabels: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  EXTRAORDINARY: 'Extraordinario',
};

const extraordinaryTypeLabels: Record<string, string> = {
  AGUINALDO: 'Aguinaldo',
  VACATION_PREMIUM: 'Prima Vacacional',
  PTU: 'PTU (Reparto de Utilidades)',
  SETTLEMENT: 'Finiquito',
  LIQUIDATION: 'Liquidacion',
  BONUS: 'Bono',
  RETROACTIVE: 'Retroactivo',
  OTHER: 'Otro',
};

interface PeriodFormData {
  periodType: string;
  extraordinaryType?: string;
  periodNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  paymentDate: string;
  description?: string;
}

export default function PayrollPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewPeriodId, setPreviewPeriodId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const today = new Date();
  const [formData, setFormData] = useState<PeriodFormData>({
    periodType: 'BIWEEKLY',
    periodNumber: 1,
    year: today.getFullYear(),
    startDate: today.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    paymentDate: today.toISOString().split('T')[0],
  });

  // Get company from catalogs
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });

  const companies = companiesData?.data || [];
  const companyId = companies[0]?.id || '';

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-periods', companyId, selectedYear],
    queryFn: () => payrollApi.getPeriods(companyId, selectedYear),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (data: PeriodFormData & { companyId: string }) => payrollApi.createPeriod(data),
    onSuccess: () => {
      toast.success('Periodo creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear periodo');
    },
  });

  const calculateMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.calculatePayroll(periodId),
    onSuccess: () => {
      toast.success('Nomina calculada correctamente');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al calcular nomina');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.approvePayroll(periodId),
    onSuccess: () => {
      toast.success('Nomina aprobada');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
  });

  const handlePreview = async (periodId: string) => {
    setIsLoadingPreview(true);
    setPreviewPeriodId(periodId);
    setIsPreviewModalOpen(true);
    try {
      const response = await payrollApi.previewPayroll(periodId);
      setPreviewData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cargar la previsualizacion');
      setIsPreviewModalOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCalculateFromPreview = async () => {
    if (!previewPeriodId) return;
    try {
      await payrollApi.calculatePayroll(previewPeriodId);
      toast.success('Nomina calculada correctamente');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      setIsPreviewModalOpen(false);
      setPreviewData(null);
      setPreviewPeriodId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al calcular nomina');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const downloadExcel = async (periodId: string) => {
    try {
      const response = await reportsApi.downloadPayrollExcel(periodId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nomina_${periodId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error al descargar el archivo');
    }
  };

  const resetForm = () => {
    const today = new Date();
    setFormData({
      periodType: 'BIWEEKLY',
      periodNumber: 1,
      year: today.getFullYear(),
      startDate: today.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      paymentDate: today.toISOString().split('T')[0],
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'periodNumber' || name === 'year' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = { ...formData, companyId };
    if (formData.periodType !== 'EXTRAORDINARY') {
      delete submitData.extraordinaryType;
      delete submitData.description;
    }
    createMutation.mutate(submitData);
  };

  const periods = data?.data || [];

  // Generate year options (current year and 4 years back/forward)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  const getPeriodTypeDisplay = (period: any) => {
    if (period.periodType === 'EXTRAORDINARY' && period.extraordinaryType) {
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-purple-600 font-medium">
            {extraordinaryTypeLabels[period.extraordinaryType] || period.extraordinaryType}
          </span>
        </span>
      );
    }
    return periodTypeLabels[period.periodType] || period.periodType;
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nomina</h1>
        <div className="flex items-center gap-4">
          <Link to="/payroll/receipts" className="btn btn-secondary">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Recibos
          </Link>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input w-auto"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Periodo
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : periods.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No hay periodos de nomina registrados</p>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary mt-4">
            Crear primer periodo
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Tipo</th>
                  <th>Fecha de Pago</th>
                  <th>Rango de Fechas</th>
                  <th>Empleados</th>
                  <th>Total Neto</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {periods.map((period: any) => (
                  <tr key={period.id} className={period.periodType === 'EXTRAORDINARY' ? 'bg-purple-50' : ''}>
                    <td className="font-medium">
                      {period.periodNumber}/{period.year}
                      {period.description && (
                        <p className="text-xs text-gray-500 mt-1">{period.description}</p>
                      )}
                    </td>
                    <td>{getPeriodTypeDisplay(period)}</td>
                    <td>{dayjs(period.paymentDate).format('DD/MM/YYYY')}</td>
                    <td className="text-sm text-gray-500">
                      {dayjs(period.startDate).format('DD/MM')} - {dayjs(period.endDate).format('DD/MM/YYYY')}
                    </td>
                    <td>{period._count?.payrollDetails || 0}</td>
                    <td className="font-medium text-green-600">
                      ${Number(period.totalNet || 0).toLocaleString('es-MX', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          statusLabels[period.status]?.color || 'bg-gray-100'
                        }`}
                      >
                        {statusLabels[period.status]?.label || period.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {period.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => handlePreview(period.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Previsualizar Nomina"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => calculateMutation.mutate(period.id)}
                              disabled={calculateMutation.isPending}
                              className="text-primary-600 hover:text-primary-800"
                              title="Calcular Directamente"
                            >
                              <CalculatorIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {period.status === 'CALCULATED' && (
                          <button
                            onClick={() => approveMutation.mutate(period.id)}
                            disabled={approveMutation.isPending}
                            className="text-green-600 hover:text-green-800"
                            title="Aprobar"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        )}
                        {['CALCULATED', 'APPROVED', 'PAID', 'CLOSED'].includes(
                          period.status
                        ) && (
                          <button
                            onClick={() => downloadExcel(period.id)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Descargar Excel"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Nuevo Periodo de Nomina</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Tipo de Periodo *</label>
                      <select
                        name="periodType"
                        value={formData.periodType}
                        onChange={handleChange}
                        className="input"
                        required
                      >
                        <option value="WEEKLY">Semanal</option>
                        <option value="BIWEEKLY">Quincenal</option>
                        <option value="MONTHLY">Mensual</option>
                        <option value="EXTRAORDINARY">Extraordinario</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Numero de Periodo *</label>
                      <input
                        type="number"
                        name="periodNumber"
                        value={formData.periodNumber}
                        onChange={handleChange}
                        className="input"
                        min="1"
                        max="99"
                        required
                      />
                    </div>
                  </div>

                  {formData.periodType === 'EXTRAORDINARY' && (
                    <>
                      <div>
                        <label className="label">Tipo de Extraordinario *</label>
                        <select
                          name="extraordinaryType"
                          value={formData.extraordinaryType || ''}
                          onChange={handleChange}
                          className="input"
                          required
                        >
                          <option value="">Seleccionar...</option>
                          {Object.entries(extraordinaryTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Descripcion</label>
                        <input
                          type="text"
                          name="description"
                          value={formData.description || ''}
                          onChange={handleChange}
                          className="input"
                          placeholder="Ej: Aguinaldo 2024, Bono de productividad..."
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="label">Ano *</label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className="input"
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Fecha Inicio *</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Fecha Fin *</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Fecha de Pago *</label>
                    <input
                      type="date"
                      name="paymentDate"
                      value={formData.paymentDate}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </div>

                  {formData.periodType === 'EXTRAORDINARY' && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-purple-700">
                        <strong>Periodo extraordinario:</strong> Este tipo de periodo se utiliza para pagos especiales
                        como aguinaldo, prima vacacional, PTU, bonos, finiquitos, etc.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Guardando...' : 'Crear Periodo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setIsPreviewModalOpen(false);
              setPreviewData(null);
              setPreviewPeriodId(null);
            }} />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="bg-white px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Previsualizacion de Nomina
                    {previewData?.period && (
                      <span className="text-gray-500 ml-2">
                        - {periodTypeLabels[previewData.period.periodType]} {previewData.period.periodNumber}/{previewData.period.year}
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => {
                      setIsPreviewModalOpen(false);
                      setPreviewData(null);
                      setPreviewPeriodId(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {isLoadingPreview ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-500">Calculando previsualizacion...</span>
                  </div>
                ) : previewData ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Empleados</p>
                        <p className="text-2xl font-bold text-gray-900">{previewData.employeeCount}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600">Total Percepciones</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(previewData.totals.perceptions)}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <p className="text-sm text-red-600">Total Deducciones</p>
                        <p className="text-2xl font-bold text-red-700">{formatCurrency(previewData.totals.deductions)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600">Total Neto a Pagar</p>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(previewData.totals.netPay)}</p>
                      </div>
                    </div>

                    {/* Employees Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Dias</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Percepciones</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deducciones</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Incidencias</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.employees.map((emp: any) => (
                            <tr key={emp.employee.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-900">{emp.employee.firstName} {emp.employee.lastName}</p>
                                  <p className="text-xs text-gray-500">{emp.employee.employeeNumber}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">{emp.employee.department}</td>
                              <td className="px-4 py-3 text-center text-sm">{emp.workedDays}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-green-600 font-medium">{formatCurrency(emp.totalPerceptions)}</span>
                                <div className="text-xs text-gray-400 mt-1">
                                  {emp.perceptions.slice(0, 2).map((p: any, i: number) => (
                                    <div key={i}>{p.conceptName}: {formatCurrency(p.amount)}</div>
                                  ))}
                                  {emp.perceptions.length > 2 && (
                                    <div className="text-gray-400">+{emp.perceptions.length - 2} mas</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-red-600 font-medium">{formatCurrency(emp.totalDeductions)}</span>
                                <div className="text-xs text-gray-400 mt-1">
                                  {emp.deductions.slice(0, 2).map((d: any, i: number) => (
                                    <div key={i}>{d.conceptName}: {formatCurrency(d.amount)}</div>
                                  ))}
                                  {emp.deductions.length > 2 && (
                                    <div className="text-gray-400">+{emp.deductions.length - 2} mas</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-blue-600 font-bold">{formatCurrency(emp.netPay)}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {emp.incidents && emp.incidents.length > 0 ? (
                                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                    {emp.incidents.length}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t">
                      <p className="text-sm text-gray-500">
                        Esta es una previsualizacion. Los datos no se guardaran hasta que confirmes el calculo.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setIsPreviewModalOpen(false);
                            setPreviewData(null);
                            setPreviewPeriodId(null);
                          }}
                          className="btn btn-secondary"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleCalculateFromPreview}
                          className="btn btn-primary"
                        >
                          <CalculatorIcon className="h-5 w-5 mr-2" />
                          Confirmar y Calcular Nomina
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No se pudo cargar la previsualizacion
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
