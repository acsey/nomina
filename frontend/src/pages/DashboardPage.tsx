import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UsersIcon,
  BanknotesIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { employeesApi, payrollApi, vacationsApi, attendanceApi, reportsApi, catalogsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/SearchableSelect';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const { multiCompanyEnabled } = useSystemConfig();
  const isEmployee = user?.role === 'employee';
  const isAdmin = user?.role === 'admin';

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const selectedYear = new Date().getFullYear();

  // Get companies for admin
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
    enabled: isAdmin,
  });
  const companies = companiesData?.data || [];

  // Auto-select first company
  useMemo(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Get employee data if user is an employee
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['my-employee', user?.email],
    queryFn: async () => {
      const response = await employeesApi.getByEmail(user?.email || '');
      return response.data;
    },
    enabled: !!user?.email && isEmployee,
  });

  const employeeId = employeeData?.id;
  const companyId = isAdmin ? selectedCompanyId : (user?.companyId || selectedCompanyId);

  // Stats queries
  const { data: employeesData } = useQuery({
    queryKey: ['employees-count', companyId],
    queryFn: () => employeesApi.getAll({ companyId, take: 1 }),
    enabled: !isEmployee && !!companyId,
  });

  const { data: periodsData } = useQuery({
    queryKey: ['payroll-periods-dash', companyId, selectedYear],
    queryFn: () => payrollApi.getPeriods(companyId, selectedYear),
    enabled: !isEmployee && !!companyId,
  });

  const { data: pendingVacations } = useQuery({
    queryKey: ['pending-vacations', companyId],
    queryFn: () => vacationsApi.getPendingRequests(companyId || ''),
    enabled: !isEmployee && !!companyId,
  });

  const { data: attendanceToday } = useQuery({
    queryKey: ['attendance-today', companyId],
    queryFn: () => attendanceApi.getAllEmployeesToday(companyId),
    enabled: !isEmployee && !!companyId,
  });

  // Employee queries
  const { data: myVacationBalance } = useQuery({
    queryKey: ['my-vacation-balance', employeeId],
    queryFn: () => vacationsApi.getBalance(employeeId || ''),
    enabled: !!employeeId && isEmployee,
  });

  const { data: myAttendanceToday } = useQuery({
    queryKey: ['my-attendance-today', employeeId],
    queryFn: () => attendanceApi.getTodayRecord(employeeId || ''),
    enabled: !!employeeId && isEmployee,
  });

  const { data: myReceipts } = useQuery({
    queryKey: ['my-receipts', employeeId],
    queryFn: () => payrollApi.getEmployeeReceipts(employeeId || '', new Date().getFullYear()),
    enabled: !!employeeId && isEmployee,
  });

  // Calculate stats
  const totalEmployees = employeesData?.data?.meta?.total || 0;
  const periods = periodsData?.data || [];
  const paidPeriods = periods.filter((p: any) => p.status === 'PAID' || p.status === 'CLOSED');
  const pendingRequests = pendingVacations?.data?.length || 0;
  const attendanceData = attendanceToday?.data || [];
  const attendanceRate = attendanceData.length > 0 && totalEmployees > 0
    ? Math.round((attendanceData.filter((a: any) => a.status === 'ON_TIME' || a.status === 'LATE').length / totalEmployees) * 100)
    : 0;

  // Total payroll for the year
  const totalPayroll = paidPeriods.reduce((sum: number, p: any) => {
    return sum + (p.payrollDetails?.reduce((s: number, d: any) => s + Number(d.netPay || 0), 0) || 0);
  }, 0);

  // Prepare chart data
  const payrollChartData = periods
    .filter((p: any) => p.status === 'PAID' || p.status === 'CLOSED')
    .slice(-6)
    .map((p: any) => ({
      name: `P${p.periodNumber}`,
      percepciones: p.payrollDetails?.reduce((s: number, d: any) => s + Number(d.totalPerceptions || 0), 0) || 0,
      deducciones: p.payrollDetails?.reduce((s: number, d: any) => s + Number(d.totalDeductions || 0), 0) || 0,
      neto: p.payrollDetails?.reduce((s: number, d: any) => s + Number(d.netPay || 0), 0) || 0,
    }));

  // Attendance pie chart data
  const attendancePieData = [
    { name: 'A tiempo', value: attendanceData.filter((a: any) => a.status === 'ON_TIME').length, color: '#10B981' },
    { name: 'Tarde', value: attendanceData.filter((a: any) => a.status === 'LATE').length, color: '#F59E0B' },
    { name: 'Ausente', value: Math.max(0, totalEmployees - attendanceData.length), color: '#EF4444' },
  ].filter(d => d.value > 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDownloadReport = async (reportType: string, periodId?: string) => {
    try {
      if (!periodId && periods.length > 0) {
        periodId = periods[0].id;
      }
      if (!periodId) {
        toast.error('No hay periodos disponibles');
        return;
      }

      switch (reportType) {
        case 'payroll-excel': {
          const response = await reportsApi.downloadPayrollExcel(periodId);
          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `nomina_${periodId}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('Reporte descargado');
          break;
        }
        case 'imss-excel': {
          const response = await reportsApi.downloadImssExcel(periodId);
          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `imss_${periodId}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('Reporte IMSS descargado');
          break;
        }
      }
    } catch (error) {
      toast.error('Error al descargar el reporte');
    }
  };

  const companyOptions = companies.map((c: any) => ({
    value: c.id,
    label: c.name,
    description: c.rfc,
  }));

  // Employee Dashboard
  if (isEmployee) {
    if (isLoadingEmployee) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!employeeId) {
      return (
        <div className="card text-center py-12">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No hay empleado vinculado
          </h2>
          <p className="text-gray-500">
            Tu cuenta de usuario no esta vinculada a un registro de empleado.
            <br />
            Contacta a Recursos Humanos para resolver este problema.
          </p>
        </div>
      );
    }

    const vacationBalance = myVacationBalance?.data;
    const attendance = myAttendanceToday?.data;
    const receipts = myReceipts?.data || [];
    const lastReceipt = receipts[0];

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {employeeData?.firstName}!
          </h1>
          <p className="text-gray-500">
            {dayjs().format('dddd, DD [de] MMMM [de] YYYY')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <CalendarDaysIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Dias de Vacaciones</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {vacationBalance
                    ? vacationBalance.earnedDays - vacationBalance.usedDays - vacationBalance.pendingDays
                    : 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Asistencia Hoy</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {attendance?.checkIn
                    ? dayjs(attendance.checkIn).format('HH:mm')
                    : 'Sin entrada'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-500">
                <BanknotesIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ultimo Pago</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {lastReceipt ? formatCurrency(Number(lastReceipt.netPay)) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">No. Empleado</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {employeeData?.employeeNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Acciones Rapidas
            </h2>
            <div className="space-y-3">
              <Link
                to="/my-portal"
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-primary-600" />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Registrar asistencia
                  </span>
                </div>
              </Link>
              <Link
                to="/my-portal"
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-primary-600" />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Ver mis recibos de nomina
                  </span>
                </div>
              </Link>
              <Link
                to="/my-portal"
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Solicitar vacaciones o permiso
                  </span>
                </div>
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Mi Informacion
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Departamento</span>
                <span className="font-medium">{employeeData?.department?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Puesto</span>
                <span className="font-medium">{employeeData?.jobPosition?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Fecha de Ingreso</span>
                <span className="font-medium">
                  {dayjs(employeeData?.hireDate).format('DD/MM/YYYY')}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{employeeData?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin/RH/Manager Dashboard
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {isAdmin && multiCompanyEnabled && companies.length > 1 && (
          <div className="mt-4 sm:mt-0 w-64">
            <SearchableSelect
              options={companyOptions}
              value={selectedCompanyId}
              onChange={setSelectedCompanyId}
              placeholder="Seleccionar empresa..."
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Total Empleados</p>
              <p className="text-3xl font-bold">{totalEmployees}</p>
            </div>
            <UsersIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100">Nomina Anual</p>
              <p className="text-3xl font-bold">{formatCurrency(totalPayroll)}</p>
            </div>
            <BanknotesIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-100">Asistencia Hoy</p>
              <p className="text-3xl font-bold">{attendanceRate}%</p>
            </div>
            <ClockIcon className="h-12 w-12 text-yellow-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100">Solicitudes Pendientes</p>
              <p className="text-3xl font-bold">{pendingRequests}</p>
            </div>
            <CalendarDaysIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Payroll Trend Chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tendencia de Nomina ({selectedYear})
          </h2>
          {payrollChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Periodo ${label}`}
                  />
                  <Bar dataKey="percepciones" name="Percepciones" fill="#10B981" />
                  <Bar dataKey="deducciones" name="Deducciones" fill="#EF4444" />
                  <Bar dataKey="neto" name="Neto" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No hay datos de nomina para mostrar
            </div>
          )}
        </div>

        {/* Attendance Pie Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Asistencia Hoy
          </h2>
          {attendancePieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {attendancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Sin datos de asistencia
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Acciones Rapidas
          </h2>
          <div className="space-y-3">
            <Link
              to="/employees/new"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-primary-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Nuevo empleado
                </span>
              </div>
            </Link>
            <Link
              to="/payroll"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <BanknotesIcon className="h-5 w-5 text-primary-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Procesar nomina
                </span>
              </div>
            </Link>
            <Link
              to="/attendance"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-primary-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Ver asistencia
                </span>
              </div>
            </Link>
            <Link
              to="/vacations"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Gestionar vacaciones
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Reports */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Reportes Rapidos
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => handleDownloadReport('payroll-excel')}
              className="w-full p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              <div className="flex items-center">
                <DocumentArrowDownIcon className="h-5 w-5 text-green-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Descargar Nomina (Excel)
                </span>
              </div>
            </button>
            <button
              onClick={() => handleDownloadReport('imss-excel')}
              className="w-full p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Reporte IMSS (Excel)
                </span>
              </div>
            </button>
            <Link
              to="/reports"
              className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-purple-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Ver todos los reportes
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Periods */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Periodos Recientes
          </h2>
          <div className="space-y-3">
            {periods.slice(0, 5).map((period: any) => (
              <div key={period.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Periodo {period.periodNumber}/{period.year}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dayjs(period.startDate).format('DD/MM')} - {dayjs(period.endDate).format('DD/MM')}
                  </p>
                </div>
                <div className="flex items-center">
                  {period.status === 'PAID' || period.status === 'CLOSED' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : period.status === 'APPROVED' ? (
                    <ClockIcon className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="ml-2 text-xs font-medium">
                    {period.status === 'PAID' ? 'Pagado' :
                     period.status === 'CLOSED' ? 'Cerrado' :
                     period.status === 'APPROVED' ? 'Aprobado' :
                     period.status === 'CALCULATED' ? 'Calculado' :
                     'Borrador'}
                  </span>
                </div>
              </div>
            ))}
            {periods.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay periodos registrados
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Help Banner */}
      <div className="mt-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Necesitas ayuda?</h3>
            <p className="text-primary-100 mt-1">
              Consulta el manual de usuario para aprender a usar todas las funciones del sistema.
            </p>
          </div>
          <Link
            to="/help"
            className="px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            Ver Manual
          </Link>
        </div>
      </div>
    </div>
  );
}
