import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './stores/appStore';
import { authService } from './services/auth.service';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { MappingDesigner } from './pages/MappingDesigner';
import { TemplateEditorPage } from './pages/TemplateEditorPage';
import { ProcessingJobs } from './pages/ProcessingJobs';
import { SavedProfiles } from './pages/SavedProfiles';
import { ProfileReport } from './pages/ProfileReport';
import { Settings } from './pages/Settings';
import { UserGuide } from './pages/UserGuide';
import { DatabaseConnections } from './pages/DatabaseConnections';
import { TextToTable } from './pages/TextToTable';
import { DatabaseMigration } from './pages/DatabaseMigration';
import { SpecEvaluator } from './pages/SpecEvaluator';
import { SpecBuilder } from './pages/SpecBuilder';
import { SqlScripts } from './pages/SqlScripts';
import { TemplateGenerator } from './pages/TemplateGenerator';
import { AdminUsers } from './pages/AdminUsers';
import { AdminRoute } from './components/AdminRoute';

function AuthGuard() {
  const { isAuthenticated } = useAppStore();
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

export default function App() {
  const { user, setUser, theme } = useAppStore();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !user) {
      authService.getProfile()
        .then((profile) => setUser(profile))
        .catch(() => {
          localStorage.removeItem('accessToken');
        });
    }
  }, [user, setUser]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: '14px' } }} />
      <Routes>
      <Route path="/login" element={<AuthGuard />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="mapping/:fileId?" element={<MappingDesigner />} />
        <Route path="template/:profileId?" element={<TemplateEditorPage />} />
        <Route path="template-generator" element={<TemplateGenerator />} />
        <Route path="jobs" element={<ProcessingJobs />} />
          <Route path="profiles" element={<SavedProfiles />} />
          <Route path="profiles/:id/report" element={<ProfileReport />} />
        <Route path="settings" element={<Settings />} />
        <Route path="guide" element={<UserGuide />} />
        <Route path="database-connections" element={<DatabaseConnections />} />
        <Route path="text-to-table" element={<TextToTable />} />
        <Route path="database-migration" element={<DatabaseMigration />} />
        <Route path="spec-evaluator" element={<SpecEvaluator />} />
        <Route path="spec-builder" element={<SpecBuilder />} />
        <Route path="sql-scripts" element={<SqlScripts />} />
        <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
