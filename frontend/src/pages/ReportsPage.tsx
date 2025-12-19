import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
  BuildingLibraryIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { reportsApi, payrollApi, catalogsApi, employeesApi, departmentsApi } from '../services/api';
import toast from 'react-hot-toast';

const reportCategories = [
  {
    title: 'Reportes de Nomina',
    reports: [
      {
        id: 'payroll-summary',
        name: 'Resumen de Nomina',
        description: 'Resumen detallado de percepciones y deducciones por periodo',
        icon: DocumentChartBarIcon,
        needsPeriod: true,
      },
      {
        id: 'payroll-excel',
        name: 'Nomina en Excel',
        description: 'Exportar nomina del periodo a formato Excel',
        icon: DocumentArrowDownIcon,
        needsPeriod: true,
      },
      {
        id: 'payroll-pdf',
        name: 'Nomina en PDF',
        description: 'Exportar nomina del periodo a formato PDF',
        icon: DocumentArrowDownIcon,
        needsPeriod: true,
      },
    ],
  },
  {
    title: 'Reportes Gubernamentales',
    reports: [
      {
        id: 'imss-report',
        name: 'Cuotas IMSS',
        description: 'Reporte de cuotas obrero-patronales del IMSS',
        icon: BuildingLibraryIcon,
        needsPeriod: true,
      },
      {
        id: 'imss-sua',
        name: 'Archivo SUA',
        description: 'Generar archivo para Sistema Unico de Autodeterminacion',
        icon: DocumentArrowDownIcon,
        needsPeriod: true,
      },
      {
        id: 'infonavit-report',
        name: 'Descuentos INFONAVIT',
        description: 'Reporte de descuentos por creditos INFONAVIT',
        icon: BuildingLibraryIcon,
        needsPeriod: true,
      },
      {
        id: 'issste-report',
        name: 'Cuotas ISSSTE',
        description: 'Reporte de cuotas para trabajadores del ISSSTE',
        icon: BuildingLibraryIcon,
        needsPeriod: true,
      },
    ],
  },
  {
    title: 'Reportes de Empleados',
    reports: [
      {
        id: 'employee-annual',
        name: 'Reporte Anual de Empleado',
        description: 'Historial de nomina y deducciones del ano',
        icon: DocumentChartBarIcon,
        needsEmployee: true,
        needsYear: true,
      },
      {
        id: 'department-report',
        name: 'Reporte por Departamento',
        description: 'Resumen de nomina por departamento',
        icon: DocumentChartBarIcon,
        needsDepartment: true,
        needsPeriod: true,
      },
    ],
  },
];

const periodTypeLabels: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  EXTRAORDINARY: 'Extraordinario',
};

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Get companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];
  const companyId = companies[0]?.id || '';

  // Get periods
  const { data: periodsData } = useQuery({
    queryKey: ['payroll-periods', companyId, selectedYear],
    queryFn: () => payrollApi.getPeriods(companyId, selectedYear),
    enabled: !!companyId,
  });
  const periods = periodsData?.data || [];

  // Get employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.getAll({ limit: 1000 }),
  });
  const employees = employeesData?.data || [];

  // Get departments
  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list', companyId],
    queryFn: () => departmentsApi.getAll(companyId),
    enabled: !!companyId,
  });
  const departments = departmentsData?.data || [];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleReportClick = (report: any) => {
    setSelectedReport(report);
    setSelectedPeriodId('');
    setSelectedEmployeeId('');
    setSelectedDepartmentId('');
    setIsModalOpen(true);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) return;

    // Validate required selections
    if (selectedReport.needsPeriod && !selectedPeriodId) {
      toast.error('Selecciona un periodo de nomina');
      return;
    }
    if (selectedReport.needsEmployee && !selectedEmployeeId) {
      toast.error('Selecciona un empleado');
      return;
    }
    if (selectedReport.needsDepartment && !selectedDepartmentId) {
      toast.error('Selecciona un departamento');
      return;
    }

    setIsGenerating(true);

    try {
      switch (selectedReport.id) {
        case 'payroll-summary': {
          const response = await reportsApi.getPayrollSummary(selectedPeriodId);
          // Show summary in a new tab or modal
          const summaryData = response.data;
          console.log('Payroll Summary:', summaryData);
          toast.success('Resumen generado. Ver consola para detalles.');
          break;
        }

        case 'payroll-excel': {
          const response = await reportsApi.downloadPayrollExcel(selectedPeriodId);
          const selectedPeriod = periods.find((p: any) => p.id === selectedPeriodId);
          const filename = `nomina_${selectedPeriod?.periodNumber || ''}_${selectedPeriod?.year || ''}.xlsx`;
          downloadBlob(new Blob([response.data]), filename);
          toast.success('Archivo Excel descargado');
          break;
        }

        case 'payroll-pdf': {
          const response = await reportsApi.downloadPayrollPdf(selectedPeriodId);
          const selectedPeriod = periods.find((p: any) => p.id === selectedPeriodId);
          const filename = `nomina_${selectedPeriod?.periodNumber || ''}_${selectedPeriod?.year || ''}.pdf`;
          downloadBlob(new Blob([response.data], { type: 'application/pdf' }), filename);
          toast.success('Archivo PDF descargado');
          break;
        }

        case 'employee-annual': {
          const response = await reportsApi.getEmployeeReport(selectedEmployeeId, selectedYear);
          const reportData = response.data;
          console.log('Employee Annual Report:', reportData);
          // You could open a modal to show the data or generate a PDF
          toast.success('Reporte generado. Ver consola para detalles.');
          break;
        }

        case 'department-report': {
          const response = await reportsApi.getDepartmentReport(selectedDepartmentId, selectedPeriodId);
          const reportData = response.data;
          console.log('Department Report:', reportData);
          toast.success('Reporte generado. Ver consola para detalles.');
          break;
        }

        case 'imss-report': {
          const imssResponse = await reportsApi.getImssReport(selectedPeriodId);
          console.log('IMSS Report:', imssResponse.data);
          // Descargar Excel
          const imssExcel = await reportsApi.downloadImssExcel(selectedPeriodId);
          const selectedPeriodImss = periods.find((p: any) => p.id === selectedPeriodId);
          downloadBlob(new Blob([imssExcel.data]), `cuotas_imss_${selectedPeriodImss?.periodNumber || ''}_${selectedPeriodImss?.year || ''}.xlsx`);
          toast.success('Reporte IMSS descargado');
          break;
        }

        case 'imss-sua': {
          const suaResponse = await reportsApi.downloadSuaFile(selectedPeriodId);
          const selectedPeriodSua = periods.find((p: any) => p.id === selectedPeriodId);
          downloadBlob(new Blob([suaResponse.data], { type: 'text/plain' }), `sua_${selectedPeriodSua?.periodNumber || ''}_${selectedPeriodSua?.year || ''}.txt`);
          toast.success('Archivo SUA descargado');
          break;
        }

        case 'infonavit-report': {
          const infonavitResponse = await reportsApi.getInfonavitReport(selectedPeriodId);
          console.log('INFONAVIT Report:', infonavitResponse.data);
          toast.success(`Reporte INFONAVIT generado: ${infonavitResponse.data.totals?.creditosActivos || 0} creditos activos`);
          break;
        }

        case 'issste-report': {
          const isssteResponse = await reportsApi.getIssteReport(selectedPeriodId);
          console.log('ISSSTE Report:', isssteResponse.data);
          // Descargar Excel
          const isssteExcel = await reportsApi.downloadIssteExcel(selectedPeriodId);
          const selectedPeriodIssste = periods.find((p: any) => p.id === selectedPeriodId);
          downloadBlob(new Blob([isssteExcel.data]), `cuotas_issste_${selectedPeriodIssste?.periodNumber || ''}_${selectedPeriodIssste?.year || ''}.xlsx`);
          toast.success('Reporte ISSSTE descargado');
          break;
        }

        default:
          toast.error('Tipo de reporte no reconocido');
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error.response?.data?.message || 'Error al generar el reporte');
    } finally {
      setIsGenerating(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 mt-1">
          Genera y descarga reportes del sistema
        </p>
      </div>

      <div className="space-y-8">
        {reportCategories.map((category) => (
          <div key={category.title}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {category.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.reports.map((report) => (
                <div
                  key={report.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleReportClick(report)}
                >
                  <div className="flex items-start">
                    <div className="p-3 rounded-lg bg-primary-100">
                      <report.icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-medium text-gray-900">{report.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Report Configuration Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{selectedReport.name}</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Year selector for all period-based reports */}
                {(selectedReport.needsPeriod || selectedReport.needsYear) && (
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
                )}

                {/* Period selector */}
                {selectedReport.needsPeriod && (
                  <div>
                    <label className="label">Periodo de Nomina</label>
                    <select
                      value={selectedPeriodId}
                      onChange={(e) => setSelectedPeriodId(e.target.value)}
                      className="input"
                    >
                      <option value="">Seleccionar periodo...</option>
                      {periods.map((period: any) => (
                        <option key={period.id} value={period.id}>
                          {periodTypeLabels[period.periodType] || period.periodType} {period.periodNumber}/{period.year}
                          {period.status !== 'CLOSED' && ` (${period.status})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Employee selector */}
                {selectedReport.needsEmployee && (
                  <div>
                    <label className="label">Empleado</label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="input"
                    >
                      <option value="">Seleccionar empleado...</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Department selector */}
                {selectedReport.needsDepartment && (
                  <div>
                    <label className="label">Departamento</label>
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      className="input"
                    >
                      <option value="">Seleccionar departamento...</option>
                      {departments.map((dept: any) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="btn btn-primary"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    'Generar Reporte'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
