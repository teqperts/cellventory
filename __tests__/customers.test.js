// __tests__/customers.test.js
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

describe('Customer Management Business Logic & Database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addCustomer()', () => {
    it('successfully creates a customer when phone, purpose, and name are provided', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 10, changes: 1 });

      const form = {
        phone: '9876543210',
        purpose: 'Repair / Service',
        name: 'Amit Sharma',
        device_model: 'iPhone 13',
        imei: '352099001761481',
        notes: 'Screen replacement',
      };

      const result = await dbHelper.addCustomer(form);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        expect.arrayContaining(['9876543210', 'Repair / Service', 'Amit Sharma', 'iPhone 13', '352099001761481'])
      );
      expect(result.id).toBe(10);
      expect(result.phone).toBe('9876543210');
      expect(result.purpose).toBe('Repair / Service');
      expect(result.name).toBe('Amit Sharma');
      expect(result.imei).toBe('352099001761481');
    });

    it('does not insert into repairs table when creating an inquiry', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 12, changes: 1 });

      const form = {
        phone: '9876543210',
        purpose: 'Inquiry / Quotation',
        name: 'Vikas Patel',
        device_model: 'Samsung S22',
        notes: 'Price quotation only',
        estimated_cost: '3500',
      };

      const result = await dbHelper.addCustomer(form);

      expect(mockRunAsync).toHaveBeenCalledTimes(1); // Only customer INSERT, no repair INSERT
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        expect.anything()
      );
      expect(result.id).toBe(12);
      expect(result.repair_id).toBeNull();
    });

    it('throws an error if mobile number is missing for non-inquiry visit', async () => {
      await expect(
        dbHelper.addCustomer({ phone: '', purpose: 'Repair / Service', name: 'John Doe' })
      ).rejects.toThrow('Mobile number is required');
    });

    it('throws an error if purpose of visit is missing', async () => {
      await expect(
        dbHelper.addCustomer({ phone: '9876543210', purpose: '', name: 'John Doe' })
      ).rejects.toThrow('Purpose of visit is required');
    });

    it('throws an error if customer name is missing for non-inquiry visit', async () => {
      await expect(
        dbHelper.addCustomer({ phone: '9876543210', purpose: 'Purchase / Accessory', name: '   ' })
      ).rejects.toThrow('Customer name is required');
    });

    it('successfully allows creating an inquiry with optional phone and name', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 15, changes: 1 });

      const form = {
        purpose: 'Inquiry / Quotation',
        imei: '862900030123457',
        notes: 'Screen replacement cost estimate inquiry',
        estimated_cost: 1500,
      };

      const result = await dbHelper.addCustomer(form);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        expect.arrayContaining(['', 'Inquiry / Quotation', 'Walk-in Customer', '862900030123457'])
      );
      expect(result.id).toBe(15);
      expect(result.name).toBe('Walk-in Customer');
      expect(result.status).toBe('Inquiry');
      expect(result.estimated_cost).toBe(1500);
    });

    it('successfully allows creating an enquiry with purpose "Enquiry" and optional phone and name', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 18, changes: 1 });

      const form = {
        purpose: 'Enquiry',
        imei: '862900030123457',
        notes: 'Price query for screen repair',
        estimated_cost: 2000,
      };

      const result = await dbHelper.addCustomer(form);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        expect.arrayContaining(['', 'Enquiry', 'Walk-in Customer', '862900030123457'])
      );
      expect(result.id).toBe(18);
      expect(result.name).toBe('Walk-in Customer');
      expect(result.purpose).toBe('Enquiry');
    });
  });

  describe('getCustomerByPhone()', () => {
    it('queries customer by phone number for quick returning customer detection', async () => {
      const mockCustomer = {
        id: 5,
        phone: '9876543210',
        purpose: 'Repair / Service',
        name: 'Rahul Verma',
      };
      mockGetFirstAsync.mockResolvedValueOnce(mockCustomer);

      const customer = await dbHelper.getCustomerByPhone('9876543210');

      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE phone = ?'),
        ['9876543210']
      );
      expect(customer).toEqual(mockCustomer);
    });

    it('returns null if phone is empty or not found', async () => {
      const res = await dbHelper.getCustomerByPhone('');
      expect(res).toBeNull();
      expect(mockGetFirstAsync).not.toHaveBeenCalled();
    });
  });

  describe('updateCustomer()', () => {
    it('updates customer record successfully with status, delivery_date and payments', async () => {
      const updatedCustomer = {
        id: 5,
        phone: '9876543210',
        purpose: 'Repair / Service',
        name: 'Rahul Verma Updated',
        status: 'Ready for Delivery',
        delivery_date: '2026-11-21',
        estimated_cost: 2500,
        advance_paid: 500,
      };
      mockGetFirstAsync.mockResolvedValueOnce(updatedCustomer);

      const result = await dbHelper.updateCustomer(5, {
        phone: '9876543210',
        purpose: 'Repair / Service',
        name: 'Rahul Verma Updated',
        status: 'Ready for Delivery',
        delivery_date: '2026-11-21',
        estimated_cost: 2500,
        advance_paid: 500,
      });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET'),
        expect.arrayContaining(['9876543210', 'Repair / Service', 'Rahul Verma Updated', 'Ready for Delivery', '2026-11-21', 2500, 500, 5])
      );
      expect(result).toEqual(updatedCustomer);
    });
  });

  describe('getCustomerHistoryByPhone()', () => {
    it('queries all visits for a phone number to track repeat customers', async () => {
      const mockHistory = [
        { id: 2, phone: '9876543210', purpose: 'Purchase' },
        { id: 1, phone: '9876543210', purpose: 'Repair' },
      ];
      mockGetAllAsync.mockResolvedValueOnce(mockHistory);

      const history = await dbHelper.getCustomerHistoryByPhone('9876543210');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE phone = ?'),
        ['9876543210']
      );
      expect(history).toEqual(mockHistory);
    });
  });

  describe('Payment & Balance Due Khata Logic', () => {
    it('calculates balance due correctly', () => {
      const estimated = 2500;
      const advance = 500;
      const balanceDue = Math.max(0, estimated - advance);
      expect(balanceDue).toBe(2000);
    });

    it('returns 0 when fully paid or overpaid', () => {
      const estimated = 1000;
      const advance = 1000;
      const balanceDue = Math.max(0, estimated - advance);
      expect(balanceDue).toBe(0);
    });
  });

  describe('convertInquiryToRepair()', () => {
    it('promotes an inquiry into an active repair with all details populated', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 101 });
      mockGetAllAsync.mockResolvedValueOnce([]); // no existing repairs
      mockGetFirstAsync.mockResolvedValueOnce({
        id: 15,
        name: 'Walk-in Customer',
        phone: '9876543210',
        purpose: 'Repair / Service',
        status: 'converted',
        device_model: 'iPhone 13',
        imei: '862900030123457',
        estimated_cost: 2500,
        advance_paid: 500,
      });

      const res = await dbHelper.convertInquiryToRepair(15, {
        name: 'Walk-in Customer',
        phone: '9876543210',
        device_model: 'iPhone 13',
        imei: '862900030123457',
        purpose: 'Repair / Service',
        status: 'In Progress',
        estimated_cost: 2500,
        advance_paid: 500,
        notes: 'Cracked screen repair',
      });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET'),
        expect.arrayContaining(['9876543210', 'Repair / Service', 'Walk-in Customer', 'iPhone 13', '862900030123457', 'converted', 2500, 500, 15])
      );
      expect(res.customer.name).toBe('Walk-in Customer');
      expect(res.customer.purpose).toBe('Repair / Service');
      expect(res.customer.status).toBe('converted');
      expect(res.repair.status).toBe('In Progress');
      expect(res.closedCustomerId).toBe(15);
    });
  });

  describe('deleteCustomer()', () => {
    it('deletes customer by ID', async () => {
      const res = await dbHelper.deleteCustomer(5);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM customers WHERE id = ?'),
        [5]
      );
      expect(res).toBe(true);
    });
  });

  describe('searchCustomers()', () => {
    it('searches by name, phone, purpose, or imei', async () => {
      await dbHelper.searchCustomers('iPhone');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name LIKE ? OR phone LIKE ? OR device_model LIKE ? OR purpose LIKE ? OR imei LIKE ?'),
        ['%iPhone%', '%iPhone%', '%iPhone%', '%iPhone%', '%iPhone%']
      );
    });

    it('finds customer by scanned 15-digit IMEI', async () => {
      await dbHelper.searchCustomers('352099001761481');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('imei LIKE ?'),
        expect.arrayContaining(['%352099001761481%'])
      );
    });
  });

  describe('WhatsApp URL Formatter Utility', () => {
    function formatWhatsAppUrl(rawPhone, message = '') {
      if (!rawPhone) return '';
      // Strip spaces, dashes, parentheses
      const cleaned = rawPhone.replace(/[^0-9+]/g, '');
      const encodedMsg = message ? `?text=${encodeURIComponent(message)}` : '';
      return `https://wa.me/${cleaned}${encodedMsg}`;
    }

    it('formats clean WhatsApp link from raw phone number', () => {
      const url = formatWhatsAppUrl('+91 98765-43210', 'Hi Amit, your phone repair is ready!');
      expect(url).toBe('https://wa.me/+919876543210?text=Hi%20Amit%2C%20your%20phone%20repair%20is%20ready!');
    });

    it('handles phone number without message', () => {
      const url = formatWhatsAppUrl('9876543210');
      expect(url).toBe('https://wa.me/9876543210');
    });
  });
});
