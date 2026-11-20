// __tests__/customerSuggestions.test.js
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

describe('Customer Phone Auto-Suggestions & Inquiry Conversion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchCustomersByPhonePrefix()', () => {
    it('queries customers matching partial phone digits with limit', async () => {
      const mockMatches = [
        { id: 1, name: 'Amit Sharma', phone: '9876543210', purpose: 'Inquiry / Quotation' },
        { id: 2, name: 'Anil Kumar', phone: '9876511111', purpose: 'Repair / Service' },
      ];
      mockGetAllAsync.mockResolvedValueOnce(mockMatches);

      const results = await dbHelper.searchCustomersByPhonePrefix('98765', 5);

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE phone LIKE ? ORDER BY id DESC LIMIT ?'),
        ['%98765%', 5]
      );
      expect(results).toEqual(mockMatches);
    });

    it('returns empty array when input is blank', async () => {
      const results = await dbHelper.searchCustomersByPhonePrefix('   ');
      expect(results).toEqual([]);
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });
  });

  describe('convertCustomerPurpose()', () => {
    it('converts customer purpose from Inquiry to Repair / Service and appends note', async () => {
      const initialCustomer = {
        id: 12,
        name: 'Rahul Verma',
        phone: '9812345678',
        purpose: 'Inquiry / Quotation',
        device_model: 'iPhone 13',
        notes: 'Price check for OLED screen',
      };

      const updatedCustomer = {
        ...initialCustomer,
        purpose: 'Repair / Service',
        notes: 'Price check for OLED screen\n[Converted from "Inquiry / Quotation" to "Repair / Service"] Proceeding with repair',
      };

      // First call: getCustomerById before update
      mockGetFirstAsync.mockResolvedValueOnce(initialCustomer);
      // Second call: getCustomerById after update
      mockGetFirstAsync.mockResolvedValueOnce(updatedCustomer);

      const result = await dbHelper.convertCustomerPurpose(
        12,
        'Repair / Service',
        'Proceeding with repair'
      );

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET purpose = ?, notes = ? WHERE id = ?'),
        expect.arrayContaining(['Repair / Service', 12])
      );
      expect(result.purpose).toBe('Repair / Service');
    });

    it('converts customer purpose to Purchase / Accessory', async () => {
      const initialCustomer = {
        id: 14,
        name: 'Sneha Patel',
        phone: '9988776655',
        purpose: 'Inquiry / Quotation',
        notes: '',
      };

      mockGetFirstAsync.mockResolvedValueOnce(initialCustomer);
      mockGetFirstAsync.mockResolvedValueOnce({
        ...initialCustomer,
        purpose: 'Purchase / Accessory',
      });

      const result = await dbHelper.convertCustomerPurpose(14, 'Purchase / Accessory');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET purpose = ?, notes = ? WHERE id = ?'),
        expect.arrayContaining(['Purchase / Accessory', 14])
      );
      expect(result.purpose).toBe('Purchase / Accessory');
    });

    it('throws error if customer ID or new purpose is missing', async () => {
      await expect(dbHelper.convertCustomerPurpose(null, 'Repair / Service')).rejects.toThrow(
        'Customer ID is required'
      );
      await expect(dbHelper.convertCustomerPurpose(14, '')).rejects.toThrow(
        'New purpose is required'
      );
    });
  });

  describe('Inquiry Detection Helper', () => {
    function isInquiryCategory(purpose) {
      if (!purpose || typeof purpose !== 'string') return false;
      return purpose.toLowerCase().includes('inquiry');
    }

    it('accurately identifies Inquiry categories', () => {
      expect(isInquiryCategory('Inquiry / Quotation')).toBe(true);
      expect(isInquiryCategory('General Inquiry')).toBe(true);
      expect(isInquiryCategory('Repair / Service')).toBe(false);
      expect(isInquiryCategory('Purchase / Accessory')).toBe(false);
      expect(isInquiryCategory('')).toBe(false);
    });
  });
});
