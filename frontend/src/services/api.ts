import axios from 'axios';
import toast from 'react-hot-toast';
import i18n from '../i18n';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get translation
const t = (key: string, fallback?: string) => {
  const translation = i18n.t(key);
  return translation !== key ? translation : (fallback || translation);
};

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

/**
 * API Error Response structure from backend
 * { code, message, i18nKey, details?, timestamp, path }
 */
interface ApiErrorResponse {
  code: string;
  message: string;
  i18nKey: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path?: string;
}

/**
 * Get the translated error message
 * Priority: i18nKey translation > message > fallback
 */
const getErrorMessage = (data: ApiErrorResponse | any): string => {
  // If data has i18nKey, try to get translation
  if (data?.i18nKey) {
    const translated = t(data.i18nKey);
    // If translation exists (not same as key), use it
    if (translated !== data.i18nKey) {
      return translated;
    }
  }

  // Handle validation errors (array of messages)
  if (data?.details?.errors && Array.isArray(data.details.errors)) {
    return data.details.errors[0];
  }

  // Handle NestJS validation pipe errors (array of messages)
  if (Array.isArray(data?.message)) {
    return data.message[0];
  }

  // Use backend message as fallback
  if (typeof data?.message === 'string') {
    return data.message;
  }

  return t('errors.generic');
};

// Response interceptor with i18n support
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Special handling for 401 - session expired
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          toast.error(getErrorMessage(data) || t('errors.sessionExpired'));
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Special handling for 428 - MFA required (don't show toast)
      if (status === 428 || data?.code === 'MFA_REQUIRED') {
        return Promise.reject(error);
      }

      // For all other errors, show translated message
      const errorMessage = getErrorMessage(data);

      // Log error details for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', {
          status,
          code: data?.code,
          i18nKey: data?.i18nKey,
          message: data?.message,
          details: data?.details,
        });
      }

      // Show toast with translated message
      toast.error(errorMessage);

    } else if (error.request) {
      // Network error - no response received
      toast.error(t('errors.networkError'));
    } else {
      // Error setting up request
      toast.error(t('errors.generic'));
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authApi = {
  login: (data: { email: string; password: string; mfaCode?: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  // Microsoft Auth
  getMicrosoftStatus: () => api.get('/auth/microsoft/status'),
  getMicrosoftLoginUrl: () => api.get('/auth/microsoft/login'),
  testMicrosoftConnection: () => api.post('/auth/microsoft/test'),
  // Auth Policies
  getAuthPolicies: () => api.get('/auth/policies'),
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
  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post(`/uploads/employees/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deletePhoto: (id: string) => api.delete(`/uploads/employees/${id}/photo`),
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

  // === ENTERPRISE: Auditoria Fiscal ===
  getReceiptFiscalAudit: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/fiscal-audit`),
  getPeriodFiscalAudit: (periodId: string) =>
    api.get(`/payroll/periods/${periodId}/fiscal-audit`),
  getPeriodFiscalAuditSummary: (periodId: string) =>
    api.get(`/payroll/periods/${periodId}/fiscal-audit/summary`),

  // === ENTERPRISE: Versionado de Recibos ===
  getReceiptVersions: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/versions`),
  getReceiptVersion: (detailId: string, version: number) =>
    api.get(`/payroll/receipts/${detailId}/versions/${version}`),
  compareVersions: (detailId: string, versionA: number, versionB: number) =>
    api.get(`/payroll/receipts/${detailId}/versions/compare`, {
      params: { versionA, versionB },
    }),
  canModifyReceipt: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/can-modify`),
  getPeriodStampedStatus: (periodId: string) =>
    api.get(`/payroll/periods/${periodId}/stamped-status`),

  // === ENTERPRISE: Snapshots de Reglas ===
  getRulesetSnapshot: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/ruleset-snapshot`),
  getRulesetSnapshotByVersion: (detailId: string, version: number) =>
    api.get(`/payroll/receipts/${detailId}/ruleset-snapshot/${version}`),
  getAllRulesetSnapshots: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/ruleset-snapshots`),
  compareRulesetSnapshots: (detailId: string, versionA: number, versionB: number) =>
    api.get(`/payroll/receipts/${detailId}/ruleset-snapshot/compare`, {
      params: { versionA, versionB },
    }),
  getCalculationContext: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/calculation-context`),
  verifySnapshotIntegrity: (detailId: string) =>
    api.get(`/payroll/receipts/${detailId}/snapshot-integrity`),

  // === ENTERPRISE: Autorizacion de Timbrado ===
  authorizeStamping: (periodId: string, details: any) =>
    api.post(`/payroll/periods/${periodId}/authorize-stamping`, details),
  revokeStampingAuth: (periodId: string, reason: string) =>
    api.post(`/payroll/periods/${periodId}/revoke-stamping-auth`, { reason }),
  getStampingEligibility: (periodId: string) =>
    api.get(`/payroll/periods/${periodId}/stamping-eligibility`),
  getAuthorizationHistory: (periodId: string) =>
    api.get(`/payroll/periods/${periodId}/authorization-history`),

  // === ENTERPRISE: Documentos Fiscales ===
  getReceiptDocuments: (detailId: string, type?: string) =>
    api.get(`/payroll/receipts/${detailId}/documents`, { params: { type } }),
  getDocumentMetadata: (documentId: string) =>
    api.get(`/payroll/documents/${documentId}`),
  downloadDocument: (documentId: string) =>
    api.get(`/payroll/documents/${documentId}/download`, { responseType: 'blob' }),
  verifyDocumentIntegrity: (documentId: string) =>
    api.get(`/payroll/documents/${documentId}/verify`),
  verifyPeriodDocumentsIntegrity: (periodId: string) =>
    api.get(`/payroll/periods/${periodId}/documents-integrity`),
  deleteDocument: (documentId: string, reason: string) =>
    api.delete(`/payroll/documents/${documentId}`, { data: { reason } }),
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
  // Auth policies (public)
  getAuthPolicies: () => api.get('/system-config/auth-policies'),
  // Admin endpoints
  getAll: () => api.get('/system-config'),
  getByKey: (key: string) => api.get(`/system-config/${key}`),
  update: (key: string, value: string, justification?: string) =>
    api.patch(`/system-config/${key}`, { value, justification }),
  updateMultiple: (configs: { key: string; value: string }[], justification?: string) =>
    api.patch('/system-config', { configs, justification }),
  // Azure AD validation
  validateAzureAd: () => api.get('/system-config/azure-ad/validate'),
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

// Email API - Testing SMTP
export const emailApi = {
  testConnection: () => api.post('/email/test-connection'),
  testSend: (to: string) => api.post('/email/test-send', { to }),
};

// PAC API - Proveedores Autorizados de Certificación
export const pacApi = {
  // Get all PAC providers (for admin catalog view)
  getAllProviders: () => api.get('/pac/providers'),

  // Get only implemented PAC providers (for company configuration)
  getImplementedProviders: () => api.get('/pac/providers/implemented'),

  // Get provider by ID
  getProviderById: (id: string) => api.get(`/pac/providers/${id}`),

  // Create custom PAC provider (admin only)
  createProvider: (data: any) => api.post('/pac/providers', data),

  // Update PAC provider
  updateProvider: (id: string, data: any) => api.patch(`/pac/providers/${id}`, data),

  // Configure PAC for a company
  configureForCompany: (companyId: string, data: any) =>
    api.post(`/pac/config/company/${companyId}`, data),

  // Get company PAC configurations
  getCompanyConfigs: (companyId: string) =>
    api.get(`/pac/config/company/${companyId}`),

  // Test PAC connection
  testConnection: (configId: string) =>
    api.post(`/pac/config/${configId}/test`),
};

// Notifications API
export const notificationsApi = {
  // Get user notifications
  getMyNotifications: (params?: {
    unreadOnly?: boolean;
    skip?: number;
    take?: number;
    type?: string;
  }) => api.get('/notifications', { params }),

  // Get unread count
  getUnreadCount: () => api.get('/notifications/unread-count'),

  // Mark as read
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),

  // Mark all as read
  markAllAsRead: () => api.post('/notifications/read-all'),

  // Delete notification
  delete: (id: string) => api.delete(`/notifications/${id}`),

  // Get upcoming birthdays
  getUpcomingBirthdays: (companyId?: string, daysAhead?: number) =>
    api.get('/notifications/upcoming-birthdays', { params: { companyId, daysAhead } }),

  // Get upcoming anniversaries
  getUpcomingAnniversaries: (companyId?: string, daysAhead?: number) =>
    api.get('/notifications/upcoming-anniversaries', { params: { companyId, daysAhead } }),
};

// Portal API - Employee Portal
export const portalApi = {
  // Documents
  getMyDocuments: (employeeId: string) => api.get(`/portal/documents/${employeeId}`),
  uploadDocument: (employeeId: string, file: File, data: {
    type: string;
    name: string;
    description?: string;
    expiresAt?: string;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name);
    formData.append('type', data.type);
    if (data.description) formData.append('description', data.description);
    if (data.expiresAt) formData.append('expiresAt', data.expiresAt);
    return api.post(`/uploads/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  validateDocument: (id: string, data: { status: 'APPROVED' | 'REJECTED'; notes?: string }) =>
    api.patch(`/portal/documents/${id}/validate`, data),
  deleteDocument: (employeeId: string, documentId: string) =>
    api.delete(`/uploads/employees/${employeeId}/documents/${documentId}`),
  downloadDocument: (path: string) => api.get(path, { responseType: 'blob' }),

  // Discounts
  getDiscounts: () => api.get('/portal/discounts'),
  createDiscount: (data: any) => api.post('/portal/discounts', data),

  // Agreements
  getAgreements: () => api.get('/portal/agreements'),
  createAgreement: (data: any) => api.post('/portal/agreements', data),

  // Recognitions
  getMyRecognitions: (employeeId: string) => api.get(`/portal/recognitions/me/${employeeId}`),
  getCompanyRecognitions: (limit?: number) =>
    api.get('/portal/recognitions/company', { params: { limit } }),
  giveRecognition: (data: {
    employeeId: string;
    type: string;
    title: string;
    message: string;
    points?: number;
    isPublic?: boolean;
  }) => api.post('/portal/recognitions', data),
  getEmployeePoints: (employeeId: string) => api.get(`/portal/points/${employeeId}`),

  // Courses
  getAvailableCourses: () => api.get('/portal/courses/available'),
  getMyCourses: (employeeId: string) => api.get(`/portal/courses/me/${employeeId}`),
  enrollInCourse: (courseId: string) => api.post(`/portal/courses/${courseId}/enroll`),
  updateCourseProgress: (courseId: string, progress: number) =>
    api.patch(`/portal/courses/${courseId}/progress`, { progress }),
  createCourse: (data: any) => api.post('/portal/courses', data),

  // Badges
  getCompanyBadges: () => api.get('/portal/badges/company'),
  getMyBadges: (employeeId: string) => api.get(`/portal/badges/me/${employeeId}`),
  awardBadge: (badgeId: string, employeeId: string, reason?: string) =>
    api.post(`/portal/badges/${badgeId}/award`, { employeeId, reason }),
  createBadge: (data: any) => api.post('/portal/badges', data),

  // Surveys
  getAvailableSurveys: () => api.get('/portal/surveys/available'),
  getSurveyDetails: (id: string) => api.get(`/portal/surveys/${id}`),
  submitSurveyResponse: (surveyId: string, answers: any[]) =>
    api.post(`/portal/surveys/${surveyId}/respond`, { answers }),
  createSurvey: (data: any) => api.post('/portal/surveys', data),
  publishSurvey: (id: string) => api.patch(`/portal/surveys/${id}/publish`),
  getSurveyResults: (id: string) => api.get(`/portal/surveys/${id}/results`),

  // Benefits
  getMyBenefits: (employeeId: string) => api.get(`/portal/benefits/${employeeId}`),
};
