import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  CalculatorIcon,
  CheckIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { payrollApi, reportsApi } from '../services/api';
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

export default function PayrollPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  // TODO: Obtener companyId del contexto
  const companyId = 'demo-company-id';

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-periods', companyId, selectedYear],
    queryFn: () => payrollApi.getPeriods(companyId, selectedYear),
  });

  const calculateMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.calculatePayroll(periodId),
    onSuccess: () => {
      toast.success('Nómina calculada correctamente');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.approvePayroll(periodId),
    onSuccess: () => {
      toast.success('Nómina aprobada');
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

  const periods = data?.data || [];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nómina</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input w-auto"
          >
            {[2024, 2025].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button className="btn btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Período
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : periods.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No hay períodos de nómina registrados</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Período</th>
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
                        }[period.periodType]
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
    </div>
  );
}
