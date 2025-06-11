import React, { useState, useEffect } from 'react';
import ReactToPrint from 'react-to-print';
import { useRef } from 'react';
import PrintableGatePass from './printablegatepass';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import { 
  PendingActions, 
  Description,
  Menu,
  Inventory,
  Receipt,
  AssignmentReturned,
  FilterList,
  Dashboard as DashboardIcon,
  ExitToApp,
  CheckCircle,
  Cancel,
  AllInbox,
  SwapHoriz
} from '@mui/icons-material';
import axios from 'axios';

const sapColors = {
  primary: '#0A6ED1',
  secondary: '#6A6D70',
  success: '#5CB85C',
  warning: '#F0AD4E',
  danger: '#D9534F',
  light: '#F5F5F5',
  dark: '#32363A'
};

const drawerWidth = 240;

const StoreDashboard = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [openPassDialog, setOpenPassDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [passData, setPassData] = useState({
    gatePassNo: '',
    fiscalYear: new Date().getFullYear(),
    documentType: 'RGP',
    issuedBy: '',
    authorizedBy: '',
    remarks: ''
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [filter, setFilter] = useState({
    gatePassStatus: 'all',
    dateRange: 'all'
  });

  const printRef = useRef();

  useEffect(() => {
    fetchRequisitions();
  }, [activeTab, filter]);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let params = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      
      if (filter.gatePassStatus !== 'all') {
        params.gatePassStatus = filter.gatePassStatus;
      }
      
      if (filter.dateRange !== 'all') {
        params.dateRange = filter.dateRange;
      }

      const response = await axios.get('http://localhost:5000/api/requisitions', { params });
      setRequisitions(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch requisitions');
      console.error('Error fetching requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateGatePassNo = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `GP-${year}${month}-${randomNum}`;
  };

  const handleOpenPassDialog = (requisition) => {
    setSelectedRequisition(requisition);
    setPassData({
      ...passData,
      gatePassNo: generateGatePassNo(),
      issuedBy: localStorage.getItem('username') || ''
    });
    setOpenPassDialog(true);
  };

  const handleClosePassDialog = () => {
    setOpenPassDialog(false);
    setSelectedRequisition(null);
  };

  const handlePassDataChange = (e) => {
    const { name, value } = e.target;
    setPassData({
      ...passData,
      [name]: value
    });
  };

  const handleGeneratePass = async () => {
  try {
    // Update requisition status to "approved"
    await axios.put(`http://localhost:5000/api/requisitions/${selectedRequisition.id}/status`, {
      status: 'approved'
    });

    // Create the gate pass
    await axios.post('http://localhost:5000/api/gatepasses', {
      ...passData,
      requisitionId: selectedRequisition.id,
      items: selectedRequisition.items
    });

    setSnackbar({
      open: true,
      message: `Gate Pass ${passData.gatePassNo} generated successfully!`,
      severity: 'success'
    });
    
    // Refresh data
    await fetchRequisitions();
    
    // Trigger print after a small delay to allow state updates
    setTimeout(() => {
      if (printRef.current) {
        window.print();
      }
    }, 500);
    
    handleClosePassDialog();
  } catch (err) {
    console.error('Error generating gate pass:', err);
    setSnackbar({
      open: true,
      message: err.response?.data?.error || 'Failed to generate gate pass',
      severity: 'error'
    });
  }
};

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'returned': return 'success';
      case 'partially returned': return 'warning';
      case 'not returned': return 'error';
      default: return 'default';
    }
  };

  const drawer = (
    <Box sx={{ 
      backgroundColor: sapColors.primary,
      color: 'white',
      height: '100%',
      p: 2
    }}>
      <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
        Store Management
      </Typography>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <PendingActions />
            </ListItemIcon>
            <ListItemText primary="Pending Requisitions" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={activeTab === 'approved'}
            onClick={() => setActiveTab('approved')}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <CheckCircle />
            </ListItemIcon>
            <ListItemText primary="Approved Requisitions" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={activeTab === 'rejected'}
            onClick={() => setActiveTab('rejected')}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <Cancel />
            </ListItemIcon>
            <ListItemText primary="Rejected Requisitions" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={activeTab === 'gatepasses'}
            onClick={() => setActiveTab('gatepasses')}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <Receipt />
            </ListItemIcon>
            <ListItemText primary="All Gate Passes" />
            <Badge badgeContent={4} color="warning" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={activeTab === 'returns'}
            onClick={() => setActiveTab('returns')}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <AssignmentReturned />
            </ListItemIcon>
            <ListItemText primary="Returns Tracking" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mt: 2 }} />
      <List sx={{ mt: 'auto' }}>
        <ListItem disablePadding>
          <ListItemButton sx={{ borderRadius: 1 }}>
            <ListItemIcon sx={{ color: 'white' }}>
              <ExitToApp />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: sapColors.dark,
          boxShadow: 'none',
          borderBottom: `1px solid ${sapColors.light}`
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
            Store Dashboard
          </Typography>
          
          {/* Filter Controls */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeTab === 'gatepasses' || activeTab === 'returns' ? (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Gate Pass Status</InputLabel>
                <Select
                  value={filter.gatePassStatus}
                  onChange={(e) => setFilter({...filter, gatePassStatus: e.target.value})}
                  label="Gate Pass Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="returned">Fully Returned</MenuItem>
                  <MenuItem value="partially returned">Partially Returned</MenuItem>
                  <MenuItem value="not returned">Not Returned</MenuItem>
                </Select>
              </FormControl>
            ) : null}
            
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={filter.dateRange}
                onChange={(e) => setFilter({...filter, dateRange: e.target.value})}
                label="Date Range"
              >
                <MenuItem value="all">All Dates</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
            
            <IconButton color="primary">
              <FilterList />
            </IconButton>
          </Box>
        </Toolbar>

        {/* Tabs */}
        <Paper square elevation={0} sx={{ borderBottom: `1px solid ${sapColors.light}` }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: sapColors.primary,
                height: 3
              }
            }}
          >
            <Tab 
              value="pending" 
              label="Pending" 
              icon={<PendingActions />} 
              iconPosition="start" 
              sx={{ minHeight: 48 }} 
            />
            <Tab 
              value="approved" 
              label="Approved" 
              icon={<CheckCircle />} 
              iconPosition="start" 
              sx={{ minHeight: 48 }} 
            />
            <Tab 
              value="rejected" 
              label="Rejected" 
              icon={<Cancel />} 
              iconPosition="start" 
              sx={{ minHeight: 48 }} 
            />
            <Tab 
              value="gatepasses" 
              label="Gate Passes" 
              icon={<Receipt />} 
              iconPosition="start" 
              sx={{ minHeight: 48 }} 
            />
            <Tab 
              value="returns" 
              label="Returns" 
              icon={<SwapHoriz />} 
              iconPosition="start" 
              sx={{ minHeight: 48 }} 
            />
          </Tabs>
        </Paper>
      </AppBar>
      
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
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
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: 16, sm: 16 }
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : requisitions.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            p: 4,
            border: `1px dashed ${sapColors.secondary}`,
            borderRadius: 2,
            mt: 4
          }}>
            <PendingActions sx={{ fontSize: 60, color: sapColors.secondary, mb: 2 }} />
            <Typography variant="h6" sx={{ color: sapColors.secondary }}>
              No {activeTab} requisitions found matching your criteria
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {requisitions.map((requisition) => (
              <Grid item xs={12} sm={6} md={4} key={requisition.id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderLeft: `4px solid ${sapColors.primary}`,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 3
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 1
                    }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {requisition.service_indent_no}
                      </Typography>
                      <Chip 
                        label={requisition.status} 
                        size="small" 
                        color={getStatusColor(requisition.status)}
                        variant="outlined"
                      />
                    </Box>
                    
                    {requisition.gatePassStatus && (
                      <Chip 
                        label={requisition.gatePassStatus} 
                        size="small" 
                        color={getStatusColor(requisition.gatePassStatus)}
                        variant="filled"
                        sx={{ mb: 1 }}
                      />
                    )}
                    
                    <Typography variant="body2" sx={{ mb: 1, color: sapColors.secondary }}>
                      Department: {requisition.department_name || 'N/A'}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 1, color: sapColors.secondary }}>
                      Requested by: {requisition.requisitioned_by}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2, color: sapColors.secondary }}>
                      Date: {new Date(requisition.requisition_date).toLocaleDateString()}
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Items ({requisition.items?.length || 0}):
                      </Typography>
                      <ul style={{ 
                        paddingLeft: '20px', 
                        margin: '8px 0',
                        listStyleType: 'none',
                        maxHeight: '120px',
                        overflowY: 'auto'
                      }}>
                        {requisition.items?.slice(0, 3).map((item, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>
                            <Typography variant="body2">
                              {item.material_description} ({item.quantity_requested} {item.unit})
                            </Typography>
                          </li>
                        ))}
                        {requisition.items?.length > 3 && (
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            +{requisition.items.length - 3} more items...
                          </Typography>
                        )}
                      </ul>
                    </Box>
                  </CardContent>
                  
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Description />}
                      onClick={() => handleOpenPassDialog(requisition)}
                      sx={{ 
                        backgroundColor: sapColors.primary,
                        '&:hover': { backgroundColor: '#085c9e' }
                      }}
                      disabled={requisition.status !== 'pending'}
                    >
                      {requisition.status === 'pending' ? 'Generate Pass' : 'View Details'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Gate Pass Generation Dialog */}
        <Dialog 
            open={openPassDialog} 
            onClose={handleClosePassDialog}
            maxWidth="md"
            fullWidth
        >
        <DialogTitle sx={{ 
          backgroundColor: sapColors.light,
          borderBottom: `1px solid ${sapColors.secondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Generate Gate Pass</span>
          <Chip 
            label={passData.documentType} 
            color={passData.documentType === 'RGP' ? 'primary' : 'secondary'}
            size="small"
          />
        </DialogTitle>



          <DialogContent sx={{ pt: 3 }}>
            {/* Hidden printable content */}
              <Box sx={{ display: 'none' }}>
                <PrintableGatePass
                  ref={printRef} 
                  passData={passData} 
                  requisition={selectedRequisition} 
                />
              </Box>
            {selectedRequisition && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Requisition Details
                    </Typography>
                    <Box sx={{ 
                      p: 2, 
                      border: `1px solid ${sapColors.light}`,
                      borderRadius: 1
                    }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Service Indent No:</strong> {selectedRequisition.service_indent_no}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Department:</strong> {selectedRequisition.department_name || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Requested by:</strong> {selectedRequisition.requisitioned_by}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Date:</strong> {new Date(selectedRequisition.requisition_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Items ({selectedRequisition.items?.length || 0})
                    </Typography>
                    <Box sx={{ 
                      maxHeight: '300px', 
                      overflowY: 'auto',
                      border: `1px solid ${sapColors.light}`,
                      borderRadius: 1,
                      p: 1
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ 
                            borderBottom: `1px solid ${sapColors.light}`,
                            backgroundColor: sapColors.light
                          }}>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Qty</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRequisition.items?.map((item, index) => (
                            <tr 
                              key={index} 
                              style={{ 
                                borderBottom: `1px solid ${sapColors.light}`,
                                '&:last-child': { borderBottom: 'none' }
                              }}
                            >
                              <td style={{ padding: '8px' }}>{item.material_description}</td>
                              <td style={{ padding: '8px' }}>{item.quantity_requested}</td>
                              <td style={{ padding: '8px' }}>{item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Gate Pass Information
                  </Typography>
                  
                  <TextField
                    label="Gate Pass No"
                    name="gatePassNo"
                    value={passData.gatePassNo}
                    fullWidth
                    disabled
                    sx={{ mb: 2 }}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      label="Fiscal Year"
                      name="fiscalYear"
                      value={passData.fiscalYear}
                      onChange={handlePassDataChange}
                      fullWidth
                      type="number"
                      inputProps={{ min: 2000, max: 2100 }}
                    />
                    
                    <FormControl fullWidth>
                      <InputLabel>Document Type</InputLabel>
                      <Select
                        name="documentType"
                        value={passData.documentType}
                        onChange={handlePassDataChange}
                        label="Document Type"
                      >
                        <MenuItem value="RGP">RGP (Returnable Gate Pass)</MenuItem>
                        <MenuItem value="NRGP">NRGP (Non-Returnable Gate Pass)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <TextField
                    label="Issued By"
                    name="issuedBy"
                    value={passData.issuedBy}
                    onChange={handlePassDataChange}
                    fullWidth
                    required
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    label="Authorized By"
                    name="authorizedBy"
                    value={passData.authorizedBy}
                    onChange={handlePassDataChange}
                    fullWidth
                    required
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    label="Remarks"
                    name="remarks"
                    value={passData.remarks}
                    onChange={handlePassDataChange}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Any special instructions or notes..."
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
           <DialogActions sx={{ 
    borderTop: `1px solid ${sapColors.light}`,
    p: 2
  }}>
    <Button 
      onClick={handleClosePassDialog}
      variant="outlined"
      sx={{ color: sapColors.dark }}
    >
      Cancel
    </Button>
    <ReactToPrint
      trigger={() => (
        <Button 
          variant="contained"
          sx={{ 
            backgroundColor: sapColors.warning,
            '&:hover': { backgroundColor: '#d39e00' }
          }}
          disabled={!passData.issuedBy || !passData.authorizedBy}
        >
          Print Preview
        </Button>
      )}
      content={() => printRef.current}
    />
    <Button 
      onClick={handleGeneratePass}
      variant="contained"
      sx={{ 
        backgroundColor: sapColors.primary,
        '&:hover': { backgroundColor: '#085c9e' }
      }}
      disabled={!passData.issuedBy || !passData.authorizedBy}
    >
      Generate & Print
    </Button>
  </DialogActions>
</Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default StoreDashboard;