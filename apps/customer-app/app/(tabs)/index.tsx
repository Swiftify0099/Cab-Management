/**
 * Customer App — Home Dashboard
 * Redesigned Premium UI (No Map, Focus on Discovery & Quick Actions)
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../src/store/auth.store'
import { profileApi, bookingApi } from '../../src/api/client'

// AI-predicted routes stay static (will be backend-driven later)
const RECOMMENDED = [
  { from: 'Mumbai', to: 'Pune', fare: '₹850', tag: 'AI-Predicted', route: '/book/cab' },
  { from: 'Bangalore', to: 'Chennai', fare: '₹1200', tag: 'AI-Predicted', route: '/book/cab' },
  { from: 'Delhi', to: 'Agra', fare: '₹650', tag: 'AI-Predicted', route: '/book/cab' },
]

const LABEL_ICONS: Record<string, string> = {
  home: 'home', work: 'briefcase', office: 'monitor',
  trip: 'map-pin', holiday: 'sun',
}

export default function HomeTab() {
  const user = useAuthStore((s) => s.user) as any
  const [profile, setProfile] = useState<any>(null)
  const [savedPlaces, setSavedPlaces] = useState<any[]>([])
  const [recentTrips, setRecentTrips] = useState<any[]>([])

  // Swiggy-style looping animation for the promo banner
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const loadDashboardData = useCallback(async () => {
    try {
      const [profileRes, addressRes, tripsRes] = await Promise.allSettled([
        profileApi.getMe(),
        profileApi.getAddresses(),
        bookingApi.getMyTrips(),
      ])
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data?.data || profileRes.value.data)
      }
      if (addressRes.status === 'fulfilled') {
        const data = addressRes.value.data?.data || addressRes.value.data || []
        setSavedPlaces(Array.isArray(data) ? data.slice(0, 4) : [])
      }
      if (tripsRes.status === 'fulfilled') {
        const data = tripsRes.value.data?.data || tripsRes.value.data || []
        const trips = Array.isArray(data) ? data : []
        // Use last 3 unique destinations as recent
        const recent = trips
          .filter((t: any) => t.destination_city || t.dropoff_address)
          .slice(0, 3)
          .map((t: any) => ({
            id: t.id,
            title: t.destination_city || 'Destination',
            subtitle: t.dropoff_address || t.destination_city || '',
            icon: 'navigate-outline',
          }))
        setRecentTrips(recent)
      }
    } catch { /* silent — no data to show */ }
  }, [])

  useFocusEffect(useCallback(() => { loadDashboardData() }, [loadDashboardData]))

  const userName = profile?.full_name || user?.phone || 'Traveller'

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 1. Personalized Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.greeting}>Good Morning,</Text>
                <Text style={styles.userName}>{userName}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={24} color="#F8FAFC" />
              <View style={styles.badge} />
            </TouchableOpacity>
          </View>

          {/* 2. Elevated Search Bar */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#94A3B8" />
            <TextInput
              placeholder="Where are you going?"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              onPressIn={() => router.push('/book/cab' as any)}
            />
            <View style={styles.searchDivider} />
            <TouchableOpacity style={styles.nowBtn} activeOpacity={0.8}>
              <Ionicons name="time-outline" size={18} color="#F8FAFC" />
              <Text style={styles.nowText}>Now</Text>
              <Feather name="chevron-down" size={16} color="#F8FAFC" />
            </TouchableOpacity>
          </View>

          {/* 3. Animated Festival/Promo Banner (Swiggy Style) */}
          <Animated.View style={[styles.promoContainer, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoGradient}
            >
              <View style={styles.promoContent}>
                <View style={styles.promoTextWrap}>
                  <Text style={styles.promoTag}>FESTIVAL OFFER 🎉</Text>
                  <Text style={styles.promoTitle}>Flat 20% Off</Text>
                  <Text style={styles.promoDesc}>On your next intercity ride</Text>
                </View>
                <View style={styles.promoIconBg}>
                  <Ionicons name="gift" size={36} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* 4. Core Services Grid */}
          <View style={styles.servicesGrid}>
            <TouchableOpacity style={styles.serviceCard} activeOpacity={0.8} onPress={() => router.push('/book/cab' as any)}>
              <LinearGradient colors={['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.02)']} style={styles.serviceGradient}>
                <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
                  <Ionicons name="car-sport" size={32} color="#3B82F6" />
                </View>
                <Text style={styles.serviceTitle}>Intercity Cab</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.serviceCard} activeOpacity={0.8} onPress={() => router.push('/parcel-booking' as any)}>
              <LinearGradient colors={['rgba(99,102,241,0.15)', 'rgba(99,102,241,0.02)']} style={styles.serviceGradient}>
                <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
                  <Feather name="package" size={28} color="#6366F1" />
                </View>
                <Text style={styles.serviceTitle}>Send Parcel</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.serviceCard} activeOpacity={0.8} onPress={() => router.push('/(tabs)/trips' as any)}>
              <LinearGradient colors={['rgba(6,182,212,0.15)', 'rgba(6,182,212,0.02)']} style={styles.serviceGradient}>
                <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(6,182,212,0.2)' }]}>
                  <FontAwesome5 name="building" size={26} color="#06B6D4" />
                </View>
                <Text style={styles.serviceTitle}>Book Hotel</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 5. Saved Places */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Saved Places</Text>
              <TouchableOpacity onPress={() => router.push('/profile/addresses' as any)}>
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.savedGrid}>
              {savedPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id || place.label}
                  style={styles.savedCard}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/book/cab', params: { pickup: place.full_address || place.label } } as any)}
                >
                  <View style={styles.savedIcon}>
                    <Feather name={(LABEL_ICONS[place.label] || 'map-pin') as any} size={18} color="#94A3B8" />
                  </View>
                  <Text style={styles.savedName} numberOfLines={1}>
                    {place.label?.charAt(0)?.toUpperCase() + (place.label?.slice(1) || '')}
                  </Text>
                </TouchableOpacity>
              ))}
              {/* Add button */}
              <TouchableOpacity
                style={styles.savedCard}
                activeOpacity={0.8}
                onPress={() => router.push('/profile/addresses' as any)}
              >
                <View style={styles.savedIcon}>
                  <Feather name="plus" size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.savedName, { color: '#3B82F6' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 6. Recent Rides */}
          {recentTrips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Destinations</Text>
              <View style={styles.recentList}>
                {recentTrips.map((ride) => (
                  <TouchableOpacity
                    key={ride.id}
                    style={styles.recentItem}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: '/book/cab', params: { destination: ride.title } } as any)}
                  >
                    <View style={styles.recentIconBox}>
                      <Ionicons name={ride.icon as any} size={20} color="#F8FAFC" />
                    </View>
                    <View style={styles.recentTextWrap}>
                      <Text style={styles.recentTitle}>{ride.title}</Text>
                      <Text style={styles.recentSubtitle} numberOfLines={1}>{ride.subtitle}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#475569" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 7. Recommended Routes */}
          <View style={[styles.section, { paddingBottom: 100 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recommended Routes</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
              {RECOMMENDED.map((item, i) => (
                <View key={i} style={styles.recCard}>
                  <View style={styles.recCardTop}>
                    <View style={styles.recIconBox}>
                      <Ionicons name="navigate" size={18} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recRoute}>{item.from} <Feather name="arrow-right" color="#94A3B8" size={14} /> {item.to}</Text>
                    </View>
                  </View>
                  <View style={styles.recCardBottom}>
                    <View>
                      <Text style={styles.recFare}>{item.fare}</Text>
                      <Text style={styles.recTag}>{item.tag}</Text>
                    </View>
                    <TouchableOpacity style={styles.recBookBtn} activeOpacity={0.8} onPress={() => router.push(item.route as any)}>
                      <Text style={styles.recBookText}>Book</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  greeting: { color: '#94A3B8', fontSize: 13, marginBottom: 2 },
  userName: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  notificationBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  badge: {
    position: 'absolute', top: 10, right: 12, width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#0F172A'
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 24, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 28,
  },
  searchInput: { flex: 1, marginLeft: 12, color: '#F8FAFC', fontSize: 16, fontWeight: '500' },
  searchDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 12 },
  nowBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  nowText: { color: '#F8FAFC', fontSize: 13, fontWeight: '600', marginHorizontal: 4 },

  // Promo Banner
  promoContainer: { marginHorizontal: 24, marginBottom: 32, shadowColor: '#8B5CF6', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  promoGradient: { borderRadius: 24, padding: 20 },
  promoContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoTextWrap: { flex: 1 },
  promoTag: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  promoTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  promoDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
  promoIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Services Grid
  servicesGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 32 },
  serviceCard: { flex: 1, marginHorizontal: 4 },
  serviceGradient: { alignItems: 'center', paddingVertical: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  serviceIconWrap: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  serviceTitle: { color: '#E2E8F0', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // General Section
  section: { marginBottom: 32 },
  sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginLeft: 24, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24, marginBottom: 16 },
  seeAllText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },

  // Saved Grid
  savedGrid: { flexDirection: 'row', paddingHorizontal: 20 },
  savedCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 4, paddingVertical: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  savedIcon: { marginBottom: 8 },
  savedName: { color: '#CBD5E1', fontSize: 12, fontWeight: '500' },

  // Recent Rides
  recentList: { paddingHorizontal: 24 },
  recentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  recentIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  recentTextWrap: { flex: 1 },
  recentTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  recentSubtitle: { color: '#94A3B8', fontSize: 13 },

  // Recommended Routes
  recScroll: { paddingHorizontal: 20 },
  recCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginRight: 16, width: 260, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  recCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  recIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recRoute: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  recCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  recFare: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  recTag: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  recBookBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  recBookText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
})
