// Dashboard.js
import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  Divider,
  Avatar
} from '@mui/material';
import { 
  PostAdd as CreateIcon,
  ListAlt as RequisitionsIcon,
  Assignment as ReportIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const quickActions = [
    {
      title: 'Create Requisition',
      icon: <CreateIcon fontSize="large" color="primary" />,
      action: () => navigate('/create-requisition')
    },
    {
      title: 'My Requisitions',
      icon: <RequisitionsIcon fontSize="large" color="primary" />,
      action: () => navigate('/my-requisitions')
    },
    {
      title: 'Reports',
      icon: <ReportIcon fontSize="large" color="primary" />,
      action: () => navigate('/reports')
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user?.username}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Service Requisition Dashboard
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 3
                }
              }}
              onClick={action.action}
            >
              <CardContent sx={{ 
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.light', 
                  width: 56, 
                  height: 56,
                  mb: 2
                }}>
                  {action.icon}
                </Avatar>
                <Typography variant="h6" component="div">
                  {action.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        {/* Placeholder for recent activity */}
        <Box sx={{ 
          p: 3, 
          bgcolor: 'background.paper',
          borderRadius: 1,
          textAlign: 'center'
        }}>
          <Typography variant="body1" color="text.secondary">
            No recent activity
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => navigate('/create-requisition')}
        >
          Create New Requisition
        </Button>
      </Box>
    </Box>
  );
};

export default Dashboard;