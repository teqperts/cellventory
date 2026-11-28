const mockGetDoc = jest.fn();
const mockRunTransaction = jest.fn();
const mockTransactionGet = jest.fn();
const mockTransactionSet = jest.fn();
const mockGetVerifiedSessionRecord = jest.fn();
const mockEvaluateOfflineGrace = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'registration-request-ref'),
  getDoc: (...args) => mockGetDoc(...args),
  runTransaction: (...args) => mockRunTransaction(...args),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('../config/firebase', () => ({
  firestore: {},
}));

jest.mock('../services/AuthSessionService', () => ({
  evaluateOfflineGrace: (...args) => mockEvaluateOfflineGrace(...args),
  getVerifiedSessionRecord: (...args) => mockGetVerifiedSessionRecord(...args),
}));

import {
  createRegistrationRequest,
  getRegistrationRequestStatus,
  isGoogleAuthUser,
} from '../services/RegistrationService';

const googleUser = {
  uid: 'google-uid',
  email: 'owner@example.com',
  emailVerified: true,
  providerData: [{ providerId: 'google.com' }],
};

describe('RegistrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVerifiedSessionRecord.mockResolvedValue(null);
    mockEvaluateOfflineGrace.mockResolvedValue({ allowed: false });
    mockTransactionGet.mockResolvedValue({ exists: () => false });
    mockRunTransaction.mockImplementation(async (_firestore, callback) =>
      callback({ get: mockTransactionGet, set: mockTransactionSet })
    );
  });

  it('accepts Google identities and rejects other providers', () => {
    expect(isGoogleAuthUser(googleUser)).toBe(true);
    expect(isGoogleAuthUser({ providerData: [{ providerId: 'password' }] })).toBe(false);
  });

  it('requires Google authentication before looking up an access request', async () => {
    await expect(getRegistrationRequestStatus({
      ...googleUser,
      providerData: [{ providerId: 'password' }],
    })).resolves.toEqual({ status: 'google-required' });
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('returns not-requested when the signed-in user has no request', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await expect(getRegistrationRequestStatus(googleUser)).resolves.toEqual({
      status: 'not-requested',
    });
  });

  it('returns the saved request status', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'pending', shopName: 'Repair Shop' }),
    });

    await expect(getRegistrationRequestStatus(googleUser)).resolves.toEqual({
      status: 'pending',
      request: { status: 'pending', shopName: 'Repair Shop' },
    });
  });

  it('uses the approved trusted session only during transient Firestore failures', async () => {
    mockGetDoc.mockRejectedValue({ code: 'unavailable' });
    mockGetVerifiedSessionRecord.mockResolvedValue({ registrationApproved: true });
    mockEvaluateOfflineGrace.mockResolvedValue({ allowed: true, remainingMs: 1200 });

    await expect(getRegistrationRequestStatus(googleUser, 123)).resolves.toEqual({
      status: 'approved',
      offline: true,
      remainingMs: 1200,
    });
    expect(mockEvaluateOfflineGrace).toHaveBeenCalledWith('google-uid', 123);
  });

  it('creates a pending request with server timestamp and normalized optional phone', async () => {
    const result = await createRegistrationRequest(googleUser, {
      shopName: '  Repair Shop  ',
      ownerName: '  Shop Owner ',
      phone: '  +1 555 0100 ',
    });

    expect(result).toEqual({ status: 'pending', existing: false });
    expect(mockTransactionSet).toHaveBeenCalledWith('registration-request-ref', {
      shopName: 'Repair Shop',
      ownerName: 'Shop Owner',
      email: 'owner@example.com',
      phone: '+1 555 0100',
      status: 'pending',
      createdAt: 'server-timestamp',
    });
  });

  it('does not let a user replace or recreate an existing request', async () => {
    mockTransactionGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'rejected' }),
    });

    await expect(createRegistrationRequest(googleUser, {
      shopName: 'Repair Shop',
      ownerName: 'Shop Owner',
    })).resolves.toEqual({ status: 'rejected', existing: true });
    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it('rejects unverified Google accounts and invalid shop fields', async () => {
    await expect(createRegistrationRequest({
      ...googleUser,
      emailVerified: false,
    }, { shopName: 'Repair Shop', ownerName: 'Shop Owner' })).rejects.toMatchObject({
      code: 'registration/google-account-required',
    });

    await expect(createRegistrationRequest(googleUser, {
      shopName: 'x',
      ownerName: 'Shop Owner',
    })).rejects.toMatchObject({
      code: 'registration/invalid-shop-name',
    });
  });
});
