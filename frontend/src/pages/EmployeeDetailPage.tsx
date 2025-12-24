import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  GiftIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { employeesApi, benefitsApi } from '../services/api';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBenefitId, setSelectedBenefitId] = useState('');
  const [customValue, setCustomValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: !!id,
  });

  const { data: allBenefitsData } = useQuery({
    queryKey: ['benefits'],
    queryFn: () => benefitsApi.getAll(),
  });

  const { data: employeeBenefitsData, refetch: refetchBenefits } = useQuery({
    queryKey: ['employee-benefits', id],
    queryFn: () => benefitsApi.getEmployeeBenefits(id!),
    enabled: !!id,
  });

  const employee = data?.data;
  const allBenefits = allBenefitsData?.data || [];
  const employeeBenefits = employeeBenefitsData?.data || [];

  // Get list of benefits not yet assigned
  const assignedBenefitIds = employeeBenefits.map((eb: any) => eb.benefitId);
  const availableBenefits = allBenefits.filter(
    (b: any) => !assignedBenefitIds.includes(b.id)
  );

  const assignMutation = useMutation({
    mutationFn: (data: any) => benefitsApi.assignToEmployee(data),
    onSuccess: () => {
      toast.success('Prestacion asignada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      refetchBenefits();
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al asignar prestacion');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (benefitId: string) => benefitsApi.removeFromEmployee(id!, benefitId),
    onSuccess: () => {
      toast.success('Prestacion removida');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      refetchBenefits();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al remover prestacion');
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBenefitId('');
    setCustomValue('');
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBenefitId) return;

    assignMutation.mutate({
      employeeId: id,
      benefitId: selectedBenefitId,
      customValue: customValue ? Number(customValue) : undefined,
      startDate: new Date(),
    });
  };

  const handleRemove = (benefitId: string, benefitName: string) => {
    if (confirm(`¿Remover la prestacion "${benefitName}" de este empleado?`)) {
      removeMutation.mutate(benefitId);
    }
  };

  const getValueDisplay = (eb: any) => {
    const value = eb.customValue ?? eb.benefit.value;
    if (!value) return '-';

    switch (eb.benefit.valueType) {
      case 'FIXED_AMOUNT':
        return `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
      case 'PERCENTAGE_SALARY':
        return `${value}% del salario`;
      case 'DAYS_SALARY':
        return `${value} dias de salario`;
      default:
        return value;
    }
  };

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
        <div className="flex items-center gap-4">
          {/* Photo */}
          {employee.photoUrl ? (
            <img
              src={employee.photoUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${employee.photoUrl}` : employee.photoUrl}
              alt={`${employee.firstName} ${employee.lastName}`}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <UserCircleIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-500">
              {employee.employeeNumber} • {employee.jobPosition?.name}
            </p>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Prestaciones Asignadas
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary btn-sm"
              disabled={availableBenefits.length === 0}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Agregar
            </button>
          </div>

          {employeeBenefits.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {employeeBenefits.map((eb: any) => (
                <li key={eb.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-50">
                      <GiftIcon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium">{eb.benefit.name}</p>
                      <p className="text-sm text-gray-500">{eb.benefit.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 font-medium">
                      {getValueDisplay(eb)}
                    </span>
                    <button
                      onClick={() => handleRemove(eb.benefitId, eb.benefit.name)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Remover prestacion"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <GiftIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                No hay prestaciones asignadas
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-primary-600 hover:text-primary-700 text-sm mt-2"
                disabled={availableBenefits.length === 0}
              >
                Agregar primera prestacion
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal para asignar prestacion */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeModal}
            />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Asignar Prestacion</h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleAssign} className="space-y-4">
                  <div>
                    <label className="label">Prestacion *</label>
                    <select
                      value={selectedBenefitId}
                      onChange={(e) => setSelectedBenefitId(e.target.value)}
                      className="input"
                      required
                    >
                      <option value="">Seleccionar prestacion...</option>
                      {availableBenefits.map((benefit: any) => (
                        <option key={benefit.id} value={benefit.id}>
                          {benefit.name} - {benefit.valueType === 'FIXED_AMOUNT'
                            ? `$${Number(benefit.value).toLocaleString()}`
                            : benefit.valueType === 'PERCENTAGE_SALARY'
                            ? `${benefit.value}%`
                            : `${benefit.value} dias`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Valor personalizado (opcional)
                    </label>
                    <input
                      type="number"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      className="input"
                      placeholder="Dejar vacio para usar el valor por defecto"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Si no se especifica, se usara el valor configurado en la prestacion
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="btn btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={assignMutation.isPending || !selectedBenefitId}
                    >
                      {assignMutation.isPending ? 'Asignando...' : 'Asignar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
