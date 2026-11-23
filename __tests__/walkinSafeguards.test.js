// __tests__/walkinSafeguards.test.js

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn().mockResolvedValue(true) },
  Platform: { OS: 'android' },
  Dimensions: { get: jest.fn().mockReturnValue({ width: 375, height: 812 }) },
  StyleSheet: { create: (s) => s },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ActivityIndicator: 'ActivityIndicator',
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockImplementation(() => Promise.resolve(mockDbInstance)),
}));

jest.mock('../config/firebase', () => ({
  auth: { currentUser: null },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  FontAwesome5: 'FontAwesome5',
  Ionicons: 'Ionicons',
}));

import { buildJobSheetWhatsAppMessage } from '../components/QuickCustomerEntryModal';
import * as dbHelper from '../database/Helper';

// Mock expo-sqlite
const mockExecAsync = jest.fn().mockResolvedValue(undefined);
const mockRunAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 42, changes: 1 });
const mockGetAllAsync = jest.fn().mockResolvedValue([]);
const mockGetFirstAsync = jest.fn().mockResolvedValue(null);

const mockDbInstance = {
  execAsync: mockExecAsync,
  runAsync: mockRunAsync,
  getAllAsync: mockGetAllAsync,
  getFirstAsync: mockGetFirstAsync,
};

describe('Walk-in Customer Intake Safeguards & 1-Tap Job Sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rule 1: Identifier Safeguard (No identifier-free intake)', () => {
    it('passes validation when phone is provided without IMEI', () => {
      const res = dbHelper.validateEntryIdentifier({ phone: '9876543210', imei: '' });
      expect(res.valid).toBe(true);
    });

    it('passes validation when IMEI is provided without phone', () => {
      const res = dbHelper.validateEntryIdentifier({ phone: '', imei: '862900030123457' });
      expect(res.valid).toBe(true);
    });

    it('fails validation when neither phone nor IMEI is provided', () => {
      const res = dbHelper.validateEntryIdentifier({ phone: '', imei: '' });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/at least one of phone number or imei/i);
    });
  });

  describe('Rule 2, 3, 4, 5: 1-Tap WhatsApp Job Sheet & Dispute Checklist', () => {
    it('builds full dispute-proof job sheet with token number, passcode, checklist, and alt contact', () => {
      const msg = buildJobSheetWhatsAppMessage({
        shopName: 'CELLVENTORY Central',
        tokenNumber: 'TK-0042',
        customerName: 'Walk-in Customer',
        phone: '9876543210',
        altPhone: '9876500000',
        deviceModel: 'iPhone 13 Pro',
        imei: '862900030123457',
        issue: 'Broken display',
        passcode: '1234',
        passcodeDisabled: false,
        simReturned: true,
        sdReturned: false,
        deliveryDate: '2026-11-23',
        estimatedCost: '3500',
        advancePaid: '1000',
        status: 'In Progress',
      });

      expect(msg).toContain('🎟️ *Token No:* #TK-0042');
      expect(msg).toContain('👤 *Customer:* Walk-in Customer');
      expect(msg).toContain('📞 *Phone:* 9876543210');
      expect(msg).toContain('📱 *Alt Contact:* 9876500000');
      expect(msg).toContain('📱 *Device:* iPhone 13 Pro');
      expect(msg).toContain('🔐 *Device Passcode:* 1234');
      expect(msg).toContain('• SIM Card: Returned to Customer');
      expect(msg).toContain('• Memory Card: None / Not Present');
      expect(msg).toContain('💰 *Est. Amount:* ₹3500');
      expect(msg).toContain('💵 *Advance Paid:* ₹1000');
      expect(msg).toContain('⚠️ *Balance Due on Pickup:* ₹2500');
    });

    it('correctly handles disabled passcode and returned memory card', () => {
      const msg = buildJobSheetWhatsAppMessage({
        shopName: 'CELLVENTORY',
        tokenNumber: 'TK-0088',
        customerName: 'Pooja',
        phone: '9123456789',
        deviceModel: 'Samsung Galaxy S22',
        passcode: '',
        passcodeDisabled: true,
        simReturned: true,
        sdReturned: true,
        estimatedCost: '1500',
        advancePaid: '1500',
      });

      expect(msg).toContain('🎟️ *Token No:* #TK-0088');
      expect(msg).toContain('🔐 *Device Passcode:* Disabled / None');
      expect(msg).toContain('• SIM Card: Returned to Customer');
      expect(msg).toContain('• Memory Card: Returned to Customer');
      expect(msg).toContain('✅ *Balance:* Fully Paid');
    });
  });

  describe('Database Persistence of Alt Contact and Checklist', () => {
    it('persists alt_phone and passes repair fields in addCustomer()', async () => {
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 77, changes: 1 }); // customer
      mockRunAsync.mockResolvedValueOnce({ lastInsertRowId: 88, changes: 1 }); // repair

      const res = await dbHelper.addCustomer({
        phone: '9876543210',
        alt_phone: '9876500000',
        name: 'Walk-in Customer',
        purpose: 'Repair',
        device_model: 'Vivo V25',
        passcode: '9999',
        passcode_disabled: 0,
        sim_returned: 1,
        sd_returned: 0,
      });

      expect(res.id).toBe(77);
      expect(res.alt_phone).toBe('9876500000');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        expect.arrayContaining(['9876543210', '9876500000'])
      );
    });
  });
});
