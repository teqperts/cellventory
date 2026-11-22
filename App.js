import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Updates from 'expo-updates';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { auth } from './config/firebase';
import { colors } from './constants/theme';
import { ShopProvider } from './context/ShopContext';
import { getDatabase } from './database/Helper';
import TabNavigator from './navigation/TabNavigator';
import AddCustomerScreen from './screens/AddCustomerScreen';
import AddItemScreen from './screens/AddItemScreen';
import CustomerDetailsScreen from './screens/CustomerDetailsScreen';
import EditCustomerScreen from './screens/EditCustomerScreen';
import EditItemScreen from './screens/EditItemScreen';
import ItemDetailsScreen from './screens/ItemDetailsScreen';
import KeyAccessScreen from './screens/KeyAccessScreen';
import ResetDbScreen from './screens/ResetDbScreen';
import { checkAndRunDailyAutoBackup } from './services/BackupService';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Check for OTA updates in background (standalone / preview / production builds)
    async function checkForUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        // Silently catch offline/network errors
      }
    }
    checkForUpdates();

    // Initialize DB
    getDatabase().catch((err) => console.error('DB Init Error:', err));

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoaded(true);
      if (firebaseUser) {
        checkAndRunDailyAutoBackup().catch((e) =>
          console.warn('Silent auto backup check error:', e)
        );
      }
    });

    return unsubscribe;
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ShopProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              <>
                <Stack.Screen name="MainTabs" component={TabNavigator} options={{ animation: 'fade' }} />
                <Stack.Screen name="ResetDbScreen" component={ResetDbScreen} />
                <Stack.Screen name="ItemDetailsScreen" component={ItemDetailsScreen} />
                <Stack.Screen name="EditItemScreen" component={EditItemScreen} />
                <Stack.Screen name="AddItemScreen" component={AddItemScreen} />
                <Stack.Screen name="AddCustomerScreen" component={AddCustomerScreen} />
                <Stack.Screen name="CustomerDetailsScreen" component={CustomerDetailsScreen} />
                <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} />
                <Stack.Screen name="EditCustomerScreen" component={EditCustomerScreen} />
              </>
            ) : (
              <Stack.Screen name="KeyAccess" component={KeyAccessScreen} options={{ animation: 'fade' }} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ShopProvider>
    </SafeAreaProvider>
  );
}
