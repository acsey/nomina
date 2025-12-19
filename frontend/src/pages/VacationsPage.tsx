import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { vacationsApi, catalogsApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const typeLabels: Record<string, string> = {
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
  MEDICAL_APPOINTMENT: 'Cita medica',
  GOVERNMENT_PROCEDURE: 'Tramite gubernamental',
  STUDY_PERMIT: 'Permiso de estudios',
  OTHER: 'Otro',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
};

interface RequestFormData {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export default function VacationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [formData, setFormData] = useState<RequestFormData>({
    employeeId: '',
    type: 'VACATION',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Get company from first company (for now)
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];
  const companyId = companies[0]?.id || '';

  // Get employees for selection
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ take: 1000 }),
    enabled: !!companyId,
  });
  const employees = employeesData?.data?.data || [];

  // Get pending requests for approval
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-vacations', companyId],
    queryFn: () => vacationsApi.getPendingRequests(companyId),
    enabled: !!companyId,
  });
  const pendingRequests = pendingData?.data || [];

  // Get selected employee's balance and requests
  const { data: balanceData } = useQuery({
    queryKey: ['vacation-balance', selectedEmployeeId],
    queryFn: () => vacationsApi.getBalance(selectedEmployeeId),
    enabled: !!selectedEmployeeId,
  });

  const { data: employeeRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['employee-vacations', selectedEmployeeId],
    queryFn: () => vacationsApi.getEmployeeRequests(selectedEmployeeId),
    enabled: !!selectedEmployeeId,
  });
  const employeeRequests = employeeRequestsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: RequestFormData) => vacationsApi.createRequest({
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    }),
    onSuccess: () => {
      toast.success('Solicitud creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['employee-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-balance'] });
      setIsModalOpen(false);
      setFormData({
        employeeId: '',
        type: 'VACATION',
        startDate: '',
        endDate: '',
        reason: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear solicitud');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => vacationsApi.approveRequest(id),
    onSuccess: () => {
      toast.success('Solicitud aprobada');
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['employee-vacations'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      vacationsApi.rejectRequest(id, reason),
    onSuccess: () => {
      toast.success('Solicitud rechazada');
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['employee-vacations'] });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleReject = (id: string) => {
    const reason = prompt('Ingrese el motivo del rechazo:');
    if (reason) {
      rejectMutation.mutate({ id, reason });
    }
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const diff = dayjs(formData.endDate).diff(dayjs(formData.startDate), 'day') + 1;
      return diff > 0 ? diff : 0;
    }
    return 0;
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'rh' || user?.role === 'manager';

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Vacaciones y Permisos
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona las solicitudes de vacaciones y permisos
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Solicitud
        </button>
      </div>

      {/* Employee selector for viewing requests */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1">
            <label className="label">Seleccionar Empleado</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="input"
            >
              <option value="">Seleccionar empleado...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                </option>
              ))}
            </select>
          </div>
          {selectedEmployeeId && balanceData?.data && (
            <div className="flex gap-4">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-xs text-blue-600">Dias Ganados</p>
                <p className="text-xl font-bold text-blue-700">
                  {balanceData.data.earnedDays}
                </p>
              </div>
              <div className="bg-green-50 px-4 py-2 rounded-lg">
                <p className="text-xs text-green-600">Disponibles</p>
                <p className="text-xl font-bold text-green-700">
                  {balanceData.data.earnedDays - balanceData.data.usedDays - balanceData.data.pendingDays}
                </p>
              </div>
              <div className="bg-yellow-50 px-4 py-2 rounded-lg">
                <p className="text-xs text-yellow-600">Usados</p>
                <p className="text-xl font-bold text-yellow-700">
                  {balanceData.data.usedDays}
                </p>
              </div>
              <div className="bg-orange-50 px-4 py-2 rounded-lg">
                <p className="text-xs text-orange-600">Pendientes</p>
                <p className="text-xl font-bold text-orange-700">
                  {balanceData.data.pendingDays}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pendientes de Aprobacion ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Solicitudes del Empleado
            </button>
          </nav>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'pending' && isAdmin ? (
        pendingLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="card text-center py-12">
            <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay solicitudes pendientes de aprobacion</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request: any) => (
              <div key={request.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {request.employee.firstName} {request.employee.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {request.employee.employeeNumber} •{' '}
                      {request.employee.department?.name}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      statusLabels[request.status]?.color
                    }`}
                  >
                    {statusLabels[request.status]?.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-medium">{typeLabels[request.type] || request.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha inicio</p>
                    <p className="font-medium">
                      {dayjs(request.startDate).format('DD/MM/YYYY')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha fin</p>
                    <p className="font-medium">
                      {dayjs(request.endDate).format('DD/MM/YYYY')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total dias</p>
                    <p className="font-medium">{request.totalDays}</p>
                  </div>
                </div>

                {request.reason && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Motivo</p>
                    <p className="text-gray-700">{request.reason}</p>
                  </div>
                )}

                {request.status === 'PENDING' && (
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <button
                      onClick={() => approveMutation.mutate(request.id)}
                      disabled={approveMutation.isPending}
                      className="btn btn-success"
                    >
                      <CheckIcon className="h-5 w-5 mr-1" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={rejectMutation.isPending}
                      className="btn btn-danger"
                    >
                      <XMarkIcon className="h-5 w-5 mr-1" />
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        // Employee requests tab
        !selectedEmployeeId ? (
          <div className="card text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Selecciona un empleado para ver sus solicitudes</p>
          </div>
        ) : requestsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : employeeRequests.length === 0 ? (
          <div className="card text-center py-12">
            <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay solicitudes registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dias
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employeeRequests.map((request: any) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {typeLabels[request.type] || request.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dayjs(request.startDate).format('DD/MM/YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dayjs(request.endDate).format('DD/MM/YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.totalDays}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          statusLabels[request.status]?.color
                        }`}
                      >
                        {statusLabels[request.status]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {request.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal for creating new request */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Nueva Solicitud</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Empleado *</label>
                    <select
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      className="input"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Tipo de Solicitud *</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="input"
                      required
                    >
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Fecha Inicio *</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Fecha Fin *</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="input"
                        min={formData.startDate}
                        required
                      />
                    </div>
                  </div>

                  {formData.startDate && formData.endDate && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Total de dias solicitados: <strong>{calculateDays()}</strong>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="label">Motivo / Comentarios</label>
                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      className="input"
                      rows={3}
                      placeholder="Describe el motivo de la solicitud..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="btn btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? 'Guardando...' : 'Enviar Solicitud'}
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
