import { useQuery } from '@tanstack/react-query';
import {
  UsersIcon,
  BanknotesIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { employeesApi, payrollApi, vacationsApi, attendanceApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

const adminStats = [
  {
    name: 'Total Empleados',
    icon: UsersIcon,
    color: 'bg-blue-500',
    key: 'employees',
  },
  {
    name: 'Nomina del Periodo',
    icon: BanknotesIcon,
    color: 'bg-green-500',
    key: 'payroll',
  },
  {
    name: 'Asistencia Hoy',
    icon: ClockIcon,
    color: 'bg-yellow-500',
    key: 'attendance',
  },
  {
    name: 'Solicitudes Pendientes',
    icon: CalendarDaysIcon,
    color: 'bg-purple-500',
    key: 'requests',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';

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

  // Admin queries
  const { data: employeesData } = useQuery({
    queryKey: ['employees-count'],
    queryFn: () => employeesApi.getAll({ take: 1 }),
    enabled: !isEmployee,
  });

  const { data: pendingVacations } = useQuery({
    queryKey: ['pending-vacations'],
    queryFn: () => vacationsApi.getPending(),
    enabled: !isEmployee,
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

  // Admin stats data
  const adminStatsData = {
    employees: employeesData?.data?.meta?.total || 0,
    payroll: '$0.00',
    attendance: '0%',
    requests: pendingVacations?.data?.length || 0,
  };

  // Employee stats
  const vacationBalance = myVacationBalance?.data;
  const attendance = myAttendanceToday?.data;
  const receipts = myReceipts?.data || [];
  const lastReceipt = receipts[0];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

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

        {/* Employee Stats */}
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

        {/* Quick Actions for Employee */}
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {adminStats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {adminStatsData[stat.key as keyof typeof adminStatsData]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Acciones Rapidas
          </h2>
          <div className="space-y-3">
            <Link
              to="/employees"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-primary-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Ver empleados
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
                  Registrar asistencia
                </span>
              </div>
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Actividad Reciente
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              No hay actividad reciente para mostrar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
