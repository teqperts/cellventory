import * as SecureStore from 'expo-secure-store';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { firestore } from '../config/firebase';

export const DEVICE_BINDING_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export const DEVICE_BINDING_ERROR_CODES = new Set([
  'auth/device-already-bound',
  'auth/device-binding-reset',
  'auth/device-binding-failed',
  'auth/device-binding-storage-unavailable',
]);

const INSTALLATION_ID_KEY = 'cellventory_installation_id';
const DEVICE_BINDING_STATE_PREFIX = 'cellventory_device_binding_';
const TRANSIENT_FIRESTORE_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'network-request-failed',
  'cancelled',
]);

function getBindingStateKey(uid) {
  const safeUid = String(uid).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${DEVICE_BINDING_STATE_PREFIX}${safeUid}`;
}

function createDeviceBindingError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createSecureStoreError() {
  return createDeviceBindingError(
    'auth/device-binding-storage-unavailable',
    'Secure device storage is unavailable.'
  );
}

async function readSecureValue(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    throw createSecureStoreError();
  }
}

async function writeSecureValue(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    throw createSecureStoreError();
  }
}

function isTransientFirestoreError(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '');
  return TRANSIENT_FIRESTORE_CODES.has(code);
}

async function ensureSecureStoreAvailable() {
  try {
    if (typeof SecureStore.isAvailableAsync === 'function' && await SecureStore.isAvailableAsync()) {
      return;
    }
  } catch {
    throw createSecureStoreError();
  }

  throw createSecureStoreError();
}

async function getInstallationId() {
  await ensureSecureStoreAvailable();
  const existingId = await readSecureValue(INSTALLATION_ID_KEY);
  if (existingId) return existingId;

  const installationId = doc(collection(firestore, '_deviceIdSeeds')).id;
  await writeSecureValue(INSTALLATION_ID_KEY, installationId);
  return installationId;
}

async function getLocalBindingState(uid) {
  const raw = await readSecureValue(getBindingStateKey(uid));
  if (!raw) {
    return { hasPreviouslyBound: false, lastVerifiedAt: null };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      hasPreviouslyBound: parsed?.hasPreviouslyBound === true,
      lastVerifiedAt: Number.isFinite(parsed?.lastVerifiedAt) ? parsed.lastVerifiedAt : null,
    };
  } catch {
    return { hasPreviouslyBound: true, lastVerifiedAt: null };
  }
}

async function persistBindingState(uid, nowMs) {
  await writeSecureValue(
    getBindingStateKey(uid),
    JSON.stringify({ hasPreviouslyBound: true, lastVerifiedAt: nowMs })
  );
}

/**
 * Claims an account for the first installation, or verifies an existing binding.
 * A previously bound installation cannot reclaim a binding removed by support.
 */
export async function verifyDeviceBinding(uid, { nowMs = Date.now(), force = false } = {}) {
  if (!uid) {
    throw createDeviceBindingError(
      'auth/device-binding-failed',
      'A signed-in account is required to verify this device.'
    );
  }

  await ensureSecureStoreAvailable();
  const localState = await getLocalBindingState(uid);
  const installationId = await getInstallationId();
  const recentlyVerified =
    localState.hasPreviouslyBound &&
    Number.isFinite(localState.lastVerifiedAt) &&
    nowMs >= localState.lastVerifiedAt &&
    nowMs - localState.lastVerifiedAt < DEVICE_BINDING_CHECK_INTERVAL_MS;

  if (!force && recentlyVerified) {
    return { status: 'cached', lastVerifiedAt: localState.lastVerifiedAt };
  }

  const bindingRef = doc(firestore, 'deviceBindings', uid);

  try {
    const status = await runTransaction(firestore, async (transaction) => {
      const bindingSnapshot = await transaction.get(bindingRef);

      if (!bindingSnapshot.exists()) {
        if (localState.hasPreviouslyBound) {
          throw createDeviceBindingError(
            'auth/device-binding-reset',
            'This device registration was reset. Contact support to register a replacement device.'
          );
        }

        transaction.set(bindingRef, {
          deviceId: installationId,
          createdAt: serverTimestamp(),
        });
        return 'claimed';
      }

      if (bindingSnapshot.data()?.deviceId !== installationId) {
        throw createDeviceBindingError(
          'auth/device-already-bound',
          'This account is already registered to another device.'
        );
      }

      return 'verified';
    });

    await persistBindingState(uid, nowMs);
    return { status, lastVerifiedAt: nowMs };
  } catch (error) {
    if (DEVICE_BINDING_ERROR_CODES.has(error?.code) || isTransientFirestoreError(error)) {
      throw error;
    }

    const bindingError = createDeviceBindingError(
      'auth/device-binding-failed',
      'Unable to verify this device. Connect to the internet and try again.'
    );
    bindingError.cause = error;
    throw bindingError;
  }
}
