// __tests__/database.test.js
import * as dbHelper from '../database/Helper';

// Mock expo-sqlite
const mockExecAsync = jest.fn().mockResolvedValue(undefined);
const mockRunAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
const mockGetAllAsync = jest.fn().mockResolvedValue([]);
const mockGetFirstAsync = jest.fn().mockResolvedValue(null);

const mockDbInstance = {
  execAsync: mockExecAsync,
  runAsync: mockRunAsync,
  getAllAsync: mockGetAllAsync,
  getFirstAsync: mockGetFirstAsync,
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockImplementation(() => Promise.resolve(mockDbInstance)),
}));

describe('Database Helper Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDatabase()', () => {
    it('initializes the database and creates the items table', async () => {
      const db = await dbHelper.getDatabase();
      expect(db).toBe(mockDbInstance);
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS items')
      );
    });
  });

  describe('addItem()', () => {
    it('successfully adds an item with all valid fields', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 42, changes: 1 });

      const form = {
        category: 'Mobile',
        name: 'iPhone 13',
        brand: 'Apple',
        model: 'A2633',
        part_type: '',
        quantity: '5',
        cost_price: '500.50',
        selling_price: '699.99',
        notes: 'Good condition',
      };

      const result = await dbHelper.addItem(form);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO items'),
        [
          'Mobile',
          'iPhone 13',
          'Apple',
          'A2633',
          '',
          5,
          500.5,
          699.99,
          expect.any(String),
          'Good condition',
        ]
      );
      expect(result.id).toBe(42);
      expect(result.name).toBe('iPhone 13');
    });

    it('defaults optional cost, selling price and notes when empty', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 10, changes: 1 });

      const form = {
        category: 'Accessory',
        name: 'Screen Protector',
        quantity: '20',
      };

      const result = await dbHelper.addItem(form);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO items'),
        [
          'Accessory',
          'Screen Protector',
          '',
          '',
          '',
          20,
          0,
          0,
          expect.any(String),
          '',
        ]
      );
      expect(result.id).toBe(10);
    });

    it('throws an error if category or name is missing', async () => {
      await expect(dbHelper.addItem({ category: '', name: 'Test', quantity: '5' })).rejects.toThrow(
        'Category and Name are required'
      );
      await expect(dbHelper.addItem({ category: 'Mobile', name: '', quantity: '5' })).rejects.toThrow(
        'Category and Name are required'
      );
    });

    it('throws an error if quantity is 0, negative, or not a number', async () => {
      await expect(
        dbHelper.addItem({ category: 'Mobile', name: 'Test', quantity: '0' })
      ).rejects.toThrow('Quantity must be a valid positive number');

      await expect(
        dbHelper.addItem({ category: 'Mobile', name: 'Test', quantity: '-3' })
      ).rejects.toThrow('Quantity must be a valid positive number');

      await expect(
        dbHelper.addItem({ category: 'Mobile', name: 'Test', quantity: 'abc' })
      ).rejects.toThrow('Quantity must be a valid positive number');
    });
  });

  describe('getAllItems()', () => {
    it('retrieves all items sorted by id descending', async () => {
      const mockItems = [
        { id: 2, name: 'Item B' },
        { id: 1, name: 'Item A' },
      ];
      mockGetAllAsync.mockResolvedValueOnce(mockItems);

      const items = await dbHelper.getAllItems();
      expect(mockGetAllAsync).toHaveBeenCalledWith('SELECT * FROM items ORDER BY id DESC');
      expect(items).toEqual(mockItems);
    });
  });

  describe('getItemById()', () => {
    it('fetches a single item by id', async () => {
      const mockItem = { id: 7, name: 'Battery Replacement', category: 'Spare Part' };
      mockGetFirstAsync.mockResolvedValueOnce(mockItem);

      const item = await dbHelper.getItemById(7);
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM items WHERE id = ?',
        [7]
      );
      expect(item).toEqual(mockItem);
    });
  });

  describe('updateItem()', () => {
    it('successfully updates an existing item', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });

      const updatedForm = {
        category: 'Mobile',
        name: 'iPhone 13 Pro',
        brand: 'Apple',
        model: 'A2638',
        part_type: '',
        quantity: '8',
        cost_price: '600',
        selling_price: '850',
        notes: 'Updated stock',
      };

      const result = await dbHelper.updateItem(5, updatedForm);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE items SET'),
        [
          'Mobile',
          'iPhone 13 Pro',
          'Apple',
          'A2638',
          '',
          8,
          600,
          850,
          'Updated stock',
          5,
        ]
      );
      expect(result.id).toBe(5);
    });

    it('throws error when id or required fields are missing in update', async () => {
      await expect(dbHelper.updateItem(null, { category: 'Mobile', name: 'Test', quantity: 5 })).rejects.toThrow(
        'Item ID is required for update'
      );
      await expect(dbHelper.updateItem(5, { category: '', name: 'Test', quantity: 5 })).rejects.toThrow(
        'Category and Name are required'
      );
      await expect(dbHelper.updateItem(5, { category: 'Mobile', name: 'Test', quantity: '0' })).rejects.toThrow(
        'Quantity must be a valid positive number'
      );
    });
  });

  describe('deleteItem()', () => {
    it('deletes an item by id', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });

      await dbHelper.deleteItem(12);
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM items WHERE id = ?', [12]);
    });

    it('throws error if id is not provided', async () => {
      await expect(dbHelper.deleteItem(null)).rejects.toThrow('Item ID is required');
    });
  });

  describe('adjustItemQuantity()', () => {
    it('updates item quantity by delta and returns the updated item', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });
      const updatedItem = { id: 3, name: 'USB-C Cable', quantity: 9 };
      mockGetFirstAsync.mockResolvedValueOnce(updatedItem);

      const result = await dbHelper.adjustItemQuantity(3, 1);

      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE items SET quantity = MAX(0, quantity + ?) WHERE id = ?',
        [1, 3]
      );
      expect(result).toEqual(updatedItem);
    });

    it('handles negative decrement delta correctly', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });
      const updatedItem = { id: 3, name: 'USB-C Cable', quantity: 8 };
      mockGetFirstAsync.mockResolvedValueOnce(updatedItem);

      const result = await dbHelper.adjustItemQuantity(3, -1);

      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE items SET quantity = MAX(0, quantity + ?) WHERE id = ?',
        [-1, 3]
      );
      expect(result).toEqual(updatedItem);
    });

    it('throws error if id is missing or delta is invalid', async () => {
      await expect(dbHelper.adjustItemQuantity(null, 1)).rejects.toThrow('Item ID is required');
      await expect(dbHelper.adjustItemQuantity(3, 0)).rejects.toThrow('Valid non-zero delta is required');
      await expect(dbHelper.adjustItemQuantity(3, 'abc')).rejects.toThrow('Valid non-zero delta is required');
    });
  });

  describe('searchItems()', () => {
    it('searches by keyword with wildcard query on name, brand, model', async () => {
      const mockFound = [{ id: 1, name: 'Samsung Galaxy', brand: 'Samsung', model: 'S22' }];
      mockGetAllAsync.mockResolvedValueOnce(mockFound);

      const results = await dbHelper.searchItems('Galaxy');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE ? OR brand LIKE ? OR model LIKE ?'),
        ['%Galaxy%', '%Galaxy%', '%Galaxy%']
      );
      expect(results).toEqual(mockFound);
    });

    it('returns empty array if search query is empty or whitespace', async () => {
      const resEmpty = await dbHelper.searchItems('');
      const resWhitespace = await dbHelper.searchItems('   ');
      expect(resEmpty).toEqual([]);
      expect(resWhitespace).toEqual([]);
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });
  });

  describe('getInventoryStats()', () => {
    it('computes total, low stock, and recent counts', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([{ count: 25 }]) // total
        .mockResolvedValueOnce([{ count: 4 }])  // low stock
        .mockResolvedValueOnce([{ count: 6 }]); // recent

      const stats = await dbHelper.getInventoryStats();
      expect(stats).toEqual({
        total: 25,
        lowStock: 4,
        recent: 6,
      });
    });
  });
});
