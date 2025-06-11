import { Print } from "@mui/icons-material";
import  React from 'react';
import { 
  Box,  
  Typography, 
  Button, 
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
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
  Badge,
  Tabs,
  Tab,
  Paper
} from '@mui/material';



const PrintableGatePass = React.forwardRef(({ passData, requisition }, ref) => {
  return (
    <Box ref={ref} sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
      {/* Company Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {passData.documentType === 'RGP' ? 'RETURNABLE GATE PASS' : 'NON-RETURNABLE GATE PASS'}
        </Typography>
        <Typography variant="subtitle1">
          {passData.gatePassNo} • Fiscal Year: {passData.fiscalYear}
        </Typography>
      </Box>

      {/* Pass Details */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 2, 
        mb: 3,
        border: '1px solid #ddd',
        p: 2,
        borderRadius: 1
      }}>
        <Box>
          <Typography variant="body2"><strong>Issued To:</strong> {requisition.department_name}</Typography>
          <Typography variant="body2"><strong>Issued By:</strong> {passData.issuedBy}</Typography>
          <Typography variant="body2"><strong>Authorized By:</strong> {passData.authorizedBy}</Typography>
        </Box>
        <Box>
          <Typography variant="body2"><strong>Date:</strong> {new Date().toLocaleDateString()}</Typography>
          <Typography variant="body2"><strong>Reference:</strong> {requisition.service_indent_no}</Typography>
          <Typography variant="body2"><strong>Remarks:</strong> {passData.remarks || 'None'}</Typography>
        </Box>
      </Box>

      {/* Items Table */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Items Issued
        </Typography>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          border: '1px solid #ddd'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>S.No</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Quantity</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {requisition.items?.map((item, index) => (
              <tr key={index}>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{index + 1}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.material_description}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.quantity_requested}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      {/* Signatures */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 3, 
        mt: 4,
        pt: 2,
        borderTop: '1px dashed #ddd'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ mb: 6 }}>
            ________________________<br />
            Issued By
          </Typography>
          <Typography variant="body2">
            Name: {passData.issuedBy}<br />
            Date: {new Date().toLocaleDateString()}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ mb: 6 }}>
            ________________________<br />
            Received By
          </Typography>
          <Typography variant="body2">
            Name: ________________<br />
            Date: ________________
          </Typography>
        </Box>
      </Box>

      {/* Footer Note */}
      {passData.documentType === 'RGP' && (
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: '#fff8e1', 
          borderLeft: '4px solid #ffc107',
          fontSize: '0.8rem'
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>NOTE:</Typography>
          <Typography variant="body2">
            The above materials must be returned in good condition within 15 days from the date of issue.
            Failure to return materials may result in departmental charges.
          </Typography>
        </Box>
      )}
    </Box>
  );
});

export default PrintableGatePass;