import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, MenuItem, Select, FormControl, InputLabel, IconButton,
  Typography, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  RadioGroup, Radio, FormControlLabel, InputAdornment
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

const ROW_HEIGHT = 48;
const DEBOUNCE_DELAY = 300;

const debounce = (func, delay) => {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
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

const MaterialRow = React.memo(({ data, index, style }) => {
  const material = data[index];
  return (
    <TableRow style={style} component="div" sx={{ display: 'flex', width: '100%' }}>
      <TableCell component="div" sx={{ flex: 1 }}>{material.code}</TableCell>
      <TableCell component="div" sx={{ flex: 2 }}>{material.desc}</TableCell>
      <TableCell component="div" sx={{ flex: 1 }}>{material.uom}</TableCell>
      <TableCell component="div" sx={{ flex: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => data.onSelect(material)}
        >
          Select
        </Button>
      </TableCell>
    </TableRow>
  );
});

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
  const [errors, setErrors] = useState({ approxdateofreturn: [] });
  const [valueHelpOpen, setValueHelpOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  const debouncedSetSearchTerm = useCallback(
    debounce((term) => setDebouncedSearchTerm(term), DEBOUNCE_DELAY),
    []
  );

  const filteredMaterials = useMemo(() => {
    if (!debouncedSearchTerm) return materialCodes;
    
    const term = debouncedSearchTerm.toLowerCase();
    return materialCodes.filter(material => 
      material.code?.toLowerCase().includes(term) || 
      material.desc?.toLowerCase().includes(term)
    );
  }, [materialCodes, debouncedSearchTerm]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [deptResponse, productsResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/departments'),
          axios.get('http://localhost:5000/api/sap/products')
        ]);

        setDepartments(deptResponse.data);
        
        const materials = productsResponse.data.products.map(p => ({
          code: p.code || '',
          desc: p.desc || '',
          uom: p.uom || 'EA',
        }));
        
        setMaterialCodes(materials);
      } catch (error) {
        console.error('Initialization error:', error);
        alert(`Failed to initialize: ${error.response?.data?.error || error.message}`);
      }
    };
    fetchInitialData();
  }, []);

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSetSearchTerm(term);
  };

  const handleTypeSelection = useCallback(() => {
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
    
    setFormData(prev => ({
      ...prev,
      items: [initialItem]
    }));
    
    setShowTypeDialog(false);
    setErrors({ approxdateofreturn: [] });
  }, [requisitionType]);

  const handleChange = useCallback((e, index) => {
    const { name, value } = e.target;
    
    if (name.startsWith('items.approxdateofreturn')) {
      setErrors(prev => ({
        ...prev,
        approxdateofreturn: prev.approxdateofreturn.map((err, i) => 
          i === index ? [] : err
        )
      }));
    }

    if (name.startsWith('items')) {
      setFormData(prev => {
        const items = [...prev.items];
        const fieldName = name.split('.')[1];
        items[index][fieldName] = value;
        return { ...prev, items };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const addItemRow = useCallback(() => {
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
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setErrors(prev => ({
      ...prev,
      approxdateofreturn: [...prev.approxdateofreturn, []]
    }));
  }, [requisitionType]);

  const removeItemRow = useCallback((index) => {
    if (formData.items.length > 1) {
      setFormData(prev => {
        const newItems = [...prev.items];
        newItems.splice(index, 1);
        return { ...prev, items: newItems };
      });
      
      setErrors(prev => {
        const newErrors = [...prev.approxdateofreturn];
        newErrors.splice(index, 1);
        return { ...prev, approxdateofreturn: newErrors };
      });
    }
  }, [formData.items.length]);

  const validateForm = useCallback(() => {
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

    setErrors(prev => ({ ...prev, approxdateofreturn: dateErrors }));
    return isValid;
  }, [formData.items]);

  const handleSubmit = useCallback(async (e) => {
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
      alert(error.response?.data?.message || 'Failed to submit requisition');
    } finally {
      setLoading(false);
    }
  }, [formData, requisitionType, validateForm]);

  const ValueHelpDialog = useMemo(() => (
    <Dialog 
      open={valueHelpOpen} 
      onClose={() => {
        setValueHelpOpen(false);
        setSearchTerm('');
        setDebouncedSearchTerm('');
      }}
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
            placeholder="Search by code or description..."
            value={searchTerm}
            onChange={handleSearchChange}
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
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ height: '400px', width: '100%' }}>
          <AutoSizer>
            {({ height, width }) => (
              <TableContainer component="div" style={{ height, width }}>
                <Table stickyHeader component="div">
                  <TableHead component="div">
                    <TableRow component="div" sx={{ display: 'flex', width: '100%' }}>
                      <TableCell component="div" sx={{ flex: 1, fontWeight: 'bold' }}>Material Code</TableCell>
                      <TableCell component="div" sx={{ flex: 2, fontWeight: 'bold' }}>Material Description</TableCell>
                      <TableCell component="div" sx={{ flex: 1, fontWeight: 'bold' }}>UOM</TableCell>
                      <TableCell component="div" sx={{ flex: 1, fontWeight: 'bold' }}>Select</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody component="div" style={{ height: height - 48, width }}>
                    <List
                      height={height - 48}
                      itemCount={filteredMaterials.length}
                      itemSize={ROW_HEIGHT}
                      itemData={{
                        ...filteredMaterials,
                        onSelect: (material) => {
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
                          setDebouncedSearchTerm('');
                        }
                      }}
                      width={width}
                    >
                      {MaterialRow}
                    </List>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </AutoSizer>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => {
            setValueHelpOpen(false);
            setSearchTerm('');
            setDebouncedSearchTerm('');
          }}
          variant="outlined"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  ), [valueHelpOpen, searchTerm, filteredMaterials, formData.items, selectedItemIndex]);

  const renderItemCodeCell = useCallback((item, index) => (
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
  ), []);

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
          {ValueHelpDialog}
        </>
      )}
    </Box>
  );
};

export default UserRequisition;