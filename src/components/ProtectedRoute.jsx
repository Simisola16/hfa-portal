import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-overlay" style={{ height: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
  const isClient = (user?.role || 'client') === 'client' || !!user?.is_impersonation;
  if (!user || !isClient) return <Navigate to="/login" replace />;
  return children;
}
