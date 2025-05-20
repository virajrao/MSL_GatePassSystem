const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const app = express();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


// Middleware
app.use(cors({
  origin: 'http://localhost:3000', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ==================== AUTHENTICATION ENDPOINTS ====================

// Registration Endpoint
app.post('/api/register', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = {
      id: users[0].id,
      username: users[0].username,
      role: users[0].role
    };

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});


// ==================== REQUISITION ENDPOINTS ====================

const SAP_CONFIG = {
  // https://my419382-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_MATERIAL_RGP1_CDS/YY1_Material_RGP1?$format=json

  BASE_URL: 'https://my419382-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_MATERIAL_RGP1_CDS/',
  AUTH: `Basic ${Buffer.from('PY_API_USER:EcqzvojarSNwxRNeBBzVkNdEDCulEnhoGYmU+E8E').toString('base64')}`,
  BATCH_SIZE: 1000, // Records per request
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // ms between retries
  TIMEOUT: 30000 // ms
};

// Get all departments with full details
app.get('/api/departments', async (req, res) => {
  console.log('Attempting to fetch departments...');
  try {
    const [departments] = await pool.query('SELECT id, name, code FROM departments');
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ 
      error: 'Error fetching departments',
      details: error.message 
    });
  }
});


// Enhanced SAP Products Endpoint with Smart Pagination and DB Sync
app.get('/api/sap/products', async (req, res) => {
  console.log('Initiating SAP products fetch with smart pagination and DB sync...');
  
  try {
    let allProducts = [];
    let skip = 0;
    let hasMore = true;
    let retryCount = 0;
    let totalFetched = 0;

    // PHASE 1: Fetch all products from SAP
    while (hasMore && retryCount < SAP_CONFIG.MAX_RETRIES) {
      try {
        const url = `${SAP_CONFIG.BASE_URL}/YY1_Material_RGP1?$format=json&$top=${SAP_CONFIG.BATCH_SIZE}&$skip=${skip}`;
        
        console.log(`Fetching batch: skip=${skip}, top=${SAP_CONFIG.BATCH_SIZE}`);
        
        const response = await axios.get(url, {
          headers: {
            Authorization: SAP_CONFIG.AUTH,
            Accept: 'application/json'
          },
          timeout: SAP_CONFIG.TIMEOUT
        });

        const batch = response.data.d?.results || response.data.value || [];
        allProducts = [...allProducts, ...batch];
        totalFetched += batch.length;
        
        console.log(`Fetched ${batch.length} records (Total: ${totalFetched})`);
        
        if (batch.length < SAP_CONFIG.BATCH_SIZE) {
          hasMore = false;
          console.log('Reached end of product records');
        } else {
          skip += SAP_CONFIG.BATCH_SIZE;
        }
        
        retryCount = 0;
        
      } catch (error) {
        retryCount++;
        console.error(`Attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= SAP_CONFIG.MAX_RETRIES) {
          throw new Error(`Failed after ${SAP_CONFIG.MAX_RETRIES} attempts: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, SAP_CONFIG.RETRY_DELAY));
      }
    }

    // Transform data
    const formattedProducts = allProducts.map(product => ({
      code: product.Product,
      desc: product.ProductName || 'No Description',
      uom: product.BaseUnit || 'EA'
    }));

    // PHASE 2: Database Synchronization
    console.log('Starting database synchronization...');
    await pool.query('START TRANSACTION');

    try {
      // 1. Get current count from database
      const [dbCountResult] = await pool.query('SELECT COUNT(*) as count FROM products_new');
      const currentDbCount = dbCountResult[0].count;

      // 2. Compare counts
      if (formattedProducts.length > currentDbCount) {
        console.log(`Updating database (SAP: ${formattedProducts.length} vs DB: ${currentDbCount})`);
        
        // 3. Truncate table for full refresh (or implement incremental update)
        await pool.query('TRUNCATE TABLE products');
        
        // 4. Insert all new records in batches
        const batchSize = 500; // Adjust based on your DB performance
        for (let i = 0; i < formattedProducts.length; i += batchSize) {
          const batch = formattedProducts.slice(i, i + batchSize);
          const values = batch.map(p => [p.code, p.desc,p.uom]);
          
          await pool.query(
            'INSERT INTO products_new (product_code,product_desc,product_uom) VALUES ?',
            [values]
          );
          
          console.log(`Inserted ${batch.length} records (Total: ${Math.min(i + batchSize, formattedProducts.length)})`);
        }
        
        console.log('Database synchronization completed successfully');
      } else {
        console.log('No database update needed - SAP count <= DB count');
      }

      await pool.query('COMMIT');

      res.json({
        success: true,
        totalCount: formattedProducts.length,
        dbCountBefore: currentDbCount,
        dbUpdated: formattedProducts.length > currentDbCount,
        products: formattedProducts
      });

    } catch (dbError) {
      await pool.query('ROLLBACK');
      console.error('Database synchronization failed:', dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    }

  } catch (error) {
    console.error('Final error:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to complete operation',
      details: error.message,
      success: false
    });
  }
});




// ==================== ERROR HANDLING ====================



/// Create new requisition
app.post('/api/requisitions', async (req, res) => {
  try {
    const { serviceIndentNo, department, items, requisitionedBy, userId } = req.body;
    
    // Validate required fields
    if (!department || isNaN(department)) {
      return res.status(400).json({ 
        error: 'Invalid department',
        message: 'Please select a valid department' 
      });
    }

    await pool.query('START TRANSACTION');
    
    // Insert requisition
    const [result] = await pool.query(
      `INSERT INTO requisitions 
       (service_indent_no, user_id, department_id, requisitioned_by, requisition_date, status) 
       VALUES (?, ?, ?, ?, CURDATE(), 'pending')`,
      [serviceIndentNo, userId, parseInt(department), requisitionedBy]
    );
    
    const requisitionId = result.insertId;
    
    // Insert requisition items
    for (const item of items) {
      await pool.query(
        `INSERT INTO req_items
         (requisition_id, item_code, material_description, quantity_requested, unit, approx_cost, approxdateofret, remarks) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          requisitionId,
          item.itemCode,
          item.materialDescription || '',
          item.quantityReq || 0,
          item.unit || '',
          item.approxCost || 0,
          item.approxdateofreturn || null,
          item.remarks || ''
        ]
      );
    }
    
    await pool.query('COMMIT');
    
    res.json({ 
      success: true,
      message: 'Requisition created successfully',
      requisitionId,
      serviceIndentNo
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Error creating requisition',
      details: error.message
    });
  }
});


// Get requisitions by user ID
app.get('/api/requisitions/:userId', async (req, res) => {
  try {
    const [requisitions] = await pool.query(
      `SELECT r.*, d.name as department_name 
       FROM requisitions r 
       JOIN departments d ON r.department_id = d.id 
       WHERE r.user_id = ?
       ORDER BY r.requisition_date DESC`,
      [req.params.userId]
    );

    // Get items for each requisition
    for (const req of requisitions) {
      const [items] = await pool.query(
        'SELECT * FROM req_items WHERE requisition_id = ?',
        [req.id]
      );
      req.items = items;
    }

    res.json(requisitions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching requisitions' });
  }
});


// ==================== STORE MANAGEMENT ENDPOINTS ====================


// Get requisitions by status
app.get('/api/requisitions', async (req, res) => {
  try {
    const { status } = req.query;
    
    if (!status) {
      return res.status(400).json({ error: 'Status parameter is required' });
    }

    const [requisitions] = await pool.query(
      `SELECT r.*, d.name as department_name 
       FROM requisitions r
       JOIN departments d ON r.department_id = d.id
       WHERE r.status = ?
       ORDER BY r.requisition_date DESC`,
      [status]
    );

    // Get items for each requisition
    for (const req of requisitions) {
      const [items] = await pool.query(
        'SELECT * FROM req_items WHERE requisition_id = ?',
        [req.id]
      );
      req.items = items;
    }

    res.json(requisitions);
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ 
      error: 'Error fetching requisitions',
      details: error.message 
    });
  }
});


// Update requisition status
app.put('/api/requisitions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const [result] = await pool.query(
      'UPDATE requisitions SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    res.json({ 
      success: true,
      message: `Requisition status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating requisition status:', error);
    res.status(500).json({ 
      error: 'Error updating requisition status',
      details: error.message 
    });
  }
});

// Create new gate pass
app.post('/api/gatepasses', async (req, res) => {
  try {
    const { 
      gatePassNo,
      requisitionId,
      fiscalYear,
      documentType,
      issuedBy,
      authorizedBy,
      remarks,
      items
    } = req.body;

    await pool.query('START TRANSACTION');

    // Insert gate pass
    const [result] = await pool.query(
      `INSERT INTO gate_passes 
       (gate_pass_no, requisition_id, fiscal_year, document_type, issued_by, authorized_by, remarks, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [gatePassNo, requisitionId, fiscalYear, documentType, issuedBy, authorizedBy, remarks]
    );

    const gatePassId = result.insertId;

    // Insert gate pass items
    for (const item of items) {
      await pool.query(
        `INSERT INTO gate_pass_items
         (gate_pass_id, item_code, material_description, unit, quantity, remarks)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          gatePassId,
          item.item_code || null,
          item.material_description,
          item.unit,
          item.quantity_requested,
          item.remarks || ''
        ]
      );
    }

    await pool.query('COMMIT');

    res.json({ 
      success: true,
      message: 'Gate pass created successfully',
      gatePassId,
      gatePassNo
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating gate pass:', error);
    res.status(500).json({ 
      error: 'Error creating gate pass',
      details: error.message 
    });
  }
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));