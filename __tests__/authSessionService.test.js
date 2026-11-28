// __tests__/authSessionService.test.js

const mockReload = jest.fn();
const mockGetIdToken = jest.fn();
const mockSignOut = jest.fn();
const mockSecureStoreMap = new Map();

jest.mock('firebase/auth', () => ({
  reload: (...args) => mockReload(...args),
  getIdToken: (...args) => mockGetIdToken(...args),
  signOut: (...args) => mockSignOut(...args),
}));

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  getItemAsync: jest.fn(async (k) => (mockSecureStoreMap.has(k) ? mockSecureStoreMap.get(k) : null)),
  setItemAsync: jest.fn(async (k, v) => {
    mockSecureStoreMap.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k) => {
    mockSecureStoreMap.delete(k);
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

import * as SecureStore from 'expo-secure-store';

import {
  CLOCK_SKEW_TOLERANCE_MS,
  getVerifiedSessionRecord,
  isRevokedAuthError,
  MAX_OFFLINE_GRACE_MS,
  recordVerifiedSession,
  verifyActiveSession,
} from '../services/AuthSessionService';

describe('AuthSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStoreMap.clear();
    mockReload.mockResolvedValue(undefined);
    mockGetIdToken.mockResolvedValue('fresh-token');
    mockSignOut.mockResolvedValue(undefined);
  });

  it('recognizes revoked auth error codes while ignoring network errors', () => {
    expect(isRevokedAuthError({ code: 'auth/user-disabled' })).toBe(true);
    expect(isRevokedAuthError({ code: 'auth/user-not-found' })).toBe(true);
    expect(isRevokedAuthError({ code: 'auth/user-token-expired' })).toBe(true);
    expect(isRevokedAuthError({ code: 'auth/invalid-user-token' })).toBe(true);
    expect(isRevokedAuthError({ code: 'auth/network-request-failed' })).toBe(false);
    expect(isRevokedAuthError(null)).toBe(false);
  });

  it('returns no-user when there is no active currentUser', async () => {
    const res = await verifyActiveSession({ currentUser: null });
    expect(res).toEqual({ status: 'no-user' });
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('records SecureStore verified timestamp when online verification succeeds', async () => {
    const mockAuth = { currentUser: { uid: 'u1', disabled: false } };
    const onRevoked = jest.fn();
    const nowMs = 1_700_000_000_000;

    const res = await verifyActiveSession(mockAuth, { onRevoked, nowMs });

    expect(mockReload).toHaveBeenCalledWith(mockAuth.currentUser);
    expect(mockGetIdToken).toHaveBeenCalledWith(mockAuth.currentUser, true);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(onRevoked).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'cellventory_session_trust_u1',
      expect.stringContaining(`"lastVerifiedAt":${nowMs}`)
    );
    expect(res).toEqual({ status: 'valid', lastVerifiedAt: nowMs });
  });

  it('signs out immediately and clears SecureStore trust when reload throws auth/user-disabled', async () => {
    await recordVerifiedSession('u1', 1_700_000_000_000);
    const mockAuth = { currentUser: { uid: 'u1' } };
    const onRevoked = jest.fn();
    mockReload.mockRejectedValueOnce({ code: 'auth/user-disabled' });

    const res = await verifyActiveSession(mockAuth, { onRevoked });

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cellventory_session_trust_u1');
    expect(onRevoked).toHaveBeenCalledWith('auth/user-disabled');
    expect(res).toEqual({ status: 'revoked', code: 'auth/user-disabled' });
  });

  it('signs out immediately when getIdToken throws auth/user-token-expired', async () => {
    const mockAuth = { currentUser: { uid: 'u1' } };
    const onRevoked = jest.fn();
    mockGetIdToken.mockRejectedValueOnce({ code: 'auth/user-token-expired' });

    const res = await verifyActiveSession(mockAuth, { onRevoked });

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    expect(onRevoked).toHaveBeenCalledWith('auth/user-token-expired');
    expect(res).toEqual({ status: 'revoked', code: 'auth/user-token-expired' });
  });

  it('signs out immediately when currentUser.disabled flag is true after reload', async () => {
    const mockAuth = { currentUser: { uid: 'u1', disabled: true } };
    const onRevoked = jest.fn();

    const res = await verifyActiveSession(mockAuth, { onRevoked });

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    expect(onRevoked).toHaveBeenCalledWith('auth/user-disabled');
    expect(res).toEqual({ status: 'revoked', code: 'auth/user-disabled' });
  });

  it('allows offline session within 72h grace period and advances lastSeenAt watermark', async () => {
    const verifiedAt = 1_700_000_000_000;
    await recordVerifiedSession('u1', verifiedAt);

    const offlineNow = verifiedAt + 24 * 60 * 60 * 1000; // +24h
    const mockAuth = { currentUser: { uid: 'u1' } };
    const onRevoked = jest.fn();
    mockReload.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    const res = await verifyActiveSession(mockAuth, { onRevoked, nowMs: offlineNow });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(onRevoked).not.toHaveBeenCalled();
    expect(res.status).toBe('offline-grace');
    expect(res.remainingMs).toBe(MAX_OFFLINE_GRACE_MS - 24 * 60 * 60 * 1000);

    const stored = await getVerifiedSessionRecord('u1');
    expect(stored.lastVerifiedAt).toBe(verifiedAt);
    expect(stored.lastSeenAt).toBe(offlineNow);
  });

  it('forces sign-out when offline grace window (72h) has expired', async () => {
    const verifiedAt = 1_700_000_000_000;
    await recordVerifiedSession('u1', verifiedAt);

    const expiredNow = verifiedAt + MAX_OFFLINE_GRACE_MS + 1000;
    const mockAuth = { currentUser: { uid: 'u1' } };
    const onRevoked = jest.fn();
    mockReload.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    const res = await verifyActiveSession(mockAuth, { onRevoked, nowMs: expiredNow });

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    expect(onRevoked).toHaveBeenCalledWith('auth/offline-grace-expired');
    expect(res).toEqual({ status: 'revoked', code: 'auth/offline-grace-expired' });
  });

  it('forces sign-out when device clock is rolled backward beyond skew tolerance', async () => {
    const verifiedAt = 1_700_000_000_000;
    await recordVerifiedSession('u1', verifiedAt);

    // Advance offline once to 10h later
    const laterOffline = verifiedAt + 10 * 60 * 60 * 1000;
    mockReload.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    await verifyActiveSession({ currentUser: { uid: 'u1' } }, { nowMs: laterOffline });

    // Attacker rolls clock backward by 2 hours
    const rolledBackNow = laterOffline - 2 * 60 * 60 * 1000;
    const mockAuth = { currentUser: { uid: 'u1' } };
    const onRevoked = jest.fn();
    mockReload.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    const res = await verifyActiveSession(mockAuth, { onRevoked, nowMs: rolledBackNow });

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    expect(onRevoked).toHaveBeenCalledWith('auth/clock-tampered');
    expect(res).toEqual({ status: 'revoked', code: 'auth/clock-tampered' });
  });

  it('tolerates minor NTP clock drift within skew tolerance while offline', async () => {
    const verifiedAt = 1_700_000_000_000;
    await recordVerifiedSession('u1', verifiedAt);

    const minorDriftNow = verifiedAt - (CLOCK_SKEW_TOLERANCE_MS - 60_000); // 4m behind
    const mockAuth = { currentUser: { uid: 'u1' } };
    const onRevoked = jest.fn();
    mockReload.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    const res = await verifyActiveSession(mockAuth, { onRevoked, nowMs: minorDriftNow });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(onRevoked).not.toHaveBeenCalled();
    expect(res.status).toBe('offline-grace');
  });

  it('forces sign-out when offline and no prior SecureStore verification record exists', async () => {
    const mockAuth = { currentUser: { uid: 'u_unverified' } };
    const onRevoked = jest.fn();
    mockReload.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    const res = await verifyActiveSession(mockAuth, { onRevoked });

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    expect(onRevoked).toHaveBeenCalledWith('auth/offline-unverified');
    expect(res).toEqual({ status: 'revoked', code: 'auth/offline-unverified' });
  });

  it('deduplicates concurrent verifyActiveSession calls', async () => {
    const mockAuth = { currentUser: { uid: 'u1' } };
    let resolveReload;
    mockReload.mockReturnValueOnce(new Promise((r) => { resolveReload = r; }));
    mockGetIdToken.mockResolvedValueOnce('fresh-token');

    const p1 = verifyActiveSession(mockAuth, { nowMs: 1_700_000_000_000 });
    const p2 = verifyActiveSession(mockAuth, { nowMs: 1_700_000_000_000 });
    resolveReload();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(r1).toEqual({ status: 'valid', lastVerifiedAt: 1_700_000_000_000 });
    expect(r2).toEqual({ status: 'valid', lastVerifiedAt: 1_700_000_000_000 });
  });
});
