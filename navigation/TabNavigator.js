import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AddItemWrapped from '../screens/wrapped/AddItemWrapped';
import HomeWrapped from '../screens/wrapped/HomeWrapped';
import InventoryWrapped from '../screens/wrapped/InventoryWrapped';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FFFFFF' },
        tabBarActiveTintColor: '#305F72',
        tabBarInactiveTintColor: '#687E91',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeWrapped}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryWrapped}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Add Item"
        component={AddItemWrapped}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="plus-square" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
