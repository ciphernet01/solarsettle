import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWeb3, ROLE_HOME } from '../context/Web3Context';

/**
 * Guards role-specific dashboards.
 *  - Not signed in        -> /login (remembers where the user wanted to go)
 *  - Signed in, wrong role -> redirected to their own dashboard
 */
export default function ProtectedRoute({ allowed, children }) {
  const { account, role } = useWeb3();
  const location = useLocation();

  if (!account) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (role && !allowed.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />;
  }
  if (!role) {
    return (
      <div className="dashboard">
        <p className="dashboard-sub">Resolving your role on-chain...</p>
      </div>
    );
  }
  return children;
}
