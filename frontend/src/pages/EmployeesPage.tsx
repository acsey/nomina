import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, page, user?.companyId],
    queryFn: () =>
      employeesApi.getAll({
        search,
        skip: (page - 1) * limit,
        take: limit,
      }),
    enabled: !isAuthLoading, // Wait for auth to load
  });

  const employees = data?.data?.data || [];
  const meta = data?.data?.meta || { total: 0, totalPages: 1 };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('employees.title')}</h1>
        <Link to="/employees/new" className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          {t('employees.newEmployee')}
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('employees.searchPlaceholder')}
            className="input pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('employees.noEmployeesFound')}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('employees.fields.employeeNumber')}</th>
                  <th>{t('common.name')}</th>
                  <th>{t('common.company')}</th>
                  <th>{t('common.department')}</th>
                  <th>{t('common.position')}</th>
                  <th>{t('common.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((employee: any) => (
                  <tr key={employee.id}>
                    <td className="font-medium">{employee.employeeNumber}</td>
                    <td>
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td>{employee.company?.name || '-'}</td>
                    <td>{employee.department?.name || '-'}</td>
                    <td>{employee.jobPosition?.name || '-'}</td>
                    <td>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          employee.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {employee.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/employees/${employee.id}`}
                        className="text-primary-600 hover:text-primary-800 font-medium text-sm"
                      >
                        {t('employees.viewDetail')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, meta.total), total: meta.total })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn btn-secondary text-sm disabled:opacity-50"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === meta.totalPages}
                className="btn btn-secondary text-sm disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
