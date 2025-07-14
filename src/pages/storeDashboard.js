import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  PendingActions,
  Description,
  Menu,
  CheckCircle,
  Cancel,
  Search as SearchIcon,
  Business,
  LocalShipping,
  DateRange,
  Person,
  VerifiedUser,
  Note,
  ConfirmationNumber,
  Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

const StoreDashboard = () => {
  const navigate = useNavigate();
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [passData, setPassData] = useState({
    gatePassNo: '',
    fiscalYear: new Date().getFullYear(),
    documentType: 'RGP',
    issuedBy: '',
    authorizedBy: '',
    remarks: '',
    transporterName: '',
    transporterGSTIN: '',
    ewaybillNo: '',
    uNo: '',
    physicalChallanNum: '',
    challanDate: new Date().toISOString().split('T')[0],
    transactionDate: new Date().toISOString().split('T')[0],
    buyerName: '',
    approvalAuthority: '',
    vehicleNum: '',
    supplierId: '',
    supplierName: '',
    supplierAddress: '',
    supplierGSTIN: '',
    supplierContact: '',
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [filter, setFilter] = useState({
    dateRange: 'all',
    page: 1,
    limit: 20,
    hasMore: true,
  });
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const observer = useRef();
  const containerRef = useRef();

  const generateGatePassNo = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `GP-${year}${month}-${randomNum}`;
  };

  const lastRequisitionRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && filter.hasMore) {
          setFilter((prev) => ({ ...prev, page: prev.page + 1 }));
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, filter.hasMore]
  );

  const fetchRequisitions = async (reset = false) => {
    try {
      reset ? setLoading(true) : setLoadingMore(true);
      setError(null);
      const params = {
        status: activeTab,
        dateRange: filter.dateRange !== 'all' ? filter.dateRange : undefined,
        search: searchTerm || undefined,
        page: reset ? 1 : filter.page,
        limit: filter.limit,
      };
      const response = await axios.get('http://200.0.5.184:5000/api/requisitionsdet', { params });
      if (reset) {
        setRequisitions(response.data);
      } else {
        setRequisitions((prev) => [...prev, ...response.data]);
      }
      setFilter((prev) => ({
        ...prev,
        hasMore: response.data.length === prev.limit,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch requisitions');
      console.error('Error fetching requisitions:', err);
    } finally {
      reset ? setLoading(false) : setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchRequisitions(true);
  }, [activeTab, filter.dateRange, searchTerm]);

  useEffect(() => {
    if (filter.page > 1) {
      fetchRequisitions();
    }
  }, [filter.page]);

  const fetchSuppliers = async (searchTerm = '') => {
    try {
      setSupplierLoading(true);
      const response = await axios.get('http://200.0.5.184:5000/api/sap/suppliers', {
        params: { search: searchTerm },
      });
      setSupplierOptions(response.data);
      setFilteredSuppliers(response.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setSnackbar({
        open: true,
        message: 'Failed to fetch suppliers',
        severity: 'error',
      });
    } finally {
      setSupplierLoading(false);
    }
  };

  const handleOpenSupplierDialog = () => {
    setOpenSupplierDialog(true);
    if (supplierOptions.length === 0) {
      fetchSuppliers();
    }
  };

  const handleSelectSupplier = (supplier) => {
    setPassData({
      ...passData,
      supplierId: supplier.id || '',
      supplierName: supplier.name || '',
      supplierAddress: supplier.address || '',
      supplierGSTIN: supplier.gstin || '',
      supplierContact: supplier.contact || '',
    });
    setOpenSupplierDialog(false);
  };

  const handleOpenDialog = async (requisition) => {
    try {
      setLoading(true);
      // Fetch full requisition details including gate pass info
      const response = await axios.get(`http://200.0.5.184:5000/api/requisitionsdet`, {
        params: { 
          status: activeTab,
          search: requisition.pr_num,
          limit: 1
        }
      });
      
      if (response.data.length === 0) {
        throw new Error('Requisition details not found');
      }

      const fullRequisition = response.data[0];
      setSelectedRequisition(fullRequisition);
      
      // Set pass data from requisition details
      setPassData({
        gatePassNo: fullRequisition.gate_pass_no || generateGatePassNo(),
        fiscalYear: fullRequisition.fiscal_year || new Date().getFullYear(),
        documentType: fullRequisition.document_type || 'RGP',
        issuedBy: fullRequisition.issued_by || localStorage.getItem('username') || '',
        authorizedBy: fullRequisition.authorized_by || '',
        remarks: fullRequisition.details_remarks || '',
        transporterName: fullRequisition.transporter_name || '',
        transporterGSTIN: fullRequisition.transporter_gstin || '',
        ewaybillNo: fullRequisition.ewaybill_no || '',
        uNo: fullRequisition.u_no || '',
        physicalChallanNum: fullRequisition.physical_challan_num || '',
        challanDate: fullRequisition.challan_date || new Date().toISOString().split('T')[0],
        transactionDate: fullRequisition.transaction_date || new Date().toISOString().split('T')[0],
        buyerName: fullRequisition.buyer_name || '',
        approvalAuthority: fullRequisition.approval_authority || '',
        vehicleNum: fullRequisition.vehicle_num || '',
        supplierId: fullRequisition.supplier_id || '',
        supplierName: fullRequisition.supplier_name || '',
        supplierAddress: fullRequisition.supplier_address || '',
        supplierGSTIN: fullRequisition.supplier_gstin || '',
        supplierContact: fullRequisition.supplier_contact || '',
      });
      
      setOpenDialog(true);
    } catch (error) {
      console.error('Error fetching requisition details:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load requisition details',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRequisition(null);
  };

  const handlePassDataChange = (e) => {
    const { name, value } = e.target;
    setPassData({
      ...passData,
      [name]: value || '',
    });
  };

  const handleSave = async () => {
    if (!selectedRequisition || !selectedRequisition.id) {
      setSnackbar({
        open: true,
        message: 'No requisition selected',
        severity: 'error',
      });
      return;
    }

    // Validate required fields
    const requiredFields = ['gatePassNo', 'documentType', 'fiscalYear', 'issuedBy'];
    const missingFields = requiredFields.filter((field) => !passData[field]);
    if (missingFields.length > 0) {
      setSnackbar({
        open: true,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        severity: 'error',
      });
      return;
    }

    try {
      const payload = {
        status: 'storeapprove',
        ...passData,
      };
      await axios.put(`http://200.0.5.184:5000/api/requisitions/${selectedRequisition.id}/status`, payload);
      setSnackbar({
        open: true,
        message: `Gate pass created successfully for Approval ${selectedRequisition.pr_num}!`,
        severity: 'success',
      });
      setRequisitions((prev) => prev.filter((req) => req.id !== selectedRequisition.id));
      handleCloseDialog();
    } catch (err) {
      console.error('Error approving requisition:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || err.response?.data?.details || 'Failed to create gate pass',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'storeapprove':
      case 'higherauthapprove':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'completed':
        return 'primary';
      default:
        return 'default';
    }
  };

  const drawer = (
    <Box sx={{ backgroundColor: colors.dark, color: colors.text, height: '100%', p: 2,
    marginTop:'50px'
     }}>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ color: colors.text }}>
              <PendingActions />
            </ListItemIcon>
            <ListItemText primary="Pending Requisitions" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === 'higherauthapprove'}
            onClick={() => setActiveTab('higherauthapprove')}
            sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ color: colors.text }}>
              <CheckCircle />
            </ListItemIcon>
            <ListItemText primary="Approved Requisitions" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === 'rejected'}
            onClick={() => setActiveTab('rejected')}
            sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ color: colors.text }}>
              <Cancel />
            </ListItemIcon>
            <ListItemText primary="Rejected Requisitions" />
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
            Store Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 , alignItems: 'center' }}>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={filter.dateRange}
                onChange={(e) => setFilter({ ...filter, dateRange: e.target.value, page: 1 })}
                label="Date Range"
              >
                <MenuItem value="all">All Dates</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
          </Box>
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
        ref={containerRef}
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: 10, sm: 10 },
          overflow: 'auto',
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
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              border: `1px dashed ${colors.secondary}`,
              borderRadius: 2,
              mt: 4,
            }}
          >
            <PendingActions sx={{ fontSize: 60, color: colors.secondary, mb: 2 }} />
            <Typography variant="h6" sx={{ color: colors.secondary }}>
              No {activeTab} requisitions found
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {requisitions.map((requisition, index) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                key={requisition.id}
                ref={index === requisitions.length - 1 ? lastRequisitionRef : null}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: `4px solid ${colors.primary}`,
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.02)', boxShadow: 3 },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {requisition.pr_num}
                      </Typography>
                      <Chip
                        label={requisition.status}
                        size="small"
                        color={getStatusColor(requisition.status)}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, color: colors.secondary }}>
                      Department: {requisition.department_code || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: colors.secondary }}>
                      Requested by: {requisition.requisitioned_by}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: colors.secondary }}>
                      Date: {new Date(requisition.requisition_date).toLocaleDateString()}
                    </Typography>
                    {requisition.gate_pass_no && (
                      <Typography variant="body2" sx={{ mb: 1, color: colors.secondary }}>
                        Gate Pass: {requisition.gate_pass_no}
                      </Typography>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Items ({requisition.items?.length || 0}):
                      </Typography>
                      <ul style={{ paddingLeft: '20px', margin: '8px 0', listStyleType: 'none', maxHeight: '120px', overflowY: 'auto' }}>
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
                      onClick={() => handleOpenDialog(requisition)}
                      sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: '#085c9e' } }}
                    >
                      {requisition.status === 'pending' ? 'Create' : 'View Details'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {loadingMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}
        <Dialog open={openSupplierDialog} onClose={() => setOpenSupplierDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ backgroundColor: colors.light, borderBottom: `1px solid ${colors.secondary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Select Supplier
            </Typography>
            <IconButton onClick={() => setOpenSupplierDialog(false)} size="small">
              <Cancel />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2 }}>
              {filteredSuppliers.length === 0 ? (
                <Typography variant="body1" sx={{ textAlign: 'center', p: 2 }}>
                  {supplierLoading ? 'Loading suppliers...' : 'No suppliers found'}
                </Typography>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Supplier ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>GSTIN</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSuppliers.map((supplier) => (
                        <TableRow
                          key={supplier.id}
                          onClick={() => handleSelectSupplier(supplier)}
                          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f0f7ff' } }}
                        >
                          <TableCell>{supplier.id}</TableCell>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell>{supplier.address}</TableCell>
                          <TableCell>{supplier.gstin}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setOpenSupplierDialog(false)}
              sx={{ borderColor: colors.secondary, color: colors.secondary }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { width: '100%', maxWidth: '800px' } }}>
          <DialogTitle sx={{ backgroundColor: colors.light, borderBottom: `1px solid ${colors.secondary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Requisition Details - {selectedRequisition?.pr_num}
            </Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <Cancel />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
                      <ConfirmationNumber sx={{ mr: 1 }} /> Header Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Gate Pass Number"
                          fullWidth
                          size="small"
                          name="gatePassNo"
                          value={passData.gatePassNo}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Assignment sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Document Type"
                          fullWidth
                          size="small"
                          name="documentType"
                          value={passData.documentType}
                          onChange={handlePassDataChange}
                          select
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Description sx={{ color: colors.secondary, mr: 1 }} /> }}
                        >
                          <MenuItem value="RGP">Returnable Gate Pass (RGP)</MenuItem>
                          <MenuItem value="NRGP">Non-Returnable Gate Pass (NRGP)</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Fiscal Year"
                          fullWidth
                          size="small"
                          name="fiscalYear"
                          value={passData.fiscalYear}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <DateRange sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Issued By"
                          fullWidth
                          size="small"
                          name="issuedBy"
                          value={passData.issuedBy}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Person sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Authorized By"
                          fullWidth
                          size="small"
                          name="authorizedBy"
                          value={passData.authorizedBy}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <VerifiedUser sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Buyer Name"
                          fullWidth
                          size="small"
                          name="buyerName"
                          value={passData.buyerName}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Person sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Approval Authority"
                          fullWidth
                          size="small"
                          name="approvalAuthority"
                          value={passData.approvalAuthority}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <VerifiedUser sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Requested By"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.requisitioned_by || ''}
                          disabled
                          InputProps={{ startAdornment: <Person sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Department"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.department_code || 'N/A'}
                          disabled
                          InputProps={{ startAdornment: <Business sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        <Business sx={{ mr: 1 }} /> Supplier Information
                      </Typography>
                      {selectedRequisition?.status === 'pending' && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<SearchIcon />}
                          onClick={handleOpenSupplierDialog}
                          sx={{ borderColor: colors.primary, color: colors.primary, '&:hover': { backgroundColor: '#f0f7ff', borderColor: colors.primary } }}
                        >
                          Select Supplier
                        </Button>
                      )}
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Supplier Name"
                          fullWidth
                          size="small"
                          name="supplierName"
                          value={passData.supplierName}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Business sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Supplier GSTIN"
                          fullWidth
                          size="small"
                          name="supplierGSTIN"
                          value={passData.supplierGSTIN}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <VerifiedUser sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Supplier Contact"
                          fullWidth
                          size="small"
                          name="supplierContact"
                          value={passData.supplierContact}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                            inputProps={{
                            maxLength: 10,
                          }}
                          InputProps={{ startAdornment: <Person sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Supplier Address"
                          fullWidth
                          size="small"
                          name="supplierAddress"
                          value={passData.supplierAddress}
                          onChange={handlePassDataChange}
                          multiline
                          rows={2}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Note sx={{ color: colors.secondary, mr: 1, alignSelf: 'flex-start' }} /> }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
                      <LocalShipping sx={{ mr: 1 }} /> Transport Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Transporter Name"
                          fullWidth
                          size="small"
                          name="transporterName"
                          value={passData.transporterName}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Business sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Transporter GSTIN"
                          fullWidth
                          size="small"
                          name="transporterGSTIN"
                          value={passData.transporterGSTIN}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                           inputProps={{
                            maxLength: 15,
                          }}
                          InputProps={{ startAdornment: <VerifiedUser sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Vehicle Number"
                          fullWidth
                          size="small"
                          name="vehicleNum"
                          value={passData.vehicleNum}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <LocalShipping sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="E-Way Bill No"
                          fullWidth
                          size="small"
                          name="ewaybillNo"
                          value={passData.ewaybillNo}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Description sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Service PO Number"
                          fullWidth
                          size="small"
                          name="uNo"
                          value={passData.uNo}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <ConfirmationNumber sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
                      <Description sx={{ mr: 1 }} /> Line Items
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>S.No</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Unit</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Approx. Cost</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedRequisition?.items?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{item.material_description}</TableCell>
                              <TableCell>{item.quantity_requested}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>{item.approx_cost || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
                      <Note sx={{ mr: 1 }} /> Additional Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Physical Challan Number"
                          fullWidth
                          size="small"
                          name="physicalChallanNum"
                          value={passData.physicalChallanNum}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Description sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Challan Date"
                          fullWidth
                          size="small"
                          name="challanDate"
                          type="date"
                          value={passData.challanDate}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <DateRange sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Transaction Date"
                          fullWidth
                          size="small"
                          name="transactionDate"
                          type="date"
                          value={passData.transactionDate}
                          onChange={handlePassDataChange}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <DateRange sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Remarks"
                          fullWidth
                          size="small"
                          name="remarks"
                          value={passData.remarks}
                          onChange={handlePassDataChange}
                          multiline
                          rows={2}
                          disabled={selectedRequisition?.status !== 'pending'}
                          InputProps={{ startAdornment: <Note sx={{ color: colors.secondary, mr: 1, alignSelf: 'flex-start' }} /> }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: `1px solid ${colors.light}` }}>
            <Button
              variant="outlined"
              onClick={handleCloseDialog}
              sx={{ borderColor: colors.secondary, color: colors.secondary }}
            >
              Close
            </Button>
            {selectedRequisition?.status === 'pending' && (
              <Button
                variant="contained"
                onClick={handleSave}
                sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: '#085c9e' } }}
              >
                Approve
              </Button>
            )}
          </DialogActions>
        </Dialog>
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

export default StoreDashboard;