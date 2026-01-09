import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import { PortalGuard, AdminGuard, canAccessPortal } from './components/guards';
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
import SurveysManagementPage from './pages/SurveysManagementPage';
import DocumentsManagementPage from './pages/DocumentsManagementPage';

// Employee Portal pages
import {
  MyPayrollPage,
  VacationsDashboardPage,
  FeedPage,
  PortalAttendancePage,
  PortalDocumentsPage,
  PortalBenefitsPage,
  PortalRecognitionPage,
  PortalSurveysPage,
  PortalPeoplePage,
} from './pages/portal';

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

// Determines where to redirect based on portal access
function RoleBasedRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // REGLA ÚNICA: Si puede acceder al portal, va al portal
  // Si no, va al dashboard
  if (canAccessPortal(user)) {
    return <Navigate to="/portal/feed" replace />;
  }

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

              {/* Admin Routes - Protected by AdminGuard */}
              <Route path="employees" element={<AdminGuard><EmployeesPage /></AdminGuard>} />
              <Route path="employees/new" element={<AdminGuard><EmployeeFormPage /></AdminGuard>} />
              <Route path="employees/:id" element={<AdminGuard><EmployeeDetailPage /></AdminGuard>} />
              <Route path="employees/:id/edit" element={<AdminGuard><EmployeeFormPage /></AdminGuard>} />
              <Route path="departments" element={<AdminGuard><DepartmentsPage /></AdminGuard>} />
              <Route path="payroll" element={<AdminGuard><PayrollPage /></AdminGuard>} />
              <Route path="payroll/receipts" element={<AdminGuard><PayrollReceiptsPage /></AdminGuard>} />
              <Route path="incidents" element={<AdminGuard><IncidentsPage /></AdminGuard>} />
              <Route path="attendance" element={<AdminGuard><AttendancePage /></AdminGuard>} />
              <Route path="vacations" element={<AdminGuard><VacationsPage /></AdminGuard>} />
              <Route path="benefits" element={<AdminGuard><BenefitsPage /></AdminGuard>} />
              <Route path="reports" element={<AdminGuard><ReportsPage /></AdminGuard>} />
              <Route path="bulk-upload" element={<AdminGuard><BulkUploadPage /></AdminGuard>} />
              <Route path="companies" element={<AdminGuard><CompaniesPage /></AdminGuard>} />
              <Route path="company-config" element={<AdminGuard><CompanyConfigPage /></AdminGuard>} />
              <Route path="users" element={<AdminGuard><UsersPage /></AdminGuard>} />
              <Route path="accounting-config" element={<AdminGuard><AccountingConfigPage /></AdminGuard>} />
              <Route path="work-schedules" element={<AdminGuard><WorkSchedulesPage /></AdminGuard>} />
              <Route path="devices" element={<AdminGuard><DevicesPage /></AdminGuard>} />
              <Route path="system-settings" element={<AdminGuard><SystemSettingsPage /></AdminGuard>} />
              <Route path="surveys" element={<AdminGuard><SurveysManagementPage /></AdminGuard>} />
              <Route path="documents-management" element={<AdminGuard><DocumentsManagementPage /></AdminGuard>} />

              {/* Routes accessible to all authenticated users */}
              <Route path="my-portal" element={<EmployeePortalPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="org-chart" element={<OrgChartPage />} />
              <Route path="timeclock" element={<WebTimeclockPage />} />
              </Route>

              {/* Employee Portal Routes - Protected by PortalGuard */}
              <Route
                path="/portal"
                element={
                  <PortalGuard redirectTo="/dashboard">
                    <PortalLayout />
                  </PortalGuard>
                }
              >
                <Route index element={<Navigate to="/portal/feed" replace />} />
                <Route path="my-payroll" element={<MyPayrollPage />} />
                <Route path="vacations" element={<VacationsDashboardPage />} />
                <Route path="attendance" element={<PortalAttendancePage />} />
                <Route path="documents" element={<PortalDocumentsPage />} />
                <Route path="people" element={<PortalPeoplePage />} />
                <Route path="org-chart" element={<OrgChartPage />} />
                <Route path="services" element={<HelpPage />} />
                <Route path="benefits" element={<PortalBenefitsPage />} />
                <Route path="recognition" element={<PortalRecognitionPage />} />
                <Route path="surveys" element={<PortalSurveysPage />} />
                <Route path="feed" element={<FeedPage />} />
              </Route>
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </SystemConfigProvider>
    </BrowserRouter>
  );
}

export default App;
