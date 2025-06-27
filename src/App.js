import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './Components/Layout';
import UserRequisition from './pages/UserRequisition';
import RequisitionDashboard from './pages/RequisitionDashboard';
import Login from './pages/login';
import Dashboard from './Components/Dashboard';
import StoreDashboard from './pages/storeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import RoleGuard from './Components/RoleGaurd';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0A6ED1',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/create-requisition"
              element={<RoleGuard role="user"><UserRequisition /></RoleGuard>}
            />
            <Route
              path="/my-requisitions"
              element={<RoleGuard role="user"><RequisitionDashboard /></RoleGuard>}
            />
            <Route
              path="/store-dashboard"
              element={<RoleGuard role="store"><StoreDashboard /></RoleGuard>}
            />
            <Route
              path="/admin-dashboard"
              element={<RoleGuard role="admin"><AdminDashboard /></RoleGuard>}
            />
            <Route
              path="/security-dashboard"
              element={<RoleGuard role="security"><SecurityDashboard /></RoleGuard>}
            />
          </Route>

          {/* Catch-all route for undefined paths */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

const ProtectedLayout = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout />;
};

export default App;