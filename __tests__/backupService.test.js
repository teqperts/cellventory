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
  storage: {},
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn((storage, path) => ({ path })),
  uploadString: jest.fn().mockResolvedValue({}),
  getDownloadURL: jest.fn().mockResolvedValue('https://mockstorage.example.com/backup.json'),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadString } from 'firebase/storage';

import {
  createDatabaseSnapshot,
  getLocalBackupMeta,
  restoreDatabaseSnapshot,
  uploadBackupToCloud,
} from '../services/BackupService';

describe('BackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDatabaseSnapshot()', () => {
    it('creates a formatted snapshot containing all tables and metadata', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([{ id: 1, name: 'iPhone 13 Screen', quantity: 4 }]) // items
        .mockResolvedValueOnce([{ id: 1, phone: '9876543210', name: 'Ravi' }]) // customers
        .mockResolvedValueOnce([{ id: 1, customer_id: 1, issue: 'Broken display' }]) // repairs
        .mockResolvedValueOnce([{ id: 1, item_name: 'Back Cover', sold_price: 250 }]); // sales

      const snapshot = await createDatabaseSnapshot();

      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.shop_uid).toBe('user_test_123');
      expect(snapshot.shop_email).toBe('owner@cellventory.com');
      expect(snapshot.stats).toEqual({
        items_count: 1,
        customers_count: 1,
        repairs_count: 1,
        sales_count: 1,
      });
      expect(snapshot.data.items).toHaveLength(1);
      expect(snapshot.data.customers).toHaveLength(1);
      expect(snapshot.data.repairs).toHaveLength(1);
      expect(snapshot.data.sales).toHaveLength(1);
    });
  });

  describe('uploadBackupToCloud()', () => {
    it('uploads JSON string to Firebase storage and caches metadata in AsyncStorage', async () => {
      const sampleSnapshot = {
        version: '1.0.0',
        timestamp: '2026-11-22T10:00:00.000Z',
        shop_uid: 'user_test_123',
        stats: { items_count: 5, customers_count: 10, repairs_count: 2, sales_count: 8 },
        data: { items: [], customers: [], repairs: [], sales: [] },
      };

      const meta = await uploadBackupToCloud(sampleSnapshot);

      expect(uploadString).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'backups/user_test_123/latest_backup.json' }),
        expect.any(String),
        'raw',
        expect.objectContaining({ contentType: 'application/json' })
      );

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@cellventory_backup_meta_user_test_123',
        expect.stringContaining('2026-11-22T10:00:00.000Z')
      );
      expect(meta.stats.items_count).toBe(5);
    });
  });

  describe('restoreDatabaseSnapshot()', () => {
    it('restores all tables inside a transaction', async () => {
      const sampleSnapshot = {
        data: {
          items: [{ id: 10, name: 'Samsung Battery', quantity: 2, selling_price: 1200 }],
          customers: [{ id: 20, phone: '9998887776', name: 'Sunil', purpose: 'Repair' }],
          repairs: [{ id: 30, customer_id: 20, device_model: 'M31', issue: 'Charging port' }],
          sales: [{ id: 40, item_name: 'Tempered Glass', quantity: 1, sold_price: 150 }],
        },
      };

      const result = await restoreDatabaseSnapshot(sampleSnapshot);

      expect(mockWithTransactionAsync).toHaveBeenCalled();
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM items;');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM customers;');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM repairs;');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM sales;');
      expect(result).toEqual({
        restored_items: 1,
        restored_customers: 1,
        restored_repairs: 1,
        restored_sales: 1,
      });
    });

    it('rejects invalid snapshot format', async () => {
      await expect(restoreDatabaseSnapshot(null)).rejects.toThrow('Invalid snapshot data.');
      await expect(restoreDatabaseSnapshot({})).rejects.toThrow('Invalid snapshot data.');
    });
  });
});
