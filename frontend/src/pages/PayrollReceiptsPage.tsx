import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentArrowDownIcon,
  EyeIcon,
  DocumentTextIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { payrollApi, employeesApi, catalogsApi, cfdiApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const periodTypeLabels: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  EXTRAORDINARY: 'Extraordinario',
};

export default function PayrollReceiptsPage() {
  const { user } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const isAdmin = user?.role === 'admin';

  // Get companies
  const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];

  // Set default company
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Get employees for the selected company
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', selectedCompanyId],
    queryFn: () => employeesApi.getAll({ companyId: selectedCompanyId, limit: 1000 }),
    enabled: !!selectedCompanyId,
  });
  const employees = employeesData?.data || [];

  // Reset employee selection when company changes
  useEffect(() => {
    setSelectedEmployeeId('');
  }, [selectedCompanyId]);

  // Get employee's payroll receipts
  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ['payroll-receipts', selectedEmployeeId, selectedYear],
    queryFn: () => payrollApi.getEmployeeReceipts(selectedEmployeeId, selectedYear),
    enabled: !!selectedEmployeeId,
  });
  const receipts = receiptsData?.data || [];

  const handleDownload = async (detailId: string, periodInfo: string) => {
    try {
      const response = await payrollApi.downloadReceipt(detailId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo_nomina_${periodInfo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Recibo descargado exitosamente');
    } catch (error) {
      toast.error('Error al descargar el recibo');
    }
  };

  const handleView = async (detailId: string) => {
    try {
      const response = await payrollApi.viewReceipt(detailId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Error al abrir el recibo');
    }
  };

  const handleDownloadXml = async (detailId: string, periodInfo: string) => {
    try {
      const response = await cfdiApi.downloadXmlByDetail(detailId);
      const blob = new Blob([response.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cfdi_nomina_${periodInfo}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('XML descargado');
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('XML no disponible para este recibo');
      } else {
        toast.error('Error al descargar el XML');
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  // Generate year options (current year and 4 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Recibos de Nomina
        </h1>
        <p className="text-gray-500 mt-1">
          Consulta y descarga los recibos de nomina de los empleados
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {/* Company selector for admin */}
          {isAdmin && (
            <div>
              <label className="label">Empresa</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="input"
                disabled={isLoadingCompanies}
              >
                <option value="">Seleccionar empresa...</option>
                {companies.map((company: any) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Empleado</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="input"
              disabled={!selectedCompanyId || isLoadingEmployees}
            >
              <option value="">
                {isLoadingEmployees ? 'Cargando...' : 'Seleccionar empleado...'}
              </option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ano</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Receipts list */}
      {!selectedEmployeeId ? (
        <div className="card text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Selecciona un empleado para ver sus recibos de nomina</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="card text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay recibos de nomina para el periodo seleccionado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Periodo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dias Trabajados
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Percepciones
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Deducciones
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Neto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receipts.map((receipt: any) => {
                const period = receipt.payrollPeriod;
                if (!period) return null;

                return (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {period.periodNumber}/{period.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {periodTypeLabels[period.periodType] || period.periodType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dayjs(period.paymentDate).format('DD/MM/YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(receipt.workedDays).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      {formatCurrency(Number(receipt.totalPerceptions))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      {formatCurrency(Number(receipt.totalDeductions))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-bold">
                      {formatCurrency(Number(receipt.netPay))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(receipt.id)}
                          className="text-primary-600 hover:text-primary-800 p-1"
                          title="Ver PDF"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(
                            receipt.id,
                            `${period.periodNumber}_${period.year}`
                          )}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Descargar PDF"
                        >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadXml(
                            receipt.id,
                            `${period.periodNumber}_${period.year}`
                          )}
                          className="text-amber-600 hover:text-amber-800 p-1"
                          title="Descargar XML"
                        >
                          <CodeBracketIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt details summary */}
      {selectedEmployeeId && receipts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-green-50">
            <p className="text-sm text-green-600">Total Percepciones ({selectedYear})</p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(
                receipts
                  .filter((r: any) => r.payrollPeriod)
                  .reduce((sum: number, r: any) => sum + Number(r.totalPerceptions || 0), 0)
              )}
            </p>
          </div>
          <div className="card bg-red-50">
            <p className="text-sm text-red-600">Total Deducciones ({selectedYear})</p>
            <p className="text-2xl font-bold text-red-700">
              {formatCurrency(
                receipts
                  .filter((r: any) => r.payrollPeriod)
                  .reduce((sum: number, r: any) => sum + Number(r.totalDeductions || 0), 0)
              )}
            </p>
          </div>
          <div className="card bg-blue-50">
            <p className="text-sm text-blue-600">Total Neto ({selectedYear})</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(
                receipts
                  .filter((r: any) => r.payrollPeriod)
                  .reduce((sum: number, r: any) => sum + Number(r.netPay || 0), 0)
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
