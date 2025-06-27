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
  InputLabel,
  Select,
  MenuItem,
  Paper,
  FormControl
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
  Gavel,
  Assignment
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
  dark: '#0A6ED1', // Professional dark navy for sidebar
  background: '#F7F7F7',
  text: '#FFFFFF',
};

const drawerWidth = 240;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [activeTab, setActiveTab] = useState('storeapprove');
  const [filter, setFilter] = useState({
    dateRange: 'all',
    page: 1,
    limit: 20,
    hasMore: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const observer = useRef();
  const containerRef = useRef();

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
      const response = await axios.get('http://localhost:5000/api/requisitionsdet', { params });
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

  const handleOpenDialog = (requisition) => {
    setSelectedRequisition(requisition);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRequisition(null);
  };

  const handleHigherApproval = async (status) => {
    try {
      await axios.put(`http://localhost:5000/api/requisitions/${selectedRequisition.id}/higher-approval`, { status });
      setSnackbar({
        open: true,
        message: `Requisition ${selectedRequisition.pr_num} ${status === 'higherauthapprove' ? 'approved' : status === 'rejected' ? 'rejected' : 'completed'} successfully!`,
        severity: 'success',
      });
      setRequisitions((prev) => prev.filter((req) => req.id !== selectedRequisition.id));
      handleCloseDialog();
    } catch (err) {
      console.error('Error updating higher approval:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to update requisition status',
        severity: 'error',
      });
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

  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ backgroundColor: colors.dark, color: colors.text, height: '100%', p: 2 }}>
      <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
        Admin Approval
      </Typography>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === 'storeapprove'}
            onClick={() => setActiveTab('storeapprove')}
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
            Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
              No {activeTab === 'storeapprove' ? 'pending' : activeTab === 'higherauthapprove' ? 'approved' : 'rejected'} requisitions found
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
                      View Details
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
                          value={selectedRequisition?.gate_pass_no || ''}
                          disabled
                          InputProps={{ startAdornment: <Assignment sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Document Type"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.document_type || ''}
                          disabled
                          InputProps={{ startAdornment: <Description sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Fiscal Year"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.fiscal_year || ''}
                          disabled
                          InputProps={{ startAdornment: <DateRange sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Issued By"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.issued_by || ''}
                          disabled
                          InputProps={{ startAdornment: <Person sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Authorized By"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.authorized_by || ''}
                          disabled
                          InputProps={{ startAdornment: <VerifiedUser sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Buyer Name"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.buyer_name || ''}
                          disabled
                          InputProps={{ startAdornment: <Person sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Approval Authority"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.approval_authority || ''}
                          disabled
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
                      <Business sx={{ mr: 1 }} /> Supplier Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Supplier Name"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.supplier_name || ''}
                          disabled
                          InputProps={{ startAdornment: <Business sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Supplier GSTIN"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.supplier_gstin || ''}
                          disabled
                          InputProps={{ startAdornment: <VerifiedUser sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Supplier Contact"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.supplier_contact || ''}
                          disabled
                          InputProps={{ startAdornment: <Person sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Supplier Address"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.supplier_address || ''}
                          disabled
                          multiline
                          rows={2}
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
                          value={selectedRequisition?.transporter_name || ''}
                          disabled
                          InputProps={{ startAdornment: <Business sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Transporter GSTIN"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.transporter_gstin || ''}
                          disabled
                          InputProps={{ startAdornment: <VerifiedUser sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          label="Vehicle Number"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.vehicle_num || ''}
                          disabled
                          InputProps={{ startAdornment: <LocalShipping sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="E-Way Bill No"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.ewaybill_no || ''}
                          disabled
                          InputProps={{ startAdornment: <Description sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="U No"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.u_no || ''}
                          disabled
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display_access: 'flex', alignItems: 'center' }}>
                      <Note sx={{ mr: 1 }} /> Additional Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Physical Challan Number"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.physical_challan_num || ''}
                          disabled
                          InputProps={{ startAdornment: <Description sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Challan Date"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.challan_date || ''}
                          disabled
                          InputProps={{ startAdornment: <DateRange sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Transaction Date"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.transaction_date || ''}
                          disabled
                          InputProps={{ startAdornment: <DateRange sx={{ color: colors.secondary, mr: 1 }} /> }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Remarks"
                          fullWidth
                          size="small"
                          value={selectedRequisition?.details_remarks || ''}
                          disabled
                          multiline
                          rows={2}
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
              Cancel
            </Button>
            {selectedRequisition?.status === 'storeapprove' && (
              <>
                <Button
                  variant="contained"
                  onClick={() => handleHigherApproval('higherauthapprove')}
                  sx={{ backgroundColor: colors.success, '&:hover': { backgroundColor: '#4a9b4a' }, mr: 1 }}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleHigherApproval('rejected')}
                  sx={{ backgroundColor: colors.danger, '&:hover': { backgroundColor: '#c9302c' }, mr: 1 }}
                >
                  Reject
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleHigherApproval('completed')}
                  sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: '#085c9e' } }}
                >
                  Complete
                </Button>
              </>
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

export default AdminDashboard;