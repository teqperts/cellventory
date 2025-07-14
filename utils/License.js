import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

const VALID_KEYS = ['TEQ-CELL-0425', 'TEQ-CELL-9999', '1234'];

export async function verifyKey(inputKey) {
  const deviceId = Device.osInternalBuildId || Device.deviceName || 'unknown-device';

  if (VALID_KEYS.includes(inputKey.trim())) {
    const payload = JSON.stringify({ deviceId, key: inputKey.trim() });
    await SecureStore.setItemAsync('access_granted_payload', payload);
    return true;
  }

  return false;
}

export async function hasAccess() {
  const raw = await SecureStore.getItemAsync('access_granted_payload');
  if (!raw) return false;

  const { deviceId: storedDevice, key } = JSON.parse(raw);
  const currentDevice = Device.osInternalBuildId || Device.deviceName || 'unknown-device';

  return storedDevice === currentDevice && VALID_KEYS.includes(key);
}
