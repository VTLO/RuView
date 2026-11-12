import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { colors } from '../theme/colors';
import { useMatStore } from '../stores/matStore';
import LiveScreen from '../screens/LiveScreen';
import MATScreen from '../screens/MATScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VitalsScreen from '../screens/VitalsScreen';
import ZonesScreen from '../screens/ZonesScreen';
import { MainTabsParamList } from './types';

// Screens are imported statically: lazily-loaded tab chunks could hang forever in Suspense on web
// once a second chunk had loaded. They are small; heavy 3D code is still split out inside LiveScreen.
const toIconName = (routeName: keyof MainTabsParamList) => {
  switch (routeName) {
    case 'Live':
      return 'wifi';
    case 'Vitals':
      return 'heart';
    case 'Zones':
      return 'grid';
    case 'MAT':
      return 'shield-checkmark';
    case 'Settings':
      return 'settings';
    default:
      return 'ellipse';
  }
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const screens: ReadonlyArray<{ name: keyof MainTabsParamList; component: React.ComponentType }> = [
  { name: 'Live', component: LiveScreen },
  { name: 'Vitals', component: VitalsScreen },
  { name: 'Zones', component: ZonesScreen },
  { name: 'MAT', component: MATScreen },
  { name: 'Settings', component: SettingsScreen },
];

export const MainTabs = () => {
  const matAlertCount = useMatStore((state) => state.alerts.length);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarIcon: ({ color, size }) => <Ionicons name={toIconName(route.name)} size={size} color={color} />,
        tabBarLabelStyle: {
          fontFamily: 'Courier New',
          textTransform: 'uppercase',
          fontSize: 10,
        },
        tabBarLabel: ({ children, color }) => <ThemedText style={{ color }}>{children}</ThemedText>,
      })}
    >
      {screens.map(({ name, component }) => (
        <Tab.Screen
          key={name}
          name={name}
          options={{
            tabBarBadge: name === 'MAT' ? (matAlertCount > 0 ? matAlertCount : undefined) : undefined,
          }}
          component={component}
        />
      ))}
    </Tab.Navigator>
  );
};
