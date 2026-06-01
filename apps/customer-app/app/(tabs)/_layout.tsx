/**
 * Customer App — Tabs Layout
 * Pixel-perfect from stitch: customer_home_dashboard tab bar
 * Uses custom dark tab bar matching the design
 */
import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

function TabIcon({
  focused, darkMode, activeIcon, inactiveIcon, iconLib, label,
}: {
  focused: boolean
  darkMode: boolean
  activeIcon: string
  inactiveIcon?: string
  iconLib: 'feather' | 'ionicons' | 'mci'
  label: string
}) {
  const color = focused ? '#3B82F6' : (darkMode ? '#9CA3AF' : '#64748B')
  const icon = focused ? activeIcon : (inactiveIcon || activeIcon)
  const size = focused ? 26 : 24

  let IconComp: any = null
  if (iconLib === 'feather') IconComp = Feather
  if (iconLib === 'ionicons') IconComp = Ionicons
  if (iconLib === 'mci') IconComp = MaterialCommunityIcons

  return (
    <View style={styles.tabIconWrap}>
      {focused && <View style={[styles.activeIndicator, darkMode ? {} : { backgroundColor: '#2563EB' }]} />}
      <IconComp name={icon} size={size} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0D1A',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 10,
          paddingTop: 2,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              darkMode={true}
              activeIcon="home-variant"
              iconLib="mci"
              label="Home"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              darkMode={true}
              activeIcon="calendar"
              inactiveIcon="calendar-outline"
              iconLib="ionicons"
              label="Trips"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="parcels"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              darkMode={true}
              activeIcon="tag"
              inactiveIcon="tag-outline"
              iconLib="mci"
              label="Parcels"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              darkMode={true}
              activeIcon="wallet"
              inactiveIcon="wallet-outline"
              iconLib="ionicons"
              label="Wallet"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              darkMode={true}
              activeIcon="person"
              inactiveIcon="person-outline"
              iconLib="ionicons"
              label="Profile"
            />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabIconWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: 4 },
  activeIndicator: {
    position: 'absolute', top: -4, width: 48, height: 2,
    backgroundColor: '#3B82F6', borderRadius: 1,
  },
  tabLabel: { fontSize: 10, fontWeight: '500', marginTop: 3 },
})
