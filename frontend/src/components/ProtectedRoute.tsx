import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

export default function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { token, userRole } = useAppStore();
  const location = useLocation();

  // If not logged in, redirect to appropriate login page
  if (!token && !requireAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If trying to access admin route without being an admin
  if (requireAdmin && userRole !== 'admin') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // If trying to access user route with token but no specific userRole (though app defaults to farmer)
  // Actually, the main check is just the token for user routes.

  return <>{children}</>;
}
