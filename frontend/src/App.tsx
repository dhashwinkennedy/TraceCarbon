import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';

// Manufacturer Pages
import { ManufacturerDashboard } from './pages/manufacturer/ManufacturerDashboard';
import { SuppliersPage } from './pages/manufacturer/SuppliersPage';
import { SupplierDetailPage } from './pages/manufacturer/SupplierDetailPage';
import { AuditorsPage } from './pages/manufacturer/AuditorsPage';
import { ProductsPage } from './pages/manufacturer/ProductsPage';
import { EmissionFactorsPage } from './pages/manufacturer/EmissionFactorsPage';
import { PurchaseRecordsPage } from './pages/manufacturer/PurchaseRecordsPage';
import { SubmissionsPage } from './pages/manufacturer/SubmissionsPage';
import { SubmissionDetailPage } from './pages/manufacturer/SubmissionDetailPage';
import { CalculationsPage } from './pages/manufacturer/CalculationsPage';
import { ReportsPage } from './pages/manufacturer/ReportsPage';
import { CompanyProfilePage } from './pages/manufacturer/CompanyProfilePage';

// Supplier Pages
import { SupplierDashboard } from './pages/supplier/SupplierDashboard';
import { ReportingRequirementsPage } from './pages/supplier/ReportingRequirementsPage';
import { MonthlyReportsPage } from './pages/supplier/MonthlyReportsPage';
import { MonthlyReportDetailPage } from './pages/supplier/MonthlyReportDetailPage';
import { SpreadsheetImportWizard } from './pages/supplier/SpreadsheetImportWizard';
import { ClarificationsPage } from './pages/supplier/ClarificationsPage';
import { ReductionSuggestionsPage } from './pages/supplier/ReductionSuggestionsPage';
import { SupplierProfilePage } from './pages/supplier/SupplierProfilePage';

// Auditor Pages
import { AuditorDashboard } from './pages/auditor/AuditorDashboard';
import { AuditorAssignmentsPage } from './pages/auditor/AuditorAssignmentsPage';
import { AuditorSubmissionsPage } from './pages/auditor/AuditorSubmissionsPage';
import { AuditorSubmissionReviewPage } from './pages/auditor/AuditorSubmissionReviewPage';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'manufacturer') {
    return <Navigate to="/manufacturer/dashboard" replace />;
  }
  if (user.role === 'supplier') {
    return <Navigate to="/supplier/dashboard" replace />;
  }
  if (user.role === 'auditor') {
    return <Navigate to="/auditor/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Protected Routes inside AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Common Settings */}
        <Route path="/settings/change-password" element={<ChangePasswordPage />} />

        {/* Manufacturer Routes */}
        <Route
          path="/manufacturer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <ManufacturerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/suppliers"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/suppliers/:id"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <SupplierDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/auditors"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <AuditorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/products"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/factors"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <EmissionFactorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/purchases"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <PurchaseRecordsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/submissions"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <SubmissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/submissions/:id"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <SubmissionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/calculations"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <CalculationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/reports"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/profile"
          element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <CompanyProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Supplier Routes */}
        <Route
          path="/supplier/dashboard"
          element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <SupplierDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplier/requirements"
          element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <ReportingRequirementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplier/submissions"
          element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <MonthlyReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplier/submissions/:id"
          element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <MonthlyReportDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplier/spreadsheet-wizard"
          element={<Navigate to="/supplier/submissions" replace />}
        />
        <Route
          path="/supplier/clarifications"
          element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <ClarificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplier/reductions"
          element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <ReductionSuggestionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplier/profile"
          element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <SupplierProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Auditor Routes */}
        <Route
          path="/auditor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['auditor']}>
              <AuditorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/assignments"
          element={
            <ProtectedRoute allowedRoles={['auditor']}>
              <AuditorAssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/submissions"
          element={
            <ProtectedRoute allowedRoles={['auditor']}>
              <AuditorSubmissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/submissions/:id"
          element={
            <ProtectedRoute allowedRoles={['auditor']}>
              <AuditorSubmissionReviewPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
