import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWeb3, ROLE_HOME } from '../context/Web3Context';

export default function ProtectedRoute({ allowed, children }) {
  const { selectedRole } = useWeb3();
  const location = useLocation();

  if (!selectedRole) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!allowed.includes(selectedRole)) {
    return <Navigate to={ROLE_HOME[selectedRole] || '/login'} replace />;
  }
  return children;
}
