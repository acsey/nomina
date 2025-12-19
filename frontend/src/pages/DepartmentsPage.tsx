import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { departmentsApi } from '../services/api';

export default function DepartmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
  });

  const departments = data?.data || [];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departamentos</h1>
        <button className="btn btn-primary">
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
                    {dept.description || 'Sin descripción'}
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
    </div>
  );
}
