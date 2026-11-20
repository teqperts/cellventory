// __tests__/shopContext.test.js

jest.mock('../config/firebase', () => ({
  auth: { currentUser: null },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { formatDefaultShopName } from '../context/ShopContext';

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
