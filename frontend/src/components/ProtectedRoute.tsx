import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore, UserRole } from '@/store/useAppStore';

export default function ProtectedRoute({ children, requireAdmin, requireRole }: { children: React.ReactNode, requireAdmin?: boolean, requireRole?: UserRole[] }) {
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

  // Check specific roles if provided
  if (requireRole && !requireRole.includes(userRole as UserRole)) {
    // If not allowed, send back to home
    return <Navigate to="/" replace />;
  }

  // If trying to access user route with token but no specific userRole (though app defaults to farmer)
  // Actually, the main check is just the token for user routes.

  return <>{children}</>;
}
