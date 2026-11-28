import * as Updates from 'expo-updates';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import AppUpdateModal from '../components/AppUpdateModal';
import { buildAvailableUpdateInfo } from '../constants/appVersion';
import { useShop } from './ShopContext';

const FOREGROUND_CHECK_COOLDOWN_MS = 120000;

export const AppUpdateContext = createContext({
  checkingForUpdate: false,
  checkForAppUpdates: async () => ({ available: false }),
});

export function AppUpdateProvider({ children }) {
  const { setIsProfileModalOpen } = useShop();
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [applyingUpdate, setApplyingUpdate] = useState(false);

  const isCheckingRef = useRef(false);
  const lastCheckAtRef = useRef(0);
  const dismissedUpdateIdRef = useRef(null);

  const checkForAppUpdates = useCallback(
    async ({ manual = false, force = false } = {}) => {
      if (__DEV__) {
        if (manual) {
          Alert.alert(
            'Development Mode',
            'Running locally in dev mode. OTA updates run on installed APK builds.'
          );
        }
        return { available: false };
      }

      if (isCheckingRef.current) {
        return { available: false };
      }

      const now = Date.now();
      if (!manual && !force && now - lastCheckAtRef.current < FOREGROUND_CHECK_COOLDOWN_MS) {
        return { available: false };
      }

      isCheckingRef.current = true;
      lastCheckAtRef.current = now;
      if (manual) setCheckingForUpdate(true);

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update?.isAvailable) {
          const info = buildAvailableUpdateInfo(update.manifest);
          if (!manual && info.id && dismissedUpdateIdRef.current === info.id) {
            return { available: true, dismissed: true, updateInfo: info };
          }
          if (manual) {
            dismissedUpdateIdRef.current = null;
            setIsProfileModalOpen(false);
          }
          setPendingUpdate(info);
          return { available: true, updateInfo: info };
        }

        if (manual) {
          Alert.alert('✅ Up to Date', 'No new update found. You are running the latest version.');
        }
        return { available: false };
      } catch (err) {
        if (manual) {
          Alert.alert(
            'Update Check Failed',
            err?.message || 'Could not reach Expo update server. Please check your internet connection.'
          );
        }
        return { available: false, error: err };
      } finally {
        isCheckingRef.current = false;
        if (manual) setCheckingForUpdate(false);
      }
    },
    [setIsProfileModalOpen]
  );

  const handleConfirmUpdate = useCallback(async () => {
    if (!pendingUpdate || applyingUpdate) return;
    setApplyingUpdate(true);
    try {
      await Updates.fetchUpdateAsync();
      setPendingUpdate(null);
      await Updates.reloadAsync();
    } catch (err) {
      Alert.alert(
        'Update Failed',
        err?.message || 'Could not download or install the update. Please try again.'
      );
    } finally {
      setApplyingUpdate(false);
    }
  }, [pendingUpdate, applyingUpdate]);

  const handleCancelUpdate = useCallback(() => {
    if (applyingUpdate) return;
    if (pendingUpdate?.id) {
      dismissedUpdateIdRef.current = pendingUpdate.id;
    }
    setPendingUpdate(null);
  }, [applyingUpdate, pendingUpdate]);

  useEffect(() => {
    checkForAppUpdates({ manual: false, force: true });

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkForAppUpdates({ manual: false, force: false });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkForAppUpdates]);

  return (
    <AppUpdateContext.Provider
      value={{
        checkingForUpdate,
        checkForAppUpdates,
      }}
    >
      {children}
      <AppUpdateModal
        visible={Boolean(pendingUpdate)}
        updateInfo={pendingUpdate}
        updating={applyingUpdate}
        onConfirm={handleConfirmUpdate}
        onCancel={handleCancelUpdate}
      />
    </AppUpdateContext.Provider>
  );
}

export function useAppUpdate() {
  return useContext(AppUpdateContext);
}
