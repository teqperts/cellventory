// services/AuthSessionService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getIdToken, reload, signOut } from 'firebase/auth';

import { auth } from '../config/firebase';

export const DEFAULT_SESSION_CHECK_INTERVAL_MS = 30000;
export const MAX_OFFLINE_GRACE_MS = 72 * 60 * 60 * 1000; // 72 hours
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes tolerance for NTP clock drift

const TRUST_KEY_PREFIX = 'cellventory_session_trust_';

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

function getTrustStorageKey(uid) {
  const safeUid = String(uid || 'default').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${TRUST_KEY_PREFIX}${safeUid}`;
}

async function isSecureStoreSupported() {
  try {
    if (typeof SecureStore.isAvailableAsync === 'function') {
      return await SecureStore.isAvailableAsync();
    }
    return typeof SecureStore.getItemAsync === 'function';
  } catch (e) {
    return false;
  }
}

async function readTrustRaw(key) {
  if (await isSecureStoreSupported()) {
    return await SecureStore.getItemAsync(key);
  }
  return await AsyncStorage.getItem(key);
}

async function writeTrustRaw(key, value) {
  if (await isSecureStoreSupported()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function deleteTrustRaw(key) {
  if (await isSecureStoreSupported()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

/**
 * Persists the latest server-verified timestamp for this UID in SecureStore.
 */
export async function recordVerifiedSession(uid, nowMs = Date.now()) {
  if (!uid) return null;
  const payload = {
    uid,
    lastVerifiedAt: nowMs,
    lastSeenAt: nowMs,
  };
  await writeTrustRaw(getTrustStorageKey(uid), JSON.stringify(payload)).catch((e) => {
    console.warn('Failed to store verified session timestamp:', e?.message || e);
  });
  return payload;
}

/**
 * Reads the persisted verification record for this UID.
 */
export async function getVerifiedSessionRecord(uid) {
  if (!uid) return null;
  try {
    const raw = await readTrustRaw(getTrustStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.lastVerifiedAt !== 'number') return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

/**
 * Removes stored verification metadata when a session is revoked or signed out.
 */
export async function clearVerifiedSession(uid) {
  if (!uid) return;
  await deleteTrustRaw(getTrustStorageKey(uid)).catch(() => {});
}

/**
 * Evaluates whether an offline user is still within the 72-hour offline grace period
 * and has not rolled the device clock backward.
 */
export async function evaluateOfflineGrace(uid, nowMs = Date.now()) {
  const record = await getVerifiedSessionRecord(uid);
  if (!record || !record.lastVerifiedAt) {
    return { allowed: false, reason: 'auth/offline-unverified' };
  }

  const lastVerifiedAt = record.lastVerifiedAt;
  const lastSeenAt = typeof record.lastSeenAt === 'number' ? record.lastSeenAt : lastVerifiedAt;

  // Detect backward clock tampering beyond small NTP drift
  if (
    nowMs + CLOCK_SKEW_TOLERANCE_MS < lastVerifiedAt ||
    nowMs + CLOCK_SKEW_TOLERANCE_MS < lastSeenAt
  ) {
    return { allowed: false, reason: 'auth/clock-tampered' };
  }

  const offlineElapsedMs = Math.max(0, nowMs - lastVerifiedAt);
  if (offlineElapsedMs > MAX_OFFLINE_GRACE_MS) {
    return { allowed: false, reason: 'auth/offline-grace-expired' };
  }

  // Advance monotonic lastSeenAt watermark
  if (nowMs > lastSeenAt) {
    const updated = {
      uid,
      lastVerifiedAt,
      lastSeenAt: nowMs,
    };
    await writeTrustRaw(getTrustStorageKey(uid), JSON.stringify(updated)).catch(() => {});
  }

  return {
    allowed: true,
    remainingMs: MAX_OFFLINE_GRACE_MS - offlineElapsedMs,
  };
}

let activeVerificationPromise = null;

/**
 * Verifies the active Firebase Auth user directly with Firebase servers.
 * - Valid online verification records/refreshes the 72h SecureStore offline grace window.
 * - Disabled/deleted/expired Firebase logins are immediately signed out.
 * - Offline sessions remain allowed only within MAX_OFFLINE_GRACE_MS and without backward clock tampering.
 */
export async function verifyActiveSession(authInstance = auth, { onRevoked, nowMs } = {}) {
  const currentUser = authInstance?.currentUser;
  if (!currentUser) {
    return { status: 'no-user' };
  }

  if (activeVerificationPromise) {
    return activeVerificationPromise;
  }

  const checkTimeMs = typeof nowMs === 'number' ? nowMs : Date.now();

  activeVerificationPromise = (async () => {
    try {
      await reload(currentUser);

      if (authInstance?.currentUser?.disabled) {
        await clearVerifiedSession(currentUser.uid);
        await signOut(authInstance);
        if (typeof onRevoked === 'function') {
          onRevoked('auth/user-disabled');
        }
        return { status: 'revoked', code: 'auth/user-disabled' };
      }

      await getIdToken(currentUser, true);
      await recordVerifiedSession(currentUser.uid, checkTimeMs);
      return { status: 'valid', lastVerifiedAt: checkTimeMs };
    } catch (err) {
      if (isRevokedAuthError(err)) {
        await clearVerifiedSession(currentUser.uid);
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

      // Offline / transient network error: enforce 72h grace period & clock-tamper guard
      const graceCheck = await evaluateOfflineGrace(currentUser.uid, checkTimeMs);
      if (!graceCheck.allowed) {
        try {
          await signOut(authInstance);
        } catch (signOutErr) {
          console.warn('Offline grace sign-out error:', signOutErr?.message || signOutErr);
        }
        if (typeof onRevoked === 'function') {
          onRevoked(graceCheck.reason);
        }
        return { status: 'revoked', code: graceCheck.reason };
      }

      return {
        status: 'offline-grace',
        code: err?.code || 'unknown',
        remainingMs: graceCheck.remainingMs,
      };
    } finally {
      activeVerificationPromise = null;
    }
  })();

  return activeVerificationPromise;
}
