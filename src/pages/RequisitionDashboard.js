import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

const statusColors = {
  pending: 'default',
  approved: 'success',
  rejected: 'error',
  completed: 'info'
};

const RequisitionDashboard = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = JSON.parse(localStorage.getItem('user'))?.id;

  useEffect(() => {
    const fetchRequisitions = async () => {
      try {
        const response = await axios.get(`http://200.0.5.184:5000/api/requisitions/${userId}`);
        setRequisitions(response.data);
      } catch (error) {
        console.error('Error fetching requisitions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequisitions();
  }, [userId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        My Requisitions
      </Typography>
      
      {requisitions.length === 0 ? (
        <Typography variant="body1">No requisitions found</Typography>
      ) : (
        <Grid container spacing={3}>
          {requisitions.map((req) => (
            <Grid item xs={12} sm={6} md={4} key={req.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">{req.service_indent_no}</Typography>
                    <Chip 
                      label={req.status} 
                      color={statusColors[req.status] || 'default'} 
                      size="small" 
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Department: {req.department_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submitted: {new Date(req.requisition_date).toLocaleDateString()}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2">
                    Requested by: {req.requisitioned_by}
                  </Typography>
                  
                  <Box mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {new Date(req.updated_at || req.requisition_date).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default RequisitionDashboard;