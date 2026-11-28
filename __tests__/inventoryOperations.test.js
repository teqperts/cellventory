import * as dbHelper from '../database/Helper';

const mockExecAsync = jest.fn().mockResolvedValue(undefined);
const mockRunAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
const mockGetAllAsync = jest.fn().mockResolvedValue([]);
const mockGetFirstAsync = jest.fn().mockResolvedValue(null);
const mockWithTransactionAsync = jest.fn(async (callback) => callback());

const mockDbInstance = {
  execAsync: mockExecAsync,
  runAsync: mockRunAsync,
  getAllAsync: mockGetAllAsync,
  getFirstAsync: mockGetFirstAsync,
  withTransactionAsync: mockWithTransactionAsync,
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockImplementation(() => Promise.resolve(mockDbInstance)),
}));

describe('Inventory & Sales Helper Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordSale()', () => {
    it('records a sale and decrements item stock', async () => {
      mockRunAsync
        .mockResolvedValueOnce({ lastInsertRowId: 10, changes: 1 }) // insert into sales
        .mockResolvedValueOnce({ changes: 1 }); // update items decrement
      mockGetFirstAsync
        .mockResolvedValueOnce({ id: 5, name: 'AirPods Pro', quantity: 10 })
        .mockResolvedValueOnce({ id: 5, name: 'AirPods Pro', quantity: 9 });

      const saleData = {
        item_id: 5,
        item_name: 'AirPods Pro',
        category: 'Accessory',
        quantity: 1,
        cost_price: 1500,
        sold_price: 2200,
        payment_mode: 'UPI',
        customer_name: 'Amit Kumar',
        customer_phone: '9876543210',
      };

      const result = await dbHelper.recordSale(saleData);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sales'),
        expect.arrayContaining([5, 'AirPods Pro', 'Accessory', 1, 1500, 2200, 'UPI', 'Amit Kumar', '9876543210'])
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE items SET quantity = quantity - ? WHERE id = ?'),
        [1, 5]
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inventory_movements'),
        expect.arrayContaining([5, 'AirPods Pro', 'sale', -1, 10, 9, 'sale', 10])
      );
      expect(mockWithTransactionAsync).toHaveBeenCalled();
      expect(result.sale.id).toBe(10);
      expect(result.updatedItem.quantity).toBe(9);
    });

    it('throws error when quantity is invalid', async () => {
      await expect(
        dbHelper.recordSale({
          item_name: 'Cable',
          quantity: 0,
          sold_price: 100,
        })
      ).rejects.toThrow('Quantity must be greater than zero');
    });

    it('throws error when sold_price is negative or missing', async () => {
      await expect(
        dbHelper.recordSale({
          item_name: 'Cable',
          quantity: 1,
          sold_price: -10,
        })
      ).rejects.toThrow('Valid selling price is required');
    });

    it('rejects a sale that exceeds current stock without writing a sale', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ id: 5, name: 'Cable', quantity: 1 });

      await expect(
        dbHelper.recordSale({
          item_id: 5,
          item_name: 'Cable',
          quantity: 2,
          sold_price: 100,
        })
      ).rejects.toThrow('Insufficient stock: only 1 unit(s) available.');

      expect(mockRunAsync).not.toHaveBeenCalled();
    });
  });

  describe('restockItem()', () => {
    it('restocks item quantity', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });
      mockGetFirstAsync
        .mockResolvedValueOnce({ id: 8, name: 'Battery', quantity: 10 })
        .mockResolvedValueOnce({ id: 8, name: 'Battery', quantity: 15 });

      const updated = await dbHelper.restockItem(8, 5);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE items SET quantity = quantity + ? WHERE id = ?'),
        [5, 8]
      );
      expect(updated.quantity).toBe(15);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inventory_movements'),
        expect.arrayContaining([8, 'Battery', 'restock', 5, 10, 15, 'restock'])
      );
    });

    it('restocks item quantity and updates cost_price when provided', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });
      mockGetFirstAsync
        .mockResolvedValueOnce({ id: 8, name: 'Battery', quantity: 10 })
        .mockResolvedValueOnce({ id: 8, name: 'Battery', quantity: 20, cost_price: 450 });

      const updated = await dbHelper.restockItem(8, 10, 450);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE items SET quantity = quantity + ?, cost_price = ? WHERE id = ?'),
        [10, 450, 8]
      );
      expect(updated.cost_price).toBe(450);
    });
  });

  describe('getInventoryFinancialSummary() & computeFinancialSummary()', () => {
    it('computes valuation and margin statistics correctly from items', async () => {
      mockGetAllAsync.mockResolvedValueOnce([
        { id: 1, quantity: 10, cost_price: 200, selling_price: 300 },
        { id: 2, quantity: 5, cost_price: 100, selling_price: 150 },
        { id: 3, quantity: 0, cost_price: 50, selling_price: 80 },
      ]);

      const summary = await dbHelper.getInventoryFinancialSummary();

      expect(summary.total_items).toBe(3);
      expect(summary.total_units).toBe(15);
      expect(summary.total_cost_value).toBe(2500); // 10*200 + 5*100
      expect(summary.total_retail_value).toBe(3750); // 10*300 + 5*150
      expect(summary.potential_profit).toBe(1250);
      expect(summary.margin_percent).toBe('33.3');
      expect(summary.low_stock_count).toBe(1); // qty: 5 is < 10
      expect(summary.out_of_stock_count).toBe(1); // qty: 0
    });
  });

  describe('getSalesByItemId() and getAllSales()', () => {
    it('queries sales records by item id', async () => {
      mockGetAllAsync.mockResolvedValueOnce([{ id: 1, item_name: 'Charger', quantity: 1 }]);
      const sales = await dbHelper.getSalesByItemId(3);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sales WHERE item_id = ?'),
        [3]
      );
      expect(sales.length).toBe(1);
    });

    it('queries all recent sales with limit', async () => {
      mockGetAllAsync.mockResolvedValueOnce([{ id: 2, item_name: 'Cover' }]);
      const sales = await dbHelper.getAllSales(20);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sales ORDER BY id DESC LIMIT ?'),
        [20]
      );
      expect(sales.length).toBe(1);
    });

    describe('getStockMovementsByItemId()', () => {
      it('queries newest item movements with limit and offset', async () => {
        const movements = [{ id: 4, item_id: 8, movement_type: 'restock' }];
        mockGetAllAsync.mockResolvedValueOnce(movements);

        const result = await dbHelper.getStockMovementsByItemId(8, 10, 20);

        expect(mockGetAllAsync).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY created_at DESC, id DESC'),
          [8, 10, 20]
        );
        expect(result).toEqual(movements);
      });
    });
  });
});
