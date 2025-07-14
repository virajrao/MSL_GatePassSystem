import React, { useState,useEffect } from 'react';

import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Divider,
  Avatar,
  CircularProgress,
  Chip
} from '@mui/material';
import { 
  PostAdd as CreateIcon,
  ListAlt as RequisitionsIcon,
  AssignmentTurnedIn as CompletedIcon,
  ErrorOutline as RejectedIcon
} from '@mui/icons-material';
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

const statusColors = {
  pending: 'default',
  approved: 'success',
  rejected: 'error',
  completed: 'info',
  submitted: 'primary'
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentRequisitions, setRecentRequisitions] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, requisitionsRes] = await Promise.all([
          axios.get(`http://200.0.5.184:5000/api/dashboard/stats/${user?.id}`),
          axios.get(`http://200.0.5.184:5000/api/requisitions/recent/${user?.id}`)
        ]);
        
        setStats(statsRes.data);
        setRecentRequisitions(requisitionsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);



  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CompletedIcon color={statusColors[status]} />;
      case 'rejected': return <RejectedIcon color={statusColors[status]} />;
      default: return <RequisitionsIcon color={statusColors[status]} />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, backgroundColor: sapColors.background, minHeight: '100vh' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ 
          color: sapColors.primary,
          fontWeight: 600,
          mb: 1
        }}>
          Requisition Dashboard
        </Typography>
        <Typography variant="subtitle1" sx={{ color: sapColors.textLight }}>
          Welcome back, {user?.username}
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats && Object.entries(stats).map(([key, value]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Card sx={{ 
              borderLeft: `4px solid ${sapColors.primary}`,
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Typography>
                <Typography variant="h4" component="div">
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

  

      {/* Recent Requisitions */}
      <Typography variant="h6" sx={{ 
        mb: 3,
        color: sapColors.textDark,
        fontWeight: 500
      }}>
        Recent Requisitions
      </Typography>
      
      {recentRequisitions.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="textSecondary">
              No recent requisitions found
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {recentRequisitions.slice(0, 4).map((req) => (
            <Grid item xs={12} sm={6} md={3} key={req.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {req.purchase_number || req.service_indent_no}
                    </Typography>
                    <Chip 
                      icon={getStatusIcon(req.status)}
                      label={req.status}
                      color={statusColors[req.status] || 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 1, color: sapColors.textLight }}>
                    {req.description?.substring(0, 50)}{req.description?.length > 50 ? '...' : ''}
                  </Typography>
                  
                  <Typography variant="caption" display="block" sx={{ mt: 2, color: sapColors.textLight }}>
                    Submitted: {new Date(req.requisition_date).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;