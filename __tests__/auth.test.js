// __tests__/auth.test.js

jest.mock('../config/firebase', () => ({
  auth: { currentUser: null },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { normalizeAuthIdentifier } from '../context/ShopContext';

describe('Authentication Action Logic', () => {
  let mockSignInWithEmailAndPassword;

  beforeEach(() => {
    mockSignInWithEmailAndPassword = jest.fn();
  });

  const loginAction = async (identifier, password) => {
    const normalized = normalizeAuthIdentifier(identifier);
    if (!normalized || !password) {
      throw new Error('Please enter username or email and password');
    }

    try {
      return await mockSignInWithEmailAndPassword({}, normalized, password);
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many attempts. Try again later.');
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  };

  it('rejects when username/email is empty or only whitespace', async () => {
    await expect(loginAction('', 'password123')).rejects.toThrow('Please enter username or email and password');
    await expect(loginAction('   ', 'password123')).rejects.toThrow('Please enter username or email and password');
    expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('rejects when password is empty', async () => {
    await expect(loginAction('test@example.com', '')).rejects.toThrow('Please enter username or email and password');
    expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('successfully signs in with trimmed email and password', async () => {
    const mockUser = { uid: 'user_123', email: 'test@example.com' };
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

    const result = await loginAction('  test@example.com  ', 'secret123');

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@example.com', 'secret123');
    expect(result.user).toEqual(mockUser);
  });

  it('successfully signs in with username converted to standardized email', async () => {
    const mockUser = { uid: 'user_456', email: 'rathore@cellventory.com' };
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

    const result = await loginAction('rathore', 'secret123');

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith({}, 'rathore@cellventory.com', 'secret123');
    expect(result.user).toEqual(mockUser);
  });

  it('maps auth/invalid-credential error to user-friendly message', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/invalid-credential' });

    await expect(loginAction('test@example.com', 'wrongpass')).rejects.toThrow(
      'Invalid email or password.'
    );
  });

  it('maps auth/too-many-requests error to rate limit message', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/too-many-requests' });

    await expect(loginAction('test@example.com', 'pass')).rejects.toThrow(
      'Too many attempts. Try again later.'
    );
  });

  it('maps unexpected errors to generic fallback message', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    await expect(loginAction('test@example.com', 'pass')).rejects.toThrow(
      'Login failed. Please try again.'
    );
  });
});
