// src/components/common/ProtectedRoute.jsx
// Guards routes — redirects to /login if not authenticated
// Redirects to correct dashboard based on role

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: 12, color: '#9ca3af' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // If a specific role is required and user has wrong role → redirect to correct dashboard
  if (allowedRole && user.role !== allowedRole) {
    const redirect = user.role === 'donor' ? '/donor/dashboard' : '/receiver/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}
