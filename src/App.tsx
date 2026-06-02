import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SetPasswordPage from './pages/SetPasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { AppProvider } from './context/AppContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Chatbot from './components/ui/Chatbot';
import HomePage from './pages/HomePage';
import PortfolioPage from './features/portfolio/PortfolioPage';
import FinancePage from './features/finance/FinancePage';
import InvestmentPage from './features/investment/InvestmentPage';
import AdminPage from './features/admin/AdminPage';
import VCToolkitPage from './features/toolkit/VCToolkitPage';
import WorkspacePage from './features/workspace/WorkspacePage';

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
          <Routes>
            <Route path="/dashboard"  element={<PortfolioPage />} />
            <Route path="/finance"    element={<FinancePage />} />
            <Route path="/investment" element={<InvestmentPage />} />
            <Route path="/admin"      element={<AdminPage />} />
            <Route path="/toolkit"    element={<VCToolkitPage />} />
            <Route path="/workspace"  element={<WorkspacePage />} />
            {/* Catch-all → dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
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
