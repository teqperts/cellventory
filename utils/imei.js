// utils/imei.js

/**
 * Strips all non-numeric characters from a raw string.
 * @param {string} raw
 * @returns {string}
 */
export function cleanIMEI(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/[^0-9]/g, '');
}

/**
 * Validates a 15-digit IMEI using the standard Luhn Algorithm (Mod 10).
 * @param {string} raw
 * @returns {{ valid: boolean, reason: string, cleaned: string, length: number }}
 */
export function validateIMEI(raw) {
  if (!raw) {
    return { valid: false, reason: 'No IMEI provided', cleaned: '', length: 0 };
  }

  const cleaned = cleanIMEI(raw);

  if (cleaned.length !== 15) {
    return {
      valid: false,
      reason: `IMEI must be 15 digits (currently ${cleaned.length})`,
      cleaned,
      length: cleaned.length,
    };
  }

  // Luhn algorithm for IMEI (15 digits)
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(cleaned.charAt(i), 10);

    // Double every second digit from the left (odd indexes: 1, 3, 5, 7, 9, 11, 13)
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9; // equivalent to digit % 10 + Math.floor(digit / 10)
      }
    }
    sum += digit;
  }

  const isValid = sum % 10 === 0;

  return {
    valid: isValid,
    reason: isValid ? 'Valid IMEI (Checksum verified)' : 'Invalid checksum (Luhn check failed)',
    cleaned,
    length: 15,
  };
}

/**
 * Formats a 15-digit IMEI for human readability (TAC-FAC-SNR-CD).
 * e.g., 352099001761482 -> 35-209900-176148-2
 * @param {string} raw
 * @returns {string}
 */
export function formatIMEI(raw) {
  const cleaned = cleanIMEI(raw);
  if (cleaned.length !== 15) return cleaned;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 8)}-${cleaned.slice(8, 14)}-${cleaned.slice(14)}`;
}

/**
 * Extracts a 15-digit IMEI candidate from scanned barcode data.
 * Handles prefixes such as "IMEI:", "IMEI1:", "SN:", or full URLs.
 * @param {string} barcodeData
 * @returns {string}
 */
export function extractIMEIFromBarcode(barcodeData) {
  if (!barcodeData || typeof barcodeData !== 'string') return '';

  const trimmed = barcodeData.trim();

  // Check for 15-digit sequence
  const match = trimmed.match(/\b\d{15}\b/);
  if (match) {
    return match[0];
  }

  // Fallback: clean all non-digits and if it's 15 digits, return it
  const cleaned = cleanIMEI(trimmed);
  if (cleaned.length === 15) {
    return cleaned;
  }

  return cleaned || trimmed;
}
