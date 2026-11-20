import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
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
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
              <Feather name="home" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryWrapped}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersWrapped}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
              <Feather name="users" size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#EFF6FF',
  },
});
