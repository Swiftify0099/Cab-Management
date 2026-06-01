/**
 * Hotel Booking / Stay Recommendations Screen
 * Pixel-perfect from stitch: destination_stay_recommendations
 */
import React from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

export default function HotelBookingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F8FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Destination Stay</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Feather name="user" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Arrival Status Card */}
        <View style={styles.arrivalCard}>
          <View style={styles.arrivalInfo}>
            <Text style={styles.arrivalTitle}>Arriving in Mumbai</Text>
            
            <View style={styles.progressBarWrap}>
              <View style={[styles.progressBarFill, { width: '80%' }]} />
            </View>
            
            <Text style={styles.arrivalSub}>45 min remaining</Text>
          </View>
          
          {/* Mini Map Mock */}
          <View style={styles.miniMap}>
            <View style={[styles.mapLine, { top: 16, transform: [{ rotate: '12deg' }] }]} />
            <View style={[styles.mapLineVert, { left: 32, transform: [{ rotate: '-12deg' }] }]} />
            <View style={[styles.mapLine, { bottom: 16, transform: [{ rotate: '-45deg' }] }]} />
            
            <View style={styles.mapDot} />
            <View style={styles.mapPulse} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Highly-Rated Hotels Near You</Text>

        {/* Horizontal Hotel List */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotelScroll}>
          
          {/* Hotel 1 */}
          <View style={styles.hotelCard}>
            <View style={styles.hotelImgPlaceholder}>
               <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E2E8F0' }]} />
               <MaterialCommunityIcons name="city-variant" size={60} color="#94A3B8" />
            </View>
            <View style={styles.hotelDetails}>
              <Text style={styles.hotelName} numberOfLines={1}>Taj Lands End</Text>
              
              <View style={styles.ratingRow}>
                <Text style={styles.ratingScore}>4.8</Text>
                <Ionicons name="star" size={14} color="#F59E0B" style={{ marginHorizontal: 4 }} />
                <Text style={styles.ratingCount}>(1,205 reviews)</Text>
              </View>

              <Text style={styles.priceRow}>
                ₹12,499 <Text style={styles.priceSub}>/ night</Text>
              </Text>
              
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Express Check-in Available</Text>
              </View>

              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hotel 2 */}
          <View style={styles.hotelCard}>
            <View style={styles.hotelImgPlaceholder}>
               <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F1F5F9' }]} />
               <MaterialCommunityIcons name="home-modern" size={60} color="#94A3B8" />
            </View>
            <View style={styles.hotelDetails}>
              <Text style={styles.hotelName} numberOfLines={1}>The Oberoi</Text>
              
              <View style={styles.ratingRow}>
                <Text style={styles.ratingScore}>4.9</Text>
                <Ionicons name="star" size={14} color="#F59E0B" style={{ marginHorizontal: 4 }} />
                <Text style={styles.ratingCount}>(3,500 reviews)</Text>
              </View>

              <Text style={styles.priceRow}>
                ₹16,320 <Text style={styles.priceSub}>/ night</Text>
              </Text>
              
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Express Check-in Available</Text>
              </View>

              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hotel 3 */}
          <View style={styles.hotelCard}>
            <View style={styles.hotelImgPlaceholder}>
               <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E2E8F0' }]} />
               <MaterialCommunityIcons name="bed-king-outline" size={60} color="#94A3B8" />
            </View>
            <View style={styles.hotelDetails}>
              <Text style={styles.hotelName} numberOfLines={1}>JW Marriott</Text>
              
              <View style={styles.ratingRow}>
                <Text style={styles.ratingScore}>4.7</Text>
                <Ionicons name="star" size={14} color="#F59E0B" style={{ marginHorizontal: 4 }} />
                <Text style={styles.ratingCount}>(890 reviews)</Text>
              </View>

              <Text style={styles.priceRow}>
                ₹11,230 <Text style={styles.priceSub}>/ night</Text>
              </Text>
              
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Express Check-in</Text>
              </View>

              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/book/cab' as any)}>
          <Ionicons name="car-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="bed-outline" size={24} color="#1D4ED8" />
          <Text style={[styles.navLabel, { color: '#1D4ED8', fontWeight: '600' }]}>Stays</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)/trips' as any)}>
          <Feather name="briefcase" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)/profile' as any)}>
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F8FF' },
  header: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000', flex: 1, textAlign: 'center' },
  
  scroll: { flex: 1 },

  arrivalCard: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#3B82F6', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#EFF6FF',
  },
  arrivalInfo: { flex: 1, marginRight: 16 },
  arrivalTitle: { color: '#000', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  progressBarWrap: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#1D4ED8', borderRadius: 4 },
  arrivalSub: { color: '#000', fontSize: 14 },
  
  miniMap: {
    width: 64, height: 64, backgroundColor: '#FEF3C7', borderRadius: 12,
    borderWidth: 1, borderColor: '#FEF08A', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  mapLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: '#FDE047' },
  mapLineVert: { position: 'absolute', width: 1, height: '100%', backgroundColor: '#FDE047' },
  mapDot: { width: 12, height: 12, backgroundColor: '#1D4ED8', borderRadius: 6, borderWidth: 2, borderColor: '#FFF', zIndex: 10 },
  mapPulse: { position: 'absolute', width: 24, height: 24, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 12 },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000', paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },

  hotelScroll: { paddingLeft: 16, paddingBottom: 32, paddingRight: 16 },
  hotelCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, width: 280, marginRight: 16,
    shadowColor: '#94A3B8', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden',
  },
  hotelImgPlaceholder: { width: '100%', height: 180, alignItems: 'center', justifyContent: 'center' },
  hotelDetails: { padding: 16 },
  hotelName: { color: '#000', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ratingScore: { color: '#000', fontWeight: '700' },
  ratingCount: { color: '#6B7280' },
  priceRow: { color: '#000', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  priceSub: { fontSize: 16, fontWeight: '400' },
  badge: { backgroundColor: '#DCFCE7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 16 },
  badgeText: { color: '#166534', fontSize: 11, fontWeight: '600' },
  viewBtn: { width: '100%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1D4ED8', alignItems: 'center' },
  viewBtnText: { color: '#1D4ED8', fontSize: 16, fontWeight: '700' },

  bottomNav: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
    flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, paddingBottom: 24,
  },
  navItem: { alignItems: 'center' },
  navLabel: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
})
