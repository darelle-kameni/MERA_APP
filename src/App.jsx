import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PatientAuthProvider, usePatientAuth } from '@/lib/PatientAuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingScreen from '@/components/LoadingScreen';
import Layout from './components/Layout';
import PatientLayout from './components/patient/PatientLayout';

// Staff pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PatientRegistration = lazy(() => import('./pages/PatientRegistration'));
const DiagnosticSession = lazy(() => import('./pages/DiagnosticSession'));
const PatientRecords = lazy(() => import('./pages/PatientRecords'));
const MedicalReview = lazy(() => import('./pages/MedicalReview'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));
const AISimulator = lazy(() => import('./pages/AISimulator'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const PageNotFound = lazy(() => import('./lib/PageNotFound'));

// Admin pages
const AdminRequests = lazy(() => import('./pages/admin/Requests'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminAssignments = lazy(() => import('./pages/admin/Assignments'));

// Patient pages
const PatientLogin = lazy(() => import('./pages/patient/Login'));
const PatientDashboard = lazy(() => import('./pages/patient/Dashboard'));
const PatientSession = lazy(() => import('./pages/patient/Session'));
const PatientProfile = lazy(() => import('./pages/patient/Profile'));
const PatientChat = lazy(() => import('./pages/patient/Chat'));

// ─── Staff guards ───────────────────────────────────────────
const RequireStaff = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  if (isLoadingAuth) return <LoadingScreen label="Vérification de la session" />;
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
};

const RequireAdmin = ({ children }) => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <LoadingScreen label="Vérification" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const RedirectIfStaffAuthed = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <LoadingScreen label="Vérification de la session" />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

// ─── Patient guards ─────────────────────────────────────────
const RequirePatient = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = usePatientAuth();
  const location = useLocation();
  if (isLoadingAuth) return <LoadingScreen label="Vérification de la session" />;
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/patient/login?next=${next}`} replace />;
  }
  return children;
};

const RedirectIfPatientAuthed = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = usePatientAuth();
  if (isLoadingAuth) return <LoadingScreen label="Vérification de la session" />;
  if (isAuthenticated) return <Navigate to="/patient" replace />;
  return children;
};

// ─── Subtree components ─────────────────────────────────────
const StaffApp = () => (
  <AuthProvider>
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={<RedirectIfStaffAuthed><Login /></RedirectIfStaffAuthed>} />
        <Route path="/register" element={<RedirectIfStaffAuthed><Register /></RedirectIfStaffAuthed>} />
        <Route element={<RequireStaff><Layout /></RequireStaff>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients/new" element={<PatientRegistration />} />
          <Route path="/diagnostic" element={<DiagnosticSession />} />
          <Route path="/diagnostic/:id" element={<DiagnosticSession />} />
          <Route path="/patients" element={<PatientRecords />} />
          <Route path="/reviews" element={<MedicalReview />} />
          <Route path="/devices" element={<DeviceManagement />} />
          <Route path="/simulator" element={<AISimulator />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin/requests" element={<RequireAdmin><AdminRequests /></RequireAdmin>} />
          <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
          <Route path="/admin/assignments" element={<RequireAdmin><AdminAssignments /></RequireAdmin>} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </Suspense>
  </AuthProvider>
);

const PatientApp = () => (
  <PatientAuthProvider>
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="login" element={<RedirectIfPatientAuthed><PatientLogin /></RedirectIfPatientAuthed>} />
        <Route element={<RequirePatient><PatientLayout /></RequirePatient>}>
          <Route index element={<PatientDashboard />} />
          <Route path="sessions/:id" element={<PatientSession />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="chat" element={<PatientChat />} />
        </Route>
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Routes>
    </Suspense>
  </PatientAuthProvider>
);

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/patient/*" element={<PatientApp />} />
            <Route path="/*" element={<StaffApp />} />
          </Routes>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
