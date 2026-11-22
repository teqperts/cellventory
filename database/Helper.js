// database/Helper.js
import * as SQLite from 'expo-sqlite';

let cachedDb = null;
let dbInitPromise = null;

export async function getDatabase() {
  if (cachedDb) return cachedDb;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('cellventory.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      part_type TEXT,
      quantity INTEGER DEFAULT 0,
      cost_price REAL,
      selling_price REAL,
      added_on TEXT,
      notes TEXT,
      imei TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      purpose TEXT NOT NULL,
      name TEXT NOT NULL,
      device_model TEXT,
      imei TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'In Progress',
      delivery_date TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      device_model TEXT NOT NULL,
      imei TEXT,
      issue TEXT,
      purpose TEXT DEFAULT 'Repair / Service',
      status TEXT DEFAULT 'In Progress',
      delivery_date TEXT,
      estimated_cost REAL DEFAULT 0,
      advance_paid REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_repairs_customer_id ON repairs(customer_id);
    CREATE INDEX IF NOT EXISTS idx_repairs_imei ON repairs(imei);
    CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
    CREATE INDEX IF NOT EXISTS idx_repairs_delivery_date ON repairs(delivery_date);

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      item_name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER NOT NULL,
      cost_price REAL DEFAULT 0,
      sold_price REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      customer_name TEXT,
      customer_phone TEXT,
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sales_item_id ON sales(item_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
  `);

  // Migrate: ensure 'imei' column exists for customers
  try {
    await db.execAsync('ALTER TABLE customers ADD COLUMN imei TEXT;');
  } catch (e) {
    // Column already exists or table was created with imei column
  }

  // Create customer IMEI index only after column is guaranteed to exist
  try {
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_customers_imei ON customers(imei);');
  } catch (e) {
    // Suppress index creation error if not supported
  }

  // Migrate: ensure 'status' and 'delivery_date' exist on customers
  try {
    await db.execAsync("ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'In Progress';");
  } catch (e) {}

  try {
    await db.execAsync('ALTER TABLE customers ADD COLUMN delivery_date TEXT;');
  } catch (e) {}

  // Migrate: ensure 'estimated_cost' and 'advance_paid' exist on customers
  try {
    await db.execAsync('ALTER TABLE customers ADD COLUMN estimated_cost REAL DEFAULT 0;');
  } catch (e) {}

  try {
    await db.execAsync('ALTER TABLE customers ADD COLUMN advance_paid REAL DEFAULT 0;');
  } catch (e) {}

  // Migrate: ensure 'imei' column exists for items
  try {
    await db.execAsync('ALTER TABLE items ADD COLUMN imei TEXT;');
  } catch (e) {
    // Column already exists or table was created with imei column
  }

  // Create item IMEI index only after column is guaranteed to exist
  try {
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_items_imei ON items(imei);');
  } catch (e) {}

  // Cleanup: ensure inquiries never reside in repairs table
  try {
    await db.execAsync("DELETE FROM repairs WHERE purpose LIKE '%Inquiry%' OR status = 'Inquiry';");
  } catch (e) {}

    cachedDb = db;
    return db;
  } catch (err) {
    dbInitPromise = null;
    throw err;
  }
})();

  return dbInitPromise;
}

export async function addItem(form) {
  const {
    category,
    name,
    brand = '',
    model = '',
    part_type = '',
    quantity = 0,
    cost_price = 0,
    selling_price = 0,
    notes = '',
    imei = '',
  } = form;

  if (!category || !name) {
    throw new Error('Category and Name are required');
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error('Quantity must be a valid positive number');
  }

  const parsedCost = cost_price && !isNaN(cost_price) ? parseFloat(cost_price) : 0;
  const parsedSelling = selling_price && !isNaN(selling_price) ? parseFloat(selling_price) : 0;
  const added_on = new Date().toISOString();

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO items (
      category, name, brand, model, part_type,
      quantity, cost_price, selling_price,
      added_on, notes, imei
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category,
      name,
      brand || '',
      model || '',
      part_type || '',
      parsedQty,
      parsedCost,
      parsedSelling,
      added_on,
      notes || '',
      (imei || '').trim(),
    ]
  );

  return { id: result.lastInsertRowId, ...form, added_on };
}

export async function getAllItems() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM items ORDER BY id DESC');
}

export async function getItemById(id) {
  const db = await getDatabase();
  return await db.getFirstAsync('SELECT * FROM items WHERE id = ?', [id]);
}

export async function getItemByIMEI(imei) {
  if (!imei || !imei.trim()) return null;
  const db = await getDatabase();
  const clean = imei.trim();
  return await db.getFirstAsync(
    'SELECT * FROM items WHERE imei = ? OR notes LIKE ? ORDER BY id DESC LIMIT 1',
    [clean, `%${clean}%`]
  );
}

export async function updateItem(id, form) {
  const {
    category,
    name,
    brand = '',
    model = '',
    part_type = '',
    quantity = 0,
    cost_price = 0,
    selling_price = 0,
    notes = '',
    imei = '',
  } = form;

  if (!id) {
    throw new Error('Item ID is required for update');
  }

  if (!category || !name) {
    throw new Error('Category and Name are required');
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error('Quantity must be a valid positive number');
  }

  const parsedCost = cost_price && !isNaN(cost_price) ? parseFloat(cost_price) : 0;
  const parsedSelling = selling_price && !isNaN(selling_price) ? parseFloat(selling_price) : 0;

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE items SET
      category = ?, name = ?, brand = ?, model = ?, part_type = ?,
      quantity = ?, cost_price = ?, selling_price = ?, notes = ?, imei = ?
    WHERE id = ?`,
    [
      category,
      name,
      brand || '',
      model || '',
      part_type || '',
      parsedQty,
      parsedCost,
      parsedSelling,
      notes || '',
      (imei || '').trim(),
      id,
    ]
  );

  return { id, ...form };
}

export async function deleteItem(id) {
  if (!id) throw new Error('Item ID is required');
  const db = await getDatabase();
  return await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

export async function adjustItemQuantity(id, delta) {
  if (!id) throw new Error('Item ID is required');
  const parsedDelta = parseInt(delta, 10);
  if (isNaN(parsedDelta) || parsedDelta === 0) {
    throw new Error('Valid non-zero delta is required');
  }

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE items SET quantity = MAX(0, quantity + ?) WHERE id = ?`,
    [parsedDelta, id]
  );
  return await getItemById(id);
}

export async function searchItems(text) {
  if (!text || !text.trim()) return [];
  const db = await getDatabase();
  const keyword = `%${text.trim()}%`;
  return await db.getAllAsync(
    `SELECT * FROM items WHERE name LIKE ? OR brand LIKE ? OR model LIKE ? ORDER BY id DESC`,
    [keyword, keyword, keyword]
  );
}

export async function getInventoryStats() {
  const db = await getDatabase();
  const total = await db.getAllAsync('SELECT COUNT(*) as count FROM items');
  const lowStock = await db.getAllAsync('SELECT COUNT(*) as count FROM items WHERE quantity < 10');
  const recent = await db.getAllAsync(
    `SELECT COUNT(*) as count FROM items WHERE added_on >= date('now', '-7 days')`
  );

  return {
    total: total[0]?.count || 0,
    lowStock: lowStock[0]?.count || 0,
    recent: recent[0]?.count || 0,
  };
}

export async function recordSale({
  item_id,
  item_name,
  category = '',
  quantity = 1,
  cost_price = 0,
  sold_price,
  payment_mode = 'Cash',
  customer_name = '',
  customer_phone = '',
}) {
  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  const parsedSoldPrice = parseFloat(sold_price);
  if (isNaN(parsedSoldPrice) || parsedSoldPrice < 0) {
    throw new Error('Valid selling price is required');
  }

  const db = await getDatabase();
  const created_at = new Date().toISOString();

  // Insert into sales table
  const result = await db.runAsync(
    `INSERT INTO sales (
      item_id, item_name, category, quantity, cost_price, sold_price,
      payment_mode, customer_name, customer_phone, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item_id || null,
      item_name,
      category,
      parsedQty,
      parseFloat(cost_price) || 0,
      parsedSoldPrice,
      payment_mode,
      customer_name ? customer_name.trim() : '',
      customer_phone ? customer_phone.trim() : '',
      created_at,
    ]
  );

  // Decrement item quantity in items table
  if (item_id) {
    await db.runAsync(
      `UPDATE items SET quantity = MAX(0, quantity - ?) WHERE id = ?`,
      [parsedQty, item_id]
    );
  }

  const updatedItem = item_id ? await getItemById(item_id) : null;

  return {
    sale: {
      id: result.lastInsertRowId,
      item_id,
      item_name,
      category,
      quantity: parsedQty,
      cost_price: parseFloat(cost_price) || 0,
      sold_price: parsedSoldPrice,
      payment_mode,
      customer_name,
      customer_phone,
      created_at,
    },
    updatedItem,
  };
}

export async function restockItem(itemId, addedQty, newCostPrice) {
  if (!itemId) throw new Error('Item ID is required');
  const parsedQty = parseInt(addedQty, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error('Valid restock quantity is required');
  }

  const db = await getDatabase();
  if (newCostPrice !== undefined && newCostPrice !== null && !isNaN(newCostPrice) && parseFloat(newCostPrice) > 0) {
    await db.runAsync(
      `UPDATE items SET quantity = quantity + ?, cost_price = ? WHERE id = ?`,
      [parsedQty, parseFloat(newCostPrice), itemId]
    );
  } else {
    await db.runAsync(
      `UPDATE items SET quantity = quantity + ? WHERE id = ?`,
      [parsedQty, itemId]
    );
  }

  return await getItemById(itemId);
}

export function computeFinancialSummary(items = []) {
  let totalUnits = 0;
  let totalCost = 0;
  let totalRetail = 0;
  let lowStock = 0;
  let outOfStock = 0;

  for (const item of items) {
    const q = Number(item.quantity) || 0;
    const cost = Number(item.cost_price) || 0;
    const sell = Number(item.selling_price) || 0;
    totalUnits += q;
    totalCost += q * cost;
    totalRetail += q * sell;
    if (q === 0) {
      outOfStock++;
    } else if (q < 10) {
      lowStock++;
    }
  }

  const potentialProfit = Math.max(0, totalRetail - totalCost);
  const marginPercent = totalRetail > 0 ? ((potentialProfit / totalRetail) * 100).toFixed(1) : '0';

  return {
    total_items: items.length,
    total_units: totalUnits,
    total_cost_value: totalCost,
    total_retail_value: totalRetail,
    potential_profit: potentialProfit,
    margin_percent: marginPercent,
    low_stock_count: lowStock,
    out_of_stock_count: outOfStock,
  };
}

export async function getInventoryFinancialSummary() {
  const items = await getAllItems();
  return computeFinancialSummary(items);
}

export async function getSalesByItemId(itemId) {
  if (!itemId) return [];
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT * FROM sales WHERE item_id = ? ORDER BY id DESC`,
    [itemId]
  );
}

export async function getAllSales(limit = 50) {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT * FROM sales ORDER BY id DESC LIMIT ?`,
    [limit]
  );
}

// -------------------------------------------------------------
// Customer Management Functions (Streamlined: Name & Phone)
// -------------------------------------------------------------

export async function findOrCreateCustomer({ name, phone, purpose = 'Repair / Service' }) {
  const cleanPhone = (phone || '').trim();
  const cleanName = (name || '').trim();
  const isAnInquiry = (purpose || '').toLowerCase().includes('inquiry');

  if (!cleanPhone && !isAnInquiry) {
    throw new Error('Mobile number is required');
  }

  const db = await getDatabase();

  if (cleanPhone) {
    const existing = await db.getFirstAsync(
      'SELECT * FROM customers WHERE phone = ? ORDER BY id ASC LIMIT 1',
      [cleanPhone]
    );

    if (existing) {
      if (cleanName && cleanName !== existing.name && cleanName !== 'Walk-in Customer') {
        await db.runAsync('UPDATE customers SET name = ? WHERE id = ?', [cleanName, existing.id]);
        return { ...existing, name: cleanName };
      }
      return existing;
    }
  }

  const finalName = cleanName || (isAnInquiry ? 'Walk-in Customer' : '');
  if (!finalName) {
    throw new Error('Customer name is required');
  }

  const created_at = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO customers (name, phone, created_at, purpose) VALUES (?, ?, ?, ?)',
    [finalName, cleanPhone, created_at, purpose]
  );

  return {
    id: result.lastInsertRowId,
    name: finalName,
    phone: cleanPhone,
    created_at,
    purpose,
  };
}

// -------------------------------------------------------------
// Repair Orders / Multi-Device Jobs Management Functions
// -------------------------------------------------------------

export async function addRepair(form) {
  const {
    customer_id,
    device_model,
    imei = '',
    issue = '',
    purpose = 'Repair / Service',
    status = 'In Progress',
    delivery_date = '',
    estimated_cost = 0,
    advance_paid = 0,
    notes = '',
  } = form;

  if (!customer_id) {
    throw new Error('Customer ID is required');
  }
  if (!device_model || !device_model.trim()) {
    throw new Error('Device model is required');
  }

  const parsedCost =
    estimated_cost !== undefined && estimated_cost !== '' && !isNaN(estimated_cost)
      ? parseFloat(estimated_cost)
      : 0;
  const parsedAdvance =
    advance_paid !== undefined && advance_paid !== '' && !isNaN(advance_paid)
      ? parseFloat(advance_paid)
      : 0;
  const created_at = new Date().toISOString();

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO repairs (
      customer_id, device_model, imei, issue, purpose, status, delivery_date,
      estimated_cost, advance_paid, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer_id,
      device_model.trim(),
      (imei || '').trim(),
      (issue || notes || '').trim(),
      (purpose || 'Repair / Service').trim(),
      (status || 'In Progress').trim(),
      (delivery_date || '').trim(),
      parsedCost,
      parsedAdvance,
      (notes || '').trim(),
      created_at,
      created_at,
    ]
  );

  return {
    id: result.lastInsertRowId,
    customer_id,
    device_model: device_model.trim(),
    imei: (imei || '').trim(),
    issue: (issue || notes || '').trim(),
    purpose: (purpose || 'Repair / Service').trim(),
    status: (status || 'In Progress').trim(),
    delivery_date: (delivery_date || '').trim(),
    estimated_cost: parsedCost,
    advance_paid: parsedAdvance,
    notes: (notes || '').trim(),
    created_at,
    updated_at: created_at,
  };
}

export async function getRepairsByCustomerId(customerId) {
  if (!customerId) return [];
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM repairs WHERE customer_id = ? ORDER BY id DESC',
    [customerId]
  );
}

export async function getRepairById(id) {
  if (!id) return null;
  const db = await getDatabase();
  return await db.getFirstAsync(
    `SELECT r.*, c.name as customer_name, c.phone as customer_phone
     FROM repairs r
     JOIN customers c ON r.customer_id = c.id
     WHERE r.id = ?`,
    [id]
  );
}

export async function updateRepair(id, form) {
  if (!id) throw new Error('Repair ID is required');

  const {
    device_model,
    imei = '',
    issue = '',
    purpose = 'Repair / Service',
    status = 'In Progress',
    delivery_date = '',
    estimated_cost = 0,
    advance_paid = 0,
    notes = '',
  } = form;

  const parsedCost =
    estimated_cost !== undefined && estimated_cost !== '' && !isNaN(estimated_cost)
      ? parseFloat(estimated_cost)
      : 0;
  const parsedAdvance =
    advance_paid !== undefined && advance_paid !== '' && !isNaN(advance_paid)
      ? parseFloat(advance_paid)
      : 0;
  const updated_at = new Date().toISOString();

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE repairs SET
      device_model = ?, imei = ?, issue = ?, purpose = ?, status = ?,
      delivery_date = ?, estimated_cost = ?, advance_paid = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      (device_model || '').trim(),
      (imei || '').trim(),
      (issue || notes || '').trim(),
      (purpose || 'Repair / Service').trim(),
      (status || 'In Progress').trim(),
      (delivery_date || '').trim(),
      parsedCost,
      parsedAdvance,
      (notes || '').trim(),
      updated_at,
      id,
    ]
  );

  return await getRepairById(id);
}

export async function updateRepairStatus(id, newStatus) {
  if (!id) throw new Error('Repair ID is required');
  const db = await getDatabase();
  const updated_at = new Date().toISOString();
  await db.runAsync('UPDATE repairs SET status = ?, updated_at = ? WHERE id = ?', [
    (newStatus || 'In Progress').trim(),
    updated_at,
    id,
  ]);
  return await getRepairById(id);
}

export async function deleteRepair(id) {
  if (!id) throw new Error('Repair ID is required');
  const db = await getDatabase();
  await db.runAsync('DELETE FROM repairs WHERE id = ?', [id]);
  return true;
}

export async function getAllRepairs() {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT r.*, c.name as customer_name, c.phone as customer_phone
     FROM repairs r
     JOIN customers c ON r.customer_id = c.id
     WHERE (r.purpose IS NULL OR r.purpose NOT LIKE '%Inquiry%')
       AND (r.status IS NULL OR r.status != 'Inquiry')
     ORDER BY r.id DESC`
  );
}

export async function getCustomerWithRepairs(customerId) {
  if (!customerId) return null;
  const customer = await getCustomerById(customerId);
  if (!customer) return null;

  const repairs = await getRepairsByCustomerId(customerId);
  let totalEstimated = 0;
  let totalAdvance = 0;
  let activeRepairsCount = 0;

  for (const r of repairs) {
    const isRInquiry =
      r.status === 'Inquiry' ||
      (r.purpose && r.purpose.toLowerCase().includes('inquiry'));
    if (!isRInquiry) {
      const est = parseFloat(r.estimated_cost) || 0;
      const adv = parseFloat(r.advance_paid) || 0;
      totalEstimated += est;
      totalAdvance += adv;
      if (r.status !== 'Delivered') {
        activeRepairsCount++;
      }
    }
  }

  const totalBalanceDue = Math.max(0, totalEstimated - totalAdvance);

  return {
    ...customer,
    repairs,
    stats: {
      totalEstimated,
      totalAdvance,
      totalBalanceDue,
      activeRepairsCount,
      totalDevicesCount: repairs.length,
    },
  };
}

export async function addCustomer(form) {
  const {
    phone = '',
    purpose = 'Repair / Service',
    name = '',
    device_model = '',
    imei = '',
    email = '',
    address = '',
    notes = '',
    status = '',
    delivery_date = '',
    estimated_cost = 0,
    advance_paid = 0,
  } = form;

  const isAnInquiry = (purpose || '').toLowerCase().includes('inquiry');

  if (!isAnInquiry) {
    if (!phone || !phone.trim()) {
      throw new Error('Mobile number is required');
    }
    if (!name || !name.trim()) {
      throw new Error('Customer name is required');
    }
  }
  if (!purpose || !purpose.trim()) {
    throw new Error('Purpose of visit is required');
  }

  const cleanPhone = (phone || '').trim();
  const cleanName = (name || '').trim() || (isAnInquiry ? 'Walk-in Customer' : '');
  const created_at = new Date().toISOString();
  const defaultStatus = status
    ? status.trim()
    : isAnInquiry
    ? 'Inquiry'
    : 'In Progress';
  const defaultDelivery = delivery_date ? delivery_date.trim() : '';
  const parsedCost =
    estimated_cost !== undefined && estimated_cost !== '' && !isNaN(estimated_cost)
      ? parseFloat(estimated_cost)
      : 0;
  const parsedAdvance =
    advance_paid !== undefined && advance_paid !== '' && !isNaN(advance_paid)
      ? parseFloat(advance_paid)
      : 0;

  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO customers (
      phone, purpose, name, device_model, imei, email, address, notes, created_at, status, delivery_date, estimated_cost, advance_paid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanPhone,
      purpose.trim(),
      cleanName,
      (device_model || '').trim(),
      (imei || '').trim(),
      (email || '').trim(),
      (address || '').trim(),
      (notes || '').trim(),
      created_at,
      defaultStatus,
      defaultDelivery,
      parsedCost,
      parsedAdvance,
    ]
  );

  const customerId = result.lastInsertRowId;

  // Also create a repair ticket only if NOT an inquiry and device/repair details are provided
  let repairId = null;
  if (!isAnInquiry && (device_model || imei || (purpose && purpose.toLowerCase().includes('repair')) || parsedCost > 0 || parsedAdvance > 0)) {
    try {
      const rep = await addRepair({
        customer_id: customerId,
        device_model: device_model || 'Device',
        imei: imei || '',
        issue: notes || '',
        purpose: purpose.trim(),
        status: defaultStatus,
        delivery_date: defaultDelivery,
        estimated_cost: parsedCost,
        advance_paid: parsedAdvance,
        notes: notes || '',
      });
      repairId = rep.id;
    } catch (e) {
      // Fallback
    }
  }

  return {
    id: customerId,
    ...form,
    repair_id: repairId,
    phone: cleanPhone,
    name: cleanName,
    created_at,
    status: defaultStatus,
    delivery_date: defaultDelivery,
    estimated_cost: parsedCost,
    advance_paid: parsedAdvance,
  };
}

export async function getAllCustomers() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM customers ORDER BY id DESC');
}

export async function getCustomerById(id) {
  if (!id) return null;
  const db = await getDatabase();
  return await db.getFirstAsync('SELECT * FROM customers WHERE id = ?', [id]);
}

export async function getCustomerByPhone(phone) {
  if (!phone || !phone.trim()) return null;
  const db = await getDatabase();
  return await db.getFirstAsync('SELECT * FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1', [
    phone.trim(),
  ]);
}

export async function getCustomerHistoryByPhone(phone) {
  if (!phone || !phone.trim()) return [];
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM customers WHERE phone = ? ORDER BY id DESC',
    [phone.trim()]
  );
}

export async function updateCustomer(id, form) {
  if (!id) throw new Error('Customer ID is required');

  const {
    phone,
    purpose,
    name,
    device_model = '',
    imei = '',
    email = '',
    address = '',
    notes = '',
    status = '',
    delivery_date = '',
    estimated_cost = 0,
    advance_paid = 0,
  } = form;

  if (!phone || !phone.trim()) {
    throw new Error('Mobile number is required');
  }
  if (!purpose || !purpose.trim()) {
    throw new Error('Purpose of visit is required');
  }
  if (!name || !name.trim()) {
    throw new Error('Customer name is required');
  }

  const parsedCost =
    estimated_cost !== undefined && estimated_cost !== '' && !isNaN(estimated_cost)
      ? parseFloat(estimated_cost)
      : 0;
  const parsedAdvance =
    advance_paid !== undefined && advance_paid !== '' && !isNaN(advance_paid)
      ? parseFloat(advance_paid)
      : 0;

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE customers SET
      phone = ?,
      purpose = ?,
      name = ?,
      device_model = ?,
      imei = ?,
      email = ?,
      address = ?,
      notes = ?,
      status = ?,
      delivery_date = ?,
      estimated_cost = ?,
      advance_paid = ?
    WHERE id = ?`,
    [
      phone.trim(),
      purpose.trim(),
      name.trim(),
      (device_model || '').trim(),
      (imei || '').trim(),
      (email || '').trim(),
      (address || '').trim(),
      (notes || '').trim(),
      (status || 'In Progress').trim(),
      (delivery_date || '').trim(),
      parsedCost,
      parsedAdvance,
      id,
    ]
  );

  return await getCustomerById(id);
}

export async function deleteCustomer(id) {
  if (!id) throw new Error('Customer ID is required');
  const db = await getDatabase();
  await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
  return true;
}

export async function searchCustomers(text) {
  if (!text || !text.trim()) return await getAllCustomers();
  const db = await getDatabase();
  const keyword = `%${text.trim()}%`;
  return await db.getAllAsync(
    `SELECT * FROM customers 
     WHERE name LIKE ? OR phone LIKE ? OR device_model LIKE ? OR purpose LIKE ? OR imei LIKE ? 
     ORDER BY id DESC`,
    [keyword, keyword, keyword, keyword, keyword]
  );
}

export async function getCustomerStats() {
  const db = await getDatabase();
  const total = await db.getAllAsync('SELECT COUNT(*) as count FROM customers');
  const repairs = await db.getAllAsync(
    `SELECT COUNT(*) as count FROM customers WHERE purpose LIKE '%Repair%'`
  );
  const purchases = await db.getAllAsync(
    `SELECT COUNT(*) as count FROM customers WHERE purpose LIKE '%Purchase%'`
  );

  return {
    total: total[0]?.count || 0,
    repairs: repairs[0]?.count || 0,
    purchases: purchases[0]?.count || 0,
  };
}

export async function searchCustomersByPhonePrefix(digits, limit = 5) {
  if (!digits || !digits.trim()) return [];
  const db = await getDatabase();
  const keyword = `%${digits.trim()}%`;
  return await db.getAllAsync(
    `SELECT * FROM customers WHERE phone LIKE ? ORDER BY id DESC LIMIT ?`,
    [keyword, limit]
  );
}

export async function convertCustomerPurpose(id, newPurpose, appendNote = '') {
  if (!id) throw new Error('Customer ID is required');
  if (!newPurpose || !newPurpose.trim()) throw new Error('New purpose is required');

  const customer = await getCustomerById(id);
  if (!customer) throw new Error('Customer record not found');

  const currentNotes = customer.notes || '';
  const timestamp = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const conversionLog = `\n[Converted from "${customer.purpose}" to "${newPurpose.trim()}" on ${timestamp}]${
    appendNote ? ' ' + appendNote.trim() : ''
  }`;
  const updatedNotes = (currentNotes + conversionLog).trim();

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE customers SET purpose = ?, notes = ? WHERE id = ?`,
    [newPurpose.trim(), updatedNotes, id]
  );

  return await getCustomerById(id);
}

export async function convertInquiryToRepair(customerId, form) {
  if (!customerId) throw new Error('Customer ID is required');

  const {
    phone = '',
    name = '',
    device_model = '',
    imei = '',
    email = '',
    address = '',
    notes = '',
    delivery_date = '',
    estimated_cost = 0,
    advance_paid = 0,
    status = 'In Progress',
    purpose = 'Repair / Service',
  } = form;

  const cleanPhone = (phone || '').trim();
  const cleanName = (name || '').trim() || 'Walk-in Customer';
  const cleanPurpose = (purpose || 'Repair / Service').trim();
  const cleanStatus = status && status !== 'Inquiry' ? status.trim() : 'In Progress';
  const parsedCost =
    estimated_cost !== undefined && estimated_cost !== '' && !isNaN(estimated_cost)
      ? parseFloat(estimated_cost)
      : 0;
  const parsedAdvance =
    advance_paid !== undefined && advance_paid !== '' && !isNaN(advance_paid)
      ? parseFloat(advance_paid)
      : 0;

  const db = await getDatabase();

  // 1. Update customer record
  await db.runAsync(
    `UPDATE customers SET
      phone = ?,
      purpose = ?,
      name = ?,
      device_model = ?,
      imei = ?,
      email = ?,
      address = ?,
      notes = ?,
      status = ?,
      delivery_date = ?,
      estimated_cost = ?,
      advance_paid = ?
    WHERE id = ?`,
    [
      cleanPhone,
      cleanPurpose,
      cleanName,
      (device_model || '').trim(),
      (imei || '').trim(),
      (email || '').trim(),
      (address || '').trim(),
      (notes || '').trim(),
      cleanStatus,
      (delivery_date || '').trim(),
      parsedCost,
      parsedAdvance,
      customerId,
    ]
  );

  // 2. Sync or create repair record
  const existingRepairs = await getRepairsByCustomerId(customerId);
  let repairRecord = null;
  if (existingRepairs && existingRepairs.length > 0) {
    const rId = existingRepairs[0].id;
    repairRecord = await updateRepair(rId, {
      customer_id: customerId,
      device_model: device_model || existingRepairs[0].device_model || 'Device',
      imei: imei || existingRepairs[0].imei || '',
      issue: notes || existingRepairs[0].issue || '',
      purpose: cleanPurpose,
      status: cleanStatus,
      delivery_date: delivery_date || '',
      estimated_cost: parsedCost,
      advance_paid: parsedAdvance,
      notes: notes || '',
    });
  } else {
    repairRecord = await addRepair({
      customer_id: customerId,
      device_model: device_model || 'Device',
      imei: imei || '',
      issue: notes || '',
      purpose: cleanPurpose,
      status: cleanStatus,
      delivery_date: delivery_date || '',
      estimated_cost: parsedCost,
      advance_paid: parsedAdvance,
      notes: notes || '',
    });
  }

  return {
    customer: await getCustomerById(customerId),
    repair: repairRecord,
  };
}

export async function getCustomerByIMEI(imei) {
  if (!imei || !imei.trim()) return null;
  const db = await getDatabase();
  const clean = imei.trim();

  const direct = await db.getFirstAsync(
    'SELECT * FROM customers WHERE imei = ? ORDER BY id DESC LIMIT 1',
    [clean]
  );
  if (direct) return direct;

  try {
    const rep = await db.getFirstAsync(
      `SELECT r.*, c.name, c.phone, c.email, c.address 
       FROM repairs r 
       JOIN customers c ON r.customer_id = c.id 
       WHERE r.imei = ? 
       ORDER BY r.id DESC LIMIT 1`,
      [clean]
    );
    if (rep) {
      return {
        ...rep,
        device_model: rep.device_model,
        purpose: rep.purpose,
        status: rep.status,
        notes: rep.notes || rep.issue,
        customer_id: rep.customer_id,
      };
    }
  } catch (e) {
    // fallback
  }

  return null;
}

export async function getDeviceHistoryByIMEI(imei) {
  if (!imei || !imei.trim()) return [];
  const db = await getDatabase();
  const clean = imei.trim();

  const customerHistory = await db.getAllAsync(
    'SELECT * FROM customers WHERE imei = ? ORDER BY id DESC',
    [clean]
  );
  if (customerHistory && customerHistory.length > 0) {
    return customerHistory;
  }

  try {
    const repairHistory = await db.getAllAsync(
      `SELECT r.*, c.name as customer_name, c.phone as customer_phone 
       FROM repairs r 
       JOIN customers c ON r.customer_id = c.id 
       WHERE r.imei = ? 
       ORDER BY r.id DESC`,
      [clean]
    );
    if (repairHistory && repairHistory.length > 0) {
      return repairHistory;
    }
  } catch (e) {
    // fallback
  }

  return [];
}

export async function searchCustomersByIMEIPrefix(digits, limit = 5) {
  if (!digits || !digits.trim()) return [];
  const db = await getDatabase();
  const keyword = `%${digits.trim()}%`;
  return await db.getAllAsync(
    'SELECT * FROM customers WHERE imei LIKE ? ORDER BY id DESC LIMIT ?',
    [keyword, limit]
  );
}

export async function lookupIMEI(rawImei) {
  const clean = rawImei ? rawImei.trim() : '';
  if (!clean) return { type: 'empty' };

  // 1. Check Shop Inventory
  const inventoryItem = await getItemByIMEI(clean);
  if (inventoryItem) {
    return { type: 'inventory', item: inventoryItem };
  }

  // 2. Check Customer Records
  const customer = await getCustomerByIMEI(clean);
  if (customer) {
    const history = await getDeviceHistoryByIMEI(clean);
    return { type: 'customer', customer, history };
  }

  // 3. Brand New Device
  return { type: 'new', imei: clean };
}

// -------------------------------------------------------------
// Daily Operations & Next Actions Engine
// -------------------------------------------------------------

export async function getDeliveriesDueToday() {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT * FROM customers 
     WHERE purpose LIKE '%Repair%' 
       AND (status IS NULL OR status != 'Delivered')
       AND (
         delivery_date = date('now', 'localtime') 
         OR status = 'Ready for Delivery'
         OR (delivery_date IS NULL AND date(created_at) = date('now', 'localtime'))
       )
     ORDER BY 
       CASE WHEN status = 'Ready for Delivery' THEN 0 ELSE 1 END,
       id DESC`
  );
}

export async function getNextActionSuggestions() {
  const db = await getDatabase();

  // 1. Pending Inquiries needing follow-up (created in last 7 days)
  const pendingInquiries = await db.getAllAsync(
    `SELECT * FROM customers 
     WHERE purpose LIKE '%Inquiry%' 
       AND (status IS NULL OR status = 'Inquiry')
       AND created_at >= date('now', '-7 days')
     ORDER BY id DESC LIMIT 5`
  );

  // 2. Critical Low Stock items (quantity <= 3)
  const criticalStock = await db.getAllAsync(
    `SELECT * FROM items 
     WHERE quantity <= 3 
     ORDER BY quantity ASC, id DESC LIMIT 5`
  );

  // 3. Overdue Repairs (promised date past, not delivered)
  const overdueRepairs = await db.getAllAsync(
    `SELECT * FROM customers 
     WHERE purpose LIKE '%Repair%' 
       AND delivery_date < date('now', 'localtime')
       AND delivery_date != ''
       AND (status IS NULL OR status != 'Delivered')
     ORDER BY delivery_date ASC LIMIT 5`
  );

  return {
    pendingInquiries: pendingInquiries || [],
    criticalStock: criticalStock || [],
    overdueRepairs: overdueRepairs || [],
  };
}

export async function updateCustomerStatus(id, newStatus) {
  if (!id) throw new Error('Customer ID is required');
  const db = await getDatabase();
  await db.runAsync('UPDATE customers SET status = ? WHERE id = ?', [newStatus, id]);
  try {
    await db.runAsync('UPDATE repairs SET status = ? WHERE id = ? OR customer_id = ?', [newStatus, id, id]);
  } catch (e) {}
  return await getCustomerById(id);
}

export async function getHomeDashboardStats() {
  const db = await getDatabase();

  const dueToday = await db.getAllAsync(
    `SELECT COUNT(*) as count FROM customers 
     WHERE purpose LIKE '%Repair%' 
       AND (status IS NULL OR status != 'Delivered')
       AND (
         delivery_date = date('now', 'localtime') 
         OR status = 'Ready for Delivery'
         OR (delivery_date IS NULL AND date(created_at) = date('now', 'localtime'))
       )`
  );

  const inProgressRepairs = await db.getAllAsync(
    `SELECT COUNT(*) as count FROM customers 
     WHERE purpose LIKE '%Repair%' 
       AND (status IS NULL OR status = 'In Progress')`
  );

  const lowStock = await db.getAllAsync('SELECT COUNT(*) as count FROM items WHERE quantity < 10');

  return {
    dueToday: dueToday[0]?.count || 0,
    inProgress: inProgressRepairs[0]?.count || 0,
    lowStock: lowStock[0]?.count || 0,
  };
}
