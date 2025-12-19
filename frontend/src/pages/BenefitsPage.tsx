import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, GiftIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { benefitsApi } from '../services/api';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<BenefitFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['benefits'],
    queryFn: () => benefitsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: BenefitFormData) => benefitsApi.create(data),
    onSuccess: () => {
      toast.success('Prestacion creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      closeModal();
    },
    onError: (error: any) => {
      console.error('Error creating benefit:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BenefitFormData }) => benefitsApi.update(id, data),
    onSuccess: () => {
      toast.success('Prestacion actualizada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      closeModal();
    },
    onError: (error: any) => {
      console.error('Error updating benefit:', error);
    },
  });

  const benefits = data?.data || [];

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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prestaciones</h1>
        <button onClick={openCreateModal} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Prestacion
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : benefits.length === 0 ? (
        <div className="card text-center py-12">
          <GiftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay prestaciones registradas</p>
          <button onClick={openCreateModal} className="btn btn-primary mt-4">
            Crear primera prestacion
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit: any) => (
            <div key={benefit.id} className="card">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-lg bg-primary-100">
                  <GiftIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(benefit)}
                    className="p-1 text-gray-400 hover:text-primary-600"
                    title="Editar"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Activo
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {isEditing ? 'Editar Prestacion' : 'Nueva Prestacion'}
                  </h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

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
                      {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
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
