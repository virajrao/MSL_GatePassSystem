import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  AppBar, 
  Toolbar, 
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Typography,
  Button,
  ButtonGroup,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ListAlt from '@mui/icons-material/ListAlt';
import ExitToApp from '@mui/icons-material/ExitToApp';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AppsIcon from '@mui/icons-material/Apps';
import { styled } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ApprovalIcon from '@mui/icons-material/Approval';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import RecentActorsIcon from '@mui/icons-material/RecentActors';
import StarBorderIcon from '@mui/icons-material/StarBorder';

const drawerWidth = 240;

// Enhanced SAP Fiori styles
const SAPAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#fff',
  color: '#32363A',
  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
  borderBottom: '1px solid #D9D9D9',
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}));

const SAPAvatar = styled(Avatar)({
  backgroundColor: '#0A6ED1',
  color: '#fff',
  width: 32,
  height: 32,
  fontSize: '0.875rem',
  fontWeight: 500
});

const SAPListItem = styled(ListItem)({
  padding: '8px 16px',
  '&:hover': {
    backgroundColor: '#E5F1FB'
  },
  '&.Mui-selected': {
    backgroundColor: '#E5F1FB',
    borderLeft: '3px solid #0A6ED1',
    '& .MuiListItemIcon-root': {
      color: '#0A6ED1'
    }
  }
});

const HeaderButton = styled(Button)(({ theme, selected }) => ({
  textTransform: 'none',
  fontWeight: selected ? 600 : 400,
  color: selected ? '#0A6ED1' : '#32363A',
  borderBottom: selected ? '2px solid #0A6ED1' : '2px solid transparent',
  borderRadius: 0,
  padding: '6px 16px',
  minWidth: 'auto',
  '&:hover': {
    backgroundColor: '#E5F1FB'
  }
}));

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')) || { username: 'User' };
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Check if current route is security dashboard
  const isSecurityDashboard = location.pathname === '/security-dashboard';

  // Mock data for notifications
  const notifications = [
    { id: 1, text: 'Requisition #4567 needs approval', time: '2h ago', read: false },
    { id: 2, text: 'New comment on PR #8901', time: '1d ago', read: true }
  ];

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const drawer = (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#F5F6F8'
    }}>
      <Toolbar sx={{ 
        minHeight: '64px !important',
        borderBottom: '1px solid #D9D9D9',
        bgcolor: '#FFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="https://www.sap.com/dam/application/shared/logos/sap-logo-svg.svg" 
            alt="SAP Logo" 
            style={{ height: 24 }} 
          />
          <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 600 }}>
            Requisition Portal
          </Typography>
        </Box>
      </Toolbar>
      
      {/* User Profile Quick View */}
      <Box sx={{ p: 2, borderBottom: '1px solid #D9D9D9', bgcolor: '#FFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SAPAvatar sx={{ width: 40, height: 40, mr: 1.5 }}>
            {user.username.charAt(0).toUpperCase()}
          </SAPAvatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {user.username}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {user.role || 'Procurement User'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Navigation */}
      <List sx={{ flexGrow: 1, pt: 0 }}>
        <SAPListItem 
          button 
          onClick={() => navigate('/Dashboard')}
          selected={isActive('/')}
        >
          <ListItemIcon sx={{ minWidth: '36px' }}>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Dashboard" 
            primaryTypographyProps={{ variant: 'body2', fontWeight: isActive('/') ? 600 : 400 }}
          />
        </SAPListItem>
        
        <SAPListItem 
          button 
          onClick={() => navigate('/create-requisition')}
          selected={isActive('/create-requisition')}
        >
          <ListItemIcon sx={{ minWidth: '36px' }}>
            <PostAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Create Requisition" 
            primaryTypographyProps={{ variant: 'body2', fontWeight: isActive('/create-requisition') ? 600 : 400 }}
          />
        </SAPListItem>
      </List>
      
      {/* System Section */}
      <Box sx={{ p: 2, borderTop: '1px solid #D9D9D9' }}>
       
        
        <Typography variant="caption" color="textSecondary" sx={{ pl: 2, display: 'block', mt: 1 }}>
          SAP Requisition Portal v2.1
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Header - Always shown */}
      <SAPAppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ minHeight: '64px !important' }}>
          {!isSecurityDashboard && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { sm: 'none' },
                color: '#32363A'
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          {/* Navigation Buttons */}
          <Box sx={{ 
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            flexGrow: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src="https://www.sap.com/dam/application/shared/logos/sap-logo-svg.svg" 
                alt="SAP Logo" 
                style={{ height: 24 }} 
              />
              <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 600 }}>
                RGP/NRGP System
              </Typography>
            </Box>
          </Box>
          
          {/* Right side icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            
            
           
            
            
            {/* User menu */}
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SAPAvatar sx={{ width: 32, height: 32 }}>
                  {user.username.charAt(0).toUpperCase()}
                </SAPAvatar>
                <Typography variant="body2" sx={{ ml: 1, display: { xs: 'none', md: 'block' } }}>
                  {user.username}
                </Typography>
              </Box>
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                elevation: 1,
                sx: {
                  mt: 1,
                  minWidth: 200,
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }
              }}
            >
              <MenuItem dense disabled>
                <Typography variant="body2" color="textSecondary">
                  Signed in as <strong>{user.username}</strong>
                </Typography>
              </MenuItem>
              <Divider />
             
              
             
             
              <MenuItem onClick={handleLogout} dense>
                <ListItemIcon sx={{ minWidth: '36px' }}>
                  <ExitToApp fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Sign Out" 
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </SAPAppBar>

      {/* Sidebar Drawer - Only shown when not on security dashboard */}
      {!isSecurityDashboard && (
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="navigation"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
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
      )}

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: isSecurityDashboard ? '100%' : `calc(100% - ${drawerWidth}px)` },
          bgcolor: '#F5F6F8',
          height: '100vh',
          overflow: 'auto'
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;