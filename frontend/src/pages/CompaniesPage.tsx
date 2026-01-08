import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  PencilSquareIcon,
  BuildingOffice2Icon,
  XMarkIcon,
  BuildingLibraryIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { catalogsApi, api } from '../services/api';
import toast from 'react-hot-toast';

// Instituciones de gobierno
const GOV_INSTITUTIONS = [
  { value: '', label: 'Seleccionar...' },
  { value: 'IMSS', label: 'IMSS - Instituto Mexicano del Seguro Social' },
  { value: 'ISSSTE', label: 'ISSSTE - Instituto de Seguridad y Servicios Sociales' },
  { value: 'INSABI', label: 'INSABI - Instituto de Salud para el Bienestar' },
  { value: 'IMSS_BIENESTAR', label: 'IMSS-Bienestar' },
  { value: 'SEDENA', label: 'SEDENA - Secretaria de la Defensa Nacional' },
  { value: 'SEMAR', label: 'SEMAR - Secretaria de Marina' },
  { value: 'INAH', label: 'INAH - Instituto Nacional de Antropologia e Historia' },
  { value: 'INBA', label: 'INBA - Instituto Nacional de Bellas Artes' },
  { value: 'SEP', label: 'SEP - Secretaria de Educacion Publica' },
  { value: 'UNAM', label: 'UNAM - Universidad Nacional Autonoma de Mexico' },
  { value: 'IPN', label: 'IPN - Instituto Politecnico Nacional' },
  { value: 'PEMEX', label: 'PEMEX - Petroleos Mexicanos' },
  { value: 'CFE', label: 'CFE - Comision Federal de Electricidad' },
  { value: 'SAT', label: 'SAT - Servicio de Administracion Tributaria' },
  { value: 'BANXICO', label: 'BANXICO - Banco de Mexico' },
  { value: 'CONAGUA', label: 'CONAGUA - Comision Nacional del Agua' },
  { value: 'INEGI', label: 'INEGI - Instituto Nacional de Estadistica' },
  { value: 'OTHER', label: 'Otra institucion de gobierno' },
];

const GOV_INSTITUTION_LABELS: Record<string, string> = {
  IMSS: 'IMSS',
  ISSSTE: 'ISSSTE',
  INSABI: 'INSABI',
  IMSS_BIENESTAR: 'IMSS-Bienestar',
  SEDENA: 'SEDENA',
  SEMAR: 'SEMAR',
  INAH: 'INAH',
  INBA: 'INBA',
  SEP: 'SEP',
  UNAM: 'UNAM',
  IPN: 'IPN',
  PEMEX: 'PEMEX',
  CFE: 'CFE',
  SAT: 'SAT',
  BANXICO: 'BANXICO',
  CONAGUA: 'CONAGUA',
  INEGI: 'INEGI',
  OTHER: 'Gobierno',
};

interface CompanyFormData {
  name: string;
  rfc: string;
  institutionType: string;
  govInstitution: string;
  registroPatronal: string;
  registroPatronalIssste: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
}

const initialFormData: CompanyFormData = {
  name: '',
  rfc: '',
  institutionType: 'PRIVATE',
  govInstitution: '',
  registroPatronal: '',
  registroPatronalIssste: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  email: '',
};

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);

  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CompanyFormData) => {
      const payload = {
        ...data,
        govInstitution: data.institutionType === 'GOVERNMENT' ? data.govInstitution : null,
      };
      return api.post('/catalogs/companies', payload);
    },
    onSuccess: () => {
      toast.success('Empresa creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear empresa');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CompanyFormData) => {
      const payload = {
        ...data,
        govInstitution: data.institutionType === 'GOVERNMENT' ? data.govInstitution : null,
      };
      return api.patch(`/catalogs/companies/${editingCompany.id}`, payload);
    },
    onSuccess: () => {
      toast.success('Empresa actualizada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar empresa');
    },
  });

  const openCreateModal = () => {
    setEditingCompany(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (company: any) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      rfc: company.rfc || '',
      institutionType: company.institutionType || 'PRIVATE',
      govInstitution: company.govInstitution || '',
      registroPatronal: company.registroPatronal || '',
      registroPatronalIssste: company.registroPatronalIssste || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zipCode: company.zipCode || '',
      phone: company.phone || '',
      email: company.email || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    setFormData(initialFormData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      // Si cambia a privada, limpiar la institucion de gobierno
      if (name === 'institutionType' && value === 'PRIVATE') {
        newData.govInstitution = '';
      }
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCompany) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isGovernment = formData.institutionType === 'GOVERNMENT';

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500 mt-1">
            Administra las empresas e instituciones de gobierno
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Empresa
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : companies.length === 0 ? (
        <div className="card text-center py-12">
          <BuildingOffice2Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay empresas registradas</p>
          <button onClick={openCreateModal} className="btn btn-primary mt-4">
            <PlusIcon className="h-5 w-5 mr-2" />
            Crear primera empresa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company: any) => (
            <div key={company.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    company.institutionType === 'GOVERNMENT'
                      ? 'bg-amber-100'
                      : 'bg-primary-100'
                  }`}>
                    {company.institutionType === 'GOVERNMENT' ? (
                      <BuildingLibraryIcon className="h-6 w-6 text-amber-600" />
                    ) : (
                      <BuildingOffice2Icon className="h-6 w-6 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-500">{company.rfc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/company-config?company=${company.id}`}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                    title="Configurar empresa"
                  >
                    <CogIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => openEditModal(company)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                    title="Editar datos"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Badge de tipo */}
              <div className="mt-3">
                {company.institutionType === 'GOVERNMENT' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {GOV_INSTITUTION_LABELS[company.govInstitution] || 'Gobierno'}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Empresa Privada
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {company.registroPatronal && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reg. Patronal IMSS:</span>
                    <span className="font-medium">{company.registroPatronal}</span>
                  </div>
                )}
                {company.registroPatronalIssste && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reg. Patronal ISSSTE:</span>
                    <span className="font-medium">{company.registroPatronalIssste}</span>
                  </div>
                )}
                {company.address && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Direccion:</span>
                    <span className="font-medium text-right max-w-[200px] truncate">
                      {company.address}
                    </span>
                  </div>
                )}
                {company.city && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ciudad:</span>
                    <span className="font-medium">
                      {company.city}, {company.state}
                    </span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Telefono:</span>
                    <span className="font-medium">{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium">{company.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeModal}
            />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Tipo de Institucion */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="label">Tipo de Institucion *</label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.institutionType === 'PRIVATE'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="institutionType"
                          value="PRIVATE"
                          checked={formData.institutionType === 'PRIVATE'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <BuildingOffice2Icon className={`h-6 w-6 mr-3 ${
                          formData.institutionType === 'PRIVATE' ? 'text-primary-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <div className="font-medium">Empresa Privada</div>
                          <div className="text-sm text-gray-500">IMSS como seguro social</div>
                        </div>
                      </label>
                      <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.institutionType === 'GOVERNMENT'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="institutionType"
                          value="GOVERNMENT"
                          checked={formData.institutionType === 'GOVERNMENT'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <BuildingLibraryIcon className={`h-6 w-6 mr-3 ${
                          formData.institutionType === 'GOVERNMENT' ? 'text-amber-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <div className="font-medium">Institucion de Gobierno</div>
                          <div className="text-sm text-gray-500">ISSSTE u otro sistema</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Selector de institucion de gobierno */}
                  {isGovernment && (
                    <div>
                      <label className="label">Institucion de Gobierno *</label>
                      <select
                        name="govInstitution"
                        value={formData.govInstitution}
                        onChange={handleChange}
                        className="input"
                        required={isGovernment}
                      >
                        {GOV_INSTITUTIONS.map((inst) => (
                          <option key={inst.value} value={inst.value}>
                            {inst.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="label">Nombre de la Empresa/Institucion *</label>
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
                      <label className="label">RFC *</label>
                      <input
                        type="text"
                        name="rfc"
                        value={formData.rfc}
                        onChange={handleChange}
                        className="input uppercase"
                        maxLength={13}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Registro Patronal IMSS</label>
                      <input
                        type="text"
                        name="registroPatronal"
                        value={formData.registroPatronal}
                        onChange={handleChange}
                        className="input"
                        placeholder="Solo si aplica"
                      />
                    </div>
                    {isGovernment && (
                      <div className="col-span-2">
                        <label className="label">Registro Patronal ISSSTE</label>
                        <input
                          type="text"
                          name="registroPatronalIssste"
                          value={formData.registroPatronalIssste}
                          onChange={handleChange}
                          className="input"
                          placeholder="Solo si aplica"
                        />
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="label">Direccion</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Ciudad</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Estado</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Codigo Postal</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        className="input"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="label">Telefono</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
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
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {(createMutation.isPending || updateMutation.isPending)
                        ? 'Guardando...'
                        : editingCompany
                        ? 'Actualizar'
                        : 'Crear Empresa'}
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
