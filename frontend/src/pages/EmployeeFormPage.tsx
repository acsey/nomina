import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { employeesApi, catalogsApi, departmentsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

interface EmployeeFormData {
  employeeNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  secondLastName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  rfc: string;
  curp: string;
  nss: string;
  address: string;
  colony: string;
  city: string;
  state: string;
  zipCode: string;
  hireDate: string;
  contractType: string;
  employmentType: string;
  jobPositionId: string;
  departmentId: string;
  companyId: string;
  workScheduleId: string;
  baseSalary: number;
  salaryType: string;
  paymentMethod: string;
  bankId: string;
  bankAccount: string;
  clabe: string;
}

const initialFormData: EmployeeFormData = {
  employeeNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
  secondLastName: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: 'MALE',
  maritalStatus: 'SINGLE',
  rfc: '',
  curp: '',
  nss: '',
  address: '',
  colony: '',
  city: '',
  state: '',
  zipCode: '',
  hireDate: new Date().toISOString().split('T')[0],
  contractType: 'INDEFINITE',
  employmentType: 'FULL_TIME',
  jobPositionId: '',
  departmentId: '',
  companyId: '',
  workScheduleId: '',
  baseSalary: 0,
  salaryType: 'MONTHLY',
  paymentMethod: 'TRANSFER',
  bankId: '',
  bankAccount: '',
  clabe: '',
};

export default function EmployeeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.role === 'admin';
  const [formData, setFormData] = useState<EmployeeFormData>({
    ...initialFormData,
    // Pre-select user's company for non-admin users
    companyId: user?.companyId || '',
  });

  // Fetch employee data when editing
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: isEditMode,
  });

  // Populate form when employee data is loaded
  useEffect(() => {
    if (employeeData?.data) {
      const emp = employeeData.data;
      setFormData({
        employeeNumber: emp.employeeNumber || '',
        firstName: emp.firstName || '',
        middleName: emp.middleName || '',
        lastName: emp.lastName || '',
        secondLastName: emp.secondLastName || '',
        email: emp.email || '',
        phone: emp.phone || '',
        birthDate: emp.birthDate ? dayjs(emp.birthDate).format('YYYY-MM-DD') : '',
        gender: emp.gender || 'MALE',
        maritalStatus: emp.maritalStatus || 'SINGLE',
        rfc: emp.rfc || '',
        curp: emp.curp || '',
        nss: emp.nss || '',
        address: emp.address || '',
        colony: emp.colony || '',
        city: emp.city || '',
        state: emp.state || '',
        zipCode: emp.zipCode || '',
        hireDate: emp.hireDate ? dayjs(emp.hireDate).format('YYYY-MM-DD') : '',
        contractType: emp.contractType || 'INDEFINITE',
        employmentType: emp.employmentType || 'FULL_TIME',
        jobPositionId: emp.jobPositionId || '',
        departmentId: emp.departmentId || '',
        companyId: emp.companyId || '',
        workScheduleId: emp.workScheduleId || '',
        baseSalary: Number(emp.baseSalary) || 0,
        salaryType: emp.salaryType || 'MONTHLY',
        paymentMethod: emp.paymentMethod || 'TRANSFER',
        bankId: emp.bankId || '',
        bankAccount: emp.bankAccount || '',
        clabe: emp.clabe || '',
      });
    }
  }, [employeeData]);

  // Fetch catalogs
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });

  const { data: jobPositionsData } = useQuery({
    queryKey: ['job-positions'],
    queryFn: () => catalogsApi.getJobPositions(),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
  });

  const { data: banksData } = useQuery({
    queryKey: ['banks'],
    queryFn: () => catalogsApi.getBanks(),
  });

  const { data: workSchedulesData } = useQuery({
    queryKey: ['work-schedules'],
    queryFn: () => catalogsApi.getWorkSchedules(),
  });

  const companies = companiesData?.data || [];
  const jobPositions = jobPositionsData?.data || [];
  const departments = departmentsData?.data || [];
  const banks = banksData?.data || [];
  const workSchedules = workSchedulesData?.data || [];

  // Prepare payload
  const preparePayload = (data: EmployeeFormData) => ({
    ...data,
    baseSalary: Number(data.baseSalary),
    bankId: data.bankId || undefined,
    workScheduleId: data.workScheduleId || undefined,
    middleName: data.middleName || undefined,
    secondLastName: data.secondLastName || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    nss: data.nss || undefined,
    address: data.address || undefined,
    colony: data.colony || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    zipCode: data.zipCode || undefined,
    bankAccount: data.bankAccount || undefined,
    clabe: data.clabe || undefined,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: EmployeeFormData) => employeesApi.create(preparePayload(data)),
    onSuccess: () => {
      toast.success('Empleado creado exitosamente');
      navigate('/employees');
    },
    onError: (error: any) => {
      console.error('Error creating employee:', error);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: EmployeeFormData) => employeesApi.update(id!, preparePayload(data)),
    onSuccess: () => {
      toast.success('Empleado actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate(`/employees/${id}`);
    },
    onError: (error: any) => {
      console.error('Error updating employee:', error);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isEditMode && employeeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Editar Empleado' : 'Nuevo Empleado'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos personales */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Datos Personales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">No. Empleado *</label>
              <input
                type="text"
                name="employeeNumber"
                value={formData.employeeNumber}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Nombre(s) *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Segundo Nombre</label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Apellido Paterno *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Apellido Materno</label>
              <input
                type="text"
                name="secondLastName"
                value={formData.secondLastName}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Fecha de Nacimiento *</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Genero *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Femenino</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div>
              <label className="label">Estado Civil *</label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="SINGLE">Soltero(a)</option>
                <option value="MARRIED">Casado(a)</option>
                <option value="DIVORCED">Divorciado(a)</option>
                <option value="WIDOWED">Viudo(a)</option>
                <option value="COHABITING">Union Libre</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
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
          </div>
        </div>

        {/* Documentos fiscales */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Documentos Fiscales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="label">CURP *</label>
              <input
                type="text"
                name="curp"
                value={formData.curp}
                onChange={handleChange}
                className="input uppercase"
                maxLength={18}
                required
              />
            </div>
            <div>
              <label className="label">NSS</label>
              <input
                type="text"
                name="nss"
                value={formData.nss}
                onChange={handleChange}
                className="input"
                maxLength={11}
              />
            </div>
          </div>
        </div>

        {/* Direccion */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Direccion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Calle y Numero</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Colonia</label>
              <input
                type="text"
                name="colony"
                value={formData.colony}
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
          </div>
        </div>

        {/* Datos laborales */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Datos Laborales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Empresa *</label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleChange}
                className="input"
                required
                disabled={!isAdmin && !!user?.companyId}
              >
                <option value="">Seleccionar...</option>
                {companies.map((company: any) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {!isAdmin && user?.companyId && (
                <p className="text-xs text-gray-500 mt-1">
                  Los empleados se asignan a tu empresa
                </p>
              )}
            </div>
            <div>
              <label className="label">Departamento *</label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Seleccionar...</option>
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Puesto *</label>
              <select
                name="jobPositionId"
                value={formData.jobPositionId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Seleccionar...</option>
                {jobPositions.map((position: any) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fecha de Ingreso *</label>
              <input
                type="date"
                name="hireDate"
                value={formData.hireDate}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Tipo de Contrato *</label>
              <select
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="INDEFINITE">Indefinido</option>
                <option value="FIXED_TERM">Tiempo Determinado</option>
                <option value="SEASONAL">Por Temporada</option>
                <option value="TRIAL_PERIOD">Periodo de Prueba</option>
                <option value="TRAINING">Capacitacion</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de Jornada *</label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="FULL_TIME">Tiempo Completo</option>
                <option value="PART_TIME">Medio Tiempo</option>
                <option value="HOURLY">Por Horas</option>
              </select>
            </div>
            <div>
              <label className="label">Horario</label>
              <select
                name="workScheduleId"
                value={formData.workScheduleId}
                onChange={handleChange}
                className="input"
              >
                <option value="">Seleccionar...</option>
                {workSchedules.map((schedule: any) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Datos de pago */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Datos de Pago</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Salario Base *</label>
              <input
                type="number"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">Tipo de Salario *</label>
              <select
                name="salaryType"
                value={formData.salaryType}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="MONTHLY">Mensual</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="WEEKLY">Semanal</option>
                <option value="DAILY">Diario</option>
                <option value="HOURLY">Por Hora</option>
              </select>
            </div>
            <div>
              <label className="label">Forma de Pago *</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="TRANSFER">Transferencia</option>
                <option value="CHECK">Cheque</option>
                <option value="CASH">Efectivo</option>
              </select>
            </div>
            <div>
              <label className="label">Banco</label>
              <select
                name="bankId"
                value={formData.bankId}
                onChange={handleChange}
                className="input"
              >
                <option value="">Seleccionar...</option>
                {banks.map((bank: any) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Numero de Cuenta</label>
              <input
                type="text"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">CLABE Interbancaria</label>
              <input
                type="text"
                name="clabe"
                value={formData.clabe}
                onChange={handleChange}
                className="input"
                maxLength={18}
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/employees')}
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
              : isEditMode ? 'Actualizar Empleado' : 'Guardar Empleado'}
          </button>
        </div>
      </form>
    </div>
  );
}
