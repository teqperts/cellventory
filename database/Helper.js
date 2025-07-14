// utils/db.js
import * as SQLite from 'expo-sqlite';

let cachedDb = null;

export async function getDatabase() {
  if (cachedDb) return cachedDb;

  const db = await SQLite.openDatabaseAsync('cellventory.db', {
    useNewConnection: true,
  });

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

  console.log('📦 items table initialized');
  cachedDb = db;
  return db;
}
