import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabNavigator from './navigation/TabNavigator';
import EditItemScreen from './screens/EditItemScreen';
import ItemDetailsScreen from './screens/ItemDetailsScreen';
import KeyAccessScreen from './screens/KeyAccessScreen';
import ResetDbScreen from './screens/ResetDbScreen';

import { hasAccess } from './utils/License';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const setup = async () => {
      // Initialize DB schema
      const db = await SQLite.openDatabaseAsync('cellventory.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT,
          name TEXT NOT NULL,
          brand TEXT,
          model TEXT,
          part_type TEXT,
          quantity INTEGER DEFAULT 0,
          cost_price REAL,
          selling_price REAL,
          added_on TEXT,
          notes TEXT
        );
      `);
      console.log('📦 items table initialized');

      // Check license
      const status = await hasAccess();
      setIsUnlocked(status);
      setLoaded(true);
    };

    setup();
  }, []);

  if (!loaded) return null; // Optional splash screen or loader

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="KeyAccess"
            component={KeyAccessScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen name="ResetDbScreen" component={ResetDbScreen} />
          <Stack.Screen name="ItemDetailsScreen" component={ItemDetailsScreen} />
          <Stack.Screen name="EditItemScreen" component={EditItemScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
