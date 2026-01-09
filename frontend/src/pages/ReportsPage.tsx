import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
  BuildingLibraryIcon,
  XMarkIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { reportsApi, payrollApi, catalogsApi, employeesApi, departmentsApi } from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const reportCategories = [
  {
    title: 'Reportes de Asistencia',
    reports: [
      {
        id: 'attendance-report',
        name: 'Reporte de Asistencia',
        description: 'Resumen de asistencia por rango de fechas con filtros',
        icon: ClockIcon,
        needsDateRange: true,
        needsDepartment: false, // Optional
      },
      {
        id: 'schedules-report',
        name: 'Reporte de Horarios',
        description: 'Horarios asignados a todos los empleados',
        icon: CalendarDaysIcon,
        needsDepartment: false, // Optional
      },
    ],
  },
  {
    title: 'Reportes de Nómina',
    reports: [
      {
        id: 'payroll-summary',
        name: 'Resumen de Nómina',
        description: 'Resumen detallado de percepciones y deducciones por periodo',
        icon: DocumentChartBarIcon,
        needsPeriod: true,
      },
      {
        id: 'payroll-excel',
        name: 'Nómina en Excel',
        description: 'Exportar nómina del periodo a formato Excel',
        icon: DocumentArrowDownIcon,
        needsPeriod: true,
      },
      {
        id: 'payroll-pdf',
        name: 'Nómina en PDF',
        description: 'Exportar nómina del periodo a formato PDF',
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
        description: 'Generar archivo para Sistema Único de Autodeterminación',
        icon: DocumentArrowDownIcon,
        needsPeriod: true,
      },
      {
        id: 'infonavit-report',
        name: 'Descuentos INFONAVIT',
        description: 'Reporte de descuentos por créditos INFONAVIT',
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
        description: 'Historial de nómina y deducciones del año',
        icon: DocumentChartBarIcon,
        needsEmployee: true,
        needsYear: true,
      },
      {
        id: 'department-report',
        name: 'Reporte por Departamento',
        description: 'Resumen de nómina por departamento',
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
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showReportResults, setShowReportResults] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

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
  const employees = employeesData?.data?.data || [];

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
    setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
    setShowReportResults(false);
    setReportData(null);
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
      toast.error('Selecciona un periodo de nómina');
      return;
    }
    if (selectedReport.needsEmployee && !selectedEmployeeId) {
      toast.error('Selecciona un empleado');
      return;
    }
    if (selectedReport.needsDepartment === true && !selectedDepartmentId) {
      toast.error('Selecciona un departamento');
      return;
    }
    if (selectedReport.needsDateRange && (!startDate || !endDate)) {
      toast.error('Selecciona el rango de fechas');
      return;
    }

    setIsGenerating(true);

    try {
      switch (selectedReport.id) {
        case 'attendance-report': {
          const response = await reportsApi.getAttendanceReport({
            companyId,
            startDate,
            endDate,
            departmentId: selectedDepartmentId || undefined,
          });
          setReportData(response.data);
          setShowReportResults(true);
          toast.success('Reporte de asistencia generado');
          break;
        }

        case 'schedules-report': {
          const response = await reportsApi.getSchedulesReport(
            companyId,
            selectedDepartmentId || undefined
          );
          setReportData(response.data);
          setShowReportResults(true);
          toast.success('Reporte de horarios generado');
          break;
        }

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
                {/* Date range for attendance reports */}
                {selectedReport.needsDateRange && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Fecha Inicio</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Fecha Fin</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {/* Year selector for all period-based reports */}
                {(selectedReport.needsPeriod || selectedReport.needsYear) && (
                  <div>
                    <label className="label">Año</label>
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
                    <label className="label">Periodo de Nómina</label>
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
                {(selectedReport.needsDepartment !== undefined || selectedReport.needsDateRange) && (
                  <div>
                    <label className="label">
                      Departamento {selectedReport.needsDepartment !== true && '(opcional)'}
                    </label>
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      className="input"
                    >
                      <option value="">Todos los departamentos</option>
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

      {/* Report Results Modal */}
      {showReportResults && reportData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowReportResults(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">{selectedReport?.name}</h3>
                <button
                  onClick={() => setShowReportResults(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Attendance Report Results */}
                {selectedReport?.id === 'attendance-report' && reportData.summary && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Total Empleados</p>
                        <p className="text-2xl font-bold">{reportData.summary.totalEmployees}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600">Días Presentes</p>
                        <p className="text-2xl font-bold text-green-700">{reportData.summary.totals.present}</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm text-yellow-600">Retardos</p>
                        <p className="text-2xl font-bold text-yellow-700">{reportData.summary.totals.late}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <p className="text-sm text-red-600">Ausencias</p>
                        <p className="text-2xl font-bold text-red-700">{reportData.summary.totals.absent}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600">Vacaciones</p>
                        <p className="text-2xl font-bold text-blue-700">{reportData.summary.totals.vacation}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-purple-600">Horas Trabajadas</p>
                        <p className="text-2xl font-bold text-purple-700">{reportData.summary.totals.hoursWorked.toFixed(1)}</p>
                      </div>
                    </div>

                    {/* Employee Details Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Presentes</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Retardos</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ausencias</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Vacaciones</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Horas</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.employees?.map((emp: any) => (
                            <tr key={emp.employee.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">
                                  {emp.employee.firstName} {emp.employee.lastName}
                                </div>
                                <div className="text-xs text-gray-500">{emp.employee.employeeNumber}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {emp.employee.department || '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  {emp.stats.daysPresent}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  emp.stats.daysLate > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {emp.stats.daysLate}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  emp.stats.daysAbsent > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {emp.stats.daysAbsent}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {emp.stats.daysVacation}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-medium">
                                {emp.stats.totalHoursWorked.toFixed(1)}h
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Schedules Report Results */}
                {selectedReport?.id === 'schedules-report' && reportData.summary && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Total Empleados</p>
                        <p className="text-2xl font-bold">{reportData.summary.totalEmployees}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600">Con Horario</p>
                        <p className="text-2xl font-bold text-green-700">{reportData.summary.withSchedule}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <p className="text-sm text-red-600">Sin Horario</p>
                        <p className="text-2xl font-bold text-red-700">{reportData.summary.withoutSchedule}</p>
                      </div>
                    </div>

                    {/* By Schedule Summary */}
                    {reportData.summary.bySchedule?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Distribución por Horario</h4>
                        <div className="flex flex-wrap gap-2">
                          {reportData.summary.bySchedule.map((s: any) => (
                            <span key={s.name} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                              {s.name}: {s.count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employee Schedules Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Laborales</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Horas/Semana</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.employees?.map((emp: any) => (
                            <tr key={emp.employee.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">
                                  {emp.employee.firstName} {emp.employee.lastName}
                                </div>
                                <div className="text-xs text-gray-500">{emp.employee.employeeNumber}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {emp.employee.department || '-'}
                              </td>
                              <td className="px-4 py-3">
                                {emp.schedule ? (
                                  <span className="text-sm font-medium text-gray-900">{emp.schedule.name}</span>
                                ) : (
                                  <span className="text-sm text-red-500">Sin asignar</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {emp.schedule?.details
                                  ?.filter((d: any) => d.isWorkDay)
                                  .map((d: any) => d.dayName.substring(0, 3))
                                  .join(', ') || '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {emp.schedule ? (
                                  <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                                    {emp.schedule.weeklyHours?.toFixed(1)}h
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-4 border-t">
                <button
                  onClick={() => setShowReportResults(false)}
                  className="btn btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
