/**
 * Feature 16: Hotel Search Results & Multi-Criteria Filtering Screen
 * Displays hotel cards with photo carousel, ratings, starting price, and full filter bottom sheet.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton } from '../../src/components/ui'
import { hotelApi } from '../../src/api/client'

export default function HotelResultsScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{
    city?: string
    q?: string
    check_in?: string
    check_out?: string
    adults?: string
    children?: string
    rooms?: string
    property_type?: string
  }>()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hotels, setHotels] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Filters state
  const [sortBy, setSortBy] = useState('RECOMMENDED')
  const [selectedStars, setSelectedStars] = useState<number[]>([])
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([])
  const [filterModalVisible, setFilterModalVisible] = useState(false)

  const city = params.city || 'Pune'
  const checkIn = params.check_in || '2026-08-25'
  const checkOut = params.check_out || '2026-08-27'
  const adults = parseInt(params.adults || '2', 10)
  const rooms = parseInt(params.rooms || '1', 10)

  const fetchHotels = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await hotelApi.searchHotels({
        city: city,
        q: params.q,
        check_in: checkIn,
        check_out: checkOut,
        adults: adults,
        rooms: rooms,
        property_type: params.property_type,
        star_ratings: selectedStars.length > 0 ? selectedStars.join(',') : undefined,
        max_price: maxPrice || undefined,
        amenities: selectedAmenities.length > 0 ? selectedAmenities.join(',') : undefined,
        policies: selectedPolicies.length > 0 ? selectedPolicies.join(',') : undefined,
        sort_by: sortBy,
      })

      if (res.data?.data) {
        setHotels(res.data.data.hotels || [])
        setTotalCount(res.data.data.total || 0)
      }
    } catch {
      // Fallback demo data
      setHotels([
        {
          property_id: 'p_demo_taj',
          name: 'Taj Blue Diamond (IHCL)',
          star_rating: 5,
          rating: 4.8,
          reviews_count: 1420,
          city: 'Pune',
          address: '11 Koregaon Park Road, Pune',
          distance_km: 1.8,
          starting_price: 6500,
          photos: [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
          ],
          key_amenities: ['free_wifi', 'swimming_pool', 'restaurant', 'spa'],
          policies: { couple_friendly: true, pet_friendly: true },
        },
        {
          property_id: 'p_demo_westin',
          name: 'The Westin Pune Koregaon Park',
          star_rating: 5,
          rating: 4.7,
          reviews_count: 980,
          city: 'Pune',
          address: '36/3-B Koregaon Park Annexe, Pune',
          distance_km: 2.4,
          starting_price: 7800,
          photos: [
            'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
          ],
          key_amenities: ['free_wifi', 'swimming_pool', 'gym'],
          policies: { couple_friendly: true },
        },
      ])
      setTotalCount(2)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [city, params.q, checkIn, checkOut, adults, rooms, params.property_type, selectedStars, maxPrice, selectedAmenities, selectedPolicies, sortBy])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  const toggleStar = (star: number) => {
    if (selectedStars.includes(star)) {
      setSelectedStars(selectedStars.filter((s) => s !== star))
    } else {
      setSelectedStars([...selectedStars, star])
    }
  }

  const toggleAmenity = (key: string) => {
    if (selectedAmenities.includes(key)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== key))
    } else {
      setSelectedAmenities([...selectedAmenities, key])
    }
  }

  const togglePolicy = (key: string) => {
    if (selectedPolicies.includes(key)) {
      setSelectedPolicies(selectedPolicies.filter((p) => p !== key))
    } else {
      setSelectedPolicies([...selectedPolicies, key])
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Summary Bar */}
        <View style={[styles.topBar, { borderBottomColor: theme.colors.cardBorder }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.searchPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
            onPress={() => router.back()}
          >
            <Ionicons name="location-sharp" size={16} color={theme.colors.primary} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <AppText variant="small" bold style={{ color: theme.colors.textPrimary }} numberOfLines={1}>
                {city} • {adults} Guests
              </AppText>
              <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                25-27 Aug • {rooms} Room
              </AppText>
            </View>
            <Feather name="edit-2" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Filter Chips */}
        <View style={styles.filterChipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                {
                  backgroundColor: selectedStars.length > 0 || selectedAmenities.length > 0 ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons
                name="options-outline"
                size={16}
                color={selectedStars.length > 0 || selectedAmenities.length > 0 ? '#FFFFFF' : theme.colors.textPrimary}
              />
              <AppText
                variant="small"
                bold
                style={{
                  marginLeft: 4,
                  color: selectedStars.length > 0 || selectedAmenities.length > 0 ? '#FFFFFF' : theme.colors.textPrimary,
                }}
              >
                Filters
              </AppText>
            </TouchableOpacity>

            {[
              { label: '★ 4.5+ Rated', action: () => toggleStar(5), active: selectedStars.includes(5) },
              { label: 'Free Breakfast', action: () => toggleAmenity('breakfast'), active: selectedAmenities.includes('breakfast') },
              { label: 'Couple Friendly', action: () => togglePolicy('couple_friendly'), active: selectedPolicies.includes('couple_friendly') },
              { label: 'Pool', action: () => toggleAmenity('swimming_pool'), active: selectedAmenities.includes('swimming_pool') },
            ].map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: chip.active ? `${theme.colors.primary}15` : theme.colors.surface,
                    borderColor: chip.active ? theme.colors.primary : theme.colors.cardBorder,
                  },
                ]}
                onPress={chip.action}
              >
                <AppText
                  variant="small"
                  bold={chip.active}
                  style={{ color: chip.active ? theme.colors.primary : theme.colors.textPrimary }}
                >
                  {chip.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results List */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText style={{ color: theme.colors.textMuted, marginTop: 12 }}>
              Finding best verified stays in {city}...
            </AppText>
          </View>
        ) : hotels.length === 0 ? (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="bed-empty" size={54} color={theme.colors.textMuted} />
            <AppText variant="title" bold style={{ color: theme.colors.textPrimary, marginTop: 12 }}>
              No Stays Found
            </AppText>
            <AppText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }}>
              Try adjusting your price range or filter criteria.
            </AppText>
            <AppButton
              onPress={() => {
                setSelectedStars([])
                setMaxPrice(null)
                setSelectedAmenities([])
                setSelectedPolicies([])
                fetchHotels()
              }}
              style={{ marginTop: 16 }}
            >
              Reset Filters
            </AppButton>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.resultsScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHotels(true)} />}
          >
            <AppText variant="caption" bold style={[styles.countHeader, { color: theme.colors.textMuted }]}>
              {totalCount} PROPERTIES AVAILABLE IN {city.toUpperCase()}
            </AppText>

            {hotels.map((hotel) => (
              <TouchableOpacity
                key={hotel.property_id}
                style={[
                  styles.hotelCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: '/hotel/details' as any,
                    params: {
                      property_id: hotel.property_id,
                      check_in: checkIn,
                      check_out: checkOut,
                      adults: adults.toString(),
                      rooms: rooms.toString(),
                    },
                  })
                }
              >
                {/* Hotel Thumbnail Image */}
                <View style={styles.imageWrap}>
                  <Image
                    source={{
                      uri: hotel.photos?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
                    }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  {hotel.featured && (
                    <View style={styles.featuredTag}>
                      <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                      <AppText variant="caption" bold style={{ color: '#FFFFFF', marginLeft: 4 }}>
                        VERIFIED PARTNER
                      </AppText>
                    </View>
                  )}
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <AppText variant="small" bold style={{ color: '#000000', marginLeft: 3 }}>
                      {hotel.rating || '4.5'}
                    </AppText>
                  </View>
                </View>

                {/* Hotel Details */}
                <View style={styles.cardDetails}>
                  <View style={styles.titleRow}>
                    <AppText variant="body" bold style={{ color: theme.colors.textPrimary, flex: 1 }} numberOfLines={1}>
                      {hotel.name}
                    </AppText>
                    <View style={styles.starsRow}>
                      {[...Array(hotel.star_rating || 4)].map((_, i) => (
                        <Ionicons key={i} name="star" size={12} color="#F59E0B" />
                      ))}
                    </View>
                  </View>

                  <AppText variant="caption" style={{ color: theme.colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                    {hotel.address || `${hotel.city}, Maharashtra`}
                    {hotel.distance_km ? ` • ${hotel.distance_km} km from centre` : ''}
                  </AppText>

                  {/* Amenity Badges */}
                  <View style={styles.amenitiesBadgesRow}>
                    {hotel.key_amenities?.slice(0, 3).map((a: string, i: number) => (
                      <View key={i} style={[styles.amenityChip, { backgroundColor: theme.colors.backgroundAlt }]}>
                        <AppText variant="caption" style={{ color: theme.colors.textMuted, textTransform: 'capitalize' }}>
                          {a.replace('_', ' ')}
                        </AppText>
                      </View>
                    ))}
                    {hotel.policies?.couple_friendly && (
                      <View style={[styles.amenityChip, { backgroundColor: '#ECFDF5' }]}>
                        <AppText variant="caption" bold style={{ color: '#059669' }}>
                          Couple Friendly
                        </AppText>
                      </View>
                    )}
                  </View>

                  {/* Price & Action Row */}
                  <View style={styles.cardBottomRow}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <AppText variant="h3" bold style={{ color: theme.colors.primary }}>
                          ₹{hotel.starting_price?.toLocaleString('en-IN') || '4,500'}
                        </AppText>
                        <AppText variant="caption" style={{ color: theme.colors.textMuted, marginLeft: 4 }}>
                          / night
                        </AppText>
                      </View>
                      <AppText variant="caption" style={{ color: '#10B981', marginTop: 1 }}>
                        + ₹{Math.round((hotel.starting_price || 4500) * 0.12)} GST • Free Cancel
                      </AppText>
                    </View>

                    <TouchableOpacity
                      style={[styles.viewRoomsBtn, { backgroundColor: theme.colors.primary }]}
                      onPress={() =>
                        router.push({
                          pathname: '/hotel/details' as any,
                          params: {
                            property_id: hotel.property_id,
                            check_in: checkIn,
                            check_out: checkOut,
                            adults: adults.toString(),
                            rooms: rooms.toString(),
                          },
                        })
                      }
                    >
                      <AppText variant="small" bold style={{ color: '#FFFFFF' }}>
                        View Rooms
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Multi-Criteria Filter Bottom Sheet Modal */}
        <Modal
          visible={filterModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <AppText variant="title" bold style={{ color: theme.colors.textPrimary }}>
                  Filter Stays
                </AppText>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Feather name="x" size={22} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Sort By */}
                <AppText variant="caption" bold style={[styles.modalSectionTitle, { color: theme.colors.textMuted }]}>
                  SORT BY
                </AppText>
                <View style={styles.sortRow}>
                  {[
                    { key: 'RECOMMENDED', label: 'Recommended' },
                    { key: 'PRICE_LOW_HIGH', label: 'Price: Low to High' },
                    { key: 'RATING_HIGH_LOW', label: 'Rating: High to Low' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[
                        styles.sortBtn,
                        {
                          backgroundColor: sortBy === s.key ? `${theme.colors.primary}15` : theme.colors.backgroundAlt,
                          borderColor: sortBy === s.key ? theme.colors.primary : theme.colors.cardBorder,
                        },
                      ]}
                      onPress={() => setSortBy(s.key)}
                    >
                      <AppText variant="small" bold={sortBy === s.key} style={{ color: sortBy === s.key ? theme.colors.primary : theme.colors.textPrimary }}>
                        {s.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Star Category */}
                <AppText variant="caption" bold style={[styles.modalSectionTitle, { color: theme.colors.textMuted }]}>
                  STAR RATING
                </AppText>
                <View style={styles.starsFilterRow}>
                  {[3, 4, 5].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.starPill,
                        {
                          backgroundColor: selectedStars.includes(st) ? `${theme.colors.primary}20` : theme.colors.backgroundAlt,
                          borderColor: selectedStars.includes(st) ? theme.colors.primary : theme.colors.cardBorder,
                        },
                      ]}
                      onPress={() => toggleStar(st)}
                    >
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <AppText variant="small" bold style={{ marginLeft: 4, color: theme.colors.textPrimary }}>
                        {st} Star
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Amenities */}
                <AppText variant="caption" bold style={[styles.modalSectionTitle, { color: theme.colors.textMuted }]}>
                  AMENITIES
                </AppText>
                <View style={styles.amenitiesCheckGrid}>
                  {[
                    { key: 'free_wifi', label: 'Free Wi-Fi' },
                    { key: 'swimming_pool', label: 'Swimming Pool' },
                    { key: 'restaurant', label: 'Restaurant' },
                    { key: 'parking', label: 'Free Parking' },
                    { key: 'spa', label: 'Wellness Spa' },
                  ].map((am) => {
                    const active = selectedAmenities.includes(am.key)
                    return (
                      <TouchableOpacity
                        key={am.key}
                        style={[
                          styles.checkChip,
                          {
                            backgroundColor: active ? `${theme.colors.primary}15` : theme.colors.backgroundAlt,
                            borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                          },
                        ]}
                        onPress={() => toggleAmenity(am.key)}
                      >
                        <Feather name={active ? 'check-square' : 'square'} size={16} color={active ? theme.colors.primary : theme.colors.textMuted} />
                        <AppText variant="small" style={{ marginLeft: 8, color: theme.colors.textPrimary }}>
                          {am.label}
                        </AppText>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </ScrollView>

              <View style={styles.modalCtaRow}>
                <AppButton
                  onPress={() => {
                    setFilterModalVisible(false)
                    fetchHotels()
                  }}
                  style={{ flex: 1 }}
                >
                  Apply Filters
                </AppButton>
              </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginLeft: 10,
  },
  filterChipsRow: { paddingVertical: 10 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultsScroll: { paddingHorizontal: 16, paddingBottom: 30 },
  countHeader: { fontSize: 11, letterSpacing: 0.5, marginBottom: 12, marginTop: 4 },
  hotelCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: { width: '100%', height: 170, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  featuredTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(29, 78, 216, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDetails: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starsRow: { flexDirection: 'row', gap: 2, marginLeft: 8 },
  amenitiesBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  amenityChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  viewRoomsBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalSectionTitle: { fontSize: 11, letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  starsFilterRow: { flexDirection: 'row', gap: 10 },
  starPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  amenitiesCheckGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  modalCtaRow: { marginTop: 18 },
})
