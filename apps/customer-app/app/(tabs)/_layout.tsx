/**
 * Customer App — Tabs Layout
 * Now theme-aware: tab bar colors from ThemeContext.
 * All hardcoded colors removed.
 */
import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../src/contexts/ThemeContext'

function TabIcon({
  focused, activeIcon, inactiveIcon, iconLib, label,
}: {
  focused: boolean
  activeIcon: string
  inactiveIcon?: string
  iconLib: 'feather' | 'ionicons' | 'mci'
  label: string
}) {
  const { theme } = useTheme()
  const color = focused ? theme.colors.tabActive : theme.colors.tabInactive
  const icon  = focused ? activeIcon : (inactiveIcon || activeIcon)
  const size  = focused ? 26 : 24

  let IconComp: any = null
  if (iconLib === 'feather')   IconComp = Feather
  if (iconLib === 'ionicons')  IconComp = Ionicons
  if (iconLib === 'mci')       IconComp = MaterialCommunityIcons

  return (
    <View style={styles.tabIconWrap}>
      {focused && (
        <View style={[styles.activeIndicator, { backgroundColor: theme.colors.tabActive }]} />
      )}
      <IconComp name={icon} size={size} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const { theme } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor:  theme.colors.tabBorder,
          borderTopWidth:  1,
          height:          72,
          paddingBottom:   10,
          paddingTop:      2,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} activeIcon="home-variant" iconLib="mci" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} activeIcon="calendar" inactiveIcon="calendar-outline" iconLib="ionicons" label="Trips" />
          ),
        }}
      />
      <Tabs.Screen
        name="parcels"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} activeIcon="tag" inactiveIcon="tag-outline" iconLib="mci" label="Parcel" />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} activeIcon="wallet" inactiveIcon="wallet-outline" iconLib="ionicons" label="Wallet" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} activeIcon="person" inactiveIcon="person-outline" iconLib="ionicons" label="Profile" />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabIconWrap:     { alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: 4 },
  activeIndicator: { position: 'absolute', top: -4, width: 48, height: 2, borderRadius: 1 },
  tabLabel:        { fontSize: 10, fontWeight: '500', marginTop: 3 },
})
