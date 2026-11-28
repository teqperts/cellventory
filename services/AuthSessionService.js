// services/AuthSessionService.js
import { getIdToken, reload, signOut } from 'firebase/auth';

import { auth } from '../config/firebase';

export const DEFAULT_SESSION_CHECK_INTERVAL_MS = 30000;

export const REVOKED_AUTH_CODES = new Set([
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/user-token-expired',
  'auth/invalid-user-token',
]);

/**
 * Returns true only when Firebase explicitly signals the account or session
 * has been disabled, deleted, or invalidated. Offline/network errors return false.
 */
export function isRevokedAuthError(err) {
  return Boolean(err && typeof err.code === 'string' && REVOKED_AUTH_CODES.has(err.code));
}

let activeVerificationPromise = null;

/**
 * Verifies the active Firebase Auth user directly with Firebase servers.
 * If the login was disabled or deleted in Firebase Console, immediately signs out.
 * Transient offline/network failures leave the offline-first session intact.
 */
export async function verifyActiveSession(authInstance = auth, { onRevoked } = {}) {
  const currentUser = authInstance?.currentUser;
  if (!currentUser) {
    return { status: 'no-user' };
  }

  if (activeVerificationPromise) {
    return activeVerificationPromise;
  }

  activeVerificationPromise = (async () => {
    try {
      await reload(currentUser);

      if (authInstance?.currentUser?.disabled) {
        await signOut(authInstance);
        if (typeof onRevoked === 'function') {
          onRevoked('auth/user-disabled');
        }
        return { status: 'revoked', code: 'auth/user-disabled' };
      }

      await getIdToken(currentUser, true);
      return { status: 'valid' };
    } catch (err) {
      if (isRevokedAuthError(err)) {
        try {
          await signOut(authInstance);
        } catch (signOutErr) {
          console.warn('Forced sign-out error:', signOutErr?.message || signOutErr);
        }
        if (typeof onRevoked === 'function') {
          onRevoked(err.code);
        }
        return { status: 'revoked', code: err.code };
      }

      return { status: 'transient-error', code: err?.code || 'unknown' };
    } finally {
      activeVerificationPromise = null;
    }
  })();

  return activeVerificationPromise;
}
