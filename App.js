import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { auth } from './config/firebase';
import { colors } from './constants/theme';
import { AppUpdateProvider } from './context/AppUpdateContext';
import { ShopProvider } from './context/ShopContext';
import { getDatabase } from './database/Helper';
import TabNavigator from './navigation/TabNavigator';
import AccessRequestScreen from './screens/AccessRequestScreen';
import AddCustomerScreen from './screens/AddCustomerScreen';
import AddItemScreen from './screens/AddItemScreen';
import CustomerDetailsScreen from './screens/CustomerDetailsScreen';
import EnquiriesWrapped from './screens/wrapped/EnquiriesWrapped';
import EditCustomerScreen from './screens/EditCustomerScreen';
import EditItemScreen from './screens/EditItemScreen';
import ItemDetailsScreen from './screens/ItemDetailsScreen';
import KeyAccessScreen from './screens/KeyAccessScreen';
import RegistrationStatusScreen from './screens/RegistrationStatusScreen';
import {
  clearVerifiedSession,
  DEFAULT_SESSION_CHECK_INTERVAL_MS,
  verifyActiveSession,
} from './services/AuthSessionService';
import {
  checkAndRunHourlyAutoBackup,
  DEFAULT_AUTO_BACKUP_CHECK_INTERVAL_MS,
} from './services/BackupService';
import {
  getRegistrationRequestStatus,
  isGoogleAuthUser,
} from './services/RegistrationService';

const Stack = createNativeStackNavigator();

SplashScreen.preventAutoHideAsync().catch(() => {});

function getRevocationAlertMessage(code) {
  switch (code) {
    case 'auth/user-disabled':
      return 'This store login has been disabled by the administrator. You have been signed out.';
    case 'auth/offline-grace-expired':
      return 'Offline usage limit (1 hour) reached. Please connect to the internet to verify your account access.';
    case 'auth/clock-tampered':
      return 'Device date/time mismatch detected. Please enable automatic network time, connect to the internet, and sign in again.';
    case 'auth/offline-unverified':
      return 'An internet connection is required to verify your store subscription. Please connect and sign in again.';
    case 'auth/device-already-bound':
      return 'This store account is registered to another device. Contact support to move the login.';
    case 'auth/device-binding-reset':
      return 'This device registration was reset. Contact support to register this device.';
    case 'auth/device-binding-failed':
    case 'auth/device-binding-storage-unavailable':
      return 'Unable to verify this device. Connect to the internet and try again, or contact support.';
    case 'auth/device-unverified-offline':
      return 'Connect to the internet to register this device before using the app offline.';
    case 'auth/registration-unverified':
    case 'auth/registration-required':
      return 'An internet connection is required to verify shop approval before using the app.';
    default:
      return 'Your store session is no longer valid. Please sign in again.';
  }
}

function getGateErrorMessage(error) {
  if (String(error?.code || '').startsWith('registration/')) {
    return error.message;
  }
  if (String(error?.code || '').startsWith('auth/')) {
    return getRevocationAlertMessage(error.code);
  }
  return 'Unable to verify your shop access. Check your internet connection and try again.';
}

export default function App() {
  const [user, setUser] = useState(null);
  const [gate, setGate] = useState({ status: 'signed-out' });
  const [loaded, setLoaded] = useState(false);
  const activeUidRef = useRef(null);
  const authStateVersionRef = useRef(0);

  const runSessionVerification = useCallback((forceDeviceCheck = false) => {
    return verifyActiveSession(auth, {
      onRevoked: (code) => {
        Alert.alert('Session Ended', getRevocationAlertMessage(code));
      },
      forceDeviceCheck,
      registrationApproved: true,
    });
  }, []);

  const refreshAuthGate = useCallback(async (firebaseUser = auth.currentUser) => {
    if (!firebaseUser) return false;
    const currentVersion = ++authStateVersionRef.current;
    activeUidRef.current = firebaseUser.uid;

    if (!isGoogleAuthUser(firebaseUser)) {
      setUser(null);
      setGate({ status: 'signed-out' });
      setLoaded(true);
      await signOut(auth).catch((error) => {
        console.warn('Unable to sign out a non-Google account:', error?.message || error);
      });
      return false;
    }

    try {
      const registration = await getRegistrationRequestStatus(firebaseUser);
      if (currentVersion !== authStateVersionRef.current) return false;

      if (registration.status !== 'approved') {
        setUser(null);
        setGate({ ...registration, user: firebaseUser });
        setLoaded(true);
        return false;
      }

      const verification = await runSessionVerification(true);
      if (currentVersion !== authStateVersionRef.current) return false;

      const sessionAllowed =
        auth.currentUser?.uid === firebaseUser.uid &&
        ['valid', 'offline-grace'].includes(verification.status);
      setUser(sessionAllowed ? firebaseUser : null);
      setGate(
        sessionAllowed
          ? {
              status: 'approved',
              user: firebaseUser,
              request: registration.request,
            }
          : {
              status: 'error',
              user: firebaseUser,
              errorMessage: getRevocationAlertMessage(verification.code),
            }
      );
      setLoaded(true);

      if (sessionAllowed && verification.status === 'valid') {
        checkAndRunHourlyAutoBackup().catch((error) =>
          console.warn('Auto backup check error:', error?.message || error)
        );
      }
      return sessionAllowed;
    } catch (error) {
      if (currentVersion !== authStateVersionRef.current) return false;
      setUser(null);
      setGate({
        status: 'error',
        user: firebaseUser,
        errorMessage: getGateErrorMessage(error),
      });
      setLoaded(true);
      console.warn('Shop access verification failed:', error?.message || error);
      return false;
    }
  }, [runSessionVerification]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out failed:', error?.message || error);
      Alert.alert('Sign-out failed', 'Please try again.');
    }
  }, []);

  useEffect(() => {
    getDatabase().catch((error) => console.error('DB Init Error:', error));

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        refreshAuthGate(firebaseUser);
        return;
      }

      authStateVersionRef.current += 1;
      setUser(null);
      setGate({ status: 'signed-out' });
      setLoaded(true);
      if (activeUidRef.current) {
        const previousUid = activeUidRef.current;
        activeUidRef.current = null;
        clearVerifiedSession(previousUid).catch(() => {});
      }
    });

    return unsubscribe;
  }, [refreshAuthGate]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && auth.currentUser) {
        refreshAuthGate(auth.currentUser);
      }
    });
    return () => appStateSubscription.remove();
  }, [refreshAuthGate]);

  useEffect(() => {
    if (!user) return undefined;

    const sessionTimer = setInterval(() => {
      if (AppState.currentState === 'active') {
        runSessionVerification();
      }
    }, DEFAULT_SESSION_CHECK_INTERVAL_MS);

    const registrationTimer = setInterval(() => {
      if (AppState.currentState === 'active' && auth.currentUser) {
        refreshAuthGate(auth.currentUser);
      }
    }, DEFAULT_AUTO_BACKUP_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(sessionTimer);
      clearInterval(registrationTimer);
    };
  }, [user, runSessionVerification, refreshAuthGate]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let content = <KeyAccessScreen />;
  if (user) {
    content = (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} options={{ animation: 'fade' }} />
          <Stack.Screen name="ItemDetailsScreen" component={ItemDetailsScreen} />
          <Stack.Screen name="EditItemScreen" component={EditItemScreen} />
          <Stack.Screen name="AddItemScreen" component={AddItemScreen} />
          <Stack.Screen name="AddCustomerScreen" component={AddCustomerScreen} />
          <Stack.Screen name="CustomerDetailsScreen" component={CustomerDetailsScreen} />
          <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} />
          <Stack.Screen name="EditCustomerScreen" component={EditCustomerScreen} />
          <Stack.Screen name="EnquiriesScreen" component={EnquiriesWrapped} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  } else if (gate.status === 'not-requested') {
    content = (
      <AccessRequestScreen
        user={gate.user}
        onSubmitted={() => refreshAuthGate(auth.currentUser)}
        onSignOut={handleSignOut}
      />
    );
  } else if (['pending', 'rejected', 'error'].includes(gate.status)) {
    content = (
      <RegistrationStatusScreen
        email={gate.user?.email}
        status={gate.status}
        errorMessage={gate.errorMessage}
        onRefresh={() => refreshAuthGate(auth.currentUser)}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <ShopProvider registeredShopName={gate.request?.shopName}>
        <AppUpdateProvider>{content}</AppUpdateProvider>
      </ShopProvider>
    </SafeAreaProvider>
  );
}
