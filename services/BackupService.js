// services/BackupService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';

import { auth, storage } from '../config/firebase';
import { getDatabase } from '../database/Helper';

const BACKUP_META_PREFIX = '@cellventory_backup_meta_';

/**
 * Creates a complete JSON snapshot of all SQLite tables.
 */
export async function createDatabaseSnapshot() {
  const db = await getDatabase();

  const [items, customers, repairs, sales] = await Promise.all([
    db.getAllAsync('SELECT * FROM items ORDER BY id ASC').catch(() => []),
    db.getAllAsync('SELECT * FROM customers ORDER BY id ASC').catch(() => []),
    db.getAllAsync('SELECT * FROM repairs ORDER BY id ASC').catch(() => []),
    db.getAllAsync('SELECT * FROM sales ORDER BY id ASC').catch(() => []),
  ]);

  const timestamp = new Date().toISOString();
  const currentUser = auth.currentUser;

  return {
    version: '1.0.0',
    timestamp,
    shop_uid: currentUser ? currentUser.uid : null,
    shop_email: currentUser ? currentUser.email : null,
    data: {
      items: items || [],
      customers: customers || [],
      repairs: repairs || [],
      sales: sales || [],
    },
    stats: {
      items_count: (items || []).length,
      customers_count: (customers || []).length,
      repairs_count: (repairs || []).length,
      sales_count: (sales || []).length,
    },
  };
}

/**
 * Uploads snapshot JSON to Firebase Storage under the authenticated store user's folder.
 */
export async function uploadBackupToCloud(snapshot) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be logged in to back up data to the cloud.');
  }

  const uid = currentUser.uid;
  const jsonString = JSON.stringify(snapshot, null, 2);

  // 1. Upload latest reference
  const latestRef = ref(storage, `backups/${uid}/latest_backup.json`);
  await uploadString(latestRef, jsonString, 'raw', {
    contentType: 'application/json',
  });

  // 2. Upload timestamped snapshot for history
  const historyRef = ref(storage, `backups/${uid}/history/${Date.now()}.json`);
  await uploadString(historyRef, jsonString, 'raw', {
    contentType: 'application/json',
  }).catch((e) => console.warn('History upload warning:', e));

  // 3. Cache metadata locally
  const meta = {
    timestamp: snapshot.timestamp,
    stats: snapshot.stats,
    sizeBytes: jsonString.length,
  };

  await AsyncStorage.setItem(`${BACKUP_META_PREFIX}${uid}`, JSON.stringify(meta)).catch(() => {});

  return meta;
}

/**
 * Fetches cached backup metadata for the active store user.
 */
export async function getLocalBackupMeta() {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    const raw = await AsyncStorage.getItem(`${BACKUP_META_PREFIX}${currentUser.uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Downloads the latest backup snapshot from Firebase Storage.
 */
export async function downloadLatestBackup() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be logged in to restore from cloud.');
  }

  const uid = currentUser.uid;
  const latestRef = ref(storage, `backups/${uid}/latest_backup.json`);
  const downloadUrl = await getDownloadURL(latestRef);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch cloud backup (${response.status})`);
  }

  const snapshot = await response.json();
  if (!snapshot || !snapshot.data) {
    throw new Error('Downloaded backup format is invalid or corrupt.');
  }

  return snapshot;
}

/**
 * Safely restores SQLite database from a snapshot object.
 */
export async function restoreDatabaseSnapshot(snapshot) {
  if (!snapshot || !snapshot.data) {
    throw new Error('Invalid snapshot data.');
  }

  const db = await getDatabase();
  const { items = [], customers = [], repairs = [], sales = [] } = snapshot.data;

  // Perform restore inside transaction
  await db.withTransactionAsync(async () => {
    // 1. Items
    await db.runAsync('DELETE FROM items;');
    await db.runAsync('DELETE FROM sqlite_sequence WHERE name="items";').catch(() => {});
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO items (id, category, name, brand, model, part_type, quantity, cost_price, selling_price, added_on, notes, imei)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          item.id ?? null,
          item.category ?? null,
          item.name ?? 'Item',
          item.brand ?? null,
          item.model ?? null,
          item.part_type ?? null,
          item.quantity ?? 0,
          item.cost_price ?? 0,
          item.selling_price ?? 0,
          item.added_on ?? null,
          item.notes ?? null,
          item.imei ?? null,
        ]
      );
    }

    // 2. Customers
    await db.runAsync('DELETE FROM customers;');
    await db.runAsync('DELETE FROM sqlite_sequence WHERE name="customers";').catch(() => {});
    for (const c of customers) {
      await db.runAsync(
        `INSERT INTO customers (id, phone, purpose, name, device_model, imei, email, address, notes, created_at, status, delivery_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          c.id ?? null,
          c.phone ?? '',
          c.purpose ?? 'Customer',
          c.name ?? '',
          c.device_model ?? null,
          c.imei ?? null,
          c.email ?? null,
          c.address ?? null,
          c.notes ?? null,
          c.created_at ?? null,
          c.status ?? 'In Progress',
          c.delivery_date ?? null,
        ]
      );
    }

    // 3. Repairs
    await db.runAsync('DELETE FROM repairs;');
    await db.runAsync('DELETE FROM sqlite_sequence WHERE name="repairs";').catch(() => {});
    for (const r of repairs) {
      await db.runAsync(
        `INSERT INTO repairs (id, customer_id, device_model, imei, issue, purpose, status, delivery_date, estimated_cost, advance_paid, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          r.id ?? null,
          r.customer_id,
          r.device_model ?? '',
          r.imei ?? null,
          r.issue ?? null,
          r.purpose ?? 'Repair / Service',
          r.status ?? 'In Progress',
          r.delivery_date ?? null,
          r.estimated_cost ?? 0,
          r.advance_paid ?? 0,
          r.notes ?? null,
          r.created_at ?? null,
          r.updated_at ?? null,
        ]
      );
    }

    // 4. Sales
    await db.runAsync('DELETE FROM sales;');
    await db.runAsync('DELETE FROM sqlite_sequence WHERE name="sales";').catch(() => {});
    for (const s of sales) {
      await db.runAsync(
        `INSERT INTO sales (id, item_id, item_name, category, quantity, cost_price, sold_price, payment_mode, customer_name, customer_phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          s.id ?? null,
          s.item_id ?? null,
          s.item_name ?? 'Item',
          s.category ?? null,
          s.quantity ?? 1,
          s.cost_price ?? 0,
          s.sold_price ?? 0,
          s.payment_mode ?? 'Cash',
          s.customer_name ?? null,
          s.customer_phone ?? null,
          s.created_at ?? null,
        ]
      );
    }
  });

  return {
    restored_items: items.length,
    restored_customers: customers.length,
    restored_repairs: repairs.length,
    restored_sales: sales.length,
  };
}

/**
 * Checks if the last backup is older than 24 hours. If so, triggers silent cloud backup.
 */
export async function checkAndRunDailyAutoBackup() {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const meta = await getLocalBackupMeta();
    if (meta && meta.timestamp) {
      const lastTime = new Date(meta.timestamp).getTime();
      const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        // Backup is recent, skip
        return;
      }
    }

    // Run silent backup
    const snapshot = await createDatabaseSnapshot();
    await uploadBackupToCloud(snapshot);
    console.log('Automated daily cloud backup completed successfully.');
  } catch (err) {
    // Fail silently in background to avoid disrupting app experience; suppress unhandled ArrayBuffer warnings
    const msg = err?.message || String(err);
    if (!msg.includes('ArrayBuffer')) {
      console.warn('Daily auto-backup background warning:', msg);
    }
  }
}
