import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { selectIsAuthenticated } from './features/auth/authSlice.js';

import Navbar from './components/Navbar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProductView from './pages/ProductView.jsx';
import FileHistory from './pages/FileHistory.jsx';
import UploadPage from './pages/UploadPage.jsx';
import PrinterProfilesPage from './pages/PrinterProfilesPage.jsx';

function ProtectedLayout() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products/:slug" element={<ProductView />} />
          <Route path="/products/:slug/upload" element={<UploadPage />} />
          <Route path="/files/:fileAssetId/history" element={<FileHistory />} />
          <Route path="/settings/printer-profiles" element={<PrinterProfilesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
