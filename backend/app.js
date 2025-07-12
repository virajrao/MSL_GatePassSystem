const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const app = express();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Middleware
app.use(cors({
  origin: 'http://200.0.5.115:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ==================== UTILITY FUNCTIONS ====================

function convertODataDateToOriginal(odataDateString) {
  if (odataDateString == null) return null;
  const dateString = String(odataDateString);
  if (dateString.startsWith('/Date(')) {
    const timestampMatch = dateString.match(/\/Date\((-?\d+)\)\//);
    if (!timestampMatch) return dateString;
    const timestamp = parseInt(timestampMatch[1], 10);
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateString;
}

const SAP_CONFIG = {
  BASE_URL: 'https://my420917-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PUR_REQN1_CDS/',
  AUTH: `Basic ${Buffer.from('RGPUSER1:euVGzWuhGBMRl@FJgwDNfrPkHKxUFwiP8wjLqlHP').toString('base64')}`,
  BATCH_SIZE: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  TIMEOUT: 30000,
};

const SAP_CONFIG1 = {
  BASE_URL: 'https://my420917-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_SUPPLIERREF_CDS',
  AUTH: `Basic ${Buffer.from(`${process.env.SAP_USERNAME}:${process.env.SAP_PASSWORD}`).toString('base64')}`,
  BATCH_SIZE: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  TIMEOUT: 30000,
};

// ==================== AUTHENTICATION ENDPOINTS ====================

app.post('/api/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
      username,
      password,
      role,
    ]);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [
      username,
      password,
    ]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = {
      id: users[0].id,
      username: users[0].username,
      role: users[0].role,
    };
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== DEPARTMENT ENDPOINTS ====================

app.get('/api/departments', async (req, res) => {
  try {
    const [departments] = await pool.query('SELECT id, name, code FROM departments');
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      error: 'Error fetching departments',
      details: error.message,
    });
  }
});

// ==================== SUPPLIER ENDPOINTS ====================

app.get('/api/sap/suppliers', async (req, res) => {
  console.log('Initiating SAP Supplier data fetch...');
  try {
    let allSuppliers = [];
    let skip = 0;
    let hasMore = true;
    let retryCount = 0;
    let totalFetched = 0;

    while (hasMore && retryCount < SAP_CONFIG1.MAX_RETRIES) {
      try {
        const url = `${SAP_CONFIG1.BASE_URL}/YY1_supplierref?$format=json&$top=${SAP_CONFIG1.BATCH_SIZE}&$skip=${skip}`;
        console.log(`Fetching supplier batch: skip=${skip}, top=${SAP_CONFIG1.BATCH_SIZE}`);
        const response = await axios.get(url, {
          headers: {
            Authorization: SAP_CONFIG1.AUTH,
            Accept: 'application/json',
          },
          timeout: SAP_CONFIG1.TIMEOUT,
        });
        const batch = response.data.d?.results || response.data.value || [];
        allSuppliers = [...allSuppliers, ...batch];
        totalFetched += batch.length;
        console.log(`Fetched ${batch.length} supplier records (Total: ${totalFetched})`);
        if (batch.length < SAP_CONFIG1.BATCH_SIZE) {
          hasMore = false;
          console.log('Reached end of supplier records');
        } else {
          skip += SAP_CONFIG1.BATCH_SIZE;
        }
        retryCount = 0;
      } catch (error) {
        retryCount++;
        console.error(`Attempt ${retryCount} failed:`, error.message);
        if (retryCount >= SAP_CONFIG1.MAX_RETRIES) {
          throw new Error(`Failed after ${SAP_CONFIG1.MAX_RETRIES} attempts: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, SAP_CONFIG1.RETRY_DELAY));
      }
    }

    const filteredSuppliers = allSuppliers.map((supplier) => ({
      id: supplier.BusinessPartner,
      name: supplier.SupplierName,
      address: supplier.BPAddrStreetName,
      gstin: supplier.TaxNumber3 || '',
      contact: supplier.PhoneNumber || ''
    }));

    const searchTerm = req.query.search;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const filtered = filteredSuppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(searchLower) ||
          supplier.id.toLowerCase().includes(searchLower) ||
          (supplier.gstin && supplier.gstin.toLowerCase().includes(searchLower))
      );
      console.log(`Applied search filter, returning ${filtered.length} of ${filteredSuppliers.length} suppliers`);
      return res.json(filtered);
    }

    console.log(`Returning all ${filteredSuppliers.length} suppliers`);
    res.json(filteredSuppliers);
  } catch (error) {
    console.error('Final error:', error);
    res.status(500).json({
      error: 'Failed to fetch supplier data',
      details: error.message,
      success: false,
    });
  }
});

// ==================== REQUISITION ENDPOINTS ====================

app.get('/api/validate-requisition/:number', async (req, res) => {
  try {
    const { number } = req.params;
    const [requisitionResults] = await pool.query(
      'SELECT DISTINCT pr_num, Dept_Code, Dept_Code_txt, Requester, PrDate, PrType, Pr_itm_txt FROM purchasereqn_new WHERE pr_num = ? LIMIT 1',
      [number]
    );
    if (requisitionResults.length === 0) {
      return res.json({ exists: false });
    }
    const [itemsResults] = await pool.query('SELECT * FROM purchasereqn_new WHERE pr_num = ?', [
      number,
    ]);
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
        pr_type: firstItem.PrType || 'standard',
      },
      items: itemsResults.map((item) => ({
        pr_itm_num: item.pr_itm_num,
        item_code: item.itm_code,
        quantity_requested: item.itm_qty,
        unit: item.UOM,
        approx_cost: item.ItemnetAmt,
        material_description: item.Pr_itm_txt,
        approxdateofret: item.ExpDateofreturn,
        currency: item.Currency,
        status: 'pending',
      })),
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
    while (hasMore && retryCount < SAP_CONFIG.MAX_RETRIES) {
      try {
        const url = `${SAP_CONFIG.BASE_URL}/YY1_pur_reqn1?$format=json&$top=${SAP_CONFIG.BATCH_SIZE}&$skip=${skip}`;
        console.log(`Fetching batch: skip=${skip}, top=${SAP_CONFIG.BATCH_SIZE}`);
        const response = await axios.get(url, {
          headers: {
            Authorization: SAP_CONFIG.AUTH,
            Accept: 'application/json',
          },
          timeout: SAP_CONFIG.TIMEOUT,
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
        await new Promise((resolve) => setTimeout(resolve, SAP_CONFIG.RETRY_DELAY));
      }
    }
    console.log(`Total records fetched from SAP: ${allPr.length}`);
    console.log('Sample records:', allPr.slice(0, 3));
    const prGroups = allPr.reduce((acc, current) => {
      const prNum = current.PurchaseRequisition;
      if (!acc[prNum]) {
        acc[prNum] = [];
      }
      acc[prNum].push(current);
      return acc;
    }, {});
    console.log(`Grouped into ${Object.keys(prGroups).length} PRs`);
    const allItems = [];
    Object.entries(prGroups).forEach(([prNum, items]) => {
      items.forEach((item) => {
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
        });
      });
    });
    console.log(`Total items to insert: ${allItems.length}`);
    console.log('Starting database synchronization...');
    await pool.query('START TRANSACTION');
    try {
      const [dbCountResult] = await pool.query('SELECT COUNT(*) as count FROM purchasereqn_new');
      const currentDbCount = dbCountResult[0].count;
      console.log(`Refreshing database (SAP: ${allItems.length} items vs DB: ${currentDbCount})`);
      await pool.query('TRUNCATE TABLE purchasereqn_new');
      const batchSize = 500;
      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        const values = batch.map((pr) => [
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
          pr.Pr_itm_txt,
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
      const [newCountResult] = await pool.query('SELECT COUNT(*) as count FROM purchasereqn_new');
      const newDbCount = newCountResult[0].count;
      console.log(`Database now contains ${newDbCount} records`);
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
            pr_type: firstItem.PurchaseRequisitionType || 'standard',
          },
          items: items.map((item) => ({
            pr_itm_num: item.PurchaseRequisitionItem,
            item_code: item.Material,
            quantity_requested: item.RequestedQuantity,
            unit: item.BaseUnit,
            approx_cost: item.ItemNetAmount,
            material_description: item.PurchaseRequisitionItemText,
            approxdateofret: convertODataDateToOriginal(item.DeliveryDate),
            currency: item.PurReqnItemCurrency,
            status: 'pending',
          })),
        };
      });
      res.json({
        success: true,
        totalCount: allItems.length,
        dbCountBefore: currentDbCount,
        dbCountAfter: newDbCount,
        dbUpdated: true,
        requisitions: groupedData,
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
      success: false,
    });
  }
});

app.post('/api/requisitions', async (req, res) => {
  try {
    const { serviceIndentNo, department, items, requisitionedBy, userId } = req.body;
    if (!department || isNaN(department)) {
      return res.status(400).json({
        error: 'Invalid department',
        message: 'Please select a valid department',
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
          item.remarks || '',
        ]
      );
    }
    await pool.query('COMMIT');
    res.json({
      success: true,
      message: 'Requisition created successfully',
      requisitionId,
      serviceIndentNo,
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Error creating requisition',
      details: error.message,
    });
  }
});

app.put('/api/requisitions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ...gatePassData } = req.body;

    // Validate status
    if (!['pending', 'storeapprove', 'higherauthapprove', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    await pool.query('START TRANSACTION');

    // Check if requisition exists
    const [requisition] = await pool.query('SELECT id FROM requisitions_1 WHERE id = ?', [id]);
    if (requisition.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Requisition not found' });
    }

    // Update requisition status
    await pool.query('UPDATE requisitions_1 SET status = ? WHERE id = ?', [status, id]);

    // Insert or update gate pass details
    const [existingDetails] = await pool.query(
      'SELECT id FROM requisition_details WHERE requisition_id = ?', 
      [id]
    );

    if (existingDetails.length > 0) {
      await pool.query(
        `UPDATE requisition_details SET
          gate_pass_no = ?, document_type = ?, fiscal_year = ?, issued_by = ?,
          authorized_by = ?, remarks = ?, transporter_name = ?, transporter_gstin = ?,
          ewaybill_no = ?, u_no = ?, physical_challan_num = ?, challan_date = ?,
          transaction_date = ?, buyer_name = ?, approval_authority = ?, vehicle_num = ?,
          supplier_id = ?, supplier_name = ?, supplier_address = ?, supplier_gstin = ?,
          supplier_contact = ?
         WHERE requisition_id = ?`,
        [
          gatePassData.gatePassNo,
          gatePassData.documentType,
          gatePassData.fiscalYear,
          gatePassData.issuedBy,
          gatePassData.authorizedBy,
          gatePassData.remarks,
          gatePassData.transporterName,
          gatePassData.transporterGSTIN,
          gatePassData.ewaybillNo,
          gatePassData.uNo,
          gatePassData.physicalChallanNum,
          gatePassData.challanDate,
          gatePassData.transactionDate,
          gatePassData.buyerName,
          gatePassData.approvalAuthority,
          gatePassData.vehicleNum,
          gatePassData.supplierId,
          gatePassData.supplierName,
          gatePassData.supplierAddress,
          gatePassData.supplierGSTIN,
          gatePassData.supplierContact,
          id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO requisition_details (
          requisition_id, gate_pass_no, document_type, fiscal_year, issued_by,
          authorized_by, remarks, transporter_name, transporter_gstin,
          ewaybill_no, u_no, physical_challan_num, challan_date,
          transaction_date, buyer_name, approval_authority, vehicle_num,
          supplier_id, supplier_name, supplier_address, supplier_gstin, supplier_contact
        ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          gatePassData.gatePassNo,
          gatePassData.documentType,
          gatePassData.fiscalYear,
          gatePassData.issuedBy,
          gatePassData.authorizedBy,
          gatePassData.remarks,
          gatePassData.transporterName,
          gatePassData.transporterGSTIN,
          gatePassData.ewaybillNo,
          gatePassData.uNo,
          gatePassData.physicalChallanNum,
          gatePassData.challanDate,
          gatePassData.transactionDate,
          gatePassData.buyerName,
          gatePassData.approvalAuthority,
          gatePassData.vehicleNum,
          gatePassData.supplierId,
          gatePassData.supplierName,
          gatePassData.supplierAddress,
          gatePassData.supplierGSTIN,
          gatePassData.supplierContact
        ]
      );
    }

    await pool.query('COMMIT');
    res.json({ 
      success: true, 
      message: 'Requisition status and gate pass details updated successfully' 
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Update requisition error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update requisition',
      details: err.message,
    });
  }
});

// ==================== ADMIN REJECT ENDPOINT ====================
app.put('/api/AdminReject', async (req, res) => {
  try {
    const { requisitionId } = req.body;

    if (!requisitionId) {
      return res.status(400).json({ error: 'Requisition ID is required' });
    }

    await pool.query('START TRANSACTION');

    // Update requisition status to 'rejected'
    await pool.query(
      'UPDATE requisitions_1 SET status = ? WHERE id = ?',
      ['rejected', requisitionId]
    );

    await pool.query('COMMIT');
    res.json({ 
      success: true,
      message: 'Requisition rejected successfully'
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error rejecting requisition:', error);
    res.status(500).json({ 
      error: 'Failed to reject requisition',
      details: error.message
    });
  }
});


app.put('/api/requisitions/:id/state', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ...details } = req.body;
    const gatepassData = details.details;
    console.log(gatepassData);

    // Validate status
    if (!['pending', 'storeapprove', 'higherauthapprove', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    await pool.query('START TRANSACTION');

    // Check if requisition exists
    const [requisition] = await pool.query('SELECT id FROM requisitions_1 WHERE id = ?', [id]);
    if (requisition.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Requisition not found' });
    }

    // Update requisition status
    await pool.query('UPDATE requisitions_1 SET status = ? WHERE id = ?', [status, id]);

    // Check if requisition_details exists
    const [existingDetails] = await pool.query(
      'SELECT * FROM requisition_details WHERE requisition_id = ?',
      [id]
    );

    // Prepare details with default values for optional fields
    const detailsData = {
      gate_pass_no: gatepassData.gate_pass_no || '',
      document_type: gatepassData.document_type || 'RGP',
      fiscal_year: gatepassData.fiscal_year || new Date().getFullYear(),
      issued_by: gatepassData.issued_by || '',
      authorized_by: gatepassData.authorized_by|| '',
      remarks: gatepassData.details_remarks || '',
      transporter_name: gatepassData.transporter_name || '',

      transporter_gstin: gatepassData.transporter_gstin || '',
      ewaybill_no: gatepassData.ewaybill_no || '',
      u_no: gatepassData.u_no || '',
      physical_challan_num: gatepassData.physical_challan_num || '',
      challan_date: gatepassData.challan_date ? new Date(gatepassData.challan_date).toLocaleDateString('en-GB') : null,
      transaction_date: gatepassData.transaction_date ? new Date(gatepassData.transaction_date).toLocaleDateString('en-GB') : null,
      buyer_name: gatepassData.buyer_name || '',
      approval_authority: gatepassData.approval_authority || '',
      supplier_id: gatepassData.supplier_id || '',
      supplier_name: gatepassData.supplier_name || '',
      supplier_address: gatepassData.supplier_address || '',
      supplier_gstin: gatepassData.supplier_gstin || '',
      supplier_contact: gatepassData.supplier_contact || '',
      vehicle_num: gatepassData.vehicle_num
    };

    if (existingDetails.length > 0) {
      await pool.query(
        `UPDATE requisition_details SET 
         gate_pass_no = ?, document_type = ?, fiscal_year = ?, issued_by = ?, 
         authorized_by = ?, remarks = ?, transporter_name = ?, transporter_gstin = ?, 
         ewaybill_no = ?, u_no = ?, physical_challan_num = ?, challan_date = ?, 
         transaction_date = ?, buyer_name = ?, approval_authority = ?, 
         supplier_id = ?, supplier_name = ?, supplier_address = ?, 
         supplier_gstin = ?, supplier_contact = ?
         WHERE requisition_id = ?`,
        [
          detailsData.gate_pass_no,
          detailsData.document_type,
          detailsData.fiscal_year,
          detailsData.issued_by,
          detailsData.authorized_by,
          detailsData.remarks,
          detailsData.transporter_name,
          detailsData.transporter_gstin,
          detailsData.ewaybill_no,
          detailsData.u_no,
          detailsData.physical_challan_num,
          detailsData.challan_date,
          detailsData.transaction_date,
          detailsData.buyer_name,
          detailsData.approval_authority,
          detailsData.supplier_id,
          detailsData.supplier_name,
          detailsData.supplier_address,
          detailsData.supplier_gstin,
          detailsData.supplier_contact,
          id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO requisition_details (
          requisition_id, gate_pass_no, document_type, fiscal_year, issued_by, 
          authorized_by, remarks, transporter_name, transporter_gstin, 
          ewaybill_no, u_no, physical_challan_num, challan_date, 
          transaction_date, buyer_name, approval_authority, 
          supplier_id, supplier_name, supplier_address, supplier_gstin, supplier_contact,vehicle_num
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
        [
          id,
          detailsData.gate_pass_no,
          detailsData.document_type,
          detailsData.fiscal_year,
          detailsData.issued_by,
          detailsData.authorized_by,
          detailsData.remarks,
          detailsData.transporter_name,
          detailsData.transporter_gstin,
          detailsData.ewaybill_no,
          detailsData.u_no,
          detailsData.physical_challan_num,
          detailsData.challan_date,
          detailsData.transaction_date,
          detailsData.buyer_name,
          detailsData.approval_authority,
          detailsData.supplier_id,
          detailsData.supplier_name,
          detailsData.supplier_address,
          detailsData.supplier_gstin,
          detailsData.supplier_contact,
          detailsData.vehicle_num
        ]
      );
    }

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Requisition updated successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Update requisition error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update requisition',
      details: err.message,
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
      const [items] = await pool.query('SELECT * FROM req_items WHERE requisition_id = ?', [
        req.id,
      ]);
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
      `SELECT id, pr_num, department_id, department_code, requisitioned_by,
       requisition_date, status, remarks FROM requisitions_1 r
       WHERE r.status = ?
       ORDER BY r.requisition_date DESC`,
      [status]
    );
    for (const req of requisitions) {
      const [items] = await pool.query('SELECT * FROM requistion_items_1 WHERE pr_num = ?', [
        req.pr_num,
      ]);
      req.items = items;
    }
    res.json(requisitions);
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({
      error: 'Error fetching requisitions',
      details: error.message,
    });
  }
});

app.get('/api/requisitionsdet', async (req, res) => {
  try {
    const { status, dateRange, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Build the WHERE clause dynamically
    let whereClause = 'WHERE r.status = ?';
    const params = [status];

    // Apply date range filter
    if (dateRange && dateRange !== 'all') {
      if (dateRange === 'today') {
        whereClause += ' AND r.requisition_date = CURDATE()';
      } else if (dateRange === 'week') {
        whereClause += ' AND r.requisition_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      } else if (dateRange === 'month') {
        whereClause += ' AND r.requisition_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)';
      }
    }

    // Apply search filter on pr_num or requisitioned_by
    if (search) {
      whereClause += ' AND (r.pr_num LIKE ? OR r.requisitioned_by LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Fetch requisitions with their details
    const [requisitions] = await pool.query(`
      SELECT 
        r.id, r.pr_num, r.department_id, r.department_code, r.requisitioned_by, 
        r.requisition_date, r.status,
        d.gate_pass_no, d.document_type, d.fiscal_year, d.issued_by, d.authorized_by, 
        d.remarks AS details_remarks, d.transporter_name, d.transporter_gstin, 
        d.ewaybill_no, d.u_no, d.physical_challan_num, d.challan_date, 
        d.transaction_date, d.buyer_name, d.approval_authority, d.supplier_id, 
        d.supplier_name, d.supplier_address, d.supplier_gstin, d.supplier_contact,
        d.vehicle_num
      FROM requisitions_1 r
      LEFT JOIN requisition_details d ON r.id = d.requisition_id
      ${whereClause}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // If there are requisitions, fetch their items
    if (requisitions.length > 0) {
      const requisitionIds = requisitions.map(req => req.id);
      const [items] = await pool.query(`
        SELECT 
          requisition_id, pr_itm_num, item_code, quantity_requested, unit, 
          approx_cost, material_description
        FROM requistion_items_1
        WHERE requisition_id IN (?)
      `, [requisitionIds]);

      // Group items by requisition_id
      const itemsByRequisition = items.reduce((acc, item) => {
        if (!acc[item.requisition_id]) acc[item.requisition_id] = [];
        acc[item.requisition_id].push(item);
        return acc;
      }, {});

      // Attach items to their respective requisitions
      requisitions.forEach(req => {
        req.items = itemsByRequisition[req.id] || [];
      });
    }

    res.json(requisitions);
  } catch (error) {
    console.error('Error fetching requisitions details:', error);
    res.status(500).json({ error: 'Error fetching requisitions details' });
  }
});

// ==================== GATEPASS ENDPOINTS ====================

app.post('/api/gatepasses', async (req, res) => {
  try {
    const { gatePassNo, requisitionId, fiscalYear, documentType, issuedBy, authorizedBy, remarks, items } =
      req.body;
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
          item.remarks || '',
        ]
      );
    }
    await pool.query('COMMIT');
    res.json({
      success: true,
      message: 'Gate pass created successfully',
      gatePassId,
      gatePassNo,
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating gate pass:', error);
    res.status(500).json({
      error: 'Error creating gate pass',
      details: error.message,
    });
  }
});

app.get('/api/gatepasses', async (req, res) => {
  try {
    const { status, search, documentType } = req.query;
    
    if (!status) {
      return res.status(400).json({ error: 'Status parameter is required' });
    }

    let query = `
      SELECT 
        r.id AS requisition_id,
        r.pr_num,
        r.status,
        rd.gate_pass_no,
        rd.supplier_name,
        rd.vehicle_num,
        rd.document_type,
        EXISTS(
          SELECT 1 FROM material_movements mm 
          WHERE mm.gate_pass_no = rd.gate_pass_no 
          AND mm.movement_type = 'out'
        ) AS out_recorded
      FROM requisitions_1 r
      JOIN requisition_details rd ON r.id = rd.requisition_id
      WHERE r.status = ?
    `;
    
    const params = [status];
 
    
    if (search) {
      query += ` AND (rd.gate_pass_no LIKE ? OR r.pr_num LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const [results] = await pool.query(query, params);
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching gate passes:', error);
    res.status(500).json({ error: 'Failed to fetch gate passes', details: error.message });
  }
});

app.get('/api/gatepasses/:gatePassNo', async (req, res) => {
  try {
    const { gatePassNo } = req.params;
    const { checkOut } = req.query;
    
    // Get requisition and details
    const [requisition] = await pool.query(`
      SELECT 
        r.id AS requisition_id,
        r.pr_num,
        r.status,
        rd.*,
        EXISTS(
          SELECT 1 FROM material_movements mm 
          WHERE mm.gate_pass_no = rd.gate_pass_no 
          AND mm.movement_type = 'out'
        ) AS out_recorded
      FROM requisitions_1 r
      JOIN requisition_details rd ON r.id = rd.requisition_id
      WHERE rd.gate_pass_no = ?
    `, [gatePassNo]);
    
    if (requisition.length === 0) {
      return res.status(404).json({ error: 'Gate pass not found' });
    }
    
    // Get items
    const [items] = await pool.query(`
      SELECT 
        id,
        item_code,
        material_description,
        quantity_requested,
        unit
      FROM requistion_items_1 
      WHERE requisition_id = ?
    `, [requisition[0].requisition_id]);
    
    // Check if any items have been received (for material in)
    if (checkOut) {
      const [outItems] = await pool.query(`
        SELECT requisition_item_id 
        FROM material_movement_items
        JOIN material_movements ON material_movement_items.movement_id = material_movements.id
        WHERE material_movements.gate_pass_no = ? 
        AND material_movements.movement_type = 'out'
      `, [gatePassNo]);
      
      const outIds = outItems.map(item => item.requisition_item_id);
      items.forEach(item => {
        item.out_recorded = outIds.includes(item.id);
      });
    }
    
    res.json({
      ...requisition[0],
      items
    });
  } catch (error) {
    console.error('Error fetching gate pass details:', error);
    res.status(500).json({ error: 'Failed to fetch gate pass details', details: error.message });
  }
});

// ==================== MATERIAL MOVEMENT ENDPOINTS ====================

app.post('/api/material-movements', async (req, res) => {
  try {
    const { gate_pass_no, movement_type, items } = req.body;
    
    if (!gate_pass_no || !movement_type || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    await pool.query('START TRANSACTION');

    // Create movement record
    const [movementResult] = await pool.query(`
      INSERT INTO material_movements 
      (gate_pass_no, movement_type, status, movement_date)
      VALUES (?, ?, 'pending', NOW())
    `, [gate_pass_no, movement_type]);
    
    const movementId = movementResult.insertId;
    
    // Create movement items
    for (const item of items) {
      await pool.query(`
        INSERT INTO material_movement_items
        (movement_id, requisition_item_id, quantity, status)
        VALUES (?, ?, ?, 'pending')
      `, [
        movementId, 
        item.requisition_item_id, 
        item.quantity
      ]);
    }
    
    await pool.query('COMMIT');
    res.status(201).json({ 
      success: true,
      message: 'Material movement recorded successfully',
      movement_id: movementId
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error recording material movement:', error);
    res.status(500).json({ 
      error: 'Failed to record material movement',
      details: error.message
    });
  }
});

app.get('/api/material-out-for-in', async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        mm.id,
        mm.gate_pass_no,
        mm.movement_type,
        mm.status,
        mm.movement_date,
        rd.supplier_name,
        rd.vehicle_num,
        r.pr_num
      FROM material_movements mm
      JOIN requisition_details rd ON mm.gate_pass_no = rd.gate_pass_no
      JOIN requisitions_1 r ON rd.requisition_id = r.id
      WHERE mm.movement_type = 'out'
      AND NOT EXISTS (
        SELECT 1 FROM material_movements mm_in 
        WHERE mm_in.related_movement_id = mm.id
        AND mm_in.movement_type = 'in'
      )
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (mm.gate_pass_no LIKE ? OR r.pr_num LIKE ? OR rd.vehicle_num LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY mm.movement_date DESC`;
    
    const [results] = await pool.query(query, params);
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching material out records:', error);
    res.status(500).json({ 
      error: 'Failed to fetch material out records',
      details: error.message
    });
  }
});

app.get('/api/material-out-for-in/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get movement
    const [movement] = await pool.query(`
      SELECT 
        mm.id,
        mm.gate_pass_no,
        mm.movement_type,
        mm.status,
        mm.movement_date,
        rd.supplier_name,
        rd.vehicle_num,
        r.pr_num,
        rd.transporter_name,
        rd.ewaybill_no,
        rd.challan_date
      FROM material_movements mm
      JOIN requisition_details rd ON mm.gate_pass_no = rd.gate_pass_no
      JOIN requisitions_1 r ON rd.requisition_id = r.id
      WHERE mm.id = ? AND mm.movement_type = 'out'
    `, [id]);
    
    if (movement.length === 0) {
      return res.status(404).json({ error: 'Movement not found' });
    }
    
    // Get items
    const [items] = await pool.query(`
      SELECT 
        mmi.id,
        mmi.requisition_item_id,
        mmi.quantity,
        ri.item_code,
        ri.material_description,
        ri.quantity_requested,
        ri.unit,
        ri.approx_cost,
        ri.currency,
        CASE WHEN EXISTS (
          SELECT 1 FROM material_movement_items mmi_in
          JOIN material_movements mm_in ON mmi_in.movement_id = mm_in.id
          WHERE mmi_in.requisition_item_id = mmi.requisition_item_id
          AND mm_in.related_movement_id = ?
          AND mm_in.movement_type = 'in'
        ) THEN 'received' ELSE 'pending' END as status
      FROM material_movement_items mmi
      JOIN requistion_items_1 ri ON mmi.requisition_item_id = ri.id
      WHERE mmi.movement_id = ?
    `, [id, id]);
    
    res.json({
      ...movement[0],
      items
    });
  } catch (error) {
    console.error('Error fetching movement details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch movement details',
      details: error.message
    });
  }
});


// Special endpoint for NRGP processing - doing the material out for the NRGP thing 
app.post('/api/material-out-nrgp', async (req, res) => {
  try {
    const { gate_pass_no, items } = req.body;
    
    if (!gate_pass_no || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    await pool.query('START TRANSACTION');

    // 1. Create OUT movement record
    const [outMovement] = await pool.query(`
      INSERT INTO material_movements 
      (gate_pass_no, movement_type, status, movement_date)
      VALUES (?, 'out', 'completed', NOW())
    `, [gate_pass_no]);
    
    const outMovementId = outMovement.insertId;
    
    // 2. Create OUT movement items
    for (const item of items) {
      await pool.query(`
        INSERT INTO material_movement_items
        (movement_id, requisition_item_id, quantity, status)
        VALUES (?, ?, ?, 'received')
      `, [outMovementId, item.requisition_item_id, item.quantity]);
    }

    // 3. Create IN movement record (auto-completed)
    const [inMovement] = await pool.query(`
      INSERT INTO material_movements 
      (gate_pass_no, movement_type, status, movement_date, related_movement_id)
      VALUES (?, 'in', 'completed', NOW(), ?)
    `, [gate_pass_no, outMovementId]);
    
    const inMovementId = inMovement.insertId;
    
    // 4. Create IN movement items (auto-completed)
    for (const item of items) {
      await pool.query(`
        INSERT INTO material_movement_items
        (movement_id, requisition_item_id, quantity, status)
        VALUES (?, ?, ?, 'received')
      `, [inMovementId, item.requisition_item_id, item.quantity]);
    }

    // 5. Update requisition status to 'completed'
    await pool.query(`
      UPDATE requisitions_1 r
      JOIN requisition_details rd ON r.id = rd.requisition_id
      SET r.status = 'completed'
      WHERE rd.gate_pass_no = ?
    `, [gate_pass_no]);

    await pool.query('COMMIT');
    
    res.status(201).json({ 
      success: true,
      message: 'NRGP processed successfully with auto-completion',
      out_movement_id: outMovementId,
      in_movement_id: inMovementId
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error processing NRGP:', error);
    res.status(500).json({ 
      error: 'Failed to process NRGP',
      details: error.message
    });
  }
});



app.post('/api/material-in', async (req, res) => {
  try {
    const { gate_pass_no, movement_out_id, items } = req.body;
    
    if (!gate_pass_no || !movement_out_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Start transaction
    await pool.query('START TRANSACTION');

    // Determine status based on received items
    const receivedItems = items.filter(item => item.status === 'received');
    const status = receivedItems.length === items.length ? 'completed' : 'partial';

    // Create movement record
    const [movementResult] = await pool.query(`
      INSERT INTO material_movements 
      (gate_pass_no, movement_type, status, movement_date, related_movement_id)
      VALUES (?, 'in', ?, NOW(), ?)
    `, [gate_pass_no, status, movement_out_id]);
    
    const movementId = movementResult.insertId;
    
    // Create movement items
    for (const item of items) {
      if (item.status === 'received') {
        await pool.query(`
          INSERT INTO material_movement_items
          (movement_id, requisition_item_id, quantity, status)
          VALUES (?, ?, ?, ?)
        `, [
          movementId, 
          item.requisition_item_id, 
          item.quantity, 
          'received'
        ]);
      }
    }
    
    // Update requisition status if all items are received
    if (status === 'completed') {
      await pool.query(`
        UPDATE requisitions_1 r
        JOIN requisition_details rd ON r.id = rd.requisition_id
        SET r.status = 'completed'
        WHERE rd.gate_pass_no = ?
      `, [gate_pass_no]);
    }
    
    await pool.query('COMMIT');
    res.status(201).json({ 
      success: true,
      message: 'Material in recorded successfully',
      movement_id: movementId
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error recording material in:', error);
    res.status(500).json({ 
      error: 'Failed to record material in',
      details: error.message
    });
  }
});

app.get('/api/material-in', async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        mm.id,
        mm.gate_pass_no,
        mm.movement_type,
        mm.status,
        mm.movement_date,
        rd.supplier_name,
        rd.vehicle_num,
        r.pr_num,
        rd.transporter_name,
        rd.ewaybill_no
      FROM material_movements mm
      JOIN requisition_details rd ON mm.gate_pass_no = rd.gate_pass_no
      JOIN requisitions_1 r ON rd.requisition_id = r.id
      WHERE mm.movement_type = 'in'
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (mm.gate_pass_no LIKE ? OR r.pr_num LIKE ? OR rd.vehicle_num LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY mm.movement_date DESC`;
    
    const [results] = await pool.query(query, params);
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching material in records:', error);
    res.status(500).json({ 
      error: 'Failed to fetch material in records',
      details: error.message
    });
  }
});

app.get('/api/material-in/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get movement
    const [movement] = await pool.query(`
      SELECT 
        mm.id,
        mm.gate_pass_no,
        mm.movement_type,
        mm.status,
        mm.movement_date,
        rd.supplier_name,
        rd.vehicle_num,
        r.pr_num,
        rd.document_type,
        rd.transporter_name,
        rd.ewaybill_no,
        rd.challan_date
      FROM material_movements mm
      JOIN requisition_details rd ON mm.gate_pass_no = rd.gate_pass_no
      JOIN requisitions_1 r ON rd.requisition_id = r.id
      WHERE mm.id = ? AND mm.movement_type = 'in'
    `, [id]);
    
    if (movement.length === 0) {
      return res.status(404).json({ error: 'Movement not found' });
    }
    
    // Get items
    const [items] = await pool.query(`
      SELECT 
        mmi.id,
        mmi.requisition_item_id,
        mmi.quantity,
        mmi.status,
        ri.item_code,
        ri.material_description,
        ri.quantity_requested,
        ri.unit,
        ri.approx_cost,
        ri.currency
      FROM material_movement_items mmi
      JOIN requistion_items_1 ri ON mmi.requisition_item_id = ri.id
      WHERE mmi.movement_id = ?
    `, [id]);
    
    res.json({
      ...movement[0],
      items
    });
  } catch (error) {
    console.error('Error fetching material in details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch material in details',
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
app.listen(PORT, '200.0.5.115', () => console.log(`Server running on port ${PORT}`));