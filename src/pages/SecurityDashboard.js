import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Snackbar, Chip, Checkbox,
  Divider, CircularProgress, Drawer, List, ListItem, 
  ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, IconButton
} from '@mui/material';
import { 
  Search as SearchIcon, 
  CheckCircle, 
  LocalShipping,
  Inventory,
  ExitToApp,
  ArrowBack,
  Menu
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const colors = {
  primary: '#0A6ED1',
  secondary: '#6A6D70',
  success: '#5CB85C',
  warning: '#F0AD4E',
  danger: '#D9534F',
  light: '#F5F5F5',
  dark: '#1A252F',
  background: '#F7F7F7',
  text: '#FFFFFF',
};

const drawerWidth = 240;

const SecurityDashboard = () => {
  const [gatePasses, setGatePasses] = useState([]);
  const [materialOutForIn, setMaterialOutForIn] = useState([]);
  const [materialIn, setMaterialIn] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState('gatepasses');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Parse URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const urlTab = queryParams.get('tab') || 'gatepasses';
  const urlGatePass = queryParams.get('gatePass');
  const urlMovement = queryParams.get('movement');

  // Fetch gate passes ready for material out (only RGP with status 'higherauthapprove')
  const fetchGatePasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://200.0.5.184:5000/api/gatepasses', {
        params: { 
          status: 'higherauthapprove',
          documentType: 'RGP',
          search: searchTerm 
        }
      });
      setGatePasses(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch gate passes');
    } finally {
      setLoading(false);
    }
  };

  // Fetch material out records for recording in
  const fetchMaterialOutForIn = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://200.0.5.184:5000/api/material-out-for-in', {
        params: { search: searchTerm }
      });
      setMaterialOutForIn(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch material out records');
    } finally {
      setLoading(false);
    }
  };

  // Fetch material in records
  const fetchMaterialIn = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://200.0.5.184:5000/api/material-in', {
        params: { search: searchTerm }
      });
      setMaterialIn(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch material in records');
    } finally {
      setLoading(false);
    }
  };

  // Fetch gate pass details
  const fetchGatePassDetails = async (gatePassNo) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://200.0.5.184:5000/api/gatepasses/${gatePassNo}`, {
        params: { checkOut: true }
      });
      setSelectedRecord(response.data);
      navigate(`?tab=${activeTab}&gatePass=${gatePassNo}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch gate pass details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch material out details for recording in
  const fetchMaterialOutDetails = async (movementId) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://200.0.5.184:5000/api/material-out-for-in/${movementId}`);
      
      // Initialize all items as pending
      const movement = {
        ...response.data,
        items: response.data.items.map(item => ({
          ...item,
          status: item.status === 'received' ? 'received' : 'pending'
        }))
      };
      
      setSelectedRecord(movement);
      navigate(`?tab=${activeTab}&movement=${movementId}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch movement details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch material in details
  const fetchMaterialInDetails = async (movementId) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://200.0.5.184:5000/api/material-in/${movementId}`);
      setSelectedRecord(response.data);
      navigate(`?tab=${activeTab}&movement=${movementId}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch material in details');
    } finally {
      setLoading(false);
    }
  };

  // Handle back to list view
  const handleBackToList = () => {
    setSelectedRecord(null);
    navigate(`?tab=${activeTab}`, { replace: true });
  };

  // Handle tab change
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSelectedRecord(null);
    navigate(`?tab=${newTab}`, { replace: true });
  };

  const handleMaterialOut = async () => {
    try {
      setLoading(true);
      
      // Check if document type is NRGP
      if (selectedRecord.document_type === 'NRGP') {
        // For NRGP, directly mark as completed
        await axios.post('http://200.0.5.184:5000/api/material-out-nrgp', {
          gate_pass_no: selectedRecord.gate_pass_no,
          items: selectedRecord.items.map(item => ({
            requisition_item_id: item.id,
            quantity: item.quantity_requested
          }))
        });
        
        setSnackbar({
          open: true,
          message: `NRGP ${selectedRecord.gate_pass_no} processed as completed automatically`,
          severity: 'success'
        });
      } else {
        // Normal RGP processing
        await axios.post('http://200.0.5.184:5000/api/material-movements', {
          gate_pass_no: selectedRecord.gate_pass_no,
          movement_type: 'out',
          items: selectedRecord.items.map(item => ({
            requisition_item_id: item.id,
            quantity: item.quantity_requested
          }))
        });

        setSnackbar({
          open: true,
          message: `Material out recorded for Gate Pass ${selectedRecord.gate_pass_no}`,
          severity: 'success'
        });
      }
      
      handleBackToList();
      fetchGatePasses();
      fetchMaterialOutForIn();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to record material movement',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle material in
  const handleMaterialIn = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post('http://200.0.5.184:5000/api/material-in', {
        gate_pass_no: selectedRecord.gate_pass_no,
        movement_out_id: selectedRecord.id,
        items: selectedRecord.items.map(item => ({
          requisition_item_id: item.requisition_item_id,
          quantity: item.quantity,
          status: item.status
        }))
      });

      const allReceived = selectedRecord.items.every(item => item.status === 'received');
      
      setSnackbar({
        open: true,
        message: `Material in recorded (${allReceived ? 'Complete' : 'Partial'}) for Gate Pass ${selectedRecord.gate_pass_no}`,
        severity: 'success'
      });
      
      handleBackToList();
      fetchMaterialOutForIn();
      fetchMaterialIn();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to record material in',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize state from URL
  useEffect(() => {
    setActiveTab(urlTab);
    if (urlGatePass) {
      fetchGatePassDetails(urlGatePass);
    } else if (urlMovement) {
      if (urlTab === 'out') {
        fetchMaterialOutDetails(urlMovement);
      } else if (urlTab === 'in') {
        fetchMaterialInDetails(urlMovement);
      }
    }
  }, []);

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const newTab = queryParams.get('tab') || 'gatepasses';
      const newGatePass = queryParams.get('gatePass');
      const newMovement = queryParams.get('movement');
      
      setActiveTab(newTab);
      if (newGatePass) {
        fetchGatePassDetails(newGatePass);
      } else if (newMovement) {
        if (newTab === 'out') {
          fetchMaterialOutDetails(newMovement);
        } else if (newTab === 'in') {
          fetchMaterialInDetails(newMovement);
        }
      } else {
        setSelectedRecord(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch data when tab or search term changes
  useEffect(() => {
    if (activeTab === 'gatepasses') {
      fetchGatePasses();
    } else if (activeTab === 'out') {
      fetchMaterialOutForIn();
    } else if (activeTab === 'in') {
      fetchMaterialIn();
    }
  }, [activeTab, searchTerm]);

  // Render item rows based on active tab
  const renderItemRows = () => {
    if (!selectedRecord?.items) return null;
    
    return selectedRecord.items.map((item, index) => (
      <TableRow key={index}>
        {activeTab === 'out' && (
          <TableCell>
            <Checkbox
              checked={item.status === 'received'}
              onChange={(e) => {
                const updatedItems = [...selectedRecord.items];
                updatedItems[index].status = e.target.checked ? 'received' : 'pending';
                setSelectedRecord({...selectedRecord, items: updatedItems});
              }}
              color="primary"
              disabled={item.status === 'received'}
            />
          </TableCell>
        )}
        <TableCell>{item.item_code}</TableCell>
        <TableCell>{item.material_description}</TableCell>
        <TableCell>{item.quantity_requested || item.quantity}</TableCell>
        <TableCell>{item.unit}</TableCell>
        {(activeTab === 'gatepasses' || activeTab === 'in') && (
          <TableCell>
            <Chip 
              label={item.status || (item.out_recorded ? 'Recorded' : 'Pending')} 
              color={
                item.status === 'received' || item.out_recorded ? 'success' : 
                item.status === 'pending' ? 'warning' : 'default'
              } 
              size="small" 
            />
          </TableCell>
        )}
      </TableRow>
    ));
  };

  // Render action buttons based on active tab
  const renderActionButtons = () => {
    if (activeTab === 'gatepasses') {
      const hasOutRecorded = selectedRecord.items?.some(item => item.out_recorded);
      
      return (
        <Button
          variant="contained"
          color="primary"
          onClick={handleMaterialOut}
          disabled={loading || hasOutRecorded}
          startIcon={<ExitToApp />}
        >
          {hasOutRecorded ? 'Already Recorded' : 'Record Material Out'}
        </Button>
      );
    } else if (activeTab === 'out') {
      const hasReceivedItems = selectedRecord.items?.some(item => item.status === 'received');
      
      return (
        <Button
          variant="contained"
          color="success"
          onClick={handleMaterialIn}
          disabled={loading || !hasReceivedItems}
          startIcon={<CheckCircle />}
        >
          Record Material In
        </Button>
      );
    }
    return null;
  };

  // Render detail view based on active tab
  const renderDetailView = () => {
    if (!selectedRecord) return null;
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button 
            startIcon={<ArrowBack />} 
            onClick={handleBackToList}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h6">
            {activeTab === 'gatepasses' ? 'Gate Pass' : 
             activeTab === 'out' ? 'Material Out (Record In)' : 'Material In'} Details
          </Typography>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <div>
            <Typography variant="body2" color="textSecondary">Gate Pass No</Typography>
            <Typography>{selectedRecord.gate_pass_no}</Typography>
          </div>
          <div>
            <Typography variant="body2" color="textSecondary">PR Number</Typography>
            <Typography>{selectedRecord.pr_num}</Typography>
          </div>
          <div>
            <Typography variant="body2" color="textSecondary">Supplier</Typography>
            <Typography>{selectedRecord.supplier_name}</Typography>
          </div>
          <div>
            <Typography variant="body2" color="textSecondary">Vehicle No</Typography>
            <Typography>{selectedRecord.vehicle_num}</Typography>
          </div>
          <div>
            <Typography variant="body2" color="textSecondary">Document Type</Typography>
            <Typography>{selectedRecord.document_type}</Typography>
          </div>
          {activeTab !== 'gatepasses' && (
            <>
              <div>
                <Typography variant="body2" color="textSecondary">Movement Type</Typography>
                <Typography>{selectedRecord.movement_type}</Typography>
              </div>
              <div>
                <Typography variant="body2" color="textSecondary">Status</Typography>
                <Chip 
                  label={selectedRecord.status} 
                  color={
                    selectedRecord.status === 'completed' ? 'success' : 
                    selectedRecord.status === 'partial' ? 'warning' : 'default'
                  } 
                />
              </div>
            </>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>
          Items
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {activeTab === 'out' && <TableCell>Received</TableCell>}
                <TableCell>Item Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Unit</TableCell>
                {(activeTab === 'gatepasses' || activeTab === 'in') && <TableCell>Status</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {renderItemRows()}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          {renderActionButtons()}
        </Box>
      </Paper>
    );
  };

  // Render list view based on active tab
  const renderListView = () => {
    let data = [];
    let columns = [];
    
    if (activeTab === 'gatepasses') {
      data = gatePasses;
      columns = [
        { id: 'gate_pass_no', label: 'Gate Pass No' },
        { id: 'pr_num', label: 'PR Number' },
        { id: 'supplier_name', label: 'Supplier' },
        { id: 'vehicle_num', label: 'Vehicle No' },
        { id: 'document_type', label: 'Document Type' },
        { id: 'out_recorded', label: 'Material Out', format: (value) => (
          <Chip 
            label={value ? 'Recorded' : 'Pending'} 
            color={value ? 'success' : 'warning'} 
            size="small" 
          />
        )},
      ];
    } else if (activeTab === 'out') {
      data = materialOutForIn;
      columns = [
        { id: 'gate_pass_no', label: 'Gate Pass No' },
        { id: 'pr_num', label: 'PR Number' },
        { id: 'supplier_name', label: 'Supplier' },
        { id: 'vehicle_num', label: 'Vehicle No' },
        { id: 'movement_date', label: 'Out Date', format: (value) => new Date(value).toLocaleDateString() },
        { id: 'status', label: 'Status', format: (value) => (
          <Chip 
            label={value} 
            color={value === 'completed' ? 'success' : 'default'} 
            size="small" 
          />
        )},
      ];
    } else if (activeTab === 'in') {
      data = materialIn;
      columns = [
        { id: 'gate_pass_no', label: 'Gate Pass No' },
        { id: 'pr_num', label: 'PR Number' },
        { id: 'supplier_name', label: 'Supplier' },
        { id: 'vehicle_num', label: 'Vehicle No' },
        { id: 'movement_date', label: 'In Date', format: (value) => new Date(value).toLocaleDateString() },
        { id: 'status', label: 'Status', format: (value) => (
          <Chip 
            label={value} 
            color={value === 'completed' ? 'success' : 'warning'} 
            size="small" 
          />
        )},
      ];
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id}>{column.label}</TableCell>
              ))}
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id || row.gate_pass_no}>
                  {columns.map((column) => {
                    const value = row[column.id];
                    return (
                      <TableCell key={column.id}>
                        {column.format ? column.format(value) : value}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button onClick={() => {
                      if (activeTab === 'gatepasses') {
                        fetchGatePassDetails(row.gate_pass_no);
                      } else if (activeTab === 'out') {
                        fetchMaterialOutDetails(row.id);
                      } else if (activeTab === 'in') {
                        fetchMaterialInDetails(row.id);
                      }
                    }}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render the search section conditionally
  const renderSearchSection = () => {
    if (selectedRecord) return null; // Hide search when viewing details
    
    return (
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6">
          {activeTab === 'gatepasses' ? 'Gate Passes (Material Out)' :
           activeTab === 'out' ? 'Material Out (Record In)' : 'Material In Records'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder={`Search ${activeTab === 'gatepasses' ? 'Gate Pass' : 'Movement'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon />
            }}
            sx={{ width: 250 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (activeTab === 'gatepasses') fetchGatePasses();
              else if (activeTab === 'out') fetchMaterialOutForIn();
              else if (activeTab === 'in') fetchMaterialIn();
            }}
            startIcon={<SearchIcon />}
          >
            Search
          </Button>
        </Box>
      </Box>
    );
  };

  // Drawer content
  const drawer = (
    <Box sx={{ backgroundColor: colors.dark, color: colors.text, height: '100%', p: 2 }}>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
      <List>
        <ListItem disablePadding sx={ { marginTop: '50px'} }>
          <ListItemButton
            selected={activeTab === 'gatepasses'}
            onClick={() => handleTabChange('gatepasses')}
            sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ color: colors.text }}>
              <ExitToApp />
            </ListItemIcon>
            <ListItemText primary="Material Out" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === 'out'}
            onClick={() => handleTabChange('out')}
            sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ color: colors.text }}>
              <LocalShipping />
            </ListItemIcon>
            <ListItemText primary="Record Material In" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === 'in'}
            onClick={() => handleTabChange('in')}
            sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ color: colors.text }}>
              <Inventory />
            </ListItemIcon>
            <ListItemText primary="Material In Records" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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
        aria-label="mailbox folders"
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
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {renderSearchSection()}

        {selectedRecord ? renderDetailView() : renderListView()}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({...snackbar, open: false})}
          message={snackbar.message}
        />
      </Box>
    </Box>
  );
};

export default SecurityDashboard;