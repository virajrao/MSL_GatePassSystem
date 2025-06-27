import React from 'react';
import { Navigate } from 'react-router-dom';

const RoleGuard = ({ role, children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === role) {
    return children;
  }
  switch (user.role) {
    case 'store':
      return <Navigate to="/store-dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin-dashboard" replace />;
    case 'security':
      return <Navigate to="/security-dashboard" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleGuard;