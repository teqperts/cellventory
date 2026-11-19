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
  `);

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
