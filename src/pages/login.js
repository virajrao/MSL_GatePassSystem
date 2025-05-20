import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link
} from '@mui/material';
import { registerUser, loginUser } from '../api/authService';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Username required';
    if (!formData.password) newErrors.password = 'Password required';
    if (!isLogin && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    try {
      const response = await loginUser ({
        username: formData.username,
        password: formData.password
      });

      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate(`/`);

        if (response.data.user.role === 'store') {
          localStorage.setItem('store', JSON.stringify(response.data.user));
          navigate(`/`);
          navigate('/store-dashboard');
        }
        
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Login failed');
    }
  };

  const handleRegister = async () => {
    try {
      const response = await registerUser(formData);
      if (response.data.success) {
        alert('Registration successful!');
        setIsLogin(true);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    isLogin ? handleLogin() : handleRegister();
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f0f2f5'
    }}>
      <Paper elevation={3} sx={{ 
        p: 4, 
        width: 400,
        borderRadius: 2
      }}>
        <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
          {isLogin ? 'Login' : 'Register'}
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            error={!!errors.username}
            helperText={errors.username}
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            error={!!errors.password}
            helperText={errors.password}
            sx={{ mb: 2 }}
          />
          
          {!isLogin && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="store">Store</MenuItem>
                <MenuItem value="security">Security</MenuItem>
              </Select>
            </FormControl>
          )}
          
          <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            size="large"
            sx={{ 
              mt: 1,
              py: 1.5,
              backgroundColor: '#1976d2',
              '&:hover': { backgroundColor: '#1565c0' }
            }}
          >
            {isLogin ? 'Login' : 'Register'}
          </Button>
        </form>
        
        <Box sx={{ 
          mt: 3, 
          textAlign: 'center',
          color: 'text.secondary'
        }}>
          <Link 
            component="button" 
            onClick={() => setIsLogin(!isLogin)}
            sx={{ 
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {isLogin ? 
              'Create new account' : 
              'Already have an account? Sign in'}
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}