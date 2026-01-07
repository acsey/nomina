import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import DepartmentsPage from './pages/DepartmentsPage';
import PayrollPage from './pages/PayrollPage';
import PayrollReceiptsPage from './pages/PayrollReceiptsPage';
import AttendancePage from './pages/AttendancePage';
import VacationsPage from './pages/VacationsPage';
import BenefitsPage from './pages/BenefitsPage';
import ReportsPage from './pages/ReportsPage';
import BulkUploadPage from './pages/BulkUploadPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyConfigPage from './pages/CompanyConfigPage';
import IncidentsPage from './pages/IncidentsPage';
import EmployeePortalPage from './pages/EmployeePortalPage';
import UsersPage from './pages/UsersPage';
import AccountingConfigPage from './pages/AccountingConfigPage';
import WorkSchedulesPage from './pages/WorkSchedulesPage';
import DevicesPage from './pages/DevicesPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import HelpPage from './pages/HelpPage';
import OrgChartPage from './pages/OrgChartPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import WebTimeclockPage from './pages/WebTimeclockPage';

// Employee Portal pages
import { MyPayrollPage, VacationsDashboardPage, FeedPage } from './pages/portal';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Determines where to redirect based on user role
function RoleBasedRedirect() {
  const { user } = useAuth();

  // Employees should go directly to portal feed (Muro)
  if (user?.role === 'EMPLOYEE' || user?.role === 'employee') {
    return <Navigate to="/portal/feed" replace />;
  }

  // Admins and other roles go to dashboard
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <SystemConfigProvider>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
              <Route index element={<RoleBasedRedirect />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="employees/new" element={<EmployeeFormPage />} />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
              <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="payroll/receipts" element={<PayrollReceiptsPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="vacations" element={<VacationsPage />} />
              <Route path="benefits" element={<BenefitsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="bulk-upload" element={<BulkUploadPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="company-config" element={<CompanyConfigPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="accounting-config" element={<AccountingConfigPage />} />
              <Route path="work-schedules" element={<WorkSchedulesPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="system-settings" element={<SystemSettingsPage />} />
              <Route path="my-portal" element={<EmployeePortalPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="org-chart" element={<OrgChartPage />} />
              <Route path="timeclock" element={<WebTimeclockPage />} />
              </Route>

              {/* Employee Portal Routes */}
              <Route
                path="/portal"
                element={
                  <PrivateRoute>
                    <PortalLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Navigate to="/portal/feed" replace />} />
                <Route path="my-payroll" element={<MyPayrollPage />} />
                <Route path="vacations" element={<VacationsDashboardPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="documents" element={<EmployeePortalPage />} />
                <Route path="people" element={<UsersPage />} />
                <Route path="org-chart" element={<OrgChartPage />} />
                <Route path="services" element={<HelpPage />} />
                <Route path="benefits" element={<BenefitsPage />} />
                <Route path="recognition" element={<EmployeePortalPage />} />
                <Route path="surveys" element={<EmployeePortalPage />} />
                <Route path="feed" element={<FeedPage />} />
                <Route path="settings" element={<SystemSettingsPage />} />
              </Route>
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </SystemConfigProvider>
    </BrowserRouter>
  );
}

export default App;
