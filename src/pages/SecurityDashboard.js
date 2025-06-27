import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import axios from 'axios';

const SecurityDashboard = () => {
  const [gatePassNo, setGatePassNo] = useState('');
  const [requisition, setRequisition] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/requisitions/verify/${gatePassNo}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setRequisition(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify gate pass');
      setRequisition(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Security Dashboard
      </Typography>
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Gate Pass Number"
          value={gatePassNo}
          onChange={(e) => setGatePassNo(e.target.value)}
          sx={{ mr: 2 }}
        />
        <Button variant="contained" onClick={handleVerify}>
          Verify
        </Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {requisition && (
        <Box>
          <Typography variant="h6">Requisition: {requisition.pr_num}</Typography>
          <Typography>Status: {requisition.status}</Typography>
          <Typography>Gate Pass: {requisition.gate_pass_no}</Typography>
          <Typography>Supplier: {requisition.supplier_name}</Typography>
          <Typography>Items: {requisition.items?.length}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default SecurityDashboard;