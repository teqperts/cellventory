// services/BackupService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIdToken } from 'firebase/auth';
import { getDownloadURL, ref } from 'firebase/storage';

import { auth, storage } from '../config/firebase';
import { getDatabase } from '../database/Helper';

const BACKUP_META_PREFIX = '@cellventory_backup_meta_';
const DEFAULT_STORAGE_BUCKET = 'cellventory.firebasestorage.app';

export const DEFAULT_AUTO_BACKUP_CHECK_INTERVAL_MS = 3600000; // 1 hour

let activeAutoBackupPromise = null;

/**
 * Formats a Date into local YYYY-MM-DD for backup metadata.
 */
export function getLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if there is no successful backup or at least one hour has elapsed.
 */
export function shouldRunHourlyBackup(meta, now = new Date()) {
  if (!meta || !meta.timestamp) return true;

  const lastTimestampMs = new Date(meta.timestamp).getTime();
  if (isNaN(lastTimestampMs)) return true;

  const elapsedMs = now.getTime() - lastTimestampMs;
  return elapsedMs >= DEFAULT_AUTO_BACKUP_CHECK_INTERVAL_MS;
}

/**
 * Uploads a UTF-8 JSON string to Firebase Storage via REST API to avoid
 * React Native's BlobManager ArrayBuffer/Uint8Array crash in uploadString/uploadBytes.
 */
async function uploadJsonToFirebaseStorage(objectPath, jsonString, currentUser) {
  const token = await getIdToken(currentUser);
  const bucket = storage?.app?.options?.storageBucket || DEFAULT_STORAGE_BUCKET;
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(
    objectPath
  )}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Firebase ${token}`,
    },
    body: jsonString,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const error = new Error(`Cloud backup upload failed (${response.status}): ${errText}`);
    error.status = response.status;
    throw error;
  }

  return response.json().catch(() => ({}));
}

/**
 * Creates a complete JSON snapshot of all SQLite tables.
 */
export async function createDatabaseSnapshot() {
  const db = await getDatabase();

  const [items, customers, repairs, sales, inventoryMovements] = await Promise.all([
    db.getAllAsync('SELECT * FROM items ORDER BY id ASC'),
    db.getAllAsync('SELECT * FROM customers ORDER BY id ASC'),
    db.getAllAsync('SELECT * FROM repairs ORDER BY id ASC'),
    db.getAllAsync('SELECT * FROM sales ORDER BY id ASC'),
    db.getAllAsync('SELECT * FROM inventory_movements ORDER BY id ASC'),
  ]);

  const timestamp = new Date().toISOString();
  const currentUser = auth.currentUser;

  return {
    version: '1.0.0',
    timestamp,
    shop_uid: currentUser ? currentUser.uid : null,
    shop_email: currentUser ? currentUser.email : null,
    data: {
      items,
      customers,
      repairs,
      sales,
      inventory_movements: inventoryMovements,
    },
    stats: {
      items_count: items.length,
      customers_count: customers.length,
      repairs_count: repairs.length,
      sales_count: sales.length,
      inventory_movements_count: inventoryMovements.length,
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
  const todayKey = getLocalDateKey(snapshot?.timestamp ? new Date(snapshot.timestamp) : new Date());

  // Upload latest backup (overwrites previous — no history kept)
  await uploadJsonToFirebaseStorage(`backups/${uid}/latest_backup.json`, jsonString, currentUser);

  // Cache metadata locally
  const meta = {
    timestamp: snapshot.timestamp,
    lastAttemptAt: snapshot.timestamp,
    lastError: null,
    dateKey: todayKey,
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

export async function recordBackupFailure(error) {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const previousMeta = await getLocalBackupMeta();
  const meta = {
    ...(previousMeta || {}),
    lastAttemptAt: new Date().toISOString(),
    lastError: error?.message || String(error),
  };

  try {
    await AsyncStorage.setItem(
      `${BACKUP_META_PREFIX}${currentUser.uid}`,
      JSON.stringify(meta)
    );
  } catch (storageError) {
    console.warn('Failed to store backup failure status:', storageError?.message || storageError);
  }

  return meta;
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
 * Safely restores SQLite database from a snapshot object, including all schema columns.
 */
export async function restoreDatabaseSnapshot(snapshot) {
  if (!snapshot || !snapshot.data || typeof snapshot.data !== 'object') {
    throw new Error('Invalid snapshot data.');
  }

  const tableNames = ['items', 'customers', 'repairs', 'sales'];
  for (const tableName of tableNames) {
    if (!Array.isArray(snapshot.data[tableName])) {
      throw new Error(`Invalid snapshot data: ${tableName} must be an array.`);
    }
  }
  const inventoryMovements = snapshot.data.inventory_movements;
  if (inventoryMovements !== undefined && !Array.isArray(inventoryMovements)) {
    throw new Error('Invalid snapshot data: inventory_movements must be an array.');
  }

  const db = await getDatabase();
  const { items, customers, repairs, sales } = snapshot.data;
  const restoredAt = new Date().toISOString();

  // Perform restore inside transaction
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM inventory_movements;');

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
        `INSERT INTO customers (
          id, phone, purpose, name, device_model, imei, email, address, notes,
          created_at, status, delivery_date, estimated_cost, advance_paid, closed_at, converted_repair_id, alt_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
          c.estimated_cost ?? 0,
          c.advance_paid ?? 0,
          c.closed_at ?? null,
          c.converted_repair_id ?? null,
          c.alt_phone ?? null,
        ]
      );
    }

    // 3. Repairs
    await db.runAsync('DELETE FROM repairs;');
    await db.runAsync('DELETE FROM sqlite_sequence WHERE name="repairs";').catch(() => {});
    for (const r of repairs) {
      await db.runAsync(
        `INSERT INTO repairs (
          id, customer_id, device_model, imei, issue, purpose, status, delivery_date,
          estimated_cost, advance_paid, notes, passcode, passcode_disabled, sim_returned, sd_returned, alt_phone,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
          r.passcode ?? null,
          r.passcode_disabled ?? 0,
          r.sim_returned !== undefined && r.sim_returned !== null ? r.sim_returned : 1,
          r.sd_returned ?? 0,
          r.alt_phone ?? null,
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
        `INSERT INTO sales (id, item_id, item_name, category, quantity, cost_price, sold_price, payment_mode, customer_name, customer_phone, customer_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
          s.customer_id ?? null,
          s.created_at ?? null,
        ]
      );
    }

    if (inventoryMovements) {
      for (const movement of inventoryMovements) {
        await db.runAsync(
          `INSERT INTO inventory_movements (
            id, item_id, item_name, movement_type, quantity_delta, quantity_before, quantity_after,
            source_type, source_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            movement.id ?? null,
            movement.item_id ?? null,
            movement.item_name ?? 'Item',
            movement.movement_type ?? 'adjustment',
            movement.quantity_delta ?? 0,
            movement.quantity_before ?? null,
            movement.quantity_after ?? null,
            movement.source_type ?? null,
            movement.source_id ?? null,
            movement.created_at ?? restoredAt,
          ]
        );
      }
    } else {
      for (const item of items) {
        const quantity = Number(item.quantity) || 0;
        await db.runAsync(
          `INSERT INTO inventory_movements (
            item_id, item_name, movement_type, quantity_delta, quantity_before, quantity_after,
            source_type, source_id, created_at
          ) VALUES (?, ?, 'opening', ?, 0, ?, 'opening_baseline', ?, ?);`,
          [item.id ?? null, item.name ?? 'Item', quantity, quantity, item.id ?? null, restoredAt]
        );
      }

      for (const sale of sales) {
        await db.runAsync(
          `INSERT INTO inventory_movements (
            item_id, item_name, movement_type, quantity_delta, quantity_before, quantity_after,
            source_type, source_id, created_at
          ) VALUES (?, ?, 'sale', ?, NULL, NULL, 'sale', ?, ?);`,
          [
            sale.item_id ?? null,
            sale.item_name ?? 'Item',
            -(Number(sale.quantity) || 0),
            sale.id ?? null,
            sale.created_at ?? restoredAt,
          ]
        );
      }
    }
  });

  return {
    restored_items: items.length,
    restored_customers: customers.length,
    restored_repairs: repairs.length,
    restored_sales: sales.length,
    restored_movements: inventoryMovements?.length ?? items.length + sales.length,
  };
}

/**
 * Checks whether an hourly cloud backup is due and runs it in the background.
 * Deduplicates concurrent triggers from startup, foreground resume, and periodic timers.
 */
export async function checkAndRunHourlyAutoBackup() {
  const currentUser = auth.currentUser;
  if (!currentUser) return { status: 'no-user' };

  if (activeAutoBackupPromise) {
    return activeAutoBackupPromise;
  }

  activeAutoBackupPromise = (async () => {
    try {
      const meta = await getLocalBackupMeta();
      if (!shouldRunHourlyBackup(meta, new Date())) {
        return { status: 'skipped', timestamp: meta?.timestamp };
      }

      const snapshot = await createDatabaseSnapshot();
      const uploadedMeta = await uploadBackupToCloud(snapshot);
      return { status: 'uploaded', meta: uploadedMeta };
    } catch (err) {
      // Preserve local access; surface the failure in the backup settings and retry later.
      const msg = err?.message || String(err);
      const failureMeta = await recordBackupFailure(err);
      console.warn('Hourly auto-backup warning:', msg);
      return { status: 'error', message: msg, meta: failureMeta };
    } finally {
      activeAutoBackupPromise = null;
    }
  })();

  return activeAutoBackupPromise;
}
