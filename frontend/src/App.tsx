import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';

import DashboardPage from './pages/Dashboard';
import LiveMapPage from './pages/LiveMap';
import RouteOptimizationPage from './pages/RouteOptimization';
import ShipmentsPage from './pages/Shipments';
import AnalyticsPage from './pages/Analytics';
import AlertsPage from './pages/Alerts';


import ChatbotWidget from './components/ChatbotWidget';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/map" element={<LiveMapPage />} />
            <Route path="/optimize" element={<RouteOptimizationPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />

          </Routes>
        </div>
      </div>

      <ChatbotWidget />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
        style={{ zIndex: 9999 }}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
