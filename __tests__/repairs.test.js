// __tests__/repairs.test.js
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

describe('Normalized Customer & Multi-Device Repair Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateCustomer()', () => {
    it('creates a new customer with name and phone when customer does not exist', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null); // No existing
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 101, changes: 1 });

      const customer = await dbHelper.findOrCreateCustomer({
        name: 'Rahul Sharma',
        phone: '9876543210',
      });

      expect(customer.id).toBe(101);
      expect(customer.name).toBe('Rahul Sharma');
      expect(customer.phone).toBe('9876543210');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        expect.arrayContaining(['Rahul Sharma', '9876543210'])
      );
    });

    it('returns existing customer without inserting duplicate when phone matches', async () => {
      const existing = {
        id: 50,
        name: 'Rahul Sharma',
        phone: '9876543210',
      };
      mockGetFirstAsync.mockResolvedValueOnce(existing);

      const customer = await dbHelper.findOrCreateCustomer({
        name: 'Rahul Sharma',
        phone: '9876543210',
      });

      expect(customer.id).toBe(50);
      expect(customer.name).toBe('Rahul Sharma');
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('throws an error if mobile number is missing', async () => {
      await expect(
        dbHelper.findOrCreateCustomer({ name: 'Rahul Sharma', phone: '' })
      ).rejects.toThrow('Mobile number is required');
    });

    it('throws an error if customer name is missing when creating a new record', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      await expect(
        dbHelper.findOrCreateCustomer({ name: '', phone: '9876543210' })
      ).rejects.toThrow('Customer name is required');
    });
  });

  describe('addRepair()', () => {
    it('creates a repair ticket linked to customer_id with financial costing', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 201, changes: 1 });

      const repair = await dbHelper.addRepair({
        customer_id: 101,
        device_model: 'iPhone 13 Pro',
        imei: '352099001761481',
        issue: 'Broken OLED display & battery swollen',
        purpose: 'Repair / Service',
        status: 'In Progress',
        delivery_date: '2026-11-22',
        estimated_cost: '4500',
        advance_paid: '1500',
      });

      expect(repair.id).toBe(201);
      expect(repair.customer_id).toBe(101);
      expect(repair.device_model).toBe('iPhone 13 Pro');
      expect(repair.estimated_cost).toBe(4500);
      expect(repair.advance_paid).toBe(1500);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO repairs'),
        expect.arrayContaining([101, 'iPhone 13 Pro', '352099001761481', 4500, 1500])
      );
    });

    it('throws error if customer_id is missing', async () => {
      await expect(
        dbHelper.addRepair({ device_model: 'iPhone 13' })
      ).rejects.toThrow('Customer ID is required');
    });

    it('throws error if device_model is missing', async () => {
      await expect(
        dbHelper.addRepair({ customer_id: 101, device_model: '' })
      ).rejects.toThrow('Device model is required');
    });
  });

  describe('getRepairsByCustomerId()', () => {
    it('retrieves all devices/repairs for a customer ordered by id DESC', async () => {
      const mockRepairs = [
        { id: 2, customer_id: 101, device_model: 'Galaxy S22', status: 'Ready for Delivery' },
        { id: 1, customer_id: 101, device_model: 'iPhone 12', status: 'Delivered' },
      ];
      mockGetAllAsync.mockResolvedValueOnce(mockRepairs);

      const res = await dbHelper.getRepairsByCustomerId(101);

      expect(res).toEqual(mockRepairs);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('FROM repairs WHERE customer_id = ? ORDER BY id DESC'),
        [101]
      );
    });
  });

  describe('getCustomerWithRepairs()', () => {
    it('returns customer profile with embedded repairs and aggregate Khata financials', async () => {
      const mockCustomer = {
        id: 101,
        name: 'Sunil Kumar',
        phone: '9876543210',
      };
      const mockRepairs = [
        {
          id: 1,
          customer_id: 101,
          device_model: 'iPhone 13',
          status: 'In Progress',
          estimated_cost: 3000,
          advance_paid: 1000,
        },
        {
          id: 2,
          customer_id: 101,
          device_model: 'OnePlus 9',
          status: 'Ready for Delivery',
          estimated_cost: 2000,
          advance_paid: 500,
        },
        {
          id: 3,
          customer_id: 101,
          device_model: 'Redmi Note 10',
          status: 'Delivered',
          estimated_cost: 1500,
          advance_paid: 1500,
        },
      ];

      mockGetFirstAsync.mockResolvedValueOnce(mockCustomer);
      mockGetAllAsync.mockResolvedValueOnce(mockRepairs);

      const result = await dbHelper.getCustomerWithRepairs(101);

      expect(result.id).toBe(101);
      expect(result.name).toBe('Sunil Kumar');
      expect(result.repairs).toHaveLength(3);
      expect(result.stats.totalEstimated).toBe(6500);
      expect(result.stats.totalAdvance).toBe(3000);
      expect(result.stats.totalBalanceDue).toBe(3500); // 6500 - 3000
      expect(result.stats.activeRepairsCount).toBe(2); // 2 in progress / ready, 1 delivered
      expect(result.stats.totalDevicesCount).toBe(3);
    });

    it('excludes inquiry items from activeRepairsCount in getCustomerWithRepairs', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ id: 102, name: 'Anil' });
      const mockRepairs = [
        { id: 1, estimated_cost: 2000, advance_paid: 500, status: 'In Progress', purpose: 'Repair / Service' },
        { id: 2, estimated_cost: 1500, advance_paid: 0, status: 'Inquiry', purpose: 'Inquiry / Quotation' },
      ];
      mockGetAllAsync.mockResolvedValueOnce(mockRepairs);

      const result = await dbHelper.getCustomerWithRepairs(102);

      expect(result.stats.activeRepairsCount).toBe(1); // Only repair #1, inquiry #2 is excluded
      expect(result.stats.totalEstimated).toBe(2000); // Only repair #1 is counted
    });
  });

  describe('getAllRepairs() with Inquiry filtering', () => {
    it('queries repairs table excluding inquiries and non-repair records', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);

      await dbHelper.getAllRepairs();

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("r.purpose NOT LIKE '%Inquiry%' AND r.purpose NOT LIKE '%Enquiry%'")
      );
    });
  });

  describe('updateRepairStatus() & deleteRepair()', () => {
    it('updates status of a specific repair ticket', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });
      const updatedMock = { id: 5, status: 'Delivered' };
      mockGetFirstAsync.mockResolvedValueOnce(updatedMock);

      const res = await dbHelper.updateRepairStatus(5, 'Delivered');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE repairs SET status = ?'),
        expect.arrayContaining(['Delivered', 5])
      );
      expect(res).toEqual(updatedMock);
    });

    it('deletes a repair job by id', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });

      const res = await dbHelper.deleteRepair(5);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM repairs WHERE id = ?'),
        [5]
      );
      expect(res).toBe(true);
    });
  });

  describe('formatTokenNumber()', () => {
    it('formats ticket ID into 4-digit token identifier', () => {
      expect(dbHelper.formatTokenNumber(1)).toBe('TK-0001');
      expect(dbHelper.formatTokenNumber(42)).toBe('TK-0042');
      expect(dbHelper.formatTokenNumber(999)).toBe('TK-0999');
      expect(dbHelper.formatTokenNumber(1234)).toBe('TK-1234');
      expect(dbHelper.formatTokenNumber(null)).toBe('TK-0001');
    });
  });

  describe('addRepair() with Dispute Checklist & Passcode Safeguards', () => {
    it('persists passcode, passcode_disabled, sim_returned, sd_returned, and alt_phone', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 501, changes: 1 });

      const repair = await dbHelper.addRepair({
        customer_id: 101,
        device_model: 'OnePlus 11',
        imei: '862900030123456',
        issue: 'Screen flickers',
        passcode: '2580',
        passcode_disabled: 0,
        sim_returned: 1,
        sd_returned: 0,
        alt_phone: '9876599999',
      });

      expect(repair.id).toBe(501);
      expect(repair.passcode).toBe('2580');
      expect(repair.passcode_disabled).toBe(0);
      expect(repair.sim_returned).toBe(1);
      expect(repair.sd_returned).toBe(0);
      expect(repair.alt_phone).toBe('9876599999');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO repairs'),
        expect.arrayContaining(['2580', 0, 1, 0, '9876599999'])
      );
    });

    it('supports disabled passcode flag correctly', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 502, changes: 1 });

      const repair = await dbHelper.addRepair({
        customer_id: 101,
        device_model: 'iPhone 14',
        passcode: '',
        passcode_disabled: 1,
        sim_returned: 1,
        sd_returned: 1,
      });

      expect(repair.passcode).toBe('');
      expect(repair.passcode_disabled).toBe(1);
      expect(repair.sim_returned).toBe(1);
      expect(repair.sd_returned).toBe(1);
    });
  });
});
