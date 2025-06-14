import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, TextField, Button, Typography, Divider,
  CircularProgress, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow
} from '@mui/material';
import { Search, Check, Clear } from '@mui/icons-material';
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

const UserRequisition = () => {
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [prData, setPrData] = useState([]);
  const [validatedData, setValidatedData] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Load PR data from MySQL (which comes from SAP)
  useEffect(() => {
    const fetchPrData = async () => {
      setInitialLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/api/sap/purchreq');
        if (response.data && Array.isArray(response.data)) {
          setPrData(response.data);
          console.log('PR Data loaded from MySQL:', response.data.length, 'records');
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err) {
        console.error('Error loading PR data:', err);
        setError('Failed to load purchase requisition data from SAP');
      } finally {
        setInitialLoading(false);
      }
    };

    if (showForm) {
      fetchPrData();
    }
  }, [showForm]);


  const validatePurchaseNumber = useCallback(async () => {
    const trimmedNumber = purchaseNumber.trim();
    if (!trimmedNumber) {
      setError('Please enter a purchase number');
      return;
    }

    setLoading(true);
    setError(null);
    setValidatedData(null);

    try {
      // Call backend API to validate against database
      const response = await axios.get(`http://localhost:5000/api/validate-requisition/${trimmedNumber}`);
      
      if (response.data.exists) {
        setValidatedData(response.data.requisition);
        setSuccess(`Purchase requisition ${trimmedNumber} validated successfully!`);
      } else {
        setError(`Requisition ${trimmedNumber} not found in the system`);
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError(err.response?.data?.message || 'Error validating requisition');
    } finally {
      setLoading(false);
    }
  }, [purchaseNumber]);

  const handleSubmit = useCallback(async () => {
    if (!validatedData) {
      setError('Please validate a purchase number first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:5000/api/submit-requisition', {
        purchaseNumber: validatedData.purchaseNumber,
        purchaseItmNumber: validatedData.purchaseItmNumber,
        materialDescription: validatedData.description,
        plant: validatedData.plant,
        date: validatedData.date
      });

      if (response.data.success) {
        setSuccess(`Requisition ${validatedData.purchaseNumber} submitted successfully!`);
        setPurchaseNumber('');
        setValidatedData(null);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit requisition');
    } finally {
      setLoading(false);
    }
  }, [validatedData]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      validatePurchaseNumber();
    }
  };

  if (!showForm) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: sapColors.background
      }}>
        <Paper elevation={0} sx={{ 
          p: 4, 
          textAlign: 'center',
          border: `1px solid ${sapColors.border}`,
          borderRadius: 2,
          backgroundColor: 'white'
        }}>
          <Typography variant="h4" sx={{ mb: 3, color: sapColors.primary }}>
            SAP Requisition Portal
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowForm(true)}
            sx={{
              backgroundColor: sapColors.primary,
              '&:hover': { backgroundColor: '#085c9e' },
              padding: '10px 24px'
            }}
          >
            Create New Requisition
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 4, 
      minHeight: '100vh', 
      backgroundColor: sapColors.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <Paper elevation={0} sx={{ 
        width: '100%', 
        maxWidth: '800px', 
        p: 4,
        border: `1px solid ${sapColors.border}`,
        borderRadius: 2,
        backgroundColor: 'white'
      }}>
        <Typography variant="h4" sx={{ 
          mb: 3, 
          color: sapColors.primary,
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          SAP Requisition Validation
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: sapColors.textDark }}>
            Enter Purchase Requisition Number
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="e.g. 4500001234"
              value={purchaseNumber}
              onChange={(e) => setPurchaseNumber(e.target.value)}
              onKeyPress={handleKeyPress}
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
                '&:hover': { backgroundColor: '#085c9e' }
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Validate'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Clear sx={{ mr: 1 }} />
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Check sx={{ mr: 1 }} />
              {success}
            </Alert>
          )}
        </Box>

        {validatedData && (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: sapColors.textDark }}>
              Requisition Details
            </Typography>
            
            <TableContainer component={Paper} elevation={0} sx={{ 
              border: `1px solid ${sapColors.border}`,
              mb: 3
            }}>
              <Table>
                <TableHead sx={{ backgroundColor: sapColors.background }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(validatedData).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell>{key}</TableCell>
                      <TableCell>{value || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  minWidth: '180px',
                  backgroundColor: sapColors.primary,
                  '&:hover': { backgroundColor: '#085c9e' }
                }}
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  'Submit Requisition'
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