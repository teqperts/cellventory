// __tests__/authSessionService.test.js

const mockReload = jest.fn();
const mockGetIdToken = jest.fn();
const mockSignOut = jest.fn();

jest.mock('firebase/auth', () => ({
  reload: (...args) => mockReload(...args),
  getIdToken: (...args) => mockGetIdToken(...args),
  signOut: (...args) => mockSignOut(...args),
}));

jest.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

import {
  isRevokedAuthError,
  verifyActiveSession,
} from '../services/AuthSessionService';

describe('AuthSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('keeps user logged in when reload and forced token refresh succeed', async () => {
    const mockAuth = { currentUser: { uid: 'u1', disabled: false } };
    const onRevoked = jest.fn();

    const res = await verifyActiveSession(mockAuth, { onRevoked });

    expect(mockReload).toHaveBeenCalledWith(mockAuth.currentUser);
    expect(mockGetIdToken).toHaveBeenCalledWith(mockAuth.currentUser, true);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(onRevoked).not.toHaveBeenCalled();
    expect(res).toEqual({ status: 'valid' });
  });

  it('signs out immediately when reload throws auth/user-disabled', async () => {
    const mockAuth = { currentUser: { uid: 'u1' } };
    const onRevoked = jest.fn();
    mockReload.mockRejectedValueOnce({ code: 'auth/user-disabled' });

    const res = await verifyActiveSession(mockAuth, { onRevoked });

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
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

  it('preserves offline session when reload fails with auth/network-request-failed', async () => {
    const mockAuth = { currentUser: { uid: 'u1' } };
    const onRevoked = jest.fn();
    mockReload.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    const res = await verifyActiveSession(mockAuth, { onRevoked });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(onRevoked).not.toHaveBeenCalled();
    expect(res).toEqual({ status: 'transient-error', code: 'auth/network-request-failed' });
  });

  it('deduplicates concurrent verifyActiveSession calls', async () => {
    const mockAuth = { currentUser: { uid: 'u1' } };
    let resolveReload;
    mockReload.mockReturnValueOnce(new Promise((r) => { resolveReload = r; }));
    mockGetIdToken.mockResolvedValueOnce('fresh-token');

    const p1 = verifyActiveSession(mockAuth);
    const p2 = verifyActiveSession(mockAuth);
    resolveReload();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(r1).toEqual({ status: 'valid' });
    expect(r2).toEqual({ status: 'valid' });
  });
});
