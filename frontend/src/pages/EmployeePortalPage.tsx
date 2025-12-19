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
} from '@heroicons/react/24/outline';
import { attendanceApi, payrollApi, vacationsApi, incidentsApi } from '../services/api';
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
  PERSONAL: 'Permiso personal',
  UNPAID: 'Sin goce de sueldo',
  MEDICAL_APPOINTMENT: 'Cita medica',
  OTHER: 'Otro',
};

export default function EmployeePortalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'attendance' | 'receipts' | 'vacations' | 'incidents'>('attendance');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Get employee data linked to user
  const { data: employeeData } = useQuery({
    queryKey: ['my-employee', user?.id],
    queryFn: async () => {
      // For employees, the user.id should map to an employee
      // In a real app, you'd have a dedicated endpoint
      const response = await attendanceApi.getTodayRecord(user?.id || '');
      return response.data;
    },
    enabled: !!user?.id && user?.role === 'employee',
    retry: false,
  });

  // Get today's attendance for self-service
  const { data: todayAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['my-attendance-today', user?.id],
    queryFn: () => attendanceApi.getTodayRecord(user?.id || ''),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const attendance = todayAttendance?.data;

  // Get my payroll receipts
  const { data: receiptsData, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['my-receipts', user?.id, selectedYear],
    queryFn: () => payrollApi.getEmployeeReceipts(user?.id || '', selectedYear),
    enabled: !!user?.id && activeTab === 'receipts',
  });
  const receipts = receiptsData?.data || [];

  // Get my vacation balance
  const { data: vacationBalanceData } = useQuery({
    queryKey: ['my-vacation-balance', user?.id],
    queryFn: () => vacationsApi.getBalance(user?.id || ''),
    enabled: !!user?.id && activeTab === 'vacations',
  });
  const vacationBalance = vacationBalanceData?.data;

  // Get my vacation requests
  const { data: vacationRequestsData, isLoading: isLoadingVacations } = useQuery({
    queryKey: ['my-vacations', user?.id],
    queryFn: () => vacationsApi.getEmployeeRequests(user?.id || ''),
    enabled: !!user?.id && activeTab === 'vacations',
  });
  const vacationRequests = vacationRequestsData?.data || [];

  // Get my incidents
  const { data: incidentsData, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ['my-incidents', user?.id],
    queryFn: () => incidentsApi.getEmployeeIncidents(user?.id || ''),
    enabled: !!user?.id && activeTab === 'incidents',
  });
  const incidents = incidentsData?.data || [];

  // Attendance mutations
  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn(user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast.success('Entrada registrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar entrada');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => attendanceApi.checkOut(user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast.success('Salida registrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar salida');
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: () => attendanceApi.breakStart(user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast.success('Descanso iniciado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al iniciar descanso');
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: () => attendanceApi.breakEnd(user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast.success('Descanso terminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al terminar descanso');
    },
  });

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi Portal</h1>
        <p className="text-gray-500 mt-1">
          Bienvenido, {user?.firstName} {user?.lastName}
        </p>
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

                    <div className="mt-4 pt-4 border-t flex justify-end">
                      <button
                        onClick={() =>
                          handleDownloadReceipt(receipt.id, `${period.periodNumber}_${period.year}`)
                        }
                        className="btn btn-primary"
                      >
                        <DocumentTextIcon className="h-5 w-5 mr-2" />
                        Descargar Recibo PDF
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
    </div>
  );
}
