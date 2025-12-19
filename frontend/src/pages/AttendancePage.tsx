import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClockIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  PauseIcon,
  PlayIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { attendanceApi, catalogsApi } from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const statusLabels: Record<string, { label: string; color: string }> = {
  PRESENT: { label: 'Presente', color: 'bg-green-100 text-green-800' },
  ABSENT: { label: 'Ausente', color: 'bg-red-100 text-red-800' },
  LATE: { label: 'Retardo', color: 'bg-yellow-100 text-yellow-800' },
  VACATION: { label: 'Vacaciones', color: 'bg-blue-100 text-blue-800' },
  SICK_LEAVE: { label: 'Incapacidad', color: 'bg-purple-100 text-purple-800' },
};

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');

  // Get company from first company
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];
  const companyId = companies[0]?.id || '';

  // Get all employees with today's attendance
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['attendance-today', companyId],
    queryFn: () => attendanceApi.getAllEmployeesToday(companyId),
    enabled: !!companyId && isToday,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  const employeesToday = employeesData?.data || [];

  // Get daily attendance for historical dates
  const { data: historicalData, isLoading: isLoadingHistorical } = useQuery({
    queryKey: ['daily-attendance', companyId, selectedDate],
    queryFn: () => attendanceApi.getDailyAttendance(companyId, selectedDate),
    enabled: !!companyId && !isToday,
  });
  const historicalAttendance = historicalData?.data || [];

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: (employeeId: string) => attendanceApi.checkIn(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      toast.success('Entrada registrada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar entrada');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (employeeId: string) => attendanceApi.checkOut(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      toast.success('Salida registrada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar salida');
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: (employeeId: string) => attendanceApi.breakStart(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      toast.success('Descanso iniciado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al iniciar descanso');
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: (employeeId: string) => attendanceApi.breakEnd(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      toast.success('Descanso terminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al terminar descanso');
    },
  });

  const getEmployeeScheduleForToday = (employee: any) => {
    if (!employee.workSchedule?.scheduleDetails) return null;
    const dayOfWeek = dayjs().day();
    return employee.workSchedule.scheduleDetails.find(
      (d: any) => d.dayOfWeek === dayOfWeek
    );
  };

  const getAttendanceStatus = (employee: any) => {
    const attendance = employee.todayAttendance;
    if (!attendance) return { status: 'SIN_REGISTRO', label: 'Sin registro', color: 'bg-gray-100 text-gray-600' };

    const statusInfo = statusLabels[attendance.status];
    if (statusInfo) return { status: attendance.status, ...statusInfo };

    return { status: attendance.status, label: attendance.status, color: 'bg-gray-100 text-gray-600' };
  };

  // Calculate stats
  const stats = {
    total: employeesToday.length,
    present: employeesToday.filter((e: any) => e.todayAttendance?.checkIn).length,
    late: employeesToday.filter((e: any) => e.todayAttendance?.status === 'LATE').length,
    onBreak: employeesToday.filter((e: any) =>
      e.todayAttendance?.breakStart && !e.todayAttendance?.breakEnd
    ).length,
    absent: employeesToday.filter((e: any) => !e.todayAttendance?.checkIn).length,
  };

  const loading = isLoading || isLoadingHistorical;
  const attendance = isToday ? employeesToday : historicalAttendance;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
          <p className="text-gray-500 mt-1">
            {dayNames[dayjs(selectedDate).day()]}, {dayjs(selectedDate).format('DD/MM/YYYY')}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-auto"
        />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-gray-100">
              <UserIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Presentes</p>
              <p className="text-2xl font-semibold">{stats.present}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Retardos</p>
              <p className="text-2xl font-semibold">{stats.late}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-100">
              <PauseIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">En descanso</p>
              <p className="text-2xl font-semibold">{stats.onBreak}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-100">
              <ClockIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Sin registro</p>
              <p className="text-2xl font-semibold">{stats.absent}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : attendance.length === 0 ? (
        <div className="card text-center py-12">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            No hay registros de asistencia para esta fecha
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Horario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Entrada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descanso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Salida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  {isToday && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(isToday ? employeesToday : historicalAttendance).map((record: any) => {
                  const employee = isToday ? record : record.employee;
                  const attendance = isToday ? record.todayAttendance : record;
                  const schedule = isToday ? getEmployeeScheduleForToday(record) : null;
                  const statusInfo = isToday ? getAttendanceStatus(record) : statusLabels[record.status] || { label: record.status, color: 'bg-gray-100' };

                  const hasCheckedIn = !!attendance?.checkIn;
                  const hasCheckedOut = !!attendance?.checkOut;
                  const isOnBreak = attendance?.breakStart && !attendance?.breakEnd;

                  return (
                    <tr key={isToday ? employee.id : record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{employee.employeeNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.department?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule ? (
                          <span>
                            {schedule.startTime} - {schedule.endTime}
                            {schedule.breakStart && (
                              <span className="block text-xs text-gray-400">
                                Descanso: {schedule.breakStart} - {schedule.breakEnd}
                              </span>
                            )}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {attendance?.checkIn ? (
                          <span className="text-green-600 font-medium">
                            {dayjs(attendance.checkIn).format('HH:mm')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {attendance?.breakStart ? (
                          <span>
                            <span className="text-orange-600">
                              {dayjs(attendance.breakStart).format('HH:mm')}
                            </span>
                            {attendance.breakEnd && (
                              <span className="text-green-600">
                                {' - '}
                                {dayjs(attendance.breakEnd).format('HH:mm')}
                              </span>
                            )}
                            {!attendance.breakEnd && (
                              <span className="text-orange-600 animate-pulse"> (en curso)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {attendance?.checkOut ? (
                          <span className="text-blue-600 font-medium">
                            {dayjs(attendance.checkOut).format('HH:mm')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      {isToday && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-1">
                            {/* Check In button */}
                            {!hasCheckedIn && (
                              <button
                                onClick={() => checkInMutation.mutate(employee.id)}
                                disabled={checkInMutation.isPending}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Registrar entrada"
                              >
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                              </button>
                            )}

                            {/* Break Start button */}
                            {hasCheckedIn && !hasCheckedOut && !isOnBreak && (
                              <button
                                onClick={() => breakStartMutation.mutate(employee.id)}
                                disabled={breakStartMutation.isPending}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                                title="Iniciar descanso"
                              >
                                <PauseIcon className="h-5 w-5" />
                              </button>
                            )}

                            {/* Break End button */}
                            {isOnBreak && (
                              <button
                                onClick={() => breakEndMutation.mutate(employee.id)}
                                disabled={breakEndMutation.isPending}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg animate-pulse"
                                title="Terminar descanso"
                              >
                                <PlayIcon className="h-5 w-5" />
                              </button>
                            )}

                            {/* Check Out button */}
                            {hasCheckedIn && !hasCheckedOut && !isOnBreak && (
                              <button
                                onClick={() => checkOutMutation.mutate(employee.id)}
                                disabled={checkOutMutation.isPending}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Registrar salida"
                              >
                                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                              </button>
                            )}

                            {/* Show check if completed */}
                            {hasCheckedOut && (
                              <span className="text-green-500 text-sm">Completado</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
