import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClockIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  PauseIcon,
  PlayIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { attendanceApi, payrollApi, vacationsApi, incidentsApi, employeesApi, cfdiApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
  APPLIED: { label: 'Aplicada', color: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
};

const leaveTypeLabels: Record<string, string> = {
  VACATION: 'Vacaciones',
  SICK_LEAVE: 'Incapacidad por enfermedad',
  SICK_LEAVE_IMSS: 'Incapacidad IMSS',
  WORK_ACCIDENT: 'Accidente de trabajo',
  MATERNITY: 'Maternidad',
  PATERNITY: 'Paternidad',
  BEREAVEMENT_DIRECT: 'Duelo familiar directo',
  BEREAVEMENT_INDIRECT: 'Duelo familiar indirecto',
  PERSONAL: 'Permiso personal',
  UNPAID: 'Sin goce de sueldo',
};

export default function EmployeePortalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'attendance' | 'receipts' | 'vacations' | 'incidents'>('attendance');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationForm, setVacationForm] = useState({
    type: 'VACATION',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Get employee data linked to user by email
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['my-employee', user?.email],
    queryFn: async () => {
      const response = await employeesApi.getByEmail(user?.email || '');
      return response.data;
    },
    enabled: !!user?.email,
    retry: false,
  });

  const employeeId = employeeData?.id;

  // Get today's attendance for self-service
  const { data: todayAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['my-attendance-today', employeeId],
    queryFn: () => attendanceApi.getTodayRecord(employeeId || ''),
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  const attendance = todayAttendance?.data;

  // Get my payroll receipts
  const { data: receiptsData, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['my-receipts', employeeId, selectedYear],
    queryFn: () => payrollApi.getEmployeeReceipts(employeeId || '', selectedYear),
    enabled: !!employeeId && activeTab === 'receipts',
  });
  const receipts = receiptsData?.data || [];

  // Get my vacation balance
  const { data: vacationBalanceData } = useQuery({
    queryKey: ['my-vacation-balance', employeeId],
    queryFn: () => vacationsApi.getBalance(employeeId || ''),
    enabled: !!employeeId && activeTab === 'vacations',
  });
  const vacationBalance = vacationBalanceData?.data;

  // Get my vacation requests
  const { data: vacationRequestsData, isLoading: isLoadingVacations } = useQuery({
    queryKey: ['my-vacations', employeeId],
    queryFn: () => vacationsApi.getEmployeeRequests(employeeId || ''),
    enabled: !!employeeId && activeTab === 'vacations',
  });
  const vacationRequests = vacationRequestsData?.data || [];

  // Get my incidents
  const { data: incidentsData, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ['my-incidents', employeeId],
    queryFn: () => incidentsApi.getEmployeeIncidents(employeeId || ''),
    enabled: !!employeeId && activeTab === 'incidents',
  });
  const incidents = incidentsData?.data || [];

  // Attendance mutations
  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn(employeeId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast.success('Entrada registrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar entrada');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => attendanceApi.checkOut(employeeId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast.success('Salida registrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar salida');
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: () => attendanceApi.breakStart(employeeId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast.success('Descanso iniciado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al iniciar descanso');
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: () => attendanceApi.breakEnd(employeeId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast.success('Descanso terminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al terminar descanso');
    },
  });

  // Vacation request mutation
  const requestVacationMutation = useMutation({
    mutationFn: (data: any) => vacationsApi.request(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['my-vacation-balance'] });
      toast.success('Solicitud enviada exitosamente');
      setShowVacationModal(false);
      setVacationForm({ type: 'VACATION', startDate: '', endDate: '', reason: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al enviar solicitud');
    },
  });

  const handleVacationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    requestVacationMutation.mutate({
      employeeId,
      ...vacationForm,
    });
  };

  const handleDownloadReceipt = async (detailId: string, periodInfo: string) => {
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
      toast.success('Recibo descargado');
    } catch (error) {
      toast.error('Error al descargar el recibo');
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

  const hasCheckedIn = !!attendance?.checkIn;
  const hasCheckedOut = !!attendance?.checkOut;
  const isOnBreak = attendance?.breakStart && !attendance?.breakEnd;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Loading state for employee data
  if (isLoadingEmployee) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // No employee linked to this user
  if (!employeeId) {
    const isAdminUser = user?.role === 'admin' || user?.role === 'rh' || user?.role === 'super_admin';

    return (
      <div className="card text-center py-12 max-w-lg mx-auto">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isAdminUser ? 'bg-blue-100' : 'bg-yellow-100'}`}>
          {isAdminUser ? (
            <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500" />
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {isAdminUser ? 'Modulo exclusivo para empleados' : 'Usuario no vinculado'}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {isAdminUser ? (
            <>
              Este modulo es para que los <strong>empleados</strong> puedan consultar su informacion personal,
              registrar asistencia, ver recibos de nomina y solicitar vacaciones.
            </>
          ) : (
            <>
              Tu cuenta de usuario (<strong>{user?.email}</strong>) no esta vinculada a un registro de empleado en el sistema.
            </>
          )}
        </p>

        <div className={`p-4 rounded-lg text-left text-sm ${isAdminUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
          {isAdminUser ? (
            <div className="space-y-2 text-blue-800 dark:text-blue-300">
              <p className="font-medium">Como usuario administrativo puedes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Gestionar empleados desde el modulo <strong>Empleados</strong></li>
                <li>Administrar asistencia desde <strong>Asistencia</strong></li>
                <li>Procesar nominas desde <strong>Nomina</strong></li>
                <li>Aprobar vacaciones desde <strong>Vacaciones</strong></li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2 text-yellow-800 dark:text-yellow-300">
              <p className="font-medium">Para resolver esto:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Contacta al departamento de <strong>Recursos Humanos</strong></li>
                <li>Solicita que vinculen tu correo (<strong>{user?.email}</strong>) con tu registro de empleado</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi Portal</h1>
        <p className="text-gray-500 mt-1">
          Bienvenido, {employeeData?.firstName} {employeeData?.lastName} {employeeData?.secondLastName}
        </p>
      </div>

      {/* Employee Info Card */}
      <div className="card mb-6 bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">No. Empleado</p>
            <p className="font-semibold">{employeeData?.employeeNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Departamento</p>
            <p className="font-semibold">{employeeData?.department?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Puesto</p>
            <p className="font-semibold">{employeeData?.jobPosition?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fecha de Ingreso</p>
            <p className="font-semibold">{dayjs(employeeData?.hireDate).format('DD/MM/YYYY')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClockIcon className="h-5 w-5" />
            Asistencia
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'receipts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5" />
            Recibos de Nomina
          </button>
          <button
            onClick={() => setActiveTab('vacations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'vacations'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CalendarDaysIcon className="h-5 w-5" />
            Vacaciones
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'incidents'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ExclamationTriangleIcon className="h-5 w-5" />
            Incidencias
          </button>
        </nav>
      </div>

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div>
          {/* Current time display */}
          <div className="card mb-6 text-center">
            <p className="text-gray-500 text-sm">Fecha actual</p>
            <p className="text-3xl font-bold text-gray-900">
              {dayjs().format('dddd, DD [de] MMMM [de] YYYY')}
            </p>
            <p className="text-5xl font-bold text-primary-600 mt-2">
              {dayjs().format('HH:mm')}
            </p>
          </div>

          {/* Attendance actions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Registrar Asistencia</h3>

            {isLoadingAttendance ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <>
                {/* Current status */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Entrada</p>
                      <p className="text-xl font-bold text-green-600">
                        {attendance?.checkIn
                          ? dayjs(attendance.checkIn).format('HH:mm')
                          : '--:--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Inicio Descanso</p>
                      <p className="text-xl font-bold text-orange-600">
                        {attendance?.breakStart
                          ? dayjs(attendance.breakStart).format('HH:mm')
                          : '--:--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fin Descanso</p>
                      <p className="text-xl font-bold text-orange-600">
                        {attendance?.breakEnd
                          ? dayjs(attendance.breakEnd).format('HH:mm')
                          : '--:--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Salida</p>
                      <p className="text-xl font-bold text-blue-600">
                        {attendance?.checkOut
                          ? dayjs(attendance.checkOut).format('HH:mm')
                          : '--:--'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-4 justify-center">
                  {!hasCheckedIn && (
                    <button
                      onClick={() => checkInMutation.mutate()}
                      disabled={checkInMutation.isPending}
                      className="btn btn-primary flex items-center gap-2 px-8 py-4 text-lg"
                    >
                      <ArrowRightOnRectangleIcon className="h-6 w-6" />
                      Registrar Entrada
                    </button>
                  )}

                  {hasCheckedIn && !hasCheckedOut && !isOnBreak && (
                    <>
                      <button
                        onClick={() => breakStartMutation.mutate()}
                        disabled={breakStartMutation.isPending}
                        className="btn bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2 px-6 py-4"
                      >
                        <PauseIcon className="h-6 w-6" />
                        Iniciar Descanso
                      </button>
                      <button
                        onClick={() => checkOutMutation.mutate()}
                        disabled={checkOutMutation.isPending}
                        className="btn btn-primary flex items-center gap-2 px-8 py-4 text-lg"
                      >
                        <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                        Registrar Salida
                      </button>
                    </>
                  )}

                  {isOnBreak && (
                    <button
                      onClick={() => breakEndMutation.mutate()}
                      disabled={breakEndMutation.isPending}
                      className="btn bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 px-8 py-4 text-lg animate-pulse"
                    >
                      <PlayIcon className="h-6 w-6" />
                      Terminar Descanso
                    </button>
                  )}

                  {hasCheckedOut && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-6 py-4 rounded-lg">
                      <CheckCircleIcon className="h-8 w-8" />
                      <span className="text-lg font-medium">Jornada completada</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Receipts Tab */}
      {activeTab === 'receipts' && (
        <div>
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mis Recibos de Nomina</h3>
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
            </div>
          </div>

          {isLoadingReceipts ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : receipts.length === 0 ? (
            <div className="card text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay recibos disponibles para el ano seleccionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt: any) => {
                const period = receipt.payrollPeriod;
                if (!period) return null;

                return (
                  <div key={receipt.id} className="card hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">
                          Periodo {period.periodNumber}/{period.year}
                        </p>
                        <p className="text-sm text-gray-500">
                          Fecha de pago: {dayjs(period.paymentDate).format('DD/MM/YYYY')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(Number(receipt.netPay))}
                        </p>
                        <p className="text-sm text-gray-500">Neto a recibir</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-500">Percepciones</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(Number(receipt.totalPerceptions))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Deducciones</p>
                        <p className="font-medium text-red-600">
                          {formatCurrency(Number(receipt.totalDeductions))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Dias Trabajados</p>
                        <p className="font-medium">{Number(receipt.workedDays).toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                      <button
                        onClick={() =>
                          handleDownloadXml(receipt.id, `${period.periodNumber}_${period.year}`)
                        }
                        className="btn btn-secondary flex items-center"
                      >
                        <CodeBracketIcon className="h-5 w-5 mr-2" />
                        XML
                      </button>
                      <button
                        onClick={() =>
                          handleDownloadReceipt(receipt.id, `${period.periodNumber}_${period.year}`)
                        }
                        className="btn btn-primary"
                      >
                        <DocumentTextIcon className="h-5 w-5 mr-2" />
                        Descargar PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vacations Tab */}
      {activeTab === 'vacations' && (
        <div>
          {/* Balance */}
          {vacationBalance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card bg-blue-50">
                <p className="text-sm text-blue-600">Dias Ganados</p>
                <p className="text-3xl font-bold text-blue-700">{vacationBalance.earnedDays}</p>
              </div>
              <div className="card bg-green-50">
                <p className="text-sm text-green-600">Disponibles</p>
                <p className="text-3xl font-bold text-green-700">
                  {vacationBalance.earnedDays - vacationBalance.usedDays - vacationBalance.pendingDays}
                </p>
              </div>
              <div className="card bg-yellow-50">
                <p className="text-sm text-yellow-600">Usados</p>
                <p className="text-3xl font-bold text-yellow-700">{vacationBalance.usedDays}</p>
              </div>
              <div className="card bg-orange-50">
                <p className="text-sm text-orange-600">Pendientes Aprobacion</p>
                <p className="text-3xl font-bold text-orange-700">{vacationBalance.pendingDays}</p>
              </div>
            </div>
          )}

          {/* New Request Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowVacationModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Nueva Solicitud
            </button>
          </div>

          {/* Requests history */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Historial de Solicitudes</h3>

            {isLoadingVacations ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : vacationRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarDaysIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No tienes solicitudes de vacaciones registradas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dias</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vacationRequests.map((request: any) => (
                      <tr key={request.id}>
                        <td className="px-4 py-3 text-sm font-medium">
                          {leaveTypeLabels[request.type] || request.type}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {dayjs(request.startDate).format('DD/MM/YYYY')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {dayjs(request.endDate).format('DD/MM/YYYY')}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{request.totalDays}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              statusLabels[request.status]?.color || 'bg-gray-100'
                            }`}
                          >
                            {statusLabels[request.status]?.label || request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {request.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Mis Incidencias</h3>

          {isLoadingIncidents ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No tienes incidencias registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripcion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {incidents.map((incident: any) => (
                    <tr
                      key={incident.id}
                      className={
                        incident.incidentType?.isDeduction ? 'bg-red-50' : 'bg-green-50'
                      }
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {dayjs(incident.date).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {incident.incidentType?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{Number(incident.value)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            statusLabels[incident.status]?.color || 'bg-gray-100'
                          }`}
                        >
                          {statusLabels[incident.status]?.label || incident.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {incident.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vacation Request Modal */}
      {showVacationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Nueva Solicitud</h2>
                <button
                  onClick={() => setShowVacationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleVacationSubmit} className="space-y-4">
                <div>
                  <label className="label">Tipo de Solicitud *</label>
                  <select
                    value={vacationForm.type}
                    onChange={(e) => setVacationForm({ ...vacationForm, type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="VACATION">Vacaciones</option>
                    <option value="SICK_LEAVE">Incapacidad por enfermedad</option>
                    <option value="SICK_LEAVE_IMSS">Incapacidad IMSS</option>
                    <option value="WORK_ACCIDENT">Accidente de trabajo</option>
                    <option value="MATERNITY">Maternidad</option>
                    <option value="PATERNITY">Paternidad</option>
                    <option value="BEREAVEMENT_DIRECT">Duelo familiar directo</option>
                    <option value="BEREAVEMENT_INDIRECT">Duelo familiar indirecto</option>
                    <option value="PERSONAL">Permiso personal</option>
                    <option value="UNPAID">Sin goce de sueldo</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Fecha Inicio *</label>
                    <input
                      type="date"
                      value={vacationForm.startDate}
                      onChange={(e) => setVacationForm({ ...vacationForm, startDate: e.target.value })}
                      className="input"
                      required
                      min={dayjs().format('YYYY-MM-DD')}
                    />
                  </div>
                  <div>
                    <label className="label">Fecha Fin *</label>
                    <input
                      type="date"
                      value={vacationForm.endDate}
                      onChange={(e) => setVacationForm({ ...vacationForm, endDate: e.target.value })}
                      className="input"
                      required
                      min={vacationForm.startDate || dayjs().format('YYYY-MM-DD')}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Motivo</label>
                  <textarea
                    value={vacationForm.reason}
                    onChange={(e) => setVacationForm({ ...vacationForm, reason: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Describe el motivo de tu solicitud..."
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowVacationModal(false)}
                    className="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={requestVacationMutation.isPending}
                    className="btn btn-primary"
                  >
                    {requestVacationMutation.isPending ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
