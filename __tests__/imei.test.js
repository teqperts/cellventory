// __tests__/imei.test.js
import {
  cleanIMEI,
  extractIMEIFromBarcode,
  formatIMEI,
  validateIMEI,
} from '../utils/imei';

describe('IMEI Validation and Utility Suite', () => {
  // Real valid IMEIs adhering to Luhn algorithm
  const VALID_IMEI_1 = '352099001761481';
  const VALID_IMEI_2 = '862900030123457';
  const VALID_IMEI_3 = '354890091234563';

  // Invalid IMEIs
  const INVALID_CHECKSUM = '352099001761482'; // Last digit wrong
  const SHORT_IMEI = '3520990017';
  const LONG_IMEI = '35209900176148299';

  describe('cleanIMEI()', () => {
    it('removes spaces, dashes, slashes, and letters', () => {
      expect(cleanIMEI('35-209900-176148-2')).toBe('352099001761482');
      expect(cleanIMEI('35 209900 176148 2')).toBe('352099001761482');
      expect(cleanIMEI('IMEI: 35/209900/176148/2')).toBe('352099001761482');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(cleanIMEI('')).toBe('');
      expect(cleanIMEI(null)).toBe('');
      expect(cleanIMEI(undefined)).toBe('');
    });
  });

  describe('validateIMEI()', () => {
    it('validates authentic 15-digit IMEIs with correct Luhn checksum', () => {
      const res1 = validateIMEI(VALID_IMEI_1);
      expect(res1.valid).toBe(true);
      expect(res1.length).toBe(15);

      const res2 = validateIMEI(VALID_IMEI_2);
      expect(res2.valid).toBe(true);

      const res3 = validateIMEI(VALID_IMEI_3);
      expect(res3.valid).toBe(true);
    });

    it('rejects an IMEI with an invalid Luhn check digit', () => {
      const res = validateIMEI(INVALID_CHECKSUM);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Luhn check failed');
    });

    it('rejects strings shorter than 15 digits', () => {
      const res = validateIMEI(SHORT_IMEI);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('must be 15 digits');
    });

    it('rejects strings longer than 15 digits', () => {
      const res = validateIMEI(LONG_IMEI);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('must be 15 digits');
    });
  });

  describe('formatIMEI()', () => {
    it('formats a 15-digit IMEI with standard hyphen groupings', () => {
      expect(formatIMEI(VALID_IMEI_1)).toBe('35-209900-176148-1');
    });

    it('returns raw text if length is not 15', () => {
      expect(formatIMEI('12345')).toBe('12345');
    });
  });

  describe('extractIMEIFromBarcode()', () => {
    it('extracts pure 15-digit IMEI when prefixed with "IMEI:"', () => {
      expect(extractIMEIFromBarcode('IMEI:352099001761482')).toBe('352099001761482');
      expect(extractIMEIFromBarcode('IMEI1: 352099001761482')).toBe('352099001761482');
    });

    it('extracts IMEI from raw barcode with whitespace', () => {
      expect(extractIMEIFromBarcode('  352099001761482  ')).toBe('352099001761482');
    });
  });
});
