import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { incidentsApi, employeesApi } from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const categoryLabels: Record<string, string> = {
  ABSENCE: 'Falta',
  TARDINESS: 'Retardo',
  EARLY_LEAVE: 'Salida anticipada',
  OVERTIME: 'Horas extra',
  BONUS: 'Bono',
  DEDUCTION: 'Descuento',
  DISABILITY: 'Incapacidad',
  JUSTIFIED_ABSENCE: 'Falta justificada',
  OTHER: 'Otro',
};

const valueTypeLabels: Record<string, string> = {
  DAYS: 'Dias',
  HOURS: 'Horas',
  AMOUNT: 'Monto fijo',
  PERCENTAGE: 'Porcentaje',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
  APPLIED: { label: 'Aplicada', color: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
};

interface IncidentFormData {
  employeeId: string;
  incidentTypeId: string;
  date: string;
  value: number;
  description: string;
}

const initialFormData: IncidentFormData = {
  employeeId: '',
  incidentTypeId: '',
  date: new Date().toISOString().split('T')[0],
  value: 1,
  description: '',
};

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<IncidentFormData>(initialFormData);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const today = new Date();
  const [filterStartDate, setFilterStartDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  );
  const [filterEndDate, setFilterEndDate] = useState(
    new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  );

  // Get incident types
  const { data: typesData } = useQuery({
    queryKey: ['incident-types'],
    queryFn: () => incidentsApi.getTypes(),
  });
  const incidentTypes = typesData?.data || [];

  // Get employees for filter
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ take: 1000 }),
  });
  const employees = employeesData?.data?.data || [];

  // Get incidents
  const { data: incidentsData, isLoading } = useQuery({
    queryKey: ['incidents', filterStatus, filterEmployee, filterStartDate, filterEndDate],
    queryFn: () => incidentsApi.getAll({
      status: filterStatus || undefined,
      employeeId: filterEmployee || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    }),
  });
  const incidents = incidentsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: IncidentFormData) => incidentsApi.create(data),
    onSuccess: () => {
      toast.success('Incidencia registrada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar incidencia');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => incidentsApi.approve(id),
    onSuccess: () => {
      toast.success('Incidencia aprobada');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => incidentsApi.reject(id),
    onSuccess: () => {
      toast.success('Incidencia rechazada');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incidentsApi.delete(id),
    onSuccess: () => {
      toast.success('Incidencia cancelada');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'value' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getValueLabel = (incident: any) => {
    const type = incident.incidentType;
    if (!type) return incident.value;

    switch (type.valueType) {
      case 'DAYS':
        return `${incident.value} dia(s)`;
      case 'HOURS':
        return `${incident.value} hora(s)`;
      case 'FIXED_AMOUNT':
        return `$${Number(incident.value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
      case 'PERCENTAGE':
        return `${incident.value}%`;
      default:
        return incident.value;
    }
  };

  const selectedType = incidentTypes.find((t: any) => t.id === formData.incidentTypeId);

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidencias</h1>
          <p className="text-gray-500 mt-1">Registro y control de incidencias laborales</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Incidencia
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Empleado</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="input"
            >
              <option value="">Todos los empleados</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendientes</option>
              <option value="APPROVED">Aprobadas</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="APPLIED">Aplicadas</option>
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : incidents.length === 0 ? (
        <div className="card text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay incidencias registradas en el periodo seleccionado</p>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary mt-4">
            Registrar primera incidencia
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empleado</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Descripcion</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {incidents.map((incident: any) => (
                  <tr key={incident.id} className={
                    incident.incidentType?.isDeduction ? 'bg-red-50' :
                    incident.incidentType?.category === 'OVERTIME' || incident.incidentType?.category === 'BONUS' ? 'bg-green-50' : ''
                  }>
                    <td className="font-medium">
                      {dayjs(incident.date).format('DD/MM/YYYY')}
                    </td>
                    <td>
                      <div>
                        <p className="font-medium">{incident.employee?.firstName} {incident.employee?.lastName}</p>
                        <p className="text-xs text-gray-500">{incident.employee?.employeeNumber}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          incident.incidentType?.isDeduction ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {categoryLabels[incident.incidentType?.category] || incident.incidentType?.category}
                        </span>
                        <span className="text-sm text-gray-700">{incident.incidentType?.name}</span>
                      </div>
                    </td>
                    <td className="font-medium">
                      {getValueLabel(incident)}
                    </td>
                    <td className="text-sm text-gray-500 max-w-xs truncate">
                      {incident.description || '-'}
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusLabels[incident.status]?.color || 'bg-gray-100'
                      }`}>
                        {statusLabels[incident.status]?.label || incident.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {incident.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(incident.id)}
                              disabled={approveMutation.isPending}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Aprobar"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(incident.id)}
                              disabled={rejectMutation.isPending}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Rechazar"
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {['PENDING', 'APPROVED'].includes(incident.status) && (
                          <button
                            onClick={() => {
                              if (confirm('Cancelar esta incidencia?')) {
                                deleteMutation.mutate(incident.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Cancelar"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                        {incident.status === 'APPLIED' && (
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            Aplicada
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {incidents.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-yellow-50">
            <p className="text-sm text-yellow-600">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-700">
              {incidents.filter((i: any) => i.status === 'PENDING').length}
            </p>
          </div>
          <div className="card bg-green-50">
            <p className="text-sm text-green-600">Aprobadas</p>
            <p className="text-2xl font-bold text-green-700">
              {incidents.filter((i: any) => i.status === 'APPROVED').length}
            </p>
          </div>
          <div className="card bg-red-50">
            <p className="text-sm text-red-600">Total Faltas</p>
            <p className="text-2xl font-bold text-red-700">
              {incidents
                .filter((i: any) => i.incidentType?.category === 'ABSENCE' && i.status !== 'CANCELLED' && i.status !== 'REJECTED')
                .reduce((sum: number, i: any) => sum + Number(i.value), 0)} dias
            </p>
          </div>
          <div className="card bg-blue-50">
            <p className="text-sm text-blue-600">Total Horas Extra</p>
            <p className="text-2xl font-bold text-blue-700">
              {incidents
                .filter((i: any) => i.incidentType?.category === 'OVERTIME' && i.status !== 'CANCELLED' && i.status !== 'REJECTED')
                .reduce((sum: number, i: any) => sum + Number(i.value), 0)} hrs
            </p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Nueva Incidencia</h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
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
                      <option value="">Seleccionar empleado...</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Tipo de Incidencia *</label>
                    <select
                      name="incidentTypeId"
                      value={formData.incidentTypeId}
                      onChange={handleChange}
                      className="input"
                      required
                    >
                      <option value="">Seleccionar tipo...</option>
                      {incidentTypes.map((type: any) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({categoryLabels[type.category]})
                          {type.isDeduction ? ' - Descuento' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Fecha *</label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">
                        Valor ({selectedType ? valueTypeLabels[selectedType.valueType] : 'Dias'}) *
                      </label>
                      <input
                        type="number"
                        name="value"
                        value={formData.value}
                        onChange={handleChange}
                        className="input"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Descripcion</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="input"
                      rows={2}
                      placeholder="Motivo o detalles adicionales..."
                    />
                  </div>

                  {selectedType?.isDeduction && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-red-700">
                        <strong>Descuento:</strong> Esta incidencia genera un descuento en la nomina del empleado.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={closeModal} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Guardando...' : 'Registrar Incidencia'}
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
