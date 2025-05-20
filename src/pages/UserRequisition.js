import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TextField, 
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  FormControlLabel,
  InputAdornment
} from '@mui/material';
import { AddCircle, RemoveCircle, Search } from '@mui/icons-material';
import axios from 'axios';

const sapColors = {
  primary: '#0A6ED1',
  headerBg: '#F5F5F5',
  border: '#D9D9D9',
  textDark: '#32363A',
  textLight: '#6A6D70',
  valueHelp: {
    headerBg: '#f5f7fa',
    rowHover: '#e6f2fa',
    rowSelected: '#d1e9ff'
  }
};

const generateServiceIndentNo = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `SR-${year}${month}-${randomNum}`;
};

const validateDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date >= today;
};

const UserRequisition = () => {
  const [formData, setFormData] = useState({
    serviceIndentNo: generateServiceIndentNo(),
    department: '',
    items: [{
      itemCode: '',
      materialDescription: '',
      unit: '',
      quantityReq: '',
      stockInStore: '',
      approxCost: '',
      remarks: '',
      approxdateofreturn: ''
    }],
    requisitionedBy: '',
    effectiveDate: new Date().toISOString().split('T')[0]
  });

  const [departments, setDepartments] = useState([]);
  const [materialCodes, setMaterialCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTypeDialog, setShowTypeDialog] = useState(true);
  const [requisitionType, setRequisitionType] = useState('withCode');
  const [errors, setErrors] = useState({
    approxdateofreturn: []
  });

  // Value help dialog states
  const [valueHelpOpen, setValueHelpOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [filteredMaterials, setFilteredMaterials] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch departments
        const deptResponse = await axios.get('http://localhost:5000/api/departments');
        setDepartments(deptResponse.data);

        // Fetch products from SAP
        const productsResponse = await axios.get('http://localhost:5000/api/sap/products');
        
        // Transform data to only use code and unit
        const materials = productsResponse.data.products.map(p => ({
          code: p.code || '',
          desc: p.desc || 'EA',
          uom: p.uom || 'EA',
        }));
        
        setMaterialCodes(materials);
        setFilteredMaterials(materials);
      } catch (error) {
        console.error('Initialization error:', error);
        alert(`Failed to initialize: ${error.response?.data?.error || error.message}`);
      }
    };
    fetchInitialData();
  }, []);

  // Filter materials based on search term (only searches code now)
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredMaterials(materialCodes);
    } else {
      const filtered = materialCodes.filter(material => 
        material.code?.toLowerCase().includes(searchTerm.toLowerCase()) || false
      );
      setFilteredMaterials(filtered);
    }
  }, [searchTerm, materialCodes]);

  const handleTypeSelection = () => {
    const initialItem = requisitionType === 'withCode' 
      ? {
          itemCode: '',
          materialDescription: '',
          quantityReq: '',
          unit: '',
          approxCost: '',
          approxdateofreturn: '',
          remarks: ''
        }
      : {
          materialDescription: '',
          quantityReq: '',
          unit: '',
          approxCost: '',
          approxdateofreturn: '',
          remarks: ''
        };
    
    setFormData({
      ...formData,
      items: [initialItem]
    });
    setShowTypeDialog(false);
    setErrors({ approxdateofreturn: [] });
  };

  const handleChange = (e, index) => {
    const { name, value } = e.target;
    
    if (name.startsWith('items.approxdateofreturn')) {
      const newErrors = [...errors.approxdateofreturn];
      newErrors[index] = [];
      setErrors({...errors, approxdateofreturn: newErrors});
    }

    if (name.startsWith('items')) {
      const items = [...formData.items];
      const fieldName = name.split('.')[1];
      items[index][fieldName] = value;
      
      setFormData({...formData, items});
    } else {
      setFormData({...formData, [name]: value});
    }
  };

  const addItemRow = () => {
    const newItem = requisitionType === 'withCode' 
      ? {
          itemCode: '',
          materialDescription: '',
          quantityReq: '',
          unit: '',
          approxCost: '',
          approxdateofreturn: '',
          remarks: ''
        }
      : {
          materialDescription: '',
          quantityReq: '',
          unit: '',
          approxCost: '',
          approxdateofreturn: '',
          remarks: ''
        };
    
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });
    setErrors({
      ...errors,
      approxdateofreturn: [...errors.approxdateofreturn, []]
    });
  };

  const removeItemRow = (index) => {
    if (formData.items.length > 1) {
      const newItems = [...formData.items];
      newItems.splice(index, 1);
      setFormData({...formData, items: newItems});
      
      const newErrors = [...errors.approxdateofreturn];
      newErrors.splice(index, 1);
      setErrors({...errors, approxdateofreturn: newErrors});
    }
  };

  const validateForm = () => {
    const dateErrors = [];
    let isValid = true;

    formData.items.forEach((item, index) => {
      if (!item.approxdateofreturn) {
        dateErrors[index] = ['Date is required'];
        isValid = false;
      } else if (!validateDate(item.approxdateofreturn)) {
        dateErrors[index] = ['Please enter a valid future date in YYYY-MM-DD format'];
        isValid = false;
      } else {
        dateErrors[index] = [];
      }
    });

    setErrors({...errors, approxdateofreturn: dateErrors});
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.department) {
      alert('Please select a department');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/requisitions', {
        serviceIndentNo: formData.serviceIndentNo,
        department: formData.department,
        items: formData.items,
        requisitionedBy: formData.requisitionedBy,
        userId: JSON.parse(localStorage.getItem('user')).id,
        requisitionType: requisitionType
      });
      
      if (response.data.success) {
        alert(`Requisition ${formData.serviceIndentNo} submitted successfully!`);
        setFormData({
          serviceIndentNo: generateServiceIndentNo(),
          department: '',
          items: [requisitionType === 'withCode' 
            ? {
                itemCode: '',
                materialDescription: '',
                unit: '',
                quantityReq: '',
                stockInStore: '',
                approxCost: '',
                remarks: '',
                approxdateofreturn: ''
              }
            : {
                materialDescription: '',
                unit: '',
                quantityReq: '',
                stockInStore: '',
                approxCost: '',
                remarks: '',
                approxdateofreturn: ''
              }],
          requisitionedBy: '',
          effectiveDate: new Date().toISOString().split('T')[0]
        });
        setErrors({ approxdateofreturn: [] });
      }
    } catch (error) {
      console.error('Submission error:', error);
      console.log(error);
      alert(error.response?.data?.message || 'Failed to submit requisition');
    } finally {
      setLoading(false);
    }
  };

  const ValueHelpDialog = () => (
    <Dialog 
      open={valueHelpOpen} 
      onClose={() => setValueHelpOpen(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { height: '60vh' } }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Select Material</Typography>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: '300px' }}
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <TableContainer sx={{ maxHeight: '100%' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Material Code</TableCell>
                <TableCell>Material Desc</TableCell>
                <TableCell>Material_UOM</TableCell>
                <TableCell>Select</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => (
                  <TableRow 
                    key={material.code}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: sapColors.valueHelp.rowHover }
                    }}
                  >
                    <TableCell>{material.code}</TableCell>
                    <TableCell>{material.desc}</TableCell>
                    <TableCell>{material.uom}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          const updatedItems = [...formData.items];
                          updatedItems[selectedItemIndex] = {
                            ...updatedItems[selectedItemIndex],
                            itemCode: material.code,
                            materialDescription: material.desc,
                            unit: material.uom,  
                          };
                          setFormData({...formData, items: updatedItems});
                          setValueHelpOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No materials found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setValueHelpOpen(false);
          setSearchTerm('');
        }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderItemCodeCell = (item, index) => (
    <TableCell>
      <TextField
        name={`items.itemCode`}
        value={item.itemCode}
        onClick={() => {
          setSelectedItemIndex(index);
          setValueHelpOpen(true);
        }}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItemIndex(index);
                  setValueHelpOpen(true);
                }}
                edge="end"
              >
                <Search />
              </IconButton>
            </InputAdornment>
          ),
        }}
        fullWidth
        required
        size="small"
      />
    </TableCell>
  );

  return (
    <Box sx={{ p: 3, width: '100%', minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <Dialog open={showTypeDialog} onClose={() => setShowTypeDialog(false)}>
        <DialogTitle>Select Requisition Type</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset">
            <RadioGroup
              value={requisitionType}
              onChange={(e) => setRequisitionType(e.target.value)}
            >
              <FormControlLabel 
                value="withCode" 
                control={<Radio />} 
                label="With Material Code" 
              />
              <FormControlLabel 
                value="withoutCode" 
                control={<Radio />} 
                label="Without Material Code" 
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTypeSelection} color="primary" variant="contained">
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {!showTypeDialog && (
        <>
          <Box sx={{ backgroundColor: 'ghostwhite', color: 'black', p: 2, mb: 3, borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Create Service Requisition</Typography>
            <Typography variant="subtitle1">{formData.serviceIndentNo}</Typography>
          </Box>

          <Paper elevation={0} sx={{ p: 0, border: `1px solid ${sapColors.border}`, borderRadius: '0 0 4px 4px', width: '100%' }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ backgroundColor: sapColors.headerBg, p: 2, mb: 3, border: `1px solid ${sapColors.border}`, borderRadius: '4px' }}>
                <Typography variant="h6" sx={{ color: sapColors.textDark, mb: 2, fontWeight: 'bold' }}>Document Header</Typography>
                
                <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: sapColors.textDark }}>Department</InputLabel>
                    <Select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      sx={{ backgroundColor: 'white' }}
                    >
                      {departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    name="requisitionedBy"
                    label="Requisitioned By"
                    value={formData.requisitionedBy}
                    onChange={handleChange}
                    fullWidth
                    required
                    sx={{ backgroundColor: 'white' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 3 }}>
                  <TextField
                    label="Effective Date"
                    value={formData.effectiveDate}
                    disabled
                    fullWidth
                    sx={{ backgroundColor: '#f5f5f5' }}
                  />
                  <TextField
                    label="Service Indent No."
                    value={formData.serviceIndentNo}
                    disabled
                    fullWidth
                    sx={{ backgroundColor: '#f5f5f5' }}
                  />
                </Box>
              </Box>

              <Typography variant="h6" sx={{ color: sapColors.textDark, mb: 2, mt: 4, fontWeight: 'bold' }}>Items</Typography>

              <TableContainer sx={{ border: `1px solid ${sapColors.border}`, borderRadius: '4px', mb: 3 }}>
                <Table>
                  <TableHead sx={{ backgroundColor: sapColors.headerBg }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>S.No.</TableCell>
                      {requisitionType === 'withCode' && (
                        <TableCell sx={{ fontWeight: 'bold' }}>Item Code</TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 'bold' }}>Material Description</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Qty Req.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>UOM</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Approx Cost</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Approx Date of Return</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{index + 1}</TableCell>
                        {requisitionType === 'withCode' && renderItemCodeCell(item, index)}
                        <TableCell>
                          <TextField
                            name={`items.materialDescription`}
                            value={item.materialDescription}
                            onChange={(e) => handleChange(e, index)}
                            fullWidth
                            required
                            size="small"
                          />
                        </TableCell>

                        <TableCell>
                          <TextField
                            name={`items.quantityReq`}
                            value={item.quantityReq}
                            onChange={(e) => handleChange(e, index)}
                            type="number"
                            fullWidth
                            required
                            size="small"
                          />
                        </TableCell>

                        <TableCell>
                          <TextField
                            name={`items.unit`}
                            value={item.unit}
                            onChange={(e) => handleChange(e, index)}
                            fullWidth
                            required
                            size="small"
                          />
                        </TableCell>
                       
                        <TableCell>
                          <TextField
                            name={`items.approxCost`}
                            value={item.approxCost}
                            onChange={(e) => handleChange(e, index)}
                            fullWidth
                            required
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            name={`items.approxdateofreturn`}
                            value={item.approxdateofreturn}
                            onChange={(e) => handleChange(e, index)}
                            type="date"
                            fullWidth
                            required
                            size="small"
                            InputLabelProps={{
                              shrink: true,
                            }}
                            inputProps={{
                              min: new Date().toISOString().split('T')[0]
                            }}
                            error={errors.approxdateofreturn[index] && errors.approxdateofreturn[index].length > 0}
                            helperText={
                              errors.approxdateofreturn[index] ? 
                              errors.approxdateofreturn[index][0] : 
                              "YYYY-MM-DD format"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            name={`items.remarks`}
                            value={item.remarks}
                            onChange={(e) => handleChange(e, index)}
                            fullWidth
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            onClick={() => removeItemRow(index)}
                            color="error"
                            disabled={formData.items.length <= 1}
                          >
                            <RemoveCircle />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Button variant="outlined" startIcon={<AddCircle />} onClick={addItemRow} sx={{ mb: 3 }}>
                Add Item
              </Button>

              <Divider sx={{ my: 3 }} />


              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant="outlined" sx={{ color: sapColors.textDark, borderColor: sapColors.border }}>
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleSubmit}
                  disabled={loading}
                  sx={{ backgroundColor: sapColors.primary, '&:hover': { backgroundColor: '#085c9e' } }}
                >
                  {loading ? 'Processing...' : 'Submit'}
                </Button>
              </Box>
            </Box>
          </Paper>
          <ValueHelpDialog />
        </>
      )}
    </Box>
  );
};

export default UserRequisition;