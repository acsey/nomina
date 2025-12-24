import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  GiftIcon,
  XMarkIcon,
  PencilIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { benefitsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const typeLabels: Record<string, string> = {
  FOOD_VOUCHERS: 'Vales de despensa',
  SAVINGS_FUND: 'Fondo de ahorro',
  BONUS: 'Bonos',
  LIFE_INSURANCE: 'Seguro de vida',
  MAJOR_MEDICAL: 'Gastos medicos mayores',
  PRODUCTIVITY_BONUS: 'Bono de productividad',
  ATTENDANCE_BONUS: 'Bono de asistencia',
  PUNCTUALITY_BONUS: 'Bono de puntualidad',
  TRANSPORTATION: 'Ayuda de transporte',
  OTHER: 'Otro',
};

const valueTypeLabels: Record<string, string> = {
  FIXED_AMOUNT: 'Monto fijo',
  PERCENTAGE_SALARY: '% del salario',
  DAYS_SALARY: 'Dias de salario',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
};

interface BenefitFormData {
  id?: string;
  name: string;
  description: string;
  type: string;
  value: number;
  valueType: string;
}

const initialFormData: BenefitFormData = {
  name: '',
  description: '',
  type: 'BONUS',
  value: 0,
  valueType: 'FIXED_AMOUNT',
};

export default function BenefitsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<BenefitFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Get all benefits (for admin includes all, for others only approved)
  const { data, isLoading } = useQuery({
    queryKey: ['benefits', isAdmin],
    queryFn: () => benefitsApi.getAll(isAdmin),
  });

  // Get pending benefits (only for admin)
  const { data: pendingData } = useQuery({
    queryKey: ['benefits-pending'],
    queryFn: () => benefitsApi.getPending(),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: BenefitFormData) => benefitsApi.create(data),
    onSuccess: () => {
      toast.success(isAdmin ? 'Prestacion creada y aprobada' : 'Prestacion enviada para aprobacion');
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      queryClient.invalidateQueries({ queryKey: ['benefits-pending'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error('Error al crear la prestacion');
      console.error('Error creating benefit:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BenefitFormData }) => benefitsApi.update(id, data),
    onSuccess: () => {
      toast.success('Prestacion actualizada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      queryClient.invalidateQueries({ queryKey: ['benefits-pending'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error('Error al actualizar la prestacion');
      console.error('Error updating benefit:', error);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => benefitsApi.approve(id),
    onSuccess: () => {
      toast.success('Prestacion aprobada');
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      queryClient.invalidateQueries({ queryKey: ['benefits-pending'] });
    },
    onError: () => {
      toast.error('Error al aprobar la prestacion');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => benefitsApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Prestacion rechazada');
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      queryClient.invalidateQueries({ queryKey: ['benefits-pending'] });
    },
    onError: () => {
      toast.error('Error al rechazar la prestacion');
    },
  });

  const allBenefits = data?.data || [];
  const pendingBenefits = pendingData?.data || [];
  const approvedBenefits = allBenefits.filter((b: any) => b.status === 'APPROVED');

  const openCreateModal = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (benefit: any) => {
    setFormData({
      id: benefit.id,
      name: benefit.name,
      description: benefit.description || '',
      type: benefit.type,
      value: benefit.value,
      valueType: benefit.valueType,
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'value' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && formData.id) {
      updateMutation.mutate({ id: formData.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleReject = (id: string) => {
    const reason = prompt('Ingrese el motivo del rechazo:');
    if (reason) {
      rejectMutation.mutate({ id, reason });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const renderBenefitCard = (benefit: any, showActions = false) => (
    <div key={benefit.id} className="card">
      <div className="flex items-start justify-between">
        <div className="p-3 rounded-lg bg-primary-100">
          <GiftIcon className="h-6 w-6 text-primary-600" />
        </div>
        <div className="flex items-center gap-2">
          {benefit.status === 'APPROVED' && (
            <button
              onClick={() => openEditModal(benefit)}
              className="p-1 text-gray-400 hover:text-primary-600"
              title="Editar"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          )}
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig[benefit.status]?.color}`}>
            {statusConfig[benefit.status]?.label}
          </span>
        </div>
      </div>

      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        {benefit.name}
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        {benefit.description || 'Sin descripcion'}
      </p>

      <div className="mt-4 pt-4 border-t space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tipo</span>
          <span className="font-medium">{typeLabels[benefit.type]}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Valor</span>
          <span className="font-medium">
            {benefit.valueType === 'FIXED_AMOUNT'
              ? `$${Number(benefit.value || 0).toLocaleString()}`
              : benefit.valueType === 'PERCENTAGE_SALARY'
              ? `${benefit.value}%`
              : `${benefit.value} dias`}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tipo de valor</span>
          <span className="font-medium">
            {valueTypeLabels[benefit.valueType]}
          </span>
        </div>
        {benefit.createdBy && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Creado por</span>
            <span className="font-medium">
              {benefit.createdBy.firstName} {benefit.createdBy.lastName}
            </span>
          </div>
        )}
        {benefit.approvedBy && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Aprobado por</span>
            <span className="font-medium">
              {benefit.approvedBy.firstName} {benefit.approvedBy.lastName}
            </span>
          </div>
        )}
      </div>

      {/* Approval actions for pending benefits */}
      {showActions && benefit.status === 'PENDING' && isAdmin && (
        <div className="mt-4 pt-4 border-t flex gap-2">
          <button
            onClick={() => approveMutation.mutate(benefit.id)}
            disabled={approveMutation.isPending}
            className="btn btn-success flex-1"
          >
            <CheckIcon className="h-4 w-4 mr-1" />
            Aprobar
          </button>
          <button
            onClick={() => handleReject(benefit.id)}
            disabled={rejectMutation.isPending}
            className="btn btn-danger flex-1"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Rechazar
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prestaciones</h1>
        <button onClick={openCreateModal} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Prestacion
        </button>
      </div>

      {/* Tabs for admin */}
      {isAdmin && (
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approved'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Aprobadas ({approvedBenefits.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              Pendientes de Aprobacion ({pendingBenefits.length})
              {pendingBenefits.length > 0 && (
                <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingBenefits.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : activeTab === 'approved' ? (
        approvedBenefits.length === 0 ? (
          <div className="card text-center py-12">
            <GiftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay prestaciones aprobadas</p>
            <button onClick={openCreateModal} className="btn btn-primary mt-4">
              Crear primera prestacion
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedBenefits.map((benefit: any) => renderBenefitCard(benefit, false))}
          </div>
        )
      ) : (
        // Pending tab
        pendingBenefits.length === 0 ? (
          <div className="card text-center py-12">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay prestaciones pendientes de aprobacion</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingBenefits.map((benefit: any) => renderBenefitCard(benefit, true))}
          </div>
        )
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />

            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isEditing ? 'Editar Prestacion' : 'Nueva Prestacion'}
                  </h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Info message for non-admin users */}
                {!isAdmin && !isEditing && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      La prestacion sera enviada para aprobacion del administrador antes de estar disponible.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Nombre *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Descripcion</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="input"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="label">Tipo de Prestacion *</label>
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
                      <label className="label">Valor *</label>
                      <input
                        type="number"
                        name="value"
                        value={formData.value}
                        onChange={handleChange}
                        className="input"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Tipo de Valor *</label>
                      <select
                        name="valueType"
                        value={formData.valueType}
                        onChange={handleChange}
                        className="input"
                        required
                      >
                        {Object.entries(valueTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={closeModal} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isPending}>
                      {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : isAdmin ? 'Guardar' : 'Enviar para Aprobacion'}
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
