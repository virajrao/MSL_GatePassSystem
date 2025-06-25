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

// ==================== UTILITY FUNCTIONS ====================

function convertODataDateToOriginal(odataDateString) {
    if (odataDateString == null) return null;
    
    // Convert to string if it isn't already
    const dateString = String(odataDateString);
    
    // Handle both OData format and regular dates
    if (dateString.startsWith('/Date(')) {
        const timestampMatch = dateString.match(/\/Date\((-?\d+)\)\//);
        if (!timestampMatch) return dateString; // Return as-is if format is invalid
        
        const timestamp = parseInt(timestampMatch[1], 10);
        const date = new Date(timestamp);
        
        // Format as YYYY-MM-DD (ISO format)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } else {
        // Handle other date formats (like YYYYMMDD or YYYY-MM-DD)
        return dateString; // Return as-is for now
    }
}

const SAP_CONFIG = {
  BASE_URL: 'https://my420917-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PUR_REQN1_CDS/',
  AUTH: `Basic ${Buffer.from('RGPUSER1:euVGzWuhGBMRl@FJgwDNfrPkHKxUFwiP8wjLqlHP').toString('base64')}`,
  BATCH_SIZE: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  TIMEOUT: 30000
};

// ==================== AUTHENTICATION ENDPOINTS ====================

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

app.get('/api/departments', async (req, res) => {
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



app.get('/api/validate-requisition/:number', async (req, res) => {
  try {
    const { number } = req.params;
    
    // Query for the requisition header
    const [requisitionResults] = await pool.query(
      'SELECT DISTINCT pr_num, Dept_Code, Dept_Code_txt, Requester, PrDate, PrType, Pr_itm_txt FROM purchasereqn_new WHERE pr_num = ? LIMIT 1',
      [number]
    );
    
    if (requisitionResults.length === 0) {
      return res.json({ exists: false });
    }

    // Query for all items for this PR
    const [itemsResults] = await pool.query(
      'SELECT * FROM purchasereqn_new WHERE pr_num = ?',
      [number]
    );

    // Transform into the required format
    const firstItem = requisitionResults[0];
    const response = {
      exists: true,
      requisition: {
        pr_num: firstItem.pr_num,
        department_id: firstItem.Dept_Code,
        department_code: firstItem.Dept_Code_txt,
        requisitioned_by: firstItem.Requester,
        requisition_date: firstItem.PrDate,
        status: 'pending',
        remarks: firstItem.Pr_itm_txt || '',
        pr_type: firstItem.PrType || 'standard'
      },
      items: itemsResults.map(item => ({
        pr_itm_num: item.pr_itm_num,
        item_code: item.itm_code,
        quantity_requested: item.itm_qty,
        unit: item.UOM,
        approx_cost: item.ItemnetAmt,
        material_description: item.Pr_itm_txt,
        approxdateofret: item.ExpDateofreturn,
        currency: item.Currency,
        status: 'pending'
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ message: 'Error validating requisition' });
  }
});




app.post('/api/submit-pr', async (req, res) => {
  console.log('Submitting PR:', req.body.requisition?.pr_num);
  console.log('Request items count:', req.body.items?.length);

  try {
    await pool.query('START TRANSACTION');

    // Validate input
    if (!req.body.requisition || !req.body.requisition.pr_num) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'PR number is required' });
    }

    if (!req.body.items || req.body.items.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'At least one line item is required' });
    }

    const prNum = req.body.requisition.pr_num;

    // Check for existing items with a single query
    const [existingItems] = await pool.query(
      `SELECT pr_num, pr_itm_num FROM requistion_items_1 
       WHERE pr_num = ? AND pr_itm_num IN (?)`,
      [prNum, req.body.items.map(item => item.pr_itm_num)]
    );

    if (existingItems.length > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Some line items already exist for this PR',
        duplicateItems: existingItems
      });
    }

    // Check/insert requisition
    const [existingRequisition] = await pool.query(
      `SELECT id FROM requisitions_1 WHERE pr_num = ? LIMIT 1`,
      [prNum]
    );

    let prId;
    if (!existingRequisition || existingRequisition.length === 0) {
      const [prResult] = await pool.query(
        `INSERT INTO requisitions_1(
          pr_num, department_id, department_code, requisitioned_by,
          requisition_date, status, remarks, pr_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          prNum,
          req.body.requisition.department_id,
          req.body.requisition.department_code,
          req.body.requisition.requisitioned_by,
          convertODataDateToOriginal(req.body.requisition.requisition_date),
          req.body.requisition.status || 'pending',
          req.body.requisition.remarks || '',
          req.body.requisition.pr_type || 'standard'
        ]
      );
      prId = prResult.insertId;
    } else {
      prId = existingRequisition[0].id;
    }

    // Batch insert all items
    const values = req.body.items.map(item => [
      prId,
      prNum,
      item.pr_itm_num,
      item.item_code,
      item.quantity_requested,
      item.unit,
      item.approx_cost,
      item.material_description,
      convertODataDateToOriginal(item.approxdateofret),
      item.currency,
      item.status || 'pending',
      new Date()
    ]);

    await pool.query(
      `INSERT INTO requistion_items_1(
        requisition_id, pr_num, pr_itm_num, item_code,
        quantity_requested, unit, approx_cost, material_description,
        approxdateofret, currency, status, created_at
      ) VALUES ?`,
      [values]
    );

    await pool.query('COMMIT');
    
    res.json({
      success: true,
      prId: prId,
      message: 'PR submitted successfully',
      itemCount: req.body.items.length
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

app.get('/api/sap/purchreq', async (req, res) => {
  console.log('Initiating SAP Service PR fetch with smart pagination and DB sync...');
  
  try {
    let allPr = [];
    let skip = 0;
    let hasMore = true;
    let retryCount = 0;
    let totalFetched = 0;

    // PHASE 1: Fetch all PRs from SAP
    while (hasMore && retryCount < SAP_CONFIG.MAX_RETRIES) {
      try {
        const url = `${SAP_CONFIG.BASE_URL}/YY1_pur_reqn1?$format=json&$top=${SAP_CONFIG.BATCH_SIZE}&$skip=${skip}`;
        
        console.log(`Fetching batch: skip=${skip}, top=${SAP_CONFIG.BATCH_SIZE}`);
        
        const response = await axios.get(url, {
          headers: {
            Authorization: SAP_CONFIG.AUTH,
            Accept: 'application/json'
          },
          timeout: SAP_CONFIG.TIMEOUT
        });

        const batch = response.data.d?.results || response.data.value || [];
        allPr = [...allPr, ...batch];
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

    // Debug: Log all raw records before processing
    console.log(`Total records fetched from SAP: ${allPr.length}`);
    console.log('Sample records:', allPr.slice(0, 3));

    // Group PR items by requisition number
    const prGroups = allPr.reduce((acc, current) => {
      const prNum = current.PurchaseRequisition;
      if (!acc[prNum]) {
        acc[prNum] = [];
      }
      acc[prNum].push(current);
      return acc;
    }, {});

    // Debug: Log grouped data
    console.log(`Grouped into ${Object.keys(prGroups).length} PRs`);

    // Transform all items (not just first item of each group)
    const allItems = [];
    Object.entries(prGroups).forEach(([prNum, items]) => {
      items.forEach(item => {
        allItems.push({
          pr_num: item.PurchaseRequisition,
          pr_itm_num: item.PurchaseRequisitionItem,
          itm_code: item.Material,
          Requester: item.RequisitionerName,
          itm_qty: item.RequestedQuantity,
          ExpDateofreturn: item.DeliveryDate,
          PrType: item.PurchaseRequisitionType,
          Dept_Code: item.Code,
          Dept_Code_txt: item.Code_Text,
          ItemnetAmt: item.ItemNetAmount,
          Currency: item.PurReqnItemCurrency,
          Status: item.PurReqnReleaseStatus,
          UOM: item.BaseUnit,
          PrDate: item.PurchaseReqnCreationDate,
          Pr_itm_txt: item.PurchaseRequisitionItemText,
          pr_desc: item.PurReqnDescription
        });
      });
    });

    // Debug: Log transformed items count
    console.log(`Total items to insert: ${allItems.length}`);

    // PHASE 2: Database Synchronization
    console.log('Starting database synchronization...');
    await pool.query('START TRANSACTION');

    try {
      const [dbCountResult] = await pool.query('SELECT COUNT(*) as count FROM purchasereqn_new');
      const currentDbCount = dbCountResult[0].count;

      // Always refresh the data (or compare counts if you prefer)
      console.log(`Refreshing database (SAP: ${allItems.length} items vs DB: ${currentDbCount})`);
      
      await pool.query('TRUNCATE TABLE purchasereqn_new');
      
      const batchSize = 500;
      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        const values = batch.map(pr => [  
          pr.pr_num,
          pr.pr_itm_num,
          pr.itm_code,
          pr.Requester,
          pr.itm_qty,
          convertODataDateToOriginal(pr.ExpDateofreturn),
          pr.PrType,
          pr.Dept_Code,
          pr.Dept_Code_txt,
          pr.ItemnetAmt,
          pr.Currency,
          pr.Status,
          pr.UOM,
          convertODataDateToOriginal(pr.PrDate),
          pr.Pr_itm_txt
        ]);
        
        await pool.query(
          `INSERT INTO purchasereqn_new 
           (pr_num, pr_itm_num, itm_code, Requester, itm_qty, 
            ExpDateofreturn, PrType, Dept_Code, Dept_Code_txt, 
            ItemnetAmt, Currency, Status, UOM, PrDate, Pr_itm_txt) 
           VALUES ?`,
          [values]
        );
        
        console.log(`Inserted ${batch.length} records (Total: ${Math.min(i + batchSize, allItems.length)})`);
      }

      await pool.query('COMMIT');

      // Verify the count in database
      const [newCountResult] = await pool.query('SELECT COUNT(*) as count FROM purchasereqn_new');
      const newDbCount = newCountResult[0].count;
      console.log(`Database now contains ${newDbCount} records`);

      // Group the data for the frontend
      const groupedData = Object.entries(prGroups).map(([prNum, items]) => {
        const firstItem = items[0];
        return {
          requisition: {
            pr_num: prNum,
            department_id: firstItem.Code,
            department_code: firstItem.Code_Text,
            requisitioned_by: firstItem.RequisitionerName,
            requisition_date: convertODataDateToOriginal(firstItem.PurchaseReqnCreationDate),
            status: 'pending',
            remarks: firstItem.PurReqnDescription || '',
            pr_type: firstItem.PurchaseRequisitionType || 'standard'
          },
          items: items.map(item => ({
            pr_itm_num: item.PurchaseRequisitionItem,
            item_code: item.Material,
            quantity_requested: item.RequestedQuantity,
            unit: item.BaseUnit,
            approx_cost: item.ItemNetAmount,
            material_description: item.PurchaseRequisitionItemText,
            approxdateofret: convertODataDateToOriginal(item.DeliveryDate),
            currency: item.PurReqnItemCurrency,
            status: 'pending'
          }))
        };
      });
      
      res.json({
        success: true,
        totalCount: allItems.length,
        dbCountBefore: currentDbCount,
        dbCountAfter: newDbCount,
        dbUpdated: true,
        requisitions: groupedData
      });

    } catch (dbError) {
      await pool.query('ROLLBACK');
      console.error('Database synchronization failed:', dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    }

  } catch (error) {
    console.error('Final error:', error);
    res.status(500).json({ 
      error: 'Failed to complete operation',
      details: error.message,
      success: false
    });
  }
});

// ==================== OTHER ENDPOINTS ====================

app.post('/api/requisitions', async (req, res) => {
  try {
    const { serviceIndentNo, department, items, requisitionedBy, userId } = req.body;
    
    if (!department || isNaN(department)) {
      return res.status(400).json({ 
        error: 'Invalid department',
        message: 'Please select a valid department' 
      });
    }

    await pool.query('START TRANSACTION');
    
    const [result] = await pool.query(
      `INSERT INTO requisitions 
       (service_indent_no, user_id, department_id, requisitioned_by, requisition_date, status) 
       VALUES (?, ?, ?, ?, CURDATE(), 'pending')`,
      [serviceIndentNo, userId, parseInt(department), requisitionedBy]
    );
    
    const requisitionId = result.insertId;
    
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
          convertODataDateToOriginal(item.approxdateofreturn),
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

app.get('/api/requisitions', async (req, res) => {
  try {
    const { status } = req.query;
    
    if (!status) {
      return res.status(400).json({ error: 'Status parameter is required' });
    }

    const [requisitions] = await pool.query(
      `SELECT pr_num, department_id, department_code, requisitioned_by,
       requisition_date, status, remarks FROM requisitions_1 r
       WHERE r.status = ?
       ORDER BY r.requisition_date DESC`,
      [status]
    );

    for (const req of requisitions) {
      const [items] = await pool.query(
        'SELECT * FROM requistion_items_1 WHERE pr_num = ?',
        [req.pr_num]
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

    const [result] = await pool.query(
      `INSERT INTO gatepasses
       (gate_pass_no, requisition_id, fiscal_year, document_type, issued_by, authorized_by, remarks, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [gatePassNo, requisitionId, fiscalYear, documentType, issuedBy, authorizedBy, remarks]
    );

    const gatePassId = result.insertId;

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