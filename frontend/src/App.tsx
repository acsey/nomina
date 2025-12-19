import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
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
import IncidentsPage from './pages/IncidentsPage';

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
