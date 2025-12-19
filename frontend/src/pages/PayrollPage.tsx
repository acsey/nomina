import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  CalculatorIcon,
  CheckIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
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

interface PeriodFormData {
  periodType: string;
  periodNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  paymentDate: string;
}

export default function PayrollPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      console.error('Error creating period:', error);
    },
  });

  const calculateMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.calculatePayroll(periodId),
    onSuccess: () => {
      toast.success('Nomina calculada correctamente');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.approvePayroll(periodId),
    onSuccess: () => {
      toast.success('Nomina aprobada');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'periodNumber' || name === 'year' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, companyId });
  };

  const periods = data?.data || [];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nomina</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input w-auto"
          >
            {[2024, 2025, 2026].map((year) => (
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
                  <th>Empleados</th>
                  <th>Total Neto</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {periods.map((period: any) => (
                  <tr key={period.id}>
                    <td className="font-medium">
                      {period.periodNumber}/{period.year}
                    </td>
                    <td>
                      {
                        {
                          WEEKLY: 'Semanal',
                          BIWEEKLY: 'Quincenal',
                          MONTHLY: 'Mensual',
                        }[period.periodType as string]
                      }
                    </td>
                    <td>{dayjs(period.paymentDate).format('DD/MM/YYYY')}</td>
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
                          <button
                            onClick={() => calculateMutation.mutate(period.id)}
                            disabled={calculateMutation.isPending}
                            className="text-primary-600 hover:text-primary-800"
                            title="Calcular"
                          >
                            <CalculatorIcon className="h-5 w-5" />
                          </button>
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
                        max="52"
                        required
                      />
                    </div>
                  </div>
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
    </div>
  );
}
