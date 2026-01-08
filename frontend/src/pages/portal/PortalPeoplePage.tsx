import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import { employeesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string;
  email: string;
  phone?: string;
  extension?: string;
  photoUrl?: string;
  department?: { id: string; name: string };
  jobPosition?: { id: string; name: string };
}

export default function PortalPeoplePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Get employees from the same company
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['directory-employees', user?.companyId],
    queryFn: async () => {
      const response = await employeesApi.getAll({
        companyId: user?.companyId,
        take: 500, // Get all employees for directory
      });
      return response.data?.employees || response.data || [];
    },
    enabled: !!user?.companyId,
  });

  // Get unique departments
  const departments = [...new Set(employees
    .map((e: Employee) => e.department?.name)
    .filter(Boolean)
  )].sort();

  // Filter employees
  const filteredEmployees = employees.filter((emp: Employee) => {
    const matchesSearch = !search ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.jobPosition?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment = selectedDepartment === 'all' ||
      emp.department?.name === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // Group by department
  const employeesByDepartment = filteredEmployees.reduce((acc: Record<string, Employee[]>, emp: Employee) => {
    const deptName = emp.department?.name || t('common.other');
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(emp);
    return acc;
  }, {});

  const getFullName = (emp: Employee) => {
    return [emp.firstName, emp.lastName, emp.secondLastName].filter(Boolean).join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('portal.people.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('portal.people.subtitle', { count: employees.length })}
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('portal.people.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">{t('portal.people.allDepartments')}</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('portal.people.showing', { count: filteredEmployees.length })}
      </p>

      {/* Employee Grid */}
      {Object.keys(employeesByDepartment).length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <UserCircleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('portal.people.noResults')}
          </p>
        </div>
      ) : (
        Object.entries(employeesByDepartment).sort().map(([deptName, deptEmployees]) => (
          <div key={deptName}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
              {deptName}
              <span className="text-sm font-normal text-gray-500">({(deptEmployees as Employee[]).length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(deptEmployees as Employee[]).map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {emp.photoUrl ? (
                      <img
                        src={emp.photoUrl}
                        alt={getFullName(emp)}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="w-14 h-14 text-gray-300" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {getFullName(emp)}
                      </h3>
                      {emp.jobPosition && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                          <BriefcaseIcon className="h-4 w-4 flex-shrink-0" />
                          {emp.jobPosition.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-2">
                    {emp.email && (
                      <a
                        href={`mailto:${emp.email}`}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{emp.email}</span>
                      </a>
                    )}
                    {(emp.phone || emp.extension) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                        {emp.phone && <span>{emp.phone}</span>}
                        {emp.extension && (
                          <span className="text-gray-400">
                            {t('portal.people.extension', { ext: emp.extension })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
