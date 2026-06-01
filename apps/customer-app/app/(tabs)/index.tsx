/**
 * Customer App — Home Dashboard
 * Pixel-perfect implementation from stitch design: customer_home_dashboard
 */
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import MapView from 'react-native-maps'
import { useAuthStore } from '../../src/store/auth.store'

const RECOMMENDED = [
  { from: 'Mumbai', to: 'Pune', fare: '₹850', tag: 'AI-Predicted', route: '/book/cab' },
  { from: 'Bangalore', to: 'Chennai', fare: '₹1200', tag: 'AI-Predicted', route: '/book/cab' },
  { from: 'Delhi', to: 'Agra', fare: '₹650', tag: 'AI-Predicted', route: '/book/cab' },
]

export default function HomeTab() {
  const user = useAuthStore((s) => s.user)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0D1A" />

      {/* Map Background */}
      <View style={styles.mapBg}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: 19.0760,
            longitude: 72.8777,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
        >
        </MapView>
        {/* Map overlay gradient to blend map with UI */}
        <LinearGradient
          colors={['transparent', 'rgba(10,13,26,0.8)', '#0A0D1A']}
          style={[StyleSheet.absoluteFill, { top: '40%' }]}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.flex}>

          {/* Top Search Bar */}
          <View style={styles.searchBarWrap}>
            <View style={styles.searchBar}>
              <Feather name="search" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Where to? Search destinations"
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                onPressIn={() => router.push('/book/cab' as any)}
              />
            </View>
          </View>

          {/* Floating Services Card */}
          <View style={styles.servicesCard}>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/book/cab' as any)}>
              <View style={[styles.serviceIcon, { backgroundColor: '#3B82F6', shadowColor: '#3B82F6' }]}>
                <Ionicons name="car-outline" size={28} color="white" />
              </View>
              <Text style={styles.serviceLabel}>Intercity Ride</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/parcel-booking' as any)}>
              <View style={[styles.serviceIcon, { backgroundColor: '#6366F1', shadowColor: '#6366F1' }]}>
                <Feather name="package" size={26} color="white" />
              </View>
              <Text style={styles.serviceLabel}>Send Parcel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(tabs)/trips' as any)}>
              <View style={[styles.serviceIcon, { backgroundColor: '#06B6D4', shadowColor: '#06B6D4' }]}>
                <FontAwesome5 name="building" size={22} color="white" />
              </View>
              <Text style={styles.serviceLabel}>Book Hotel</Text>
            </TouchableOpacity>

            {/* Swipe indicator */}
            <View style={styles.swipePill} />
          </View>
        </View>

        {/* Bottom Sheet — Recommended for You */}
        <View style={styles.bottomSheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.bottomSheetTitle}>Recommended for You</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 8 }}
          >
            {RECOMMENDED.map((item, i) => (
              <View key={i} style={styles.recCard}>
                <View style={styles.recCardTop}>
                  <View style={styles.recIconBox}>
                    <Ionicons name="car-outline" size={20} color="#9CA3AF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recRoute}>{item.from} to</Text>
                    <Text style={styles.recRoute}>{item.to}</Text>
                  </View>
                </View>
                <Text style={styles.recFare}>
                  {item.fare}{' '}
                  <Text style={styles.recTag}>({item.tag})</Text>
                </Text>
                <TouchableOpacity
                  style={styles.recBookBtn}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.recBookText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.tabBar}>
          <View style={styles.tabActiveIndicator} />

          <TouchableOpacity style={styles.tabItem}>
            <MaterialCommunityIcons name="home-variant" size={28} color="#3B82F6" />
            <Text style={[styles.tabLabel, { color: '#3B82F6' }]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/(tabs)/trips' as any)}>
            <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
            <Text style={styles.tabLabel}>Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem}>
            <MaterialCommunityIcons name="tag-outline" size={24} color="#9CA3AF" />
            <Text style={styles.tabLabel}>Offers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Ionicons name="person-outline" size={24} color="#9CA3AF" />
            <Text style={styles.tabLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem}>
            <Feather name="more-horizontal" size={24} color="#9CA3AF" />
            <Text style={styles.tabLabel}>More</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0D1A' },
  safeArea: { flex: 1 },
  flex: { flex: 1, justifyContent: 'space-between' },
  mapBg: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  routeLine: {
    position: 'absolute', height: 2, borderRadius: 4,
  },
  carDot: {
    position: 'absolute', width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#00D4FF', opacity: 0.8,
  },

  // Search bar
  searchBarWrap: { paddingHorizontal: 20, paddingTop: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  searchInput: {
    flex: 1, marginLeft: 10, color: '#FFFFFF',
    fontSize: 15, fontWeight: '500',
  },

  // Services Card
  servicesCard: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: 'rgba(33,36,61,0.75)',
    borderRadius: 24, paddingHorizontal: 24, paddingVertical: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  serviceItem: { alignItems: 'center' },
  serviceIcon: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  serviceLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '500', textAlign: 'center' },
  swipePill: {
    position: 'absolute', bottom: 8, alignSelf: 'center',
    width: 32, height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2,
  },

  // Bottom Sheet
  bottomSheet: {
    backgroundColor: '#121526', borderTopLeftRadius: 40, borderTopRightRadius: 40,
    paddingTop: 28, paddingBottom: 96, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  handle: {
    width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3, alignSelf: 'center', marginBottom: 20,
  },
  bottomSheetTitle: {
    color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 16,
  },

  // Recommended cards
  recCard: {
    backgroundColor: '#1C1F33', borderRadius: 24, padding: 20,
    marginRight: 16, width: 220,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  recCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  recIconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center',
    alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  recRoute: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', lineHeight: 22 },
  recFare: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  recTag: { color: '#9CA3AF', fontSize: 13, fontWeight: '400' },
  recBookBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  recBookText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  // Tab bar
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,13,26,0.97)',
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tabActiveIndicator: {
    position: 'absolute', top: 0, left: '8%', width: 56, height: 2,
    backgroundColor: '#3B82F6', borderRadius: 1,
  },
  tabItem: { alignItems: 'center', flex: 1 },
  tabLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '500', marginTop: 4 },
})
