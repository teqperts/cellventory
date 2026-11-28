// __tests__/backupService.test.js

const mockRunAsync = jest.fn().mockResolvedValue({ changes: 1 });
const mockGetAllAsync = jest.fn();
const mockWithTransactionAsync = jest.fn(async (callback) => {
  await callback();
});

jest.mock('../database/Helper', () => ({
  getDatabase: jest.fn(() =>
    Promise.resolve({
      runAsync: (...args) => mockRunAsync(...args),
      getAllAsync: (...args) => mockGetAllAsync(...args),
      withTransactionAsync: (...args) => mockWithTransactionAsync(...args),
    })
  ),
}));

jest.mock('../config/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user_test_123',
      email: 'owner@cellventory.com',
    },
  },
  storage: {
    app: {
      options: {
        storageBucket: 'cellventory.firebasestorage.app',
      },
    },
  },
}));

const mockGetIdToken = jest.fn().mockResolvedValue('mock-firebase-id-token');

jest.mock('firebase/auth', () => ({
  getIdToken: (...args) => mockGetIdToken(...args),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn((storage, path) => ({ path })),
  getDownloadURL: jest.fn().mockResolvedValue('https://mockstorage.example.com/backup.json'),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  checkAndRunDailyAutoBackup,
  createDatabaseSnapshot,
  getLocalDateKey,
  restoreDatabaseSnapshot,
  shouldRunDailyBackup,
  uploadBackupToCloud,
} from '../services/BackupService';

describe('BackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ name: 'uploaded' }),
      text: jest.fn().mockResolvedValue(''),
    });
  });

  describe('createDatabaseSnapshot()', () => {
    it('creates a formatted snapshot containing all tables and metadata', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([{ id: 1, name: 'iPhone 13 Screen', quantity: 4 }]) // items
        .mockResolvedValueOnce([{ id: 1, phone: '9876543210', name: 'Ravi' }]) // customers
        .mockResolvedValueOnce([{ id: 1, customer_id: 1, issue: 'Broken display' }]) // repairs
        .mockResolvedValueOnce([{ id: 1, item_name: 'Back Cover', sold_price: 250 }]) // sales
        .mockResolvedValueOnce([{ id: 1, movement_type: 'restock' }]); // inventory movements

      const snapshot = await createDatabaseSnapshot();

      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.shop_uid).toBe('user_test_123');
      expect(snapshot.shop_email).toBe('owner@cellventory.com');
      expect(snapshot.stats).toEqual({
        items_count: 1,
        customers_count: 1,
        repairs_count: 1,
        sales_count: 1,
        inventory_movements_count: 1,
      });
      expect(snapshot.data.items).toHaveLength(1);
      expect(snapshot.data.customers).toHaveLength(1);
      expect(snapshot.data.repairs).toHaveLength(1);
      expect(snapshot.data.sales).toHaveLength(1);
      expect(snapshot.data.inventory_movements).toHaveLength(1);
    });
  });

  describe('uploadBackupToCloud()', () => {
    it('uploads JSON via Firebase Storage REST API and caches metadata with dateKey', async () => {
      const sampleSnapshot = {
        version: '1.0.0',
        timestamp: '2026-11-28T10:00:00.000Z',
        shop_uid: 'user_test_123',
        stats: { items_count: 5, customers_count: 10, repairs_count: 2, sales_count: 8 },
        data: { items: [], customers: [], repairs: [], sales: [] },
      };

      const expectedDateKey = getLocalDateKey(new Date(sampleSnapshot.timestamp));
      const meta = await uploadBackupToCloud(sampleSnapshot);

      expect(mockGetIdToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `https://firebasestorage.googleapis.com/v0/b/cellventory.firebasestorage.app/o?uploadType=media&name=${encodeURIComponent(
            'backups/user_test_123/latest_backup.json'
          )}`
        ),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Firebase mock-firebase-id-token',
          }),
          body: expect.any(String),
        })
      );

      // History upload removed — only latest_backup.json is written
      expect(global.fetch).toHaveBeenCalledTimes(1);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@cellventory_backup_meta_user_test_123',
        expect.stringContaining(`"dateKey":"${expectedDateKey}"`)
      );
      expect(meta.stats.items_count).toBe(5);
      expect(meta.dateKey).toBe(expectedDateKey);
    });
  });

  describe('shouldRunDailyBackup() & checkAndRunDailyAutoBackup()', () => {
    it('returns true when no previous backup metadata exists', () => {
      expect(shouldRunDailyBackup(null, new Date('2026-11-28T10:00:00'))).toBe(true);
    });

    it('returns false when backup already ran earlier the same local calendar day', () => {
      const now = new Date(2026, 10, 28, 18, 0, 0);
      const earlierToday = new Date(2026, 10, 28, 9, 0, 0);
      const meta = {
        timestamp: earlierToday.toISOString(),
        dateKey: getLocalDateKey(earlierToday),
      };
      expect(shouldRunDailyBackup(meta, now)).toBe(false);
    });

    it('returns true when a new calendar day begins even if less than 24h elapsed', () => {
      const yesterdayEvening = new Date(2026, 10, 27, 21, 0, 0);
      const thisMorning = new Date(2026, 10, 28, 9, 0, 0);
      const meta = {
        timestamp: yesterdayEvening.toISOString(),
        dateKey: getLocalDateKey(yesterdayEvening),
      };
      expect(shouldRunDailyBackup(meta, thisMorning)).toBe(true);
    });

    it('skips upload when today backup is already recorded in AsyncStorage', async () => {
      const now = new Date();
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          timestamp: now.toISOString(),
          dateKey: getLocalDateKey(now),
        })
      );

      const res = await checkAndRunDailyAutoBackup();
      expect(res.status).toBe('skipped');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('runs backup automatically when today backup has not happened yet', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      mockGetAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const res = await checkAndRunDailyAutoBackup();
      expect(res.status).toBe('uploaded');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('does not upload or record metadata when a table read fails', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      const readError = new Error('Repairs table unavailable');
      mockGetAllAsync.mockRejectedValueOnce(readError);

      const result = await checkAndRunDailyAutoBackup();

      expect(result).toEqual({ status: 'error', message: readError.message });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('restoreDatabaseSnapshot()', () => {
    it('restores all tables including alt_phone, passcode, and SIM/SD checklist inside a transaction', async () => {
      const sampleSnapshot = {
        data: {
          items: [{ id: 10, name: 'Samsung Battery', quantity: 2, selling_price: 1200 }],
          customers: [
            {
              id: 20,
              phone: '9998887776',
              alt_phone: '9998880000',
              name: 'Sunil',
              purpose: 'Repair',
              estimated_cost: 1500,
              advance_paid: 500,
              converted_repair_id: 30,
            },
          ],
          repairs: [
            {
              id: 30,
              customer_id: 20,
              device_model: 'M31',
              issue: 'Charging port',
              passcode: '1234',
              passcode_disabled: 0,
              sim_returned: 1,
              sd_returned: 1,
              alt_phone: '9998880000',
            },
          ],
          sales: [{ id: 40, item_name: 'Tempered Glass', quantity: 1, sold_price: 150, customer_id: 20 }],
        },
      };

      const result = await restoreDatabaseSnapshot(sampleSnapshot);

      expect(mockWithTransactionAsync).toHaveBeenCalled();
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM items;');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM customers;');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM repairs;');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM sales;');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('alt_phone'),
        expect.arrayContaining(['9998880000', 1500, 500, 30])
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('passcode_disabled'),
        expect.arrayContaining(['1234', 0, 1, 1, '9998880000'])
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining("'opening_baseline'"),
        expect.arrayContaining([10, 'Samsung Battery', 2, 2, 10, expect.any(String)])
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining("'sale'"),
        expect.arrayContaining([null, 'Tempered Glass', -1, 40, expect.any(String)])
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sales'),
        expect.arrayContaining([20])
      );
      expect(result).toEqual({
        restored_items: 1,
        restored_customers: 1,
        restored_repairs: 1,
        restored_sales: 1,
        restored_movements: 2,
      });
    });

    it('restores movement rows included in a current snapshot', async () => {
      const sampleSnapshot = {
        data: {
          items: [{ id: 1, name: 'USB Cable', quantity: 4 }],
          customers: [],
          repairs: [],
          sales: [],
          inventory_movements: [
            {
              id: 12,
              item_id: 1,
              item_name: 'USB Cable',
              movement_type: 'restock',
              quantity_delta: 4,
              quantity_before: 0,
              quantity_after: 4,
              source_type: 'restock',
              created_at: '2026-11-28T10:00:00.000Z',
            },
          ],
        },
      };

      const result = await restoreDatabaseSnapshot(sampleSnapshot);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inventory_movements'),
        [
          12,
          1,
          'USB Cable',
          'restock',
          4,
          0,
          4,
          'restock',
          null,
          '2026-11-28T10:00:00.000Z',
        ]
      );
      expect(result.restored_movements).toBe(1);
    });

    it('rejects invalid snapshot format', async () => {
      await expect(restoreDatabaseSnapshot(null)).rejects.toThrow('Invalid snapshot data.');
      await expect(restoreDatabaseSnapshot({})).rejects.toThrow('Invalid snapshot data.');
    });

    it.each([
      ['missing a table', { customers: [], repairs: [], sales: [] }],
      ['containing a non-array table', { items: [], customers: {}, repairs: [], sales: [] }],
    ])('rejects snapshots %s before starting a transaction', async (_description, data) => {
      await expect(restoreDatabaseSnapshot({ data })).rejects.toThrow(
        'Invalid snapshot data:'
      );

      expect(mockWithTransactionAsync).not.toHaveBeenCalled();
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('rejects a non-array movement collection before starting a transaction', async () => {
      await expect(
        restoreDatabaseSnapshot({
          data: { items: [], customers: [], repairs: [], sales: [], inventory_movements: {} },
        })
      ).rejects.toThrow('inventory_movements must be an array');

      expect(mockWithTransactionAsync).not.toHaveBeenCalled();
    });
  });
});
