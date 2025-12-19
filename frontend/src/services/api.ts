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
  calculatePayroll: (id: string) => api.post(`/payroll/periods/${id}/calculate`),
  approvePayroll: (id: string) => api.post(`/payroll/periods/${id}/approve`),
  closePayroll: (id: string) => api.post(`/payroll/periods/${id}/close`),
  getEmployeeHistory: (employeeId: string, limit?: number) =>
    api.get(`/payroll/employee/${employeeId}/history`, { params: { limit } }),
};

export const attendanceApi = {
  checkIn: (employeeId: string) => api.post(`/attendance/check-in/${employeeId}`),
  checkOut: (employeeId: string) => api.post(`/attendance/check-out/${employeeId}`),
  getEmployeeAttendance: (employeeId: string, startDate: string, endDate: string) =>
    api.get(`/attendance/employee/${employeeId}`, { params: { startDate, endDate } }),
  getDailyAttendance: (companyId: string, date: string) =>
    api.get('/attendance/daily', { params: { companyId, date } }),
  getSummary: (companyId: string, startDate: string, endDate: string) =>
    api.get('/attendance/summary', { params: { companyId, startDate, endDate } }),
};

export const vacationsApi = {
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
};

export const benefitsApi = {
  getAll: () => api.get('/benefits'),
  getById: (id: string) => api.get(`/benefits/${id}`),
  create: (data: any) => api.post('/benefits', data),
  update: (id: string, data: any) => api.patch(`/benefits/${id}`, data),
  delete: (id: string) => api.delete(`/benefits/${id}`),
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
};

export const governmentApi = {
  getImssReport: (companyId: string, periodId: string) =>
    api.get('/government/imss/report', { params: { companyId, periodId } }),
  getImssEmployerQuotas: (companyId: string, periodId: string) =>
    api.get('/government/imss/employer-quotas', { params: { companyId, periodId } }),
  getInfonavitReport: (companyId: string, periodId: string) =>
    api.get('/government/infonavit/report', { params: { companyId, periodId } }),
};
