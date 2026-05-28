import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/auth.store'

const QUICK_ACTIONS = [
  { icon: '🚗', label: 'Book Cab', bgColor: '#2563EB', route: '/book/cab' },
  { icon: '📦', label: 'Send Parcel', bgColor: '#7C3AED', route: '/book/parcel' },
  { icon: '🏨', label: 'Book Hotel', bgColor: '#059669', route: '/hotels' },
  { icon: '🗺️', label: 'My Trips', bgColor: '#F59E0B', route: '/(tabs)/trips' },
]

export default function HomeTab() {
  const user = useAuthStore((s) => s.user)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>Good morning! 👋</Text>
          <Text style={styles.greetingSubtitle}>Where would you like to go today?</Text>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/book/cab' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.searchIcon}>
            <Text style={{ fontSize: 18 }}>📍</Text>
          </View>
          <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
          <Text style={styles.searchArrow}>→</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => router.push(action.route as any)}
              style={[styles.actionCard, { backgroundColor: action.bgColor }]}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Trips */}
        <Text style={styles.sectionTitle}>Upcoming Trips</Text>
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
          <Text style={styles.emptyText}>No upcoming trips</Text>
          <Text style={styles.emptySubText}>Book a cab or parcel and it will appear here</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  greeting: { marginTop: 16, marginBottom: 24 },
  greetingTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  greetingSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderColor: '#E2E8F0', padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: '#94A3B8' },
  searchArrow: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard: { borderRadius: 16, padding: 16, flex: 1, minWidth: 144, alignItems: 'flex-start' },
  actionLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderColor: '#E2E8F0', padding: 20, alignItems: 'center',
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  emptySubText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
})
