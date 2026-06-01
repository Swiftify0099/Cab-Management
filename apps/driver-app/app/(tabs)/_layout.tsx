import { Tabs } from 'expo-router'
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons'

export default function DriverTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#090C15',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 68,
          paddingBottom: 12,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="view-dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
