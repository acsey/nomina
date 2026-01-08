import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { attendanceApi, employeesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  ON_TIME: { label: 'A tiempo', color: 'text-green-700', bgColor: 'bg-green-100' },
  PRESENT: { label: 'Presente', color: 'text-green-700', bgColor: 'bg-green-100' },
  LATE: { label: 'Retardo', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  ABSENT: { label: 'Ausente', color: 'text-red-700', bgColor: 'bg-red-100' },
  VACATION: { label: 'Vacaciones', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  SICK_LEAVE: { label: 'Incapacidad', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  REST_DAY: { label: 'Dia de descanso', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export default function PortalAttendancePage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  // Get employee data
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['my-employee', user?.email],
    queryFn: async () => {
      const response = await employeesApi.getByEmail(user?.email || '');
      return response.data;
    },
    enabled: !!user?.email,
  });

  const employeeId = employeeData?.id;

  // Get today's attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ['my-attendance-today', employeeId],
    queryFn: () => attendanceApi.getTodayRecord(employeeId || ''),
    enabled: !!employeeId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get monthly attendance history
  const { data: monthlyAttendance, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['my-attendance-monthly', employeeId, selectedMonth],
    queryFn: async () => {
      const startDate = dayjs(selectedMonth).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(selectedMonth).endOf('month').format('YYYY-MM-DD');
      const response = await attendanceApi.getEmployeeAttendance(employeeId || '', startDate, endDate);
      return response.data;
    },
    enabled: !!employeeId,
  });

  const attendance = todayAttendance?.data;
  const monthlyRecords = monthlyAttendance || [];

  // Calculate monthly stats
  const stats = {
    totalDays: monthlyRecords.length,
    onTime: monthlyRecords.filter((r: any) => r.status === 'ON_TIME' || r.status === 'PRESENT').length,
    late: monthlyRecords.filter((r: any) => r.status === 'LATE').length,
    absent: monthlyRecords.filter((r: any) => r.status === 'ABSENT').length,
  };

  if (isLoadingEmployee) {
    return (
      <div className="flex justify-center items-center h-64">
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
          Tu cuenta no esta vinculada a un registro de empleado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Asistencia</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Consulta tu historial de asistencia
        </p>
      </div>

      {/* Today's Status Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Hoy - {dayjs().format('dddd, DD [de] MMMM [de] YYYY')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Entrada</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {attendance?.checkIn ? dayjs(attendance.checkIn).format('HH:mm') : '--:--'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Salida</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {attendance?.checkOut ? dayjs(attendance.checkOut).format('HH:mm') : '--:--'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Horas trabajadas</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {attendance?.totalHours ? `${Math.floor(attendance.totalHours)}h ${Math.round((attendance.totalHours % 1) * 60)}m` : '--'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
            {attendance?.status ? (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${statusConfig[attendance.status]?.bgColor || 'bg-gray-100'} ${statusConfig[attendance.status]?.color || 'text-gray-700'}`}>
                {statusConfig[attendance.status]?.label || attendance.status}
              </span>
            ) : (
              <span className="text-gray-400">Sin registro</span>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Dias registrados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDays}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">A tiempo</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.onTime}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Retardos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.late}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Faltas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.absent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Historial del mes
          </h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input w-auto"
          />
        </div>

        {isLoadingMonthly ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : monthlyRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay registros de asistencia para este mes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entrada
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salida
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {monthlyRecords.map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {dayjs(record.date).format('ddd DD/MM')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {record.checkIn ? dayjs(record.checkIn).format('HH:mm') : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {record.checkOut ? dayjs(record.checkOut).format('HH:mm') : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {record.totalHours ? `${Math.floor(record.totalHours)}h ${Math.round((record.totalHours % 1) * 60)}m` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[record.status]?.bgColor || 'bg-gray-100'} ${statusConfig[record.status]?.color || 'text-gray-700'}`}>
                        {statusConfig[record.status]?.label || record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
