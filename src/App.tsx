import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Chatbot from './components/ui/Chatbot';

// Eagerly loaded (tiny, needed immediately)
import LoginPage from './pages/LoginPage';
import SetPasswordPage from './pages/SetPasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';

// Lazy-loaded — each becomes its own JS chunk
const PortfolioPage  = lazy(() => import('./features/portfolio/PortfolioPage'));
const FinancePage    = lazy(() => import('./features/finance/FinancePage'));
const InvestmentPage = lazy(() => import('./features/investment/InvestmentPage'));
const OperationsHub  = lazy(() => import('./features/operations/OperationsHub'));
const AdminPage      = lazy(() => import('./features/admin/AdminPage'));
const VCToolkitPage  = lazy(() => import('./features/toolkit/VCToolkitPage'));
const WorkspacePage  = lazy(() => import('./features/workspace/WorkspacePage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
          style={{ background: 'linear-gradient(135deg,#86CA0F,#95c840)' }}>
          <span className="text-white text-base">🌵</span>
        </div>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  );
}

// Redirect to login, remembering where the user wanted to go
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#0A2321,#1C4B42)' }}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'linear-gradient(135deg,#86CA0F,#95c840)' }}>
          <span className="text-white text-xl">🌵</span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</p>
      </div>
    </div>
  );

  if (!user) {
    // Save intended destination so login can redirect back
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}

function AppShell() {
  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <div className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/dashboard"   element={<PortfolioPage />} />
              <Route path="/finance"     element={<FinancePage />} />
              <Route path="/investment"  element={<InvestmentPage />} />
              <Route path="/operations"  element={<OperationsHub />} />
              <Route path="/admin"       element={<AdminPage />} />
              <Route path="/toolkit"     element={<VCToolkitPage />} />
              <Route path="/workspace"   element={<WorkspacePage />} />
              <Route path="*"            element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
        <Footer />
      </div>
      <Chatbot />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public pages — no login needed ─────────────────────── */}
            <Route path="/"                element={<HomePage />} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/set-password"    element={<SetPasswordPage />} />

            {/* ── Protected pages — login required ───────────────────── */}
            <Route path="/*" element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            } />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
