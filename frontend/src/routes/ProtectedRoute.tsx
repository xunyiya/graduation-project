import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <section className="empty-state">正在检查登录状态...</section>;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
