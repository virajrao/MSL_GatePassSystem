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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-requisition" element={<UserRequisition />} />
            <Route path="/my-requisitions" element={<RequisitionDashboard />} />
            <Route path="/store-dashboard" element={<StoreDashboard />} />
          </Route>

          {/* Default redirect for unauthenticated users */}
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
  
  return (
    <Layout>
      <Routes>
        {/* These nested routes will render inside the Layout component */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-requisition" element={<UserRequisition />} />
        <Route path="/my-requisitions" element={<RequisitionDashboard />} />
        <Route path="/store-dashboard" element={<StoreDashboard />} />
      </Routes>
    </Layout>
  );
};

export default App;