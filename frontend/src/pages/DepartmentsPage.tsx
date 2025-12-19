import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, BuildingOfficeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { departmentsApi, catalogsApi } from '../services/api';

interface DepartmentFormData {
  name: string;
  description: string;
  companyId: string;
}

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: '',
    companyId: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });

  const departments = data?.data || [];
  const companies = companiesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: DepartmentFormData) => departmentsApi.create(data),
    onSuccess: () => {
      toast.success('Departamento creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsModalOpen(false);
      setFormData({ name: '', description: '', companyId: '' });
    },
    onError: (error: any) => {
      console.error('Error creating department:', error);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departamentos</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo Departamento
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : departments.length === 0 ? (
        <div className="card text-center py-12">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay departamentos registrados</p>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary mt-4">
            Crear primer departamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept: any) => (
            <div key={dept.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {dept.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {dept.description || 'Sin descripcion'}
                  </p>
                </div>
                <div className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                  {dept._count?.employees || 0} empleados
                </div>
              </div>

              {dept.manager && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">Gerente</p>
                  <p className="font-medium">
                    {dept.manager.firstName} {dept.manager.lastName}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Nuevo Departamento</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Empresa *</label>
                    <select
                      name="companyId"
                      value={formData.companyId}
                      onChange={handleChange}
                      className="input"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {companies.map((company: any) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Guardando...' : 'Guardar'}
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
