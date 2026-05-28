import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/auth.store'
import { router } from 'expo-router'

const MENU_ITEMS = [
  { icon: '👤', label: 'My Profile' },
  { icon: '💳', label: 'Payment Methods' },
  { icon: '🏠', label: 'Saved Addresses' },
  { icon: '🎁', label: 'Referrals & Rewards' },
  { icon: '❓', label: 'Help & Support' },
  { icon: '⚙️', label: 'Settings' },
]

export default function ProfileTab() {
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.replace('/auth/phone')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 40 }}>👤</Text>
          </View>
          <Text style={styles.phone}>{user?.phone || 'Customer'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        </View>

        {/* Menu */}
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem}>
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  phone: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  roleBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 12, color: '#2563EB', fontWeight: '600', textTransform: 'capitalize' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#334155' },
  menuArrow: { fontSize: 18, color: '#94A3B8' },
  logoutBtn: {
    marginTop: 16, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
})
