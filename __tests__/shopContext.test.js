// __tests__/shopContext.test.js

jest.mock('../config/firebase', () => ({
  auth: { currentUser: null },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { formatDefaultShopName, normalizeAuthIdentifier } from '../context/ShopContext';

describe('normalizeAuthIdentifier', () => {
  it('passes through standard email addresses', () => {
    expect(normalizeAuthIdentifier('admin@example.com')).toBe('admin@example.com');
    expect(normalizeAuthIdentifier('store.care@teqperts.in')).toBe('store.care@teqperts.in');
  });

  it('normalizes pure username by appending @cellventory.com', () => {
    expect(normalizeAuthIdentifier('rathoremobiles')).toBe('rathoremobiles@cellventory.com');
    expect(normalizeAuthIdentifier('store1')).toBe('store1@cellventory.com');
  });

  it('trims whitespace and handles mixed case', () => {
    expect(normalizeAuthIdentifier('  ApexStore  ')).toBe('apexstore@cellventory.com');
    expect(normalizeAuthIdentifier('  User@Domain.COM  ')).toBe('user@domain.com');
  });

  it('returns empty string for null, empty, or undefined', () => {
    expect(normalizeAuthIdentifier('')).toBe('');
    expect(normalizeAuthIdentifier(null)).toBe('');
    expect(normalizeAuthIdentifier(undefined)).toBe('');
  });
});

describe('formatDefaultShopName', () => {
  it('formats single-word username into possessive shop name', () => {
    expect(formatDefaultShopName('prashant@example.com')).toBe("Prashant's Shop");
    expect(formatDefaultShopName('admin@domain.com')).toBe("Admin's Shop");
  });

  it('formats multi-word username separated by dots, dashes, or underscores', () => {
    expect(formatDefaultShopName('teqperts.mobile@gmail.com')).toBe('Teqperts Mobile');
    expect(formatDefaultShopName('apex_repairs_hub@store.com')).toBe('Apex Repairs Hub');
    expect(formatDefaultShopName('smart-telecom@yahoo.com')).toBe('Smart Telecom');
  });

  it('handles empty, null, or invalid email gracefully', () => {
    expect(formatDefaultShopName('')).toBe('My Shop');
    expect(formatDefaultShopName(null)).toBe('My Shop');
    expect(formatDefaultShopName(undefined)).toBe('My Shop');
    expect(formatDefaultShopName('@@@')).toBe('My Shop');
  });
});
