import { useQuery } from '@tanstack/react-query';
import {
  UsersIcon,
  BanknotesIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { employeesApi, payrollApi } from '../services/api';

const stats = [
  {
    name: 'Total Empleados',
    icon: UsersIcon,
    color: 'bg-blue-500',
    key: 'employees',
  },
  {
    name: 'Nómina del Período',
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
  const { data: employeesData } = useQuery({
    queryKey: ['employees-count'],
    queryFn: () => employeesApi.getAll({ take: 1 }),
  });

  const statsData = {
    employees: employeesData?.data?.meta?.total || 0,
    payroll: '$0.00',
    attendance: '0%',
    requests: 0,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsData[stat.key as keyof typeof statsData]}
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
            Acciones Rápidas
          </h2>
          <div className="space-y-3">
            <a
              href="/employees"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-primary-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Ver empleados
                </span>
              </div>
            </a>
            <a
              href="/payroll"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <BanknotesIcon className="h-5 w-5 text-primary-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Procesar nómina
                </span>
              </div>
            </a>
            <a
              href="/attendance"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-primary-600" />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Registrar asistencia
                </span>
              </div>
            </a>
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
