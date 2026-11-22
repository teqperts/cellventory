import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows } from '../constants/theme';
import CustomersWrapped from '../screens/wrapped/CustomersWrapped';
import HomeWrapped from '../screens/wrapped/HomeWrapped';
import InventoryWrapped from '../screens/wrapped/InventoryWrapped';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  // Ensure the tab bar items sit comfortably above Android 3-button navigation (insets.bottom ~48) or iOS home bar (insets.bottom ~34)
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 4 : 8;
  const tabHeight = 56 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          ...shadows.header,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeWrapped}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryWrapped}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={CustomersWrapped}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'construct' : 'construct-outline'} size={21} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
