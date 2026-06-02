import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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
    <AppProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  );
}
