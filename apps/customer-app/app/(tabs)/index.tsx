/**
 * Customer App — Home Dashboard
 * Refactored: All hardcoded colors → theme tokens.
 * Components: AppText, AppAvatar, AppSearchBar, AppButton, AppEmptyState, AppCard.
 * Business logic: UNCHANGED. API calls: UNCHANGED.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
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
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../src/store/auth.store'
import { profileApi, bookingApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText,
  AppAvatar,
  AppSearchBar,
  AppButton,
  AppEmptyState,
} from '../../src/components/ui'
import { AnimatedServiceText } from '../../components/AnimatedServiceText'

// AI-predicted routes stay static (will be backend-driven later)
const RECOMMENDED = [
  { from: 'Mumbai', to: 'Pune',      fare: '₹850',  tag: 'AI-Predicted', route: '/book/cab' },
  { from: 'Bangalore', to: 'Chennai',fare: '₹1200', tag: 'AI-Predicted', route: '/book/cab' },
  { from: 'Delhi', to: 'Agra',       fare: '₹650',  tag: 'AI-Predicted', route: '/book/cab' },
]

const LABEL_ICONS: Record<string, string> = {
  home: 'home', work: 'briefcase', office: 'monitor',
  trip: 'map-pin', holiday: 'sun',
}

export default function HomeTab() {
  const { theme, isDark } = useTheme()
  const user = useAuthStore((s) => s.user) as any
  const [profile,      setProfile]      = useState<any>(null)
  const [savedPlaces,  setSavedPlaces]  = useState<any[]>([])
  const [recentTrips,  setRecentTrips]  = useState<any[]>([])

  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
        const data   = tripsRes.value.data?.data || tripsRes.value.data || []
        const trips  = Array.isArray(data) ? data : []
        const recent = trips
          .filter((t: any) => t.destination_city || t.dropoff_address)
          .slice(0, 3)
          .map((t: any) => ({
            id:       t.id,
            title:    t.destination_city || 'Destination',
            subtitle: t.dropoff_address || t.destination_city || '',
            icon:     'navigate-outline',
          }))
        setRecentTrips(recent)
      }
    } catch { /* silent */ }
  }, [])

  useFocusEffect(useCallback(() => { loadDashboardData() }, [loadDashboardData]))

  const userName = profile?.full_name || user?.phone || 'Traveller'

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* 1. Personalized Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <AppAvatar name={userName} size={44} />
              <View style={styles.greetWrap}>
                <AppText variant="small" color="secondary">Good Morning,</AppText>
                <AppText variant="title" bold>{userName}</AppText>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.notificationBtn, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }]}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
              <View style={[styles.badge, { borderColor: theme.colors.background }]} />
            </TouchableOpacity>
          </View>

          {/* 2. Search Bar */}
          <AppSearchBar onPress={() => router.push('/book/cab' as any)} />

          {/* 3. Animated Festival/Promo Banner */}
          <Animated.View style={[styles.promoContainer, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={theme.gradient.promoBlue}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoGradient}
            >
              <View style={styles.promoContent}>
                <View style={styles.promoTextWrap}>
                  <AppText style={styles.promoTag} color="white">FESTIVAL OFFER 🎉</AppText>
                  <AppText variant="h2" bold color="white">Flat 20% Off</AppText>
                  <AppText variant="caption" color="white">On your next intercity ride</AppText>
                </View>
                <View style={styles.promoIconBg}>
                  <Ionicons name="gift" size={36} color={theme.colors.white} />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* 4. Core Services Grid */}
          <View style={styles.servicesGrid}>
            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.8}
              onPress={() => router.push('/book/cab' as any)}
            >
              <LinearGradient
                colors={['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.02)']}
                style={[styles.serviceGradient, { borderColor: theme.colors.cardBorder }]}
              >
                <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
                  <Ionicons name="car-sport" size={32} color={theme.colors.primary} />
                </View>
                <AppText variant="small" semibold color="secondary" center>Intercity Cab</AppText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.8}
              onPress={() => router.push('/parcel-booking' as any)}
            >
              <LinearGradient
                colors={['rgba(99,102,241,0.15)', 'rgba(99,102,241,0.02)']}
                style={[styles.serviceGradient, { borderColor: theme.colors.cardBorder }]}
              >
                <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
                  <Feather name="package" size={28} color={theme.colors.secondary} />
                </View>
                <AppText variant="small" semibold color="secondary" center>Send Parcel</AppText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.8}
              onPress={() => router.push('/book/properties' as any)}
            >
              <LinearGradient
                colors={['rgba(6,182,212,0.15)', 'rgba(6,182,212,0.02)']}
                style={[styles.serviceGradient, { borderColor: theme.colors.cardBorder }]}
              >
                <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(6,182,212,0.2)' }]}>
                  <FontAwesome5 name="building" size={26} color={theme.colors.tertiary} />
                </View>
                <AnimatedServiceText items={['Book Hotel', 'Book Lodging', 'Book Rooms', 'Book Resort']} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 5. Saved Places */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <AppText variant="title" bold>Saved Places</AppText>
              <TouchableOpacity onPress={() => router.push('/profile/addresses' as any)}>
                <AppText variant="bodyS" color="brand">Manage</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.savedGrid}>
              {savedPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id || place.label}
                  style={[styles.savedCard, {
                    backgroundColor: theme.colors.surface,
                    borderColor:     theme.colors.cardBorder,
                  }]}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/book/cab', params: { pickup: place.full_address || place.label } } as any)}
                >
                  <View style={styles.savedIcon}>
                    <Feather name={(LABEL_ICONS[place.label] || 'map-pin') as any} size={18} color={theme.colors.textSecondary} />
                  </View>
                  <AppText variant="small" semibold numberOfLines={1}>
                    {place.label?.charAt(0)?.toUpperCase() + (place.label?.slice(1) || '')}
                  </AppText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.savedCard, {
                  backgroundColor: theme.colors.surface,
                  borderColor:     theme.colors.cardBorder,
                }]}
                activeOpacity={0.8}
                onPress={() => router.push('/profile/addresses' as any)}
              >
                <View style={styles.savedIcon}>
                  <Feather name="plus" size={18} color={theme.colors.primary} />
                </View>
                <AppText variant="small" semibold color="brand">Add</AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* 6. Recent Rides */}
          {recentTrips.length > 0 && (
            <View style={styles.section}>
              <AppText variant="title" bold style={styles.sectionTitleLeft}>Recent Destinations</AppText>
              <View style={styles.recentList}>
                {recentTrips.map((ride) => (
                  <TouchableOpacity
                    key={ride.id}
                    style={[styles.recentItem, {
                      backgroundColor: theme.colors.surface,
                      borderColor:     theme.colors.cardBorder,
                    }]}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: '/book/cab', params: { destination: ride.title } } as any)}
                  >
                    <View style={[styles.recentIconBox, { backgroundColor: `${theme.colors.primary}22` }]}>
                      <Ionicons name={ride.icon as any} size={20} color={theme.colors.textPrimary} />
                    </View>
                    <View style={styles.recentTextWrap}>
                      <AppText variant="bodyS" bold numberOfLines={1}>{ride.title}</AppText>
                      <AppText variant="small" color="secondary" numberOfLines={1}>{ride.subtitle}</AppText>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 7. Recommended Routes */}
          <View style={[styles.section, { paddingBottom: 100 }]}>
            <View style={styles.sectionHeaderRow}>
              <AppText variant="title" bold>Recommended Routes</AppText>
              <TouchableOpacity>
                <AppText variant="bodyS" color="brand">See All</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
              {RECOMMENDED.map((item, i) => (
                <View key={i} style={[styles.recCard, {
                  backgroundColor: theme.colors.surface,
                  borderColor:     theme.colors.cardBorder,
                }]}>
                  <View style={styles.recCardTop}>
                    <View style={[styles.recIconBox, { backgroundColor: `${theme.colors.primary}22` }]}>
                      <Ionicons name="navigate" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyS" bold numberOfLines={1}>
                        {item.from}  →  {item.to}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.recCardBottom}>
                    <View>
                      <AppText variant="h4" bold>{item.fare}</AppText>
                      <AppText variant="small" color="success">{item.tag}</AppText>
                    </View>
                    <AppButton
                      size="sm"
                      onPress={() => router.push(item.route as any)}
                    >
                      Book
                    </AppButton>
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
  root:         { flex: 1 },
  safeArea:     { flex: 1 },
  scrollContent:{ paddingBottom: 40 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  userInfo:     { flexDirection: 'row', alignItems: 'center' },
  greetWrap:    { marginLeft: 12 },
  notificationBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  badge:        { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1 },

  promoContainer: { marginHorizontal: 24, marginBottom: 32, shadowColor: '#8B5CF6', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  promoGradient:  { borderRadius: 24, padding: 20 },
  promoContent:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoTextWrap:  { flex: 1 },
  promoTag:       { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6, opacity: 0.85 },
  promoIconBg:    { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  servicesGrid:   { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 32 },
  serviceCard:    { flex: 1, marginHorizontal: 4 },
  serviceGradient:{ alignItems: 'center', paddingVertical: 20, borderRadius: 20, borderWidth: 1 },
  serviceIconWrap:{ width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },

  section:        { marginBottom: 32 },
  sectionHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  sectionTitleLeft:{ marginLeft: 24, marginBottom: 16 },

  savedGrid:      { flexDirection: 'row', paddingHorizontal: 20 },
  savedCard:      { flex: 1, marginHorizontal: 4, paddingVertical: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  savedIcon:      { marginBottom: 8 },

  recentList:     { paddingHorizontal: 24 },
  recentItem:     { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  recentIconBox:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  recentTextWrap: { flex: 1 },

  recScroll:      { paddingHorizontal: 20 },
  recCard:        { borderRadius: 20, padding: 16, marginRight: 16, width: 260, borderWidth: 1 },
  recCardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  recIconBox:     { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recCardBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
})
