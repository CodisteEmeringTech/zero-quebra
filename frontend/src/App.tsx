import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/Login/LoginPage';
import { Shell } from './layout/Shell';
import { DashboardRouter } from './pages/DashboardRouter';
import { InventoryPage } from './pages/Inventory/InventoryPage';
import { AlertsPage } from './pages/Alerts/AlertsPage';
import { CooPage } from './pages/COO/CooPage';
import { StoresPage } from './pages/Admin/StoresPage';
import { SuppliersPage } from './pages/Admin/SuppliersPage';
import { SkusPage } from './pages/Admin/SkusPage';
import { UsersPage } from './pages/Admin/UsersPage';
import { ActionLogPage } from './pages/ActionLog/ActionLogPage';
import { GuidedDemoPage } from './pages/GuidedDemo/GuidedDemoPage';
import { MobileSupervisorPage } from './pages/Mobile/MobileSupervisorPage';
import { CalculatorPage } from './pages/Calculator/CalculatorPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardRouter />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/mobile" element={<MobileSupervisorPage />} />
        <Route path="/coo" element={<CooPage />} />
        <Route path="/log" element={<ActionLogPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/admin/stores" element={<StoresPage />} />
        <Route path="/admin/suppliers" element={<SuppliersPage />} />
        <Route path="/admin/skus" element={<SkusPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/demo" element={<GuidedDemoPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
