/**
 * Feature 16: Hotel & Stay Search Screen
 * Supports City selection, Search Query, Check-in / Check-out dates, and Guests & Rooms count.
 */
import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton } from '../../src/components/ui'

const POPULAR_CITIES = [
  { name: 'Pune', tag: 'Koregaon Park & Viman Nagar', icon: 'business' },
  { name: 'Mumbai', tag: 'Marine Drive & Bandra', icon: 'business' },
  { name: 'Goa', tag: 'Candolim & Calangute', icon: 'sunny' },
  { name: 'Sangli', tag: 'Miraj & City Centre', icon: 'business' },
  { name: 'Bengaluru', tag: 'Indiranagar & Whitefield', icon: 'business' },
]

export default function HotelSearchScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [selectedCity, setSelectedCity] = useState('Pune')
  const [searchQuery, setSearchQuery] = useState('')
  const [checkInDate, setCheckInDate] = useState('2026-08-25')
  const [checkOutDate, setCheckOutDate] = useState('2026-08-27')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [rooms, setRooms] = useState(1)
  const [guestModalVisible, setGuestModalVisible] = useState(false)
  const [stayType, setStayType] = useState<'hotel' | 'resort' | 'lodge' | 'room'>('hotel')

  const handleSearch = () => {
    router.push({
      pathname: '/hotel/results' as any,
      params: {
        city: selectedCity,
        q: searchQuery,
        check_in: checkInDate,
        check_out: checkOutDate,
        adults: adults.toString(),
        children: children.toString(),
        rooms: rooms.toString(),
        property_type: stayType,
      },
    })
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <AppText variant="h2" bold style={{ color: theme.colors.textPrimary }}>
              {t('hotel.find_stays', 'Book Hotels & Stays')}
            </AppText>
            <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
              {t('hotel.verified_sub', 'Verified properties with seamless ride connectivity')}
            </AppText>
          </View>
          <TouchableOpacity onPress={() => router.push('/hotel/results' as any)} style={styles.historyBtn}>
            <MaterialCommunityIcons name="history" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Stay Type Chips */}
          <View style={styles.stayTypeRow}>
            {[
              { key: 'hotel', label: 'Hotels', icon: 'office-building' },
              { key: 'resort', label: 'Resorts', icon: 'palm-tree' },
              { key: 'lodge', label: 'Lodges', icon: 'bed-double' },
              { key: 'room', label: 'Homestays', icon: 'home-heart' },
            ].map((st) => {
              const active = stayType === st.key
              return (
                <TouchableOpacity
                  key={st.key}
                  style={[
                    styles.stayTypeChip,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() => setStayType(st.key as any)}
                >
                  <MaterialCommunityIcons
                    name={st.icon as any}
                    size={18}
                    color={active ? '#FFFFFF' : theme.colors.textMuted}
                  />
                  <AppText
                    variant="small"
                    bold={active}
                    style={{
                      color: active ? '#FFFFFF' : theme.colors.textPrimary,
                      marginLeft: 6,
                    }}
                  >
                    {st.label}
                  </AppText>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Search Card */}
          <View
            style={[
              styles.searchCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            {/* City / Destination Input */}
            <View style={styles.fieldBlock}>
              <AppText variant="caption" bold style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>
                {t('hotel.destination_city', 'CITY / AREA / HOTEL NAME')}
              </AppText>
              <View style={[styles.inputRow, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.cardBorder }]}>
                <Ionicons name="location-sharp" size={22} color={theme.colors.primary} />
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="Enter City or Hotel Name (e.g. Pune, Taj)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery || selectedCity}
                  onChangeText={(txt) => {
                    setSearchQuery(txt)
                    setSelectedCity(txt)
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Feather name="x" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Quick Popular Cities */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickCitiesRow}>
              {POPULAR_CITIES.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    styles.cityPill,
                    {
                      backgroundColor: selectedCity === c.name ? `${theme.colors.primary}20` : theme.colors.backgroundAlt,
                      borderColor: selectedCity === c.name ? theme.colors.primary : theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCity(c.name)
                    setSearchQuery(c.name)
                  }}
                >
                  <AppText
                    variant="small"
                    bold={selectedCity === c.name}
                    style={{ color: selectedCity === c.name ? theme.colors.primary : theme.colors.textPrimary }}
                  >
                    {c.name}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date Pickers (Check-in / Check-out) */}
            <View style={styles.datesGrid}>
              <View style={[styles.dateBox, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.cardBorder }]}>
                <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                  {t('hotel.check_in', 'Check-In')}
                </AppText>
                <View style={styles.dateValRow}>
                  <Feather name="calendar" size={16} color={theme.colors.primary} />
                  <AppText variant="body" bold style={{ color: theme.colors.textPrimary, marginLeft: 6 }}>
                    25 Aug, Tue
                  </AppText>
                </View>
                <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                  From 2:00 PM
                </AppText>
              </View>

              <View style={styles.durationBadge}>
                <AppText variant="caption" bold style={{ color: '#FFFFFF' }}>
                  2 Nights
                </AppText>
              </View>

              <View style={[styles.dateBox, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.cardBorder }]}>
                <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                  {t('hotel.check_out', 'Check-Out')}
                </AppText>
                <View style={styles.dateValRow}>
                  <Feather name="calendar" size={16} color={theme.colors.primary} />
                  <AppText variant="body" bold style={{ color: theme.colors.textPrimary, marginLeft: 6 }}>
                    27 Aug, Thu
                  </AppText>
                </View>
                <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                  Until 11:00 AM
                </AppText>
              </View>
            </View>

            {/* Guests & Rooms Field */}
            <TouchableOpacity
              style={[styles.guestsBox, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.cardBorder }]}
              onPress={() => setGuestModalVisible(true)}
            >
              <View style={styles.guestsLeft}>
                <Ionicons name="people-outline" size={22} color={theme.colors.primary} />
                <View style={{ marginLeft: 12 }}>
                  <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                    {t('hotel.guests_rooms', 'Guests & Rooms')}
                  </AppText>
                  <AppText variant="body" bold style={{ color: theme.colors.textPrimary, marginTop: 2 }}>
                    {adults} Adults{children > 0 ? `, ${children} Children` : ''} • {rooms} {rooms === 1 ? 'Room' : 'Rooms'}
                  </AppText>
                </View>
              </View>
              <Feather name="chevron-down" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Search CTA */}
            <TouchableOpacity style={styles.searchCta} onPress={handleSearch} activeOpacity={0.85}>
              <LinearGradient
                colors={['#1D4ED8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
                <AppText variant="body" bold style={{ color: '#FFFFFF', marginLeft: 8, fontSize: 16 }}>
                  {t('hotel.search_stays_cta', 'Search Stays')}
                </AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Value Propositions Banner */}
          <View style={styles.perksRow}>
            <View style={[styles.perkItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={24} color="#10B981" />
              <AppText variant="small" bold style={{ color: theme.colors.textPrimary, marginTop: 6 }}>
                100% Verified
              </AppText>
              <AppText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
                Handpicked quality
              </AppText>
            </View>

            <View style={[styles.perkItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
              <MaterialCommunityIcons name="car-connected" size={24} color="#3B82F6" />
              <AppText variant="small" bold style={{ color: theme.colors.textPrimary, marginTop: 6 }}>
                Ride Connected
              </AppText>
              <AppText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
                1-Tap Airport Cabs
              </AppText>
            </View>

            <View style={[styles.perkItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
              <MaterialCommunityIcons name="cash-refund" size={24} color="#F59E0B" />
              <AppText variant="small" bold style={{ color: theme.colors.textPrimary, marginTop: 6 }}>
                Free Cancel
              </AppText>
              <AppText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
                Instant wallet refund
              </AppText>
            </View>
          </View>
        </ScrollView>

        {/* Guests & Rooms Stepper Modal */}
        <Modal
          visible={guestModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setGuestModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <AppText variant="title" bold style={{ color: theme.colors.textPrimary }}>
                  Select Guests & Rooms
                </AppText>
                <TouchableOpacity onPress={() => setGuestModalVisible(false)}>
                  <Feather name="x" size={22} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Adults Stepper */}
              <View style={styles.stepperRow}>
                <View>
                  <AppText variant="body" bold style={{ color: theme.colors.textPrimary }}>
                    Adults
                  </AppText>
                  <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                    Ages 13 and above
                  </AppText>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: theme.colors.cardBorder }]}
                    disabled={adults <= 1}
                    onPress={() => setAdults(Math.max(1, adults - 1))}
                  >
                    <Feather name="minus" size={16} color={adults <= 1 ? theme.colors.textMuted : theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <AppText variant="body" bold style={{ width: 32, textAlign: 'center', color: theme.colors.textPrimary }}>
                    {adults}
                  </AppText>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: theme.colors.cardBorder }]}
                    disabled={adults >= 10}
                    onPress={() => setAdults(adults + 1)}
                  >
                    <Feather name="plus" size={16} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Children Stepper */}
              <View style={styles.stepperRow}>
                <View>
                  <AppText variant="body" bold style={{ color: theme.colors.textPrimary }}>
                    Children
                  </AppText>
                  <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                    Ages 0 to 12
                  </AppText>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: theme.colors.cardBorder }]}
                    disabled={children <= 0}
                    onPress={() => setChildren(Math.max(0, children - 1))}
                  >
                    <Feather name="minus" size={16} color={children <= 0 ? theme.colors.textMuted : theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <AppText variant="body" bold style={{ width: 32, textAlign: 'center', color: theme.colors.textPrimary }}>
                    {children}
                  </AppText>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: theme.colors.cardBorder }]}
                    disabled={children >= 6}
                    onPress={() => setChildren(children + 1)}
                  >
                    <Feather name="plus" size={16} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Rooms Stepper */}
              <View style={styles.stepperRow}>
                <View>
                  <AppText variant="body" bold style={{ color: theme.colors.textPrimary }}>
                    Rooms
                  </AppText>
                  <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                    Number of rooms needed
                  </AppText>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: theme.colors.cardBorder }]}
                    disabled={rooms <= 1}
                    onPress={() => setRooms(Math.max(1, rooms - 1))}
                  >
                    <Feather name="minus" size={16} color={rooms <= 1 ? theme.colors.textMuted : theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <AppText variant="body" bold style={{ width: 32, textAlign: 'center', color: theme.colors.textPrimary }}>
                    {rooms}
                  </AppText>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: theme.colors.cardBorder }]}
                    disabled={rooms >= 5}
                    onPress={() => setRooms(rooms + 1)}
                  >
                    <Feather name="plus" size={16} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <AppButton
                onPress={() => setGuestModalVisible(false)}
                style={{ marginTop: 20 }}
              >
                Apply Selection
              </AppButton>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: { padding: 6 },
  headerTitleWrap: { flex: 1, marginLeft: 12 },
  historyBtn: { padding: 6 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
  stayTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stayTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  searchCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldBlock: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, marginBottom: 6, letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, fontFamily: 'Inter-Medium' },
  quickCitiesRow: { flexDirection: 'row', marginBottom: 16 },
  cityPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  datesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
  },
  dateBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateValRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  durationBadge: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  guestsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  guestsLeft: { flexDirection: 'row', alignItems: 'center' },
  searchCta: { borderRadius: 16, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
  },
  perksRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  perkItem: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
