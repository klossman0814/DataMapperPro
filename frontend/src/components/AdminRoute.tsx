import { Navigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const user = useAppStore((s) => s.user);
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
