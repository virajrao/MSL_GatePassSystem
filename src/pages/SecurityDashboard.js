import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Divider,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Menu,
  LocalShipping,
  Input,
  CheckCircle,
  Cancel,
  Search as SearchIcon,
} from '@mui/icons-material';
import axios from 'axios';

const colors = {
  primary: '#0A6ED1',
  secondary: '#6A6D70',
  success: '#5CB85C',
  danger: '#D9534F',
  light: '#F5F5F5',
  dark: '#0A6ED1',
  background: '#F7F7F7',
  text: '#FFFFFF',
};

const drawerWidth = 240;

const SecurityDashboard = () => {
  const [gatePassNo, setGatePassNo] = useState('');
  const [requisition, setRequisition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('materialOut');
  const [materialOutRequisitions, setMaterialOutRequisitions] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchMaterialOutRequisitions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/requisitions', {
        params: { status: 'higherauthapprove' },
  
      });
      setMaterialOutRequisitions(response.data);
      console.log(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch material out requisitions');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!gatePassNo) {
      setError('Please enter a gate pass number');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:5000/api/requisitions/verify/${gatePassNo}` );
      if (response.data.status !== 'higherauthapprove') {
        setError('Requisition is not approved by higher authority');
        setRequisition(null);
      } else {
        setRequisition(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify gate pass');
      setRequisition(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      setLoading(true);
      await axios.put(
        `http://localhost:5000/api/requisitions/${requisition.id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSnackbar({
        open: true,
        message: `Requisition ${requisition.pr_num} ${status === 'securityapprove' ? 'approved for material out' : 'rejected'} successfully`,
        severity: 'success',
      });
      setRequisition(null);
      setGatePassNo('');
      if (status === 'securityapprove') {
        fetchMaterialOutRequisitions();
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to update requisition status',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'securityapprove':
        return 'success';
      case 'securityreject':
        return 'error';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    if (activeTab === 'materialOut') {
      fetchMaterialOutRequisitions();
    }
  }, [activeTab]);

  const drawer = (
    <Box sx={{ backgroundColor: colors.dark, color: colors.text, height: '100%', p: 2 }}>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === 'materialOut'}
            onClick={() => setActiveTab('materialOut')}
            sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.1)' },
          marginTop: '60px' }}
          >
            <ListItemIcon sx={{ color: colors.text }}>
              <LocalShipping />
            </ListItemIcon>
            <ListItemText primary="Material Out" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === 'materialIn'}
            onClick={() => setActiveTab('materialIn')}
            sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ color: colors.text }}>
              <Input />
            </ListItemIcon>
            <ListItemText primary="Material In" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', backgroundColor: colors.background }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: colors.dark,
          boxShadow: 'none',
          borderBottom: `1px solid ${colors.light}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Security Dashboard
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="security options"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: 10, sm: 10 },
          overflow: 'auto',
        }}
      >
        {activeTab === 'materialOut' && (
          <>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                label="Gate Pass Number"
                value={gatePassNo}
                onChange={(e) => setGatePassNo(e.target.value)}
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={handleVerify}
                disabled={loading}
                sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: '#085c9e' } }}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </Box>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            {requisition && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Requisition Details: {requisition.pr_num}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography><strong>Status:</strong> <Chip label={requisition.status} color={getStatusColor(requisition.status)} size="small" /></Typography>
                  <Typography><strong>Gate Pass No:</strong> {requisition.gate_pass_no}</Typography>
                  <Typography><strong>Supplier:</strong> {requisition.supplier_name}</Typography>
                  <Typography><strong>Supplier Address:</strong> {requisition.supplier_address}</Typography>
                  <Typography><strong>Transporter:</strong> {requisition.transporter_name}</Typography>
                  <Typography><strong>Vehicle No:</strong> {requisition.vehicle_num}</Typography>
                  <Typography><strong>Date:</strong> {new Date(requisition.requisition_date).toLocaleDateString()}</Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Items ({requisition.items?.length || 0}):
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Item No</strong></TableCell>
                        <TableCell><strong>Description</strong></TableCell>
                        <TableCell><strong>Item Code</strong></TableCell>
                        <TableCell><strong>Quantity</strong></TableCell>
                        <TableCell><strong>Unit</strong></TableCell>
                        <TableCell><strong>Approx Cost</strong></TableCell>
                        <TableCell><strong>Remarks</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requisition.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.pr_itm_num}</TableCell>
                          <TableCell>{item.material_description}</TableCell>
                          <TableCell>{item.item_code}</TableCell>
                          <TableCell>{item.quantity_requested}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{item.approx_cost}</TableCell>
                          <TableCell>{item.remarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={() => handleStatusUpdate('securityapprove')}
                    disabled={loading}
                    sx={{ backgroundColor: colors.success, '&:hover': { backgroundColor: '#4cae4c' } }}
                  >
                    Material Out
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Cancel />}
                    onClick={() => handleStatusUpdate('securityreject')}
                    disabled={loading}
                    sx={{ backgroundColor: colors.danger, '&:hover': { backgroundColor: '#c9302c' } }}
                  >
                    Reject
                  </Button>
                </Box>
              </Paper>
            )}
            <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 'bold' }}>
              Material Out History
            </Typography>
            {loading ? (
              <Typography>Loading...</Typography>
            ) : materialOutRequisitions.length === 0 ? (
              <Typography>No material out records found</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>PR Number</strong></TableCell>
                      <TableCell><strong>Gate Pass No</strong></TableCell>
                      <TableCell><strong>Supplier</strong></TableCell>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {materialOutRequisitions.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{req.pr_num}</TableCell>
                        <TableCell>{req.gate_pass_no}</TableCell>
                        <TableCell>{req.supplier_name}</TableCell>
                        <TableCell>{new Date(req.requisition_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip label={req.status} color={getStatusColor(req.status)} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
        {activeTab === 'materialIn' && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Material In (To be implemented)
            </Typography>
            <Typography>Feature coming soon...</Typography>
          </Box>
        )}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default SecurityDashboard;