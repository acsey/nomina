import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('No tienes permisos para realizar esta acción');
          break;
        case 404:
          toast.error('Recurso no encontrado');
          break;
        case 422:
        case 400:
          const message = data.message || 'Error de validación';
          toast.error(Array.isArray(message) ? message[0] : message);
          break;
        case 500:
          toast.error('Error del servidor. Intenta de nuevo más tarde.');
          break;
        default:
          toast.error('Ocurrió un error inesperado');
      }
    } else if (error.request) {
      toast.error('No se pudo conectar con el servidor');
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

export const employeesApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/employees', { params }),
  getById: (id: string) => api.get(`/employees/${id}`),
  getByEmail: (email: string) => api.get(`/employees/by-email/${encodeURIComponent(email)}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.patch(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
  terminate: (id: string, terminationDate: string) =>
    api.post(`/employees/${id}/terminate`, { terminationDate }),
  updateSalary: (id: string, newSalary: number, reason?: string) =>
    api.post(`/employees/${id}/salary`, { newSalary, reason }),
};

export const departmentsApi = {
  getAll: (companyId?: string) =>
    api.get('/departments', { params: { companyId } }),
  getById: (id: string) => api.get(`/departments/${id}`),
  create: (data: any) => api.post('/departments', data),
  update: (id: string, data: any) => api.patch(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

export const payrollApi = {
  getPeriods: (companyId: string, year?: number) =>
    api.get('/payroll/periods', { params: { companyId, year } }),
  getPeriod: (id: string) => api.get(`/payroll/periods/${id}`),
  createPeriod: (data: any) => api.post('/payroll/periods', data),
  updatePeriod: (id: string, data: any) => api.patch(`/payroll/periods/${id}`, data),
  deletePeriod: (id: string) => api.delete(`/payroll/periods/${id}`),
  previewPayroll: (id: string) => api.get(`/payroll/periods/${id}/preview`),
  calculatePayroll: (id: string) => api.post(`/payroll/periods/${id}/calculate`),
  approvePayroll: (id: string) => api.post(`/payroll/periods/${id}/approve`),
  closePayroll: (id: string) => api.post(`/payroll/periods/${id}/close`),
  getEmployeeHistory: (employeeId: string, limit?: number) =>
    api.get(`/payroll/employee/${employeeId}/history`, { params: { limit } }),
  // Recibos de nomina
  getEmployeeReceipts: (employeeId: string, year?: number) =>
    api.get(`/payroll/employee/${employeeId}/receipts`, { params: { year } }),
  downloadReceipt: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/pdf`, { responseType: 'blob' }),
  viewReceipt: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/view`, { responseType: 'blob' }),
};

export const cfdiApi = {
  generate: (payrollDetailId: string) =>
    api.post(`/cfdi/generate/${payrollDetailId}`),
  stamp: (cfdiId: string) => api.post(`/cfdi/${cfdiId}/stamp`),
  cancel: (cfdiId: string, reason: string) =>
    api.post(`/cfdi/${cfdiId}/cancel`, { reason }),
  get: (cfdiId: string) => api.get(`/cfdi/${cfdiId}`),
  getByPayrollDetail: (payrollDetailId: string) =>
    api.get(`/cfdi/by-detail/${payrollDetailId}`),
  getByPeriod: (periodId: string) => api.get(`/cfdi/period/${periodId}`),
  stampAll: (periodId: string) => api.post(`/cfdi/period/${periodId}/stamp-all`),
  downloadXml: (cfdiId: string) =>
    api.get(`/cfdi/${cfdiId}/xml`, { responseType: 'blob' }),
  downloadXmlByDetail: (payrollDetailId: string) =>
    api.get(`/cfdi/by-detail/${payrollDetailId}/xml`, { responseType: 'blob' }),
};

export const attendanceApi = {
  checkIn: (employeeId: string) => api.post(`/attendance/check-in/${employeeId}`),
  checkOut: (employeeId: string) => api.post(`/attendance/check-out/${employeeId}`),
  breakStart: (employeeId: string) => api.post(`/attendance/break-start/${employeeId}`),
  breakEnd: (employeeId: string) => api.post(`/attendance/break-end/${employeeId}`),
  getTodayRecord: (employeeId: string) => api.get(`/attendance/today/${employeeId}`),
  getEmployeeSchedule: (employeeId: string) => api.get(`/attendance/schedule/${employeeId}`),
  getAllEmployeesToday: (companyId: string) => api.get('/attendance/today-all', { params: { companyId } }),
  getEmployeeAttendance: (employeeId: string, startDate: string, endDate: string) =>
    api.get(`/attendance/employee/${employeeId}`, { params: { startDate, endDate } }),
  getDailyAttendance: (companyId: string, date: string) =>
    api.get('/attendance/daily', { params: { companyId, date } }),
  getSummary: (companyId: string, startDate: string, endDate: string) =>
    api.get('/attendance/summary', { params: { companyId, startDate, endDate } }),
  markAbsent: (employeeId: string, date: string, notes?: string) =>
    api.post('/attendance/mark-absent', { employeeId, date, notes }),
  updateRecord: (recordId: string, data: any) =>
    api.post(`/attendance/update/${recordId}`, data),
};

export const vacationsApi = {
  request: (data: any) => api.post('/vacations/request', data),
  createRequest: (data: any) => api.post('/vacations/request', data),
  approveRequest: (id: string) => api.post(`/vacations/${id}/approve`),
  rejectRequest: (id: string, reason: string) =>
    api.post(`/vacations/${id}/reject`, { reason }),
  getBalance: (employeeId: string, year?: number) =>
    api.get(`/vacations/balance/${employeeId}`, { params: { year } }),
  getEmployeeRequests: (employeeId: string, year?: number) =>
    api.get(`/vacations/employee/${employeeId}`, { params: { year } }),
  getPendingRequests: (companyId: string) =>
    api.get('/vacations/pending', { params: { companyId } }),
  // Configuracion de tipos de ausencia
  getLeaveTypeConfigs: () => api.get('/vacations/leave-types'),
  // Horario laboral
  getEmployeeSchedule: (employeeId: string) =>
    api.get(`/vacations/schedule/${employeeId}`),
  previewVacationDays: (employeeId: string, startDate: string, endDate: string) =>
    api.get('/vacations/preview', { params: { employeeId, startDate, endDate } }),
  // Approvers based on hierarchy
  getApprovers: (employeeId: string) =>
    api.get(`/vacations/approvers/${employeeId}`),
  canApprove: (approverId: string, employeeId: string) =>
    api.get('/vacations/can-approve', { params: { approverId, employeeId } }),
};

export const benefitsApi = {
  getAll: (includeAll = false) => api.get('/benefits', { params: { includeAll } }),
  getPending: () => api.get('/benefits/pending'),
  getById: (id: string) => api.get(`/benefits/${id}`),
  create: (data: any) => api.post('/benefits', data),
  update: (id: string, data: any) => api.patch(`/benefits/${id}`, data),
  delete: (id: string) => api.delete(`/benefits/${id}`),
  approve: (id: string) => api.post(`/benefits/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/benefits/${id}/reject`, { reason }),
  assignToEmployee: (data: any) => api.post('/benefits/assign', data),
  removeFromEmployee: (employeeId: string, benefitId: string) =>
    api.delete(`/benefits/employee/${employeeId}/benefit/${benefitId}`),
  getEmployeeBenefits: (employeeId: string) =>
    api.get(`/benefits/employee/${employeeId}`),
};

export const reportsApi = {
  getPayrollSummary: (periodId: string) => api.get(`/reports/payroll/${periodId}`),
  downloadPayrollExcel: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/excel`, { responseType: 'blob' }),
  downloadPayrollPdf: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/pdf`, { responseType: 'blob' }),
  getEmployeeReport: (employeeId: string, year?: number) =>
    api.get(`/reports/employee/${employeeId}`, { params: { year } }),
  getDepartmentReport: (departmentId: string, periodId: string) =>
    api.get(`/reports/department/${departmentId}`, { params: { periodId } }),
  // Dispersión bancaria
  downloadBankDispersionExcel: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/dispersion/excel`, { responseType: 'blob' }),
  downloadBankDispersionTxt: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/dispersion/txt`, { responseType: 'blob' }),
  // Reportes gubernamentales
  getImssReport: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/imss`),
  downloadImssExcel: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/imss/excel`, { responseType: 'blob' }),
  getIssteReport: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/issste`),
  downloadIssteExcel: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/issste/excel`, { responseType: 'blob' }),
  getInfonavitReport: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/infonavit`),
  downloadSuaFile: (periodId: string) =>
    api.get(`/reports/payroll/${periodId}/sua`, { responseType: 'blob' }),
};

export const governmentApi = {
  getImssReport: (companyId: string, periodId: string) =>
    api.get('/government/imss/report', { params: { companyId, periodId } }),
  getImssEmployerQuotas: (companyId: string, periodId: string) =>
    api.get('/government/imss/employer-quotas', { params: { companyId, periodId } }),
  getInfonavitReport: (companyId: string, periodId: string) =>
    api.get('/government/infonavit/report', { params: { companyId, periodId } }),
};

export const catalogsApi = {
  getCompanies: () => api.get('/catalogs/companies'),
  getJobPositions: () => api.get('/catalogs/job-positions'),
  getBanks: () => api.get('/catalogs/banks'),
  getWorkSchedules: () => api.get('/catalogs/work-schedules'),
  getWorkScheduleById: (id: string) => api.get(`/catalogs/work-schedules/${id}`),
  createWorkSchedule: (data: any) => api.post('/catalogs/work-schedules', data),
  updateWorkSchedule: (id: string, data: any) => api.patch(`/catalogs/work-schedules/${id}`, data),
  deleteWorkSchedule: (id: string) => api.delete(`/catalogs/work-schedules/${id}`),
};

export const devicesApi = {
  getAll: (companyId: string) => api.get('/devices', { params: { companyId } }),
  getById: (id: string) => api.get(`/devices/${id}`),
  create: (data: any) => api.post('/devices', data),
  update: (id: string, data: any) => api.patch(`/devices/${id}`, data),
  delete: (id: string) => api.delete(`/devices/${id}`),
  testConnection: (id: string) => api.post(`/devices/${id}/test-connection`),
  syncRecords: (id: string) => api.post(`/devices/${id}/sync`),
  getLogs: (id: string, params?: { startDate?: string; endDate?: string; limit?: number }) =>
    api.get(`/devices/${id}/logs`, { params }),
};

export const incidentsApi = {
  // Tipos de incidencia
  getTypes: () => api.get('/incidents/types'),
  createType: (data: any) => api.post('/incidents/types', data),
  updateType: (id: string, data: any) => api.patch(`/incidents/types/${id}`, data),
  deleteType: (id: string) => api.delete(`/incidents/types/${id}`),
  // Incidencias
  getAll: (params?: {
    employeeId?: string;
    incidentTypeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => api.get('/incidents', { params }),
  getById: (id: string) => api.get(`/incidents/${id}`),
  create: (data: any) => api.post('/incidents', data),
  update: (id: string, data: any) => api.patch(`/incidents/${id}`, data),
  approve: (id: string) => api.post(`/incidents/${id}/approve`),
  reject: (id: string) => api.post(`/incidents/${id}/reject`),
  delete: (id: string) => api.delete(`/incidents/${id}`),
  getEmployeeIncidents: (employeeId: string, year?: number) =>
    api.get(`/incidents/employee/${employeeId}`, { params: { year } }),
};

export const usersApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getRoles: () => api.get('/users/roles'),
};

export const liquidationsApi = {
  // Calculate/preview liquidation
  calculate: (data: {
    employeeId: string;
    terminationDate: string;
    type: 'FINIQUITO' | 'LIQUIDACION' | 'RESCISION' | 'JUBILACION' | 'MUERTE';
    terminationReason?: string;
    saveToDb?: boolean;
  }) => api.post('/liquidations/calculate', data),

  // Create and save liquidation
  create: (data: {
    employeeId: string;
    terminationDate: string;
    type: 'FINIQUITO' | 'LIQUIDACION' | 'RESCISION' | 'JUBILACION' | 'MUERTE';
    terminationReason?: string;
  }) => api.post('/liquidations', data),

  // Get liquidation by ID
  getById: (id: string) => api.get(`/liquidations/${id}`),

  // Get all liquidations for an employee
  getByEmployee: (employeeId: string) =>
    api.get(`/liquidations/employee/${employeeId}`),

  // Approve liquidation
  approve: (id: string) => api.post(`/liquidations/${id}/approve`),

  // Mark as paid
  pay: (id: string) => api.post(`/liquidations/${id}/pay`),

  // Cancel liquidation
  cancel: (id: string) => api.post(`/liquidations/${id}/cancel`),
};

export const accountingConfigApi = {
  // Summary
  getSummary: () => api.get('/accounting-config/summary'),

  // ISN (Impuesto Sobre Nómina) por estado
  getAllIsnConfigs: (activeOnly = true) =>
    api.get('/accounting-config/isn', { params: { activeOnly } }),
  getIsnConfig: (stateCode: string) =>
    api.get(`/accounting-config/isn/${stateCode}`),
  getIsnRate: (stateCode: string) =>
    api.get(`/accounting-config/isn/${stateCode}/rate`),
  createIsnConfig: (data: any) => api.post('/accounting-config/isn', data),
  updateIsnConfig: (stateCode: string, data: any) =>
    api.patch(`/accounting-config/isn/${stateCode}`, data),

  // Valores fiscales (UMA, SMG)
  getAllFiscalValues: () => api.get('/accounting-config/fiscal'),
  getCurrentFiscalValues: () => api.get('/accounting-config/fiscal/current'),
  getFiscalValues: (year: number) =>
    api.get(`/accounting-config/fiscal/${year}`),
  createFiscalValues: (data: any) => api.post('/accounting-config/fiscal', data),
  updateFiscalValues: (year: number, data: any) =>
    api.patch(`/accounting-config/fiscal/${year}`, data),

  // Configuración de nómina por empresa
  getCompanyPayrollConfig: (companyId: string) =>
    api.get(`/accounting-config/company/${companyId}`),
  createOrUpdateCompanyPayrollConfig: (data: any) =>
    api.post('/accounting-config/company', data),
  updateCompanyPayrollConfig: (companyId: string, data: any) =>
    api.patch(`/accounting-config/company/${companyId}`, data),

  // Tablas ISR
  getAllIsrTables: () => api.get('/accounting-config/isr'),
  getIsrTable: (year: number, periodType: string) =>
    api.get(`/accounting-config/isr/${year}/${periodType}`),
  calculateIsr: (taxableIncome: number, year: number, periodType: string) =>
    api.post('/accounting-config/isr/calculate', { taxableIncome, year, periodType }),
  createIsrTableRow: (data: any) => api.post('/accounting-config/isr', data),
  updateIsrTableRow: (id: string, data: any) =>
    api.patch(`/accounting-config/isr/${id}`, data),
  deleteIsrTableRow: (id: string) => api.delete(`/accounting-config/isr/${id}`),

  // Tablas Subsidio al Empleo
  getAllSubsidioTables: () => api.get('/accounting-config/subsidio'),
  getSubsidioTable: (year: number, periodType: string) =>
    api.get(`/accounting-config/subsidio/${year}/${periodType}`),
  createSubsidioTableRow: (data: any) =>
    api.post('/accounting-config/subsidio', data),
  updateSubsidioTableRow: (id: string, data: any) =>
    api.patch(`/accounting-config/subsidio/${id}`, data),
  deleteSubsidioTableRow: (id: string) =>
    api.delete(`/accounting-config/subsidio/${id}`),

  // Tasas IMSS
  getAllImssRates: () => api.get('/accounting-config/imss'),
  getImssRates: (year: number) => api.get(`/accounting-config/imss/${year}`),
  createImssRate: (data: any) => api.post('/accounting-config/imss', data),
  updateImssRate: (id: string, data: any) =>
    api.patch(`/accounting-config/imss/${id}`, data),
  deleteImssRate: (id: string) => api.delete(`/accounting-config/imss/${id}`),
};

export const bulkUploadApi = {
  // Descargar plantillas
  downloadEmployeesTemplate: () =>
    api.get('/bulk-upload/templates/employees', { responseType: 'blob' }),
  downloadCompaniesTemplate: () =>
    api.get('/bulk-upload/templates/companies', { responseType: 'blob' }),
  downloadDepartmentsTemplate: () =>
    api.get('/bulk-upload/templates/departments', { responseType: 'blob' }),
  downloadBenefitsTemplate: () =>
    api.get('/bulk-upload/templates/benefits', { responseType: 'blob' }),
  downloadJobPositionsTemplate: () =>
    api.get('/bulk-upload/templates/job-positions', { responseType: 'blob' }),
  // Importar archivos
  importEmployees: (companyId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/bulk-upload/import/employees/${companyId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importCompanies: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/bulk-upload/import/companies', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importDepartments: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/bulk-upload/import/departments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importBenefits: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/bulk-upload/import/benefits', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importJobPositions: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/bulk-upload/import/job-positions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const systemConfigApi = {
  // Public endpoint - no auth required
  getPublic: () => api.get('/system-config/public'),
  // Admin endpoints
  getAll: () => api.get('/system-config'),
  getByKey: (key: string) => api.get(`/system-config/${key}`),
  update: (key: string, value: string) => api.patch(`/system-config/${key}`, { value }),
  updateMultiple: (configs: { key: string; value: string }[]) =>
    api.patch('/system-config', { configs }),
};

export const hierarchyApi = {
  // Organizational chart
  getOrgChart: (companyId?: string) =>
    api.get('/hierarchy/org-chart', { params: { companyId } }),

  // Employee hierarchy (supervisors chain)
  getEmployeeChain: (employeeId: string) =>
    api.get(`/hierarchy/employee/${employeeId}/chain`),

  // Subordinates
  getSubordinates: (employeeId: string) =>
    api.get(`/hierarchy/employee/${employeeId}/subordinates`),
  getAllSubordinates: (employeeId: string) =>
    api.get(`/hierarchy/employee/${employeeId}/all-subordinates`),

  // Approvers
  getApprovers: (employeeId: string) =>
    api.get(`/hierarchy/employee/${employeeId}/approvers`),

  // Set supervisor
  setSupervisor: (employeeId: string, supervisorId: string | null) =>
    api.patch(`/hierarchy/employee/${employeeId}/supervisor`, { supervisorId }),

  // Delegations
  createDelegation: (data: {
    delegatorId: string;
    delegateeId: string;
    delegationType: string;
    startDate: string;
    endDate?: string;
    reason?: string;
  }) => api.post('/hierarchy/delegations', data),
  getDelegations: (employeeId: string) =>
    api.get(`/hierarchy/employee/${employeeId}/delegations`),
  revokeDelegation: (delegationId: string) =>
    api.delete(`/hierarchy/delegations/${delegationId}`),

  // Check approval permission
  canApprove: (approverId: string, employeeId: string) =>
    api.get('/hierarchy/can-approve', { params: { approverId, employeeId } }),
};
