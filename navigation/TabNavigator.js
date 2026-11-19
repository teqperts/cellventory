import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors, shadows } from '../constants/theme';
import AddItemWrapped from '../screens/wrapped/AddItemWrapped';
import HomeWrapped from '../screens/wrapped/HomeWrapped';
import InventoryWrapped from '../screens/wrapped/InventoryWrapped';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
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
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryWrapped}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Add Item"
        component={AddItemWrapped}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="plus-circle" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
