import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './context';

export function ProtectedRoute() {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-loading" role="status">正在整理档案…</div>;
  if (!admin) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
