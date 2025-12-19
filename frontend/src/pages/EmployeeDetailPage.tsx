import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { employeesApi } from '../services/api';
import dayjs from 'dayjs';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: !!id,
  });

  const employee = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Empleado no encontrado</p>
        <Link to="/employees" className="btn btn-primary mt-4">
          Volver a empleados
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/employees"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a empleados
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-gray-500">
            {employee.employeeNumber} • {employee.jobPosition?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/employees/${id}/edit`}
            className="btn btn-secondary"
          >
            <PencilSquareIcon className="h-5 w-5 mr-1" />
            Editar
          </Link>
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${
              employee.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información Personal */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información Personal
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">RFC</dt>
              <dd className="font-medium">{employee.rfc}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">CURP</dt>
              <dd className="font-medium">{employee.curp}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">NSS</dt>
              <dd className="font-medium">{employee.nss || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de nacimiento</dt>
              <dd className="font-medium">
                {dayjs(employee.birthDate).format('DD/MM/YYYY')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Género</dt>
              <dd className="font-medium">
                {employee.gender === 'MALE' ? 'Masculino' : 'Femenino'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado civil</dt>
              <dd className="font-medium">
                {
                  {
                    SINGLE: 'Soltero/a',
                    MARRIED: 'Casado/a',
                    DIVORCED: 'Divorciado/a',
                    WIDOWED: 'Viudo/a',
                    COHABITING: 'Unión libre',
                  }[employee.maritalStatus]
                }
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="font-medium">{employee.email || '-'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-gray-500">Teléfono</dt>
              <dd className="font-medium">{employee.phone || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Información Laboral */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información Laboral
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Departamento</dt>
              <dd className="font-medium">{employee.department?.name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Puesto</dt>
              <dd className="font-medium">{employee.jobPosition?.name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de ingreso</dt>
              <dd className="font-medium">
                {dayjs(employee.hireDate).format('DD/MM/YYYY')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tipo de contrato</dt>
              <dd className="font-medium">
                {
                  {
                    INDEFINITE: 'Indefinido',
                    FIXED_TERM: 'Temporal',
                    SEASONAL: 'Por temporada',
                    TRIAL_PERIOD: 'Periodo de prueba',
                    TRAINING: 'Capacitación',
                  }[employee.contractType]
                }
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Salario base</dt>
              <dd className="font-medium text-lg text-green-600">
                ${Number(employee.baseSalary).toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tipo de salario</dt>
              <dd className="font-medium">
                {
                  {
                    MONTHLY: 'Mensual',
                    BIWEEKLY: 'Quincenal',
                    WEEKLY: 'Semanal',
                    DAILY: 'Diario',
                    HOURLY: 'Por hora',
                  }[employee.salaryType]
                }
              </dd>
            </div>
          </dl>
        </div>

        {/* Información Bancaria */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información de Pago
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Método de pago</dt>
              <dd className="font-medium">
                {
                  {
                    TRANSFER: 'Transferencia',
                    CHECK: 'Cheque',
                    CASH: 'Efectivo',
                  }[employee.paymentMethod]
                }
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Banco</dt>
              <dd className="font-medium">{employee.bank?.name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Cuenta</dt>
              <dd className="font-medium">{employee.bankAccount || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">CLABE</dt>
              <dd className="font-medium">{employee.clabe || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Prestaciones */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Prestaciones Asignadas
          </h2>
          {employee.benefits && employee.benefits.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {employee.benefits.map((eb: any) => (
                <li key={eb.id} className="py-3 flex justify-between">
                  <span className="font-medium">{eb.benefit.name}</span>
                  <span className="text-gray-500">
                    {eb.customValue
                      ? `$${Number(eb.customValue).toLocaleString()}`
                      : eb.benefit.value
                      ? `$${Number(eb.benefit.value).toLocaleString()}`
                      : '-'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No hay prestaciones asignadas
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
