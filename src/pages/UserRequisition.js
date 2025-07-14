import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Paper, TextField, Button, Typography,
  CircularProgress, Alert, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  IconButton, CssBaseline, MenuItem, Select, FormControl, InputLabel,
  Snackbar
} from '@mui/material';
import { Search, Close, Refresh } from '@mui/icons-material';
import axios from 'axios';

const sapColors = {
  primary: '#0A6ED1',
  secondary: '#6A6D70',
  success: '#5CB85C',
  error: '#D9534F',
  background: '#F5F7FA',
  border: '#D9D9D9',
  textDark: '#32363A',
  textLight: '#6A6D70'
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

const UserRequisition = () => {
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatedData, setValidatedData] = useState(null);
  const [prRecords, setPrRecords] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isFetchingPr, setIsFetchingPr] = useState(false);
  
  // Notification states
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchPrRecords();
  }, []);

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({...prev, open: false}));
  };

  const fetchPrRecords = async () => {
    setIsFetchingPr(true);
    try {
      const response = await axios.get('http://200.0.5.184:5000/api/sap/purchreq');
      const records = response.data?.requisitions || [];
      
      const uniquePrRecords = records.reduce((acc, record) => {
        const existingPr = acc.find(pr => pr.requisition.pr_num === record.requisition.pr_num);
        if (!existingPr) {
          acc.push(record);
        }
        return acc;
      }, []);

      setPrRecords(uniquePrRecords);
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to fetch PR records', 'error');
    } finally {
      setIsFetchingPr(false);
    }
  };

  const validatePurchaseNumber = useCallback(async () => {
    const trimmedNumber = purchaseNumber.trim();
    if (!trimmedNumber) {
      showNotification('Please enter a valid purchase number', 'error');
      return;
    }

    setLoading(true);
    setValidatedData(null);

    try {
      const response = await axios.get(
        `http://200.0.5.184:5000/api/validate-requisition/${trimmedNumber}`
      );
      
      if (response.data?.exists) {
        setValidatedData({
          ...response.data.requisition,
          items: response.data.items || [],
          date: formatDate(response.data.requisition?.requisition_date)
        });
      } else {
        showNotification(`Requisition ${trimmedNumber} not found in the system`, 'error');
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error validating requisition', 'error');
    } finally {
      setLoading(false);
    }
  }, [purchaseNumber]);

  const handleSubmit = useCallback(async () => {
    if (!validatedData || !validatedData.items?.length) {
      showNotification('No items to submit', 'error');
      return;
    }
    
    setLoading(true);

    try {
      const requestBody = {
        requisition: {
          pr_num: validatedData.pr_num,
          department_id: validatedData.department_id,
          department_code: validatedData.department_code,
          requisitioned_by: validatedData.requisitioned_by || "Current User",
          requisition_date: validatedData.requisition_date,
          status: 'pending',
          remarks: validatedData.remarks || 'Submitted from frontend',
          pr_type: validatedData.pr_type || 'standard'
        },
        items: validatedData.items.map(item => ({
          pr_num: validatedData.pr_num,
          item_code: item.item_code,
          pr_itm_num: item.pr_itm_num,
          quantity_requested: item.quantity_requested,
          unit: item.unit,
          approx_cost: item.approx_cost,
          material_description: item.material_description,
          currency: item.currency,
          approxdateofret: item.approxdateofret,
          status: 'pending'
        }))
      };

      const response = await axios.post(
        'http://200.0.5.184:5000/api/submit-pr',
        requestBody
      );

      if (response.data?.success) {
        showNotification(
          `Submitted PR #${validatedData.pr_num} with ${validatedData.items.length} items successfully`, 
          'success'
        );
        // Clear selection
        setPurchaseNumber('');
        setValidatedData(null);
        await fetchPrRecords();
      } else if (response.data?.error?.includes('already exist')) {
        showNotification(
          response.data.error,
          'error'
        );
        // Clear selection on duplicate error
        setPurchaseNumber('');
        setValidatedData(null);
      } else {
        throw new Error(response.data?.error || 'Submission failed');
      }
    } catch (err) {
      showNotification(err.response?.data?.error || err.message || 'Failed to submit requisition', 'error');
    } finally {
      setLoading(false);
    }
  }, [validatedData]);

  const handlePrClick = async (prNum) => {
    setPurchaseNumber(prNum);
    setLoading(true);
    
    try {
      const response = await axios.get(
        `http://200.0.5.184:5000/api/validate-requisition/${prNum}`
      );
      
      if (response.data?.exists) {
        setValidatedData({
          ...response.data.requisition,
          items: response.data.items || [],
          date: formatDate(response.data.requisition?.requisition_date)
        });
      } else {
        showNotification(`Requisition ${prNum} details not found`, 'error');
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error fetching requisition details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = filterStatus === 'all' 
    ? prRecords 
    : prRecords.filter(record => record.requisition.status === filterStatus);

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: sapColors.background,
      p: 2
    }}>
      <CssBaseline />
      
      {/* Top Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity={notification.severity}
          sx={{ width: '100%' }}
          onClose={handleCloseNotification}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <Paper elevation={3} sx={{
        width: '100%',
        maxWidth: '1200px',
        p: 4,
        borderRadius: 2,
        backgroundColor: 'white'
      }}>
        <Typography variant="h5" sx={{ 
          mb: 3,
          color: sapColors.primary,
          fontWeight: '600',
          textAlign: 'center'
        }}>
          Purchase Requisition Management
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">PR Records from SAP</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchPrRecords}
                disabled={isFetchingPr}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ 
            border: `1px solid ${sapColors.border}`,
            mb: 3,
            maxHeight: 400,
            overflow: 'auto'
          }}>
            <Table stickyHeader sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: '600' }}>PR Number</TableCell>
                  <TableCell sx={{ fontWeight: '600' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: '600' }}>Requested By</TableCell>
                  <TableCell sx={{ fontWeight: '600' }}>Date</TableCell>
                
                  <TableCell sx={{ fontWeight: '600' }}>Items Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetchingPr ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No PR records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow 
                      key={record.requisition.pr_num}
                      hover
                      onClick={() => handlePrClick(record.requisition.pr_num)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{record.requisition.pr_num}</TableCell>
                      <TableCell>{record.requisition.department_code}</TableCell>
                      <TableCell>{record.requisition.requisitioned_by}</TableCell>
                      <TableCell>{formatDate(record.requisition.requisition_date)}</TableCell>
                     
                      <TableCell>{record.items?.length || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Typography variant="h6" sx={{ 
          mb: 3,
          color: sapColors.primary,
          fontWeight: '500'
        }}>
          {validatedData ? `PR Details: ${validatedData.pr_num}` : 'Submit New Requisition'}
        </Typography>

        {!validatedData && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter purchase number (e.g. PR-2023-00123)"
                value={purchaseNumber}
                onChange={(e) => setPurchaseNumber(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Search sx={{ color: sapColors.textLight, mr: 1 }} />
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: sapColors.border,
                    },
                    '&:hover fieldset': {
                      borderColor: sapColors.primary,
                    },
                  }
                }}
              />
              
              <Button
                variant="contained"
                onClick={validatePurchaseNumber}
                disabled={loading || !purchaseNumber.trim()}
                sx={{
                  minWidth: '120px',
                  backgroundColor: sapColors.primary,
                  '&:hover': { backgroundColor: '#085c9e' },
                  textTransform: 'none'
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Validate'}
              </Button>
            </Box>
          </Box>
        )}

        {validatedData && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                PR: {validatedData.pr_num} | Items: {validatedData.items?.length || 0}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setValidatedData(null);
                  setPurchaseNumber('');
                }}
                sx={{
                  textTransform: 'none'
                }}
              >
                Back to Search
              </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ 
              border: `1px solid ${sapColors.border}`,
              mb: 3,
              overflowX: 'auto'
            }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ backgroundColor: sapColors.background }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: '600' }}>Item #</TableCell>
                    <TableCell sx={{ fontWeight: '600' }}>Material</TableCell>
                    <TableCell sx={{ fontWeight: '600' }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: '600' }}>Unit</TableCell>
                    <TableCell sx={{ fontWeight: '600' }}>Cost</TableCell>
                    <TableCell sx={{ fontWeight: '600' }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validatedData.items?.map((item) => (
                    <TableRow key={`${validatedData.pr_num}-${item.pr_itm_num}`}>
                      <TableCell>{item.pr_itm_num}</TableCell>
                      <TableCell>{item.item_code}</TableCell>
                      <TableCell>{item.quantity_requested}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.approx_cost} {item.currency}</TableCell>
                      <TableCell>{item.material_description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setValidatedData(null);
                  setPurchaseNumber('');
                }}
                sx={{
                  textTransform: 'none'
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  minWidth: '180px',
                  backgroundColor: sapColors.primary,
                  '&:hover': { backgroundColor: '#085c9e' },
                  textTransform: 'none'
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  `Submit ${validatedData.items?.length || 0} Items`
                )}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default UserRequisition;