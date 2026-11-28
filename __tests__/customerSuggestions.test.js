// __tests__/customerSuggestions.test.js
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

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  FontAwesome5: 'FontAwesome5',
  Ionicons: 'Ionicons',
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

  describe('Inquiry Conversion Autofill Mapping', () => {
    function extractInquiryAutoFill(routeParams) {
      const params = routeParams || {};
      const init = params.initialValues || {};
      const cust = params.customer || {};

      const convertInquiryId =
        params.convertInquiryId ||
        init.convertInquiryId ||
        cust.convertInquiryId ||
        (cust.id && ((cust.purpose && cust.purpose.toLowerCase().includes('inquiry')) || cust.status === 'Inquiry') ? cust.id : null);

      const targetPhone = init.phone ?? cust.phone ?? params.phone ?? '';
      const targetName = init.name ?? cust.name ?? params.name ?? '';
      const rawModel = init.device_model ?? cust.device_model ?? cust.displayDevice ?? params.device_model ?? '';
      const targetModel = (rawModel && rawModel !== 'Device Inquiry' && rawModel !== 'Device') ? rawModel : '';
      const targetImei = init.imei ?? cust.imei ?? cust.displayImei ?? params.imei ?? '';
      const targetNotes = init.notes ?? cust.notes ?? cust.issue ?? cust.displayIssue ?? params.notes ?? '';
      const targetEmail = init.email ?? cust.email ?? params.email ?? '';
      const targetAddress = init.address ?? cust.address ?? params.address ?? '';
      const pickValidNumber = (...vals) => {
        for (const v of vals) {
          if (v !== undefined && v !== null && v !== '') {
            const clean = String(v).replace(/[^0-9.]/g, '');
            if (clean && !isNaN(clean) && parseFloat(clean) > 0) {
              return clean;
            }
          }
        }
        for (const v of vals) {
          if (v !== undefined && v !== null && v !== '') {
            const clean = String(v).replace(/[^0-9.]/g, '');
            if (clean && !isNaN(clean)) {
              return clean;
            }
          }
        }
        return '';
      };

      let targetCost = pickValidNumber(
        init.estimated_cost,
        cust.estimated_cost,
        cust.totalEstimated,
        params.estimated_cost
      );

      if ((!targetCost || targetCost === '0') && targetNotes) {
        const match = String(targetNotes).match(
          /(?:quote|estimate|cost|price)[:\s]*(?:₹|rs\.?|inr)?[:\s]*(\d+(?:\.\d+)?)|(?:₹|rs\.?|inr)[:\s]*(\d+(?:\.\d+)?)/i
        );
        if (match) {
          targetCost = match[1] || match[2];
        }
      }

      const targetAdvance = pickValidNumber(
        init.advance_paid,
        cust.advance_paid,
        cust.totalAdvance,
        params.advance_paid
      );
      const targetDeliveryDate = init.delivery_date ?? cust.delivery_date ?? cust.displayDueDate ?? params.delivery_date ?? '';
      const rawTargetPurpose = init.purpose ?? (convertInquiryId ? 'Repair' : (cust.purpose ?? params.purpose ?? ''));
      const targetPurpose = rawTargetPurpose ? (
        rawTargetPurpose.toLowerCase().includes('repair') ? 'Repair' :
        (rawTargetPurpose.toLowerCase().includes('inquiry') || rawTargetPurpose.toLowerCase().includes('enquiry')) ? 'Enquiry' :
        rawTargetPurpose.toLowerCase().includes('purchase') ? 'Purchase' : rawTargetPurpose
      ) : (convertInquiryId ? 'Repair' : '');

      return {
        convertInquiryId,
        phone: String(targetPhone),
        name: targetName,
        device_model: targetModel,
        imei: targetImei,
        notes: targetNotes,
        email: targetEmail,
        address: targetAddress,
        estimated_cost: targetCost,
        advance_paid: targetAdvance,
        delivery_date: targetDeliveryDate,
        purpose: targetPurpose,
      };
    }

    it('correctly autofills all available fields from customer inquiry object', () => {
      const inquiryCustomer = {
        id: 42,
        name: 'Rahul Sharma',
        phone: '9876543210',
        device_model: 'iPhone 13 Pro',
        imei: '862900030123457',
        notes: 'Cracked screen quotation',
        email: 'rahul@example.com',
        address: 'Sector 14, Gurgaon',
        estimated_cost: 4500,
        advance_paid: 500,
        delivery_date: '2026-11-25',
        purpose: 'Inquiry / Quotation',
      };

      const autofilled = extractInquiryAutoFill({
        convertInquiryId: 42,
        customer: inquiryCustomer,
      });

      expect(autofilled.convertInquiryId).toBe(42);
      expect(autofilled.name).toBe('Rahul Sharma');
      expect(autofilled.phone).toBe('9876543210');
      expect(autofilled.device_model).toBe('iPhone 13 Pro');
      expect(autofilled.imei).toBe('862900030123457');
      expect(autofilled.notes).toBe('Cracked screen quotation');
      expect(autofilled.email).toBe('rahul@example.com');
      expect(autofilled.address).toBe('Sector 14, Gurgaon');
      expect(autofilled.estimated_cost).toBe('4500');
      expect(autofilled.advance_paid).toBe('500');
      expect(autofilled.delivery_date).toBe('2026-11-25');
      expect(autofilled.purpose).toBe('Repair');
    });

    it('correctly falls back to customer.estimated_cost when init.estimated_cost is empty string', () => {
      const autofilled = extractInquiryAutoFill({
        convertInquiryId: 55,
        customer: {
          id: 55,
          name: 'Vikram',
          phone: '9988776655',
          estimated_cost: 3200,
        },
        initialValues: {
          convertInquiryId: 55,
          name: 'Vikram',
          phone: '9988776655',
          estimated_cost: '', // empty string from callers that checked totalEstimated
        },
      });

      expect(autofilled.estimated_cost).toBe('3200');
    });

    it('extracts estimate from notes if estimated_cost is not explicitly set', () => {
      const autofilled = extractInquiryAutoFill({
        convertInquiryId: 77,
        customer: {
          id: 77,
          name: 'Anjali',
          phone: '9870000000',
          notes: 'Display combo change quote: ₹2800',
          estimated_cost: 0,
        },
      });

      expect(autofilled.estimated_cost).toBe('2800');
    });

    it('correctly autofills from initialValues wrapped object', () => {
      const autofilled = extractInquiryAutoFill({
        initialValues: {
          convertInquiryId: 99,
          name: 'Priya Verma',
          phone: '9811223344',
          device_model: 'Samsung S22',
          imei: '356938035643803',
          notes: 'Battery replacement quote',
          estimated_cost: '2200',
          advance_paid: '0',
          purpose: 'Repair / Service',
        },
      });

      expect(autofilled.convertInquiryId).toBe(99);
      expect(autofilled.name).toBe('Priya Verma');
      expect(autofilled.phone).toBe('9811223344');
      expect(autofilled.device_model).toBe('Samsung S22');
      expect(autofilled.imei).toBe('356938035643803');
      expect(autofilled.notes).toBe('Battery replacement quote');
      expect(autofilled.estimated_cost).toBe('2200');
      expect(autofilled.advance_paid).toBe('0');
      expect(autofilled.purpose).toBe('Repair');
    });
  });

  describe('Purpose of Visit strictly 3 options', () => {
    it('exposes strictly 3 purpose options: Enquiry, Repair, and Purchase', () => {
      expect(dbHelper.PURPOSE_OPTIONS).toHaveLength(3);
      expect(dbHelper.PURPOSE_OPTIONS).toEqual(['Enquiry', 'Repair', 'Purchase']);
    });
  });

  describe('Global Customer Entry Identifier Validation (validateEntryIdentifier)', () => {
    it('allows Phone-only (10 digits) when IMEI is empty', () => {
      const result = dbHelper.validateEntryIdentifier({ phone: '9876543210', imei: '' });
      expect(result.valid).toBe(true);
      expect(result.identifierType).toBe('phone');
      expect(result.phone).toBe('9876543210');
    });

    it('allows IMEI-only (15 digits) when Phone is empty', () => {
      const result = dbHelper.validateEntryIdentifier({ phone: '', imei: '862900030123457' });
      expect(result.valid).toBe(true);
      expect(result.identifierType).toBe('imei');
      expect(result.imei).toBe('862900030123457');
    });

    it('allows both valid Phone and valid IMEI', () => {
      const result = dbHelper.validateEntryIdentifier({ phone: '9876543210', imei: '862900030123457' });
      expect(result.valid).toBe(true);
      expect(result.identifierType).toBe('both');
    });

    it('blocks and returns descriptive error when both phone and IMEI are empty', () => {
      const result = dbHelper.validateEntryIdentifier({ phone: '', imei: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one of Phone Number');
    });

    it('blocks when phone is partial and IMEI is empty', () => {
      const result = dbHelper.validateEntryIdentifier({ phone: '12345', imei: '' });
      expect(result.valid).toBe(false);
    });
  });

  describe('Quick Customer Entry Strictly 3 Action Types', () => {
    it('exposes strictly 3 actions: Enquiry, Repair, and Purchase', () => {
      const actionIds = dbHelper.ACTION_TYPES.map(a => a.id);
      expect(actionIds).toHaveLength(3);
      expect(actionIds).toEqual(['Enquiry', 'Repair', 'Purchase']);
    });
  });

  describe('Enquiry-to-Repair Conversion and Atomic Closure', () => {
    it('atomically marks customer status as converted, sets closed_at, and records repair_id', async () => {
      // Mock existing customer
      const existingCustomer = {
        id: 88,
        name: 'Karan Mehra',
        phone: '9876500000',
        device_model: 'OnePlus 9',
        imei: '862900030123457',
        status: 'Inquiry',
        notes: 'Screen flicker issue',
      };
      mockGetFirstAsync.mockResolvedValueOnce(existingCustomer);

      const repairPayload = {
        device_model: 'OnePlus 9',
        issue: 'Screen flicker issue',
        estimated_cost: 3500,
        advance_paid: 500,
        status: 'In Progress',
      };

      const result = await dbHelper.convertInquiryToRepair(88, repairPayload);

      // Verify that customer update sets status='converted', closed_at, and converted_repair_id
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining("closed_at = ?"),
        expect.arrayContaining(['converted', expect.any(String), expect.any(Number), 88])
      );
      expect(result).toHaveProperty('repair');
      expect(result).toHaveProperty('closedCustomerId', 88);
    });

    it('excludes converted and closed enquiries from getNextActionSuggestions', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]); // upcoming deliveries
      mockGetAllAsync.mockResolvedValueOnce([]); // overdue repairs
      mockGetAllAsync.mockResolvedValueOnce([]); // inquiry followups

      await dbHelper.getNextActionSuggestions();

      // Check the inquiry query in getNextActionSuggestions:
      // It should filter out status IN ('converted', 'Converted', 'closed', 'Closed')
      // AND converted_repair_id IS NULL AND closed_at IS NULL
      const inquiryCall = mockGetAllAsync.mock.calls.find(call =>
        call[0] && call[0].includes('customers') && call[0].includes('converted')
      );
      expect(inquiryCall).toBeDefined();
      expect(inquiryCall[0]).toContain("status NOT IN ('converted', 'Converted', 'closed', 'Closed')");
      expect(inquiryCall[0]).toContain('converted_repair_id IS NULL');
      expect(inquiryCall[0]).toContain('closed_at IS NULL');
    });
  });

  describe('Conditional Call & WhatsApp Visibility Logic', () => {
    function getCommunicationVisibility(phone) {
      const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '') : '';
      const hasValidPhone = cleanPhone.length >= 6;
      return {
        showCall: hasValidPhone,
        showWhatsApp: hasValidPhone,
        showAddPhonePrompt: !hasValidPhone,
      };
    }

    it('shows Call & WhatsApp when phone number is valid (>= 6 digits)', () => {
      const visibility = getCommunicationVisibility('9876543210');
      expect(visibility.showCall).toBe(true);
      expect(visibility.showWhatsApp).toBe(true);
      expect(visibility.showAddPhonePrompt).toBe(false);
    });

    it('hides Call & WhatsApp and shows + Add Phone when phone number is missing, empty, or short', () => {
      expect(getCommunicationVisibility('')).toEqual({
        showCall: false,
        showWhatsApp: false,
        showAddPhonePrompt: true,
      });

      expect(getCommunicationVisibility(null)).toEqual({
        showCall: false,
        showWhatsApp: false,
        showAddPhonePrompt: true,
      });

      expect(getCommunicationVisibility('123')).toEqual({
        showCall: false,
        showWhatsApp: false,
        showAddPhonePrompt: true,
      });
    });
  });

  describe('UI Label Unification: Inquiry to Enquiry Mapping', () => {
    function mapRecordLabel(record) {
      const status = (record.status || '').toLowerCase();
      const purpose = (record.purpose || '').toLowerCase();
      if (status === 'inquiry' || status === 'enquiry' || purpose.includes('inquiry') || purpose.includes('enquiry')) {
        return 'Enquiry';
      }
      return record.status || record.purpose || 'Other';
    }

    it('maps legacy database status "Inquiry" and purpose "Inquiry / Quotation" cleanly to UI "Enquiry"', () => {
      expect(mapRecordLabel({ status: 'Inquiry' })).toBe('Enquiry');
      expect(mapRecordLabel({ status: 'inquiry' })).toBe('Enquiry');
      expect(mapRecordLabel({ purpose: 'Inquiry / Quotation' })).toBe('Enquiry');
      expect(mapRecordLabel({ status: 'Enquiry' })).toBe('Enquiry');
      expect(mapRecordLabel({ status: 'In Progress' })).toBe('In Progress');
    });
  });
});
