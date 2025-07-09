
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
  Print as PrintIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MSLLogo from './MSL_Logo.png';
import UnitedLogo from './United_logo.png';

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
const date = new Date();

const NonReturnableChallan = ({ requisition }) => {
  if (!requisition) {
    return <Box>Loading challan...</Box>;
  }

  return (
    <div data-testid="challan" style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#fff',
      color: '#000',
      lineHeight: '1.5',
    }}>
      <div style={{ 
        width: '210mm', 
        margin: '0 auto',
        minHeight: '297mm',
        padding: '20mm',
        boxSizing: 'border-box',
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <img 
            src={MSLLogo} 
            alt="MSL Logo" 
            style={{ 
              width: '80px',
              height: 'auto',
              objectFit: 'contain'
            }} 
          />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ 
              marginLeft: '28px',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              MAHARASHTRA SEAMLESS LIMITED
            </h1>
            <h2 style={{ 
              marginTop: '-18px',
              fontSize: '17px'
            }}>
              D.P. JINDAL GROUP OF INDUSTRIES
            </h2>
            <p style={{ margin: '2px 0 0 0' 
              ,marginTop: '-10px'
            }}>
              Sreepuram, Narketpally, Nalgonda-508254, Telangana
            </p>
          </div>
          <img 
            src={UnitedLogo} 
            alt="United Logo" 
            style={{ 
              width: '100px',
              height: 'auto',
              objectFit: 'contain'
            }} 
          />
        </div>

        <h1 style={{ 
          textAlign: 'center', 
          margin: '20px 0 30px 0',
          fontSize: '22px',
          fontWeight: 'bold',
          textDecoration: 'underline'
        }}>
          {requisition.document_type === 'RGP' ? 'Returnable Gate Pass' : 'Non-Returnable Gate Pass'}
        </h1>

        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '30px'
        }}>
          <div style={{ width: '60%' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>To:</p>
            <p style={{ margin: '5px 0', minHeight: '20px' }}>
              {requisition.supplier_name || ''}
            </p>
            <p style={{ margin: '5px 0', minHeight: '20px' }}>
              {requisition.supplier_address || ''}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Gatepass No:</strong> {requisition.gate_pass_no || ''}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Date:</strong> {requisition.requisition_date ? new Date(requisition.requisition_date).toLocaleDateString() : ''}
            </p>
          </div>
        </div>

        <table style={{ 
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '30px',
          fontSize: '14px'
        }}>
          <thead>
            <tr>
              <th style={{ 
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5'
              }}>St. No</th>
              <th style={{ 
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5'
              }}>Particulars</th>
              <th style={{ 
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5'
              }}>Unit</th>
              <th style={{ 
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5'
              }}>Qty</th>
              <th style={{ 
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5'
              }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {requisition.items?.map((item, index) => (
              <tr key={index}>
                <td style={{ 
                  border: '1px solid #000',
                  padding: '8px',
                  textAlign: 'center'
                }}>{index + 1}</td>
                <td style={{ 
                  border: '1px solid #000',
                  padding: '8px'
                }}>{item.material_description}</td>
                <td style={{ 
                  border: '1px solid #000',
                  padding: '8px',
                  textAlign: 'center'
                }}>{item.unit}</td>
                <td style={{ 
                  border: '1px solid #000',
                  padding: '8px',
                  textAlign: 'center'
                }}>{item.quantity_requested}</td>
                <td style={{ 
                  border: '1px solid #000',
                  padding: '8px',
                  textAlign: 'center'
                }}>{item.remarks || '-'}</td>
              </tr>
            ))}
            {[...Array(Math.max(0, 10 - (requisition.items?.length || 0)))].map((_, index) => (
              <tr key={`empty-${index}`}>
                <td style={{ border: '1px solid #000', height: '40px' }}> </td>
                <td style={{ border: '1px solid #000' }}> </td>
                <td style={{ border: '1px solid #000' }}> </td>
                <td style={{ border: '1px solid #000' }}> </td>
                <td style={{ border: '1px solid #000' }}> </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '40px'
        }}>
          <div style={{ width: '60%' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Transport Details:</p>
            <p style={{ margin: '5px 0' }}>
              <strong>Through:</strong> {requisition.transporter_name || ''}
            </

p>
            <p style={{ margin: '5px 0' }}>
              <strong>Vehicle No:</strong> {requisition.vehicle_num || ''}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>L/R No:</strong> {requisition.lr_no || ''}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Date:</strong> {date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear()}
            </p>
          </div>
          <div style={{ width: '35%' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Received:</strong> 
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Date:</strong> {requisition.receive_date ? new Date(requisition.receive_date).toLocaleDateString() : ''}
            </p>
            <div style={{ 
              textAlign: 'center',
              paddingTop: '5px'
            }}>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Authorized By</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const observer = useRef();
  const containerRef = useRef();

  const handleReject = async () => {
  try {
    if (!selectedRequisition || !selectedRequisition.id) {
      setSnackbar({
        open: true,
        message: 'No requisition selected',
        severity: 'error',
      });
      return;
    }

    const response = await axios.put('http://localhost:5000/api/AdminReject', {
      requisitionId: selectedRequisition.id
    });

    console.log(response);

    setSnackbar({
      open: true,
      message: `Requisition ${selectedRequisition.pr_num} rejected successfully`,
      severity: 'success',
    });

    // Refresh the requisitions list
    fetchRequisitions(true);
    handleCloseDialog();
  } catch (err) {
    console.error('Error during the reject action:', err);
    setSnackbar({
      open: true,
      message: err.response?.data?.error || 'Failed to reject the requisition',
      severity: 'error',
    });
  }
};


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

  const handlePrint = async () => {
    if (!selectedRequisition) {
      setSnackbar({
        open: true,
        message: 'No requisition selected for printing',
        severity: 'error',
      });
      return;
    }

    try {
      selectedRequisition.challan_date =  
      // Update requisition status to 'higherauthapprove'
      await axios.put(`http://localhost:5000/api/requisitions/${selectedRequisition.id}/state`, {
        status: 'higherauthapprove',
        details: selectedRequisition
      });
      

      // Refresh requisitions list to reflect status change
      await fetchRequisitions(true);

      // Proceed with printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setSnackbar({
          open: true,
          message: 'Failed to open print window. Please allow pop-ups.',
          severity: 'error',
        });
        return;
      }

      const printContent = `
        <html>
          <head>
            <title>Print Challan - ${selectedRequisition.pr_num}</title>
            <style>
              @page { 
                size: A4; 
                margin: 10mm;
              }
              @media print {
                body { 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  margin: 0;
                  padding: 0;
                  font-family: Arial, sans-serif;
                  font-size: 14px;
                  color: #000;
                  background: #fff;
                }
                img {
                  max-width: 100px;
                  height: auto;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                }
                th, td {
                  border: 1px solid #000;
                  padding: 8px;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                  text-align: center;
                }
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 14px;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 0;
              }
              .challan-container {
                width: 210mm;
                margin: 0 auto;
                min-height: 297mm;
                padding: 20mm;
                box-sizing: 'border-box';
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
              }
              .header .company-info {
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 20px;
                font-weight: bold;
              }
              .header h2 {
                margin: 5px 0 0 0;
                font-size: 17px;
              }
              .header p {
                margin: 5px 0 0 0;
              }
              .title {
                text-align: center;
                margin: 20px 0 30px 0;
                font-size: 22px;
                font-weight: bold;
                text-decoration: underline;
              }
              .details {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
              }
              .details-left {
                width: 60%;
              }
              .details-right {
                text-align: right;
              }
              .details p {
                margin: 5px 0;
              }
              .table-container {
                margin-bottom: 30px;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
              }
              .footer-left {
                width: 60%;
              }
              .footer-right {
                width: 35%;
              }
              .footer-right .signature {
                margin-top: 30px;
                text-align: center;
                padding-top: 5px;
              }
            </style>
          </head>
          <body>
            <div class="challan-container">
              <div class="header">
                <img src="${MSLLogo}" alt="MSL Logo" style="width: 80px; height: auto; object-fit: contain;" />
                <div class="company-info">
                  <h1>MAHARASHTRA SEAMLESS LIMITED</h1>
                  <h2>D.P. JINDAL GROUP OF INDUSTRIES</h2>
                  <p>Sreepuram, Narketpally, Nalgonda-508254, Telangana</p>
                </div>
                <img src="${UnitedLogo}" alt="United Logo" style="width: 100px; height: auto; object-fit: contain;" />
              </div>

              <h1 class="title">
                ${selectedRequisition.document_type === 'RGP' ? 'Returnable Gate Pass' : 'Non-Returnable Gate Pass'}
              </h1>

              <div class="details">
                <div class="details-left">
                  <p style="font-weight: bold; margin-bottom: 5px;">To:</p>
                  <p style="margin: 5px 0; min-height: 20px;">${selectedRequisition.supplier_name || ''}</p>
                  <p style="margin: 5px 0; min-height: 20px;">${selectedRequisition.supplier_address || ''}</p>
                </div>
                <div class="details-right">
                  <p><strong>Gatepass No:</strong> ${selectedRequisition.gate_pass_no || ''}</p>
                  <p><strong>Date:</strong> ${selectedRequisition.requisition_date ? new Date(selectedRequisition.requisition_date).toLocaleDateString() : ''}</p>
                </div>
              </div>

              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>St. No</th>
                      <th>Particulars</th>
                      <th>Unit</th>
                      <th>Qty</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${selectedRequisition.items?.map((item, index) => `
                      <tr>
                        <td style="text-align: center;">${index + 1}</td>
                        <td>${item.material_description}</td>
                        <td style="text-align: center;">${item.unit}</td>
                        <td style="text-align: center;">${item.quantity_requested}</td>
                        <td style="text-align: center;">${item.remarks || '-'}</td>
                      </tr>
                    `).join('')}
                    ${[...Array(Math.max(0, 10 - (selectedRequisition.items?.length || 0)))].map((_, index) => `
                      <tr>
                        <td style="height: 40px;"> </td>
                        <td> </td>
                        <td> </td>
                        <td> </td>
                        <td> </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <div class="footer">
                <div class="footer-left">
                  <p style="font-weight: bold; margin-bottom: 5px;">Transport Details:</p>
                  <p><strong>Through:</strong> ${selectedRequisition.transporter_name || ''}</p>
                  <p><strong>Vehicle No:</strong> ${selectedRequisition.vehicle_num || ''}</p>
                  <p><strong>L/R No:</strong> ${selectedRequisition.lr_no || ''}</p>
                  <p><strong>Date:</strong> ${date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear()}</p>
                </div>
                <div class="footer-right">
                  <p><strong>Received:</strong></p>
                  <p><strong>Date:</strong> ${selectedRequisition.receive_date ? new Date(selectedRequisition.receive_date).toLocaleDateString() : ''}</p>
                  <div class="signature">
                    <p style="font-weight: bold;">Authorized By</p>
                  </div>
                </div>
              </div>
            </div>
            <script>
              window.onbeforeprint = () => console.log('Printing started');
              window.onafterprint = () => {
                console.log('Printing completed');
                window.close();
              };
              window.onload = () => {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      setSnackbar({
        open: true,
        message: `Requisition ${selectedRequisition.pr_num} approved and print window opened`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Error during print action:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to process print request',
        severity: 'error',
      });
    }
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
    console.log('Selected Requisition:', requisition);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRequisition(null);
  };

  const handleHigherApproval = async (status) => {

    try {
      await axios.put(`http://localhost:5000/api/requisitions/${selectedRequisition.id}/status`, {
        status,
        gatePassNo: selectedRequisition.gate_pass_no || '',
        documentType: selectedRequisition.document_type || 'RGP',
        fiscalYear: selectedRequisition.fiscal_year || new Date().getFullYear(),
        issuedBy: selectedRequisition.issued_by || '',
      });
      setSnackbar({
        open: true,
        message: `Requisition ${selectedRequisition.pr_num} ${status === 'higherauthapprove' ? 'approved' : status === 'rejected' ? 'rejected' : 'completed'} successfully!`,
        severity: 'success',
      });
      await fetchRequisitions(true);
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
                    <Divider sx={{ mb: 1 }} />
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
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="xl"
          fullWidth
          disableAutoFocus={false}
          disableEnforceFocus={false}
          sx={{
            '& .MuiDialog-paper': {
              width: '90%',
              maxWidth: '1200px',
              height: '90vh'
            }
          }}
        >
          <DialogTitle sx={{ 
            backgroundColor: colors.light, 
            borderBottom: `1px solid ${colors.secondary}`, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 2 
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Requisition Details - {selectedRequisition?.pr_num}
            </Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <Cancel />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ 
            p: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selectedRequisition ? (
              <Box sx={{
                overflowY: 'auto',
                flex: 1,
                p: 2
              }}>
                <NonReturnableChallan requisition={selectedRequisition} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ 
            p: 2, 
            borderTop: `1px solid ${colors.light}`,
            justifyContent: 'space-between'
          }}>
            <Button
              variant="outlined"
              onClick={handleCloseDialog}
              sx={{ 
                borderColor: colors.secondary, 
                color: colors.secondary,
                minWidth: '120px'
              }}
            >
              Cancel
            </Button>
            {selectedRequisition?.status === 'storeapprove' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleReject}
                  sx={{ 
                    backgroundColor: colors.danger, 
                    '&:hover': { backgroundColor: '#c9302c' },
                    minWidth: '120px'
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  sx={{ 
                    backgroundColor: colors.primary, 
                    '&:hover': { backgroundColor: '#085c9e' },
                    minWidth: '150px'
                  }}
                >
                  Print Challan
                </Button>
              </Box>
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