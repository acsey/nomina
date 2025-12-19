import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClockIcon } from '@heroicons/react/24/outline';
import { attendanceApi } from '../services/api';
import dayjs from 'dayjs';

const statusLabels: Record<string, { label: string; color: string }> = {
  PRESENT: { label: 'Presente', color: 'bg-green-100 text-green-800' },
  ABSENT: { label: 'Ausente', color: 'bg-red-100 text-red-800' },
  LATE: { label: 'Retardo', color: 'bg-yellow-100 text-yellow-800' },
  VACATION: { label: 'Vacaciones', color: 'bg-blue-100 text-blue-800' },
  SICK_LEAVE: { label: 'Incapacidad', color: 'bg-purple-100 text-purple-800' },
};

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );

  // TODO: Obtener companyId del contexto
  const companyId = 'demo-company-id';

  const { data, isLoading } = useQuery({
    queryKey: ['daily-attendance', companyId, selectedDate],
    queryFn: () => attendanceApi.getDailyAttendance(companyId, selectedDate),
  });

  const attendance = data?.data || [];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Control de Asistencia
        </h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-auto"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Presentes</p>
              <p className="text-2xl font-semibold">
                {attendance.filter((a: any) => a.status === 'PRESENT').length}
              </p>
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
              <p className="text-2xl font-semibold">
                {attendance.filter((a: any) => a.status === 'LATE').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-100">
              <ClockIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Ausentes</p>
              <p className="text-2xl font-semibold">
                {attendance.filter((a: any) => a.status === 'ABSENT').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Permisos</p>
              <p className="text-2xl font-semibold">
                {
                  attendance.filter((a: any) =>
                    ['VACATION', 'SICK_LEAVE', 'PERMIT'].includes(a.status)
                  ).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
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
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Departamento</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Horas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendance.map((record: any) => (
                  <tr key={record.id}>
                    <td className="font-medium">
                      {record.employee.firstName} {record.employee.lastName}
                    </td>
                    <td>{record.employee.department?.name || '-'}</td>
                    <td>
                      {record.checkIn
                        ? dayjs(record.checkIn).format('HH:mm')
                        : '-'}
                    </td>
                    <td>
                      {record.checkOut
                        ? dayjs(record.checkOut).format('HH:mm')
                        : '-'}
                    </td>
                    <td>
                      {record.hoursWorked
                        ? `${Number(record.hoursWorked).toFixed(1)}h`
                        : '-'}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          statusLabels[record.status]?.color || 'bg-gray-100'
                        }`}
                      >
                        {statusLabels[record.status]?.label || record.status}
                      </span>
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
