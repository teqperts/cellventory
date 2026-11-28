const mockSecureStoreMap = new Map();
const mockSnapshot = {
  exists: jest.fn(),
  data: jest.fn(),
};
const mockTransaction = {
  get: jest.fn(),
  set: jest.fn(),
};
const mockRunTransaction = jest.fn();

jest.mock('../config/firebase', () => ({
  firestore: {},
}));

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  getItemAsync: jest.fn(async (key) => mockSecureStoreMap.get(key) || null),
  setItemAsync: jest.fn(async (key, value) => {
    mockSecureStoreMap.set(key, value);
  }),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ type: 'collection' })),
  doc: jest.fn((...args) =>
    args.length === 1
      ? { id: 'generated-installation-id' }
      : { path: args.slice(1).join('/') }
  ),
  runTransaction: (...args) => mockRunTransaction(...args),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

import * as SecureStore from 'expo-secure-store';

import { verifyDeviceBinding } from '../services/DeviceBindingService';

describe('DeviceBindingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStoreMap.clear();
    mockSnapshot.exists.mockReturnValue(false);
    mockSnapshot.data.mockReturnValue({});
    mockTransaction.get.mockResolvedValue(mockSnapshot);
    mockTransaction.set.mockResolvedValue(undefined);
    mockRunTransaction.mockImplementation(async (_firestore, callback) =>
      callback(mockTransaction)
    );
  });

  it('claims an unregistered account for this installation', async () => {
    await expect(
      verifyDeviceBinding('store-uid', { nowMs: 1000, force: true })
    ).resolves.toEqual({ status: 'claimed', lastVerifiedAt: 1000 });

    expect(mockTransaction.set).toHaveBeenCalledWith(
      { path: 'deviceBindings/store-uid' },
      { deviceId: 'generated-installation-id', createdAt: 'server-timestamp' }
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'cellventory_device_binding_store-uid',
      JSON.stringify({ hasPreviouslyBound: true, lastVerifiedAt: 1000 })
    );
  });

  it('allows the installation already registered to the account', async () => {
    mockSecureStoreMap.set('cellventory_installation_id', 'install-12345678901234567890');
    mockSnapshot.exists.mockReturnValue(true);
    mockSnapshot.data.mockReturnValue({ deviceId: 'install-12345678901234567890' });

    await expect(
      verifyDeviceBinding('store-uid', { nowMs: 2000, force: true })
    ).resolves.toEqual({ status: 'verified', lastVerifiedAt: 2000 });

    expect(mockTransaction.set).not.toHaveBeenCalled();
  });

  it('rejects another installation without replacing the registered device', async () => {
    mockSecureStoreMap.set('cellventory_installation_id', 'different-install-id');
    mockSnapshot.exists.mockReturnValue(true);
    mockSnapshot.data.mockReturnValue({ deviceId: 'registered-install-id' });

    await expect(
      verifyDeviceBinding('store-uid', { nowMs: 3000, force: true })
    ).rejects.toMatchObject({ code: 'auth/device-already-bound' });

    expect(mockTransaction.set).not.toHaveBeenCalled();
  });

  it('does not let a previously bound installation reclaim a reset binding', async () => {
    mockSecureStoreMap.set('cellventory_installation_id', 'registered-install-id');
    mockSecureStoreMap.set(
      'cellventory_device_binding_store-uid',
      JSON.stringify({ hasPreviouslyBound: true, lastVerifiedAt: 1000 })
    );

    await expect(
      verifyDeviceBinding('store-uid', { nowMs: 3000, force: true })
    ).rejects.toMatchObject({ code: 'auth/device-binding-reset' });

    expect(mockTransaction.set).not.toHaveBeenCalled();
  });

  it('uses the recent secure binding verification between hourly checks', async () => {
    mockSecureStoreMap.set('cellventory_installation_id', 'registered-install-id');
    mockSecureStoreMap.set(
      'cellventory_device_binding_store-uid',
      JSON.stringify({ hasPreviouslyBound: true, lastVerifiedAt: 1000 })
    );

    await expect(
      verifyDeviceBinding('store-uid', { nowMs: 2000 })
    ).resolves.toEqual({ status: 'cached', lastVerifiedAt: 1000 });

    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});
