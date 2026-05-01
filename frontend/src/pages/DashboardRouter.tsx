import { useAuthStore } from '../store/authStore';
import { CooPage } from './COO/CooPage';
import { InventoryPage } from './Inventory/InventoryPage';
import { AlertsPage } from './Alerts/AlertsPage';
import { MobileSupervisorPage } from './Mobile/MobileSupervisorPage';

export function DashboardRouter() {
  const user = useAuthStore(s => s.user)!;
  switch (user.role) {
    case 'COO':           return <CooPage />;
    case 'ADMIN':         return <CooPage />;
    case 'STORE_MANAGER': return <InventoryPage />;
    case 'SUPERVISOR':    return <MobileSupervisorPage />;
    default:              return <AlertsPage />;
  }
}
