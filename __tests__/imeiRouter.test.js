// __tests__/imeiRouter.test.js
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

describe('Smart Universal IMEI Router & Device Identifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lookupIMEI()', () => {
    it('returns type: "empty" when imei is blank or falsy', async () => {
      const res = await dbHelper.lookupIMEI('');
      expect(res).toEqual({ type: 'empty' });
    });

    it('returns type: "inventory" when IMEI matches shop inventory stock', async () => {
      const mockItem = {
        id: 15,
        name: 'iPhone 13 128GB',
        brand: 'Apple',
        model: 'A2633',
        quantity: 2,
        selling_price: 49999,
        imei: '352099001761481',
      };

      // Mock getItemByIMEI returning item
      mockGetFirstAsync.mockResolvedValueOnce(mockItem);

      const res = await dbHelper.lookupIMEI('352099001761481');

      expect(res.type).toBe('inventory');
      expect(res.item).toEqual(mockItem);
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('FROM items WHERE imei = ? OR notes LIKE ?'),
        ['352099001761481', '%352099001761481%']
      );
    });

    it('returns type: "customer" with history when IMEI matches an existing customer', async () => {
      // 1. Inventory check returns null
      mockGetFirstAsync.mockResolvedValueOnce(null);

      // 2. Customer check returns customer
      const mockCustomer = {
        id: 42,
        name: 'Vikram Singh',
        phone: '9876543210',
        purpose: 'Repair / Service',
        imei: '352099001761481',
        device_model: 'iPhone 13',
      };
      mockGetFirstAsync.mockResolvedValueOnce(mockCustomer);

      // 3. getDeviceHistoryByIMEI returns list of visits
      const mockHistory = [
        mockCustomer,
        {
          id: 30,
          name: 'Vikram Singh',
          phone: '9876543210',
          purpose: 'Inquiry / Quotation',
          imei: '352099001761481',
          created_at: '2026-10-10T10:00:00.000Z',
        },
      ];
      mockGetAllAsync.mockResolvedValueOnce(mockHistory);

      const res = await dbHelper.lookupIMEI('352099001761481');

      expect(res.type).toBe('customer');
      expect(res.customer).toEqual(mockCustomer);
      expect(res.history).toHaveLength(2);
    });

    it('returns type: "new" when IMEI does not exist in inventory or customers', async () => {
      // 1. Inventory check returns null
      mockGetFirstAsync.mockResolvedValueOnce(null);
      // 2. Customer check returns null
      mockGetFirstAsync.mockResolvedValueOnce(null);

      const res = await dbHelper.lookupIMEI('862900030123457');

      expect(res.type).toBe('new');
      expect(res.imei).toBe('862900030123457');
    });
  });

  describe('getDeviceHistoryByIMEI()', () => {
    it('queries all visits for a specific IMEI ordered by id DESC', async () => {
      const mockVisits = [
        { id: 10, purpose: 'Repair / Service', imei: '352099001761481' },
        { id: 4, purpose: 'Inquiry / Quotation', imei: '352099001761481' },
      ];
      mockGetAllAsync.mockResolvedValueOnce(mockVisits);

      const history = await dbHelper.getDeviceHistoryByIMEI('352099001761481');

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('FROM customers WHERE imei = ? ORDER BY id DESC'),
        ['352099001761481']
      );
      expect(history).toEqual(mockVisits);
    });

    it('returns empty array when imei is blank', async () => {
      const history = await dbHelper.getDeviceHistoryByIMEI('');
      expect(history).toEqual([]);
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });
  });
});
