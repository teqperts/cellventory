// __tests__/homeActions.test.js
import * as dbHelper from '../database/Helper';

// Mock expo-sqlite
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

describe('Home Screen Daily Operations & Next Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeliveriesDueToday()', () => {
    it('queries repair customer records due today or ready for pickup', async () => {
      const mockDeliveries = [
        {
          id: 1,
          name: 'Rahul Sharma',
          phone: '9876543210',
          purpose: 'Repair / Service',
          device_model: 'iPhone 13',
          status: 'Ready for Delivery',
          delivery_date: '2026-11-20',
        },
      ];
      mockGetAllAsync.mockResolvedValueOnce(mockDeliveries);

      const res = await dbHelper.getDeliveriesDueToday();

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE purpose LIKE '%Repair%'")
      );
      expect(res).toEqual(mockDeliveries);
    });
  });

  describe('getNextActionSuggestions()', () => {
    it('aggregates pending inquiries, critical low stock, and overdue repairs', async () => {
      const mockInquiries = [{ id: 10, name: 'Amit', purpose: 'Inquiry / Quotation' }];
      const mockStock = [{ id: 5, name: 'Screen iPhone 13', quantity: 1 }];
      const mockOverdue = [{ id: 8, name: 'Sunil', delivery_date: '2026-11-19' }];

      mockGetAllAsync
        .mockResolvedValueOnce(mockInquiries)
        .mockResolvedValueOnce(mockStock)
        .mockResolvedValueOnce(mockOverdue);

      const res = await dbHelper.getNextActionSuggestions();

      expect(res.pendingInquiries).toEqual(mockInquiries);
      expect(res.criticalStock).toEqual(mockStock);
      expect(res.overdueRepairs).toEqual(mockOverdue);
    });
  });

  describe('updateCustomerStatus()', () => {
    it('updates customer status e.g. to "Delivered" and returns updated record', async () => {
      const mockUpdated = { id: 7, name: 'Priya', status: 'Delivered' };
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });
      mockGetFirstAsync.mockResolvedValueOnce(mockUpdated);

      const res = await dbHelper.updateCustomerStatus(7, 'Delivered');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE customers SET status = ? WHERE id = ?',
        ['Delivered', 7]
      );
      expect(res).toEqual(mockUpdated);
    });

    it('throws error if customer ID is missing', async () => {
      await expect(dbHelper.updateCustomerStatus(null, 'Delivered')).rejects.toThrow(
        'Customer ID is required'
      );
    });
  });

  describe('getHomeDashboardStats()', () => {
    it('returns counts for dueToday, inProgress, and lowStock', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([{ count: 3 }])
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ count: 2 }]);

      const stats = await dbHelper.getHomeDashboardStats();

      expect(stats).toEqual({
        dueToday: 3,
        inProgress: 5,
        lowStock: 2,
      });
    });
  });
});
