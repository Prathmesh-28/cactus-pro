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

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'linear-gradient(135deg,#0A2321,#1C4B42)'}}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto" style={{background:'linear-gradient(135deg,#86CA0F,#95c840)'}}>
          <span className="text-white text-xl">🌵</span>
        </div>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function AppShell() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <>
      <div className={`flex flex-col min-h-screen ${isHome ? 'bg-[#0A0F0D]' : 'bg-gray-50'}`}>
        {!isHome && <Header />}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<PortfolioPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/investment" element={<InvestmentPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/toolkit" element={<VCToolkitPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
          </Routes>
        </div>
        {!isHome && <Footer />}
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
            {/* Public auth routes */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/set-password"    element={<SetPasswordPage />} />
            {/* All other routes are protected */}
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
