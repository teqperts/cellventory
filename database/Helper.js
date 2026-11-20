// database/Helper.js
import * as SQLite from 'expo-sqlite';

let cachedDb = null;

export async function getDatabase() {
  if (cachedDb) return cachedDb;

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
      notes TEXT
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
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  `);

  // Migrate: ensure 'imei' column exists for existing databases created before IMEI feature
  try {
    await db.execAsync('ALTER TABLE customers ADD COLUMN imei TEXT;');
  } catch (e) {
    // Column already exists or table was created with imei column
  }

  // Create IMEI index only after column is guaranteed to exist
  try {
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_customers_imei ON customers(imei);');
  } catch (e) {
    // Suppress index creation error if not supported
  }

  cachedDb = db;
  return db;
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
      added_on, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      quantity = ?, cost_price = ?, selling_price = ?, notes = ?
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

// -------------------------------------------------------------
// Customer Management Functions
// -------------------------------------------------------------

export async function addCustomer(form) {
  const {
    phone,
    purpose,
    name,
    device_model = '',
    imei = '',
    email = '',
    address = '',
    notes = '',
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

  const cleanPhone = phone.trim();
  const created_at = new Date().toISOString();
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO customers (
      phone, purpose, name, device_model, imei, email, address, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanPhone,
      purpose.trim(),
      name.trim(),
      (device_model || '').trim(),
      (imei || '').trim(),
      (email || '').trim(),
      (address || '').trim(),
      (notes || '').trim(),
      created_at,
    ]
  );

  return { id: result.lastInsertRowId, ...form, created_at };
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
      notes = ?
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
