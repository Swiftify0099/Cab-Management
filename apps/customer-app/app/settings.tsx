/**
 * Customer App — Settings Screen
 * Refactored: All hardcoded colors → theme tokens.
 * KEY FIX: isDarkMode toggle now ACTUALLY switches the theme via ThemeContext.
 * Previously it was local state that did nothing — now it's wired.
 * Business logic: UNCHANGED. Logout: UNCHANGED.
 */
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/auth.store'
import { useTheme } from '../src/contexts/ThemeContext'
import { AppText, AppSwitch, AppDivider } from '../src/components/ui'

export default function SettingsScreen() {
  const { logout } = useAuthStore()
  const { theme, isDark, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
    router.replace('/auth/phone')
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.backgroundAlt}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={theme.colors.textPrimary} />
          <AppText variant="subtitle" semibold>Back</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <AppText variant="h1" bold style={styles.pageTitle}>Advanced App Settings</AppText>

        {/* Preferences Section */}
        <AppText variant="subtitle" semibold style={styles.sectionTitle}>Preferences</AppText>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>

          {/* Dark Mode — WIRED to ThemeContext */}
          <AppSwitch
            value={isDark}
            onValueChange={toggleTheme}
            label="Dark Mode"
            sublabel={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
          />
          <AppDivider />

          {/* Notifications */}
          <AppSwitch
            value={true}
            onValueChange={() => {}}
            label="Notifications"
            sublabel="Trip updates and offers"
          />
          <AppDivider />

          {/* Location */}
          <AppSwitch
            value={true}
            onValueChange={() => {}}
            label="Location Sharing"
            sublabel="Required for ride matching"
          />
        </View>

        {/* Account & Data Section */}
        <AppText variant="subtitle" bold style={styles.sectionTitleLarge}>Account & Data</AppText>

        <AppText variant="bodyS" semibold color="secondary" style={styles.subSectionTitle}>Saved Addresses</AppText>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.rowAddress}>
            <View style={[styles.addrIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Feather name="home" size={20} color={theme.colors.primary} />
            </View>
            <View>
              <AppText variant="bodyS" bold>Home</AppText>
              <AppText variant="small" color="muted">Manage in Saved Addresses</AppText>
            </View>
          </View>
          <AppDivider />
          <View style={styles.rowAddress}>
            <View style={[styles.addrIcon, { backgroundColor: `${theme.colors.secondary}15` }]}>
              <Feather name="briefcase" size={20} color={theme.colors.secondary} />
            </View>
            <View>
              <AppText variant="bodyS" bold>Work</AppText>
              <AppText variant="small" color="muted">Manage in Saved Addresses</AppText>
            </View>
          </View>
        </View>

        <AppText variant="bodyS" semibold color="secondary" style={styles.subSectionTitle}>Language Selection</AppText>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="globe" size={20} color={theme.colors.textSecondary} style={styles.icon} />
              <AppText variant="body">English (US)</AppText>
            </View>
            <Feather name="chevron-down" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={[styles.card, { marginTop: 16, marginBottom: 40, backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider }]}>
            <View style={styles.rowLeft}>
              <Feather name="info" size={20} color={theme.colors.textSecondary} style={styles.icon} />
              <AppText variant="body">About App</AppText>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <Feather name="power" size={20} color={theme.colors.error} style={styles.icon} />
              <AppText variant="body" style={{ color: theme.colors.error }}>Log Out</AppText>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea:   { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 5 },
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  pageTitle:  { marginTop: 10, marginBottom: 24, letterSpacing: -0.5 },

  sectionTitle:      { marginBottom: 10, marginLeft: 4 },
  sectionTitleLarge: { marginTop: 24, marginBottom: 16, marginLeft: 4 },
  subSectionTitle:   { marginBottom: 8, marginLeft: 4 },

  card:     { borderRadius: 12, overflow: 'hidden', marginBottom: 20, padding: 16 },
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, minHeight: 44 },
  rowLeft:  { flexDirection: 'row', alignItems: 'center' },
  icon:     { marginRight: 14 },

  rowAddress:{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  addrIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
