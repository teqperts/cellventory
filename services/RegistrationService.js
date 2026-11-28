import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { firestore } from '../config/firebase';
import { evaluateOfflineGrace, getVerifiedSessionRecord } from './AuthSessionService';

const REGISTRATION_REQUESTS_COLLECTION = 'registrationRequests';
const GOOGLE_PROVIDER_ID = 'google.com';
const VALID_REQUEST_STATUSES = new Set(['pending', 'approved', 'rejected']);
const TRANSIENT_FIRESTORE_CODES = new Set([
  'cancelled',
  'deadline-exceeded',
  'network-request-failed',
  'unavailable',
]);

function createRegistrationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isTransientFirestoreError(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '');
  return TRANSIENT_FIRESTORE_CODES.has(code);
}

function getRegistrationRequestRef(uid) {
  return doc(firestore, REGISTRATION_REQUESTS_COLLECTION, uid);
}

export function isGoogleAuthUser(user) {
  return Boolean(
    user?.providerData?.some((provider) => provider.providerId === GOOGLE_PROVIDER_ID)
  );
}

export async function getRegistrationRequestStatus(user, nowMs = Date.now()) {
  if (!user?.uid || !isGoogleAuthUser(user)) {
    return { status: 'google-required' };
  }

  try {
    const snapshot = await getDoc(getRegistrationRequestRef(user.uid));
    if (!snapshot.exists()) {
      return { status: 'not-requested' };
    }

    const data = snapshot.data();
    if (!VALID_REQUEST_STATUSES.has(data?.status)) {
      throw createRegistrationError(
        'registration/invalid-status',
        'The access request has an invalid approval status.'
      );
    }

    return { status: data.status, request: data };
  } catch (error) {
    if (!isTransientFirestoreError(error)) {
      throw error;
    }

    const trustedSession = await getVerifiedSessionRecord(user.uid);
    if (trustedSession?.registrationApproved === true) {
      const grace = await evaluateOfflineGrace(user.uid, nowMs);
      if (grace.allowed) {
        return {
          status: 'approved',
          offline: true,
          remainingMs: grace.remainingMs,
        };
      }
    }

    throw error;
  }
}

export async function createRegistrationRequest(user, { shopName, ownerName, phone }) {
  if (!user?.uid || !isGoogleAuthUser(user) || !user.emailVerified || !user.email) {
    throw createRegistrationError(
      'registration/google-account-required',
      'Sign in with a verified Google account before requesting access.'
    );
  }

  const normalizedShopName = typeof shopName === 'string' ? shopName.trim() : '';
  const normalizedOwnerName = typeof ownerName === 'string' ? ownerName.trim() : '';
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';

  if (normalizedShopName.length < 2 || normalizedShopName.length > 120) {
    throw createRegistrationError(
      'registration/invalid-shop-name',
      'Enter a shop name between 2 and 120 characters.'
    );
  }

  if (normalizedOwnerName.length < 2 || normalizedOwnerName.length > 120) {
    throw createRegistrationError(
      'registration/invalid-owner-name',
      'Enter an owner name between 2 and 120 characters.'
    );
  }

  if (normalizedPhone.length > 32) {
    throw createRegistrationError(
      'registration/invalid-phone',
      'Phone number must be 32 characters or fewer.'
    );
  }

  const requestRef = getRegistrationRequestRef(user.uid);

  return runTransaction(firestore, async (transaction) => {
    const existingRequest = await transaction.get(requestRef);
    if (existingRequest.exists()) {
      const existingStatus = existingRequest.data()?.status;
      if (!VALID_REQUEST_STATUSES.has(existingStatus)) {
        throw createRegistrationError(
          'registration/invalid-status',
          'The access request has an invalid approval status.'
        );
      }
      return { status: existingStatus, existing: true };
    }

    const request = {
      shopName: normalizedShopName,
      ownerName: normalizedOwnerName,
      email: user.email.trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    if (normalizedPhone) {
      request.phone = normalizedPhone;
    }

    transaction.set(requestRef, request);
    return { status: 'pending', existing: false };
  });
}
