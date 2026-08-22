import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { ScheduledTripService } from '../../src/services/scheduledTripService';
import {
  AvailableScheduledRide,
  UpcomingReservedTrip,
} from '../../src/types/scheduledTrips';
import { ScheduledRideCard } from '../../src/components/scheduled/ScheduledRideCard';
import { UpcomingReservationCard } from '../../src/components/scheduled/UpcomingReservationCard';
import { CancelReservationModal } from '../../src/components/scheduled/CancelReservationModal';
import { ScheduledDevSheet } from '../../src/components/scheduled/ScheduledDevSheet';

export default function ScheduledTripsScreen() {
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'UPCOMING'>('AVAILABLE');
  const [availableRides, setAvailableRides] = useState<AvailableScheduledRide[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingReservedTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [selectedTripToCancel, setSelectedTripToCancel] = useState<UpcomingReservedTrip | null>(null);
  const [showDevSheet, setShowDevSheet] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'AVAILABLE') {
        const rides = await ScheduledTripService.getAvailableRides();
        setAvailableRides(rides);
      } else {
        const trips = await ScheduledTripService.getUpcomingTrips();
        setUpcomingTrips(trips);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaim = async (ride: AvailableScheduledRide) => {
    try {
      setClaimingId(ride.id);
      const res = await ScheduledTripService.acceptReservation(ride.id);
      if (res.success) {
        Alert.alert('Reservation Confirmed', res.message, [
          { text: 'View Reservations', onPress: () => setActiveTab('UPCOMING') },
          { text: 'OK', onPress: loadData },
        ]);
      } else {
        Alert.alert('Claim Failed', res.message);
      }
    } finally {
      setClaimingId(null);
    }
  };

  const handleStartHeading = async (tripId: string) => {
    try {
      setStartingId(tripId);
      const res = await ScheduledTripService.startHeadingToPickup(tripId);
      if (res.success) {
        Alert.alert('Navigation Started', res.message, [
          {
            text: 'Go to Dashboard',
            onPress: () => router.replace('/(tabs)' as any),
          },
        ]);
      } else {
        Alert.alert('Unable to Start', res.message);
      }
    } finally {
      setStartingId(null);
    }
  };

  const handleConfirmCancel = async (tripId: string, reason: string) => {
    const res = await ScheduledTripService.cancelReservation(tripId, reason);
    if (res.success) {
      Alert.alert('Reservation Cancelled', res.message);
      loadData();
    } else {
      Alert.alert('Cancellation Error', res.message);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Scheduled Trips</Text>

        <TouchableOpacity style={styles.sandboxBtn} onPress={() => setShowDevSheet(true)}>
          <MaterialCommunityIcons name="robot-outline" size={20} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: isDark ? '#131B2E' : '#F1F5F9',
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'AVAILABLE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('AVAILABLE')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'AVAILABLE' ? styles.tabTextActive : { color: theme.colors.textSecondary },
            ]}
          >
            Available ({availableRides.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'UPCOMING' && styles.tabBtnActive]}
          onPress={() => setActiveTab('UPCOMING')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'UPCOMING' ? styles.tabTextActive : { color: theme.colors.textSecondary },
            ]}
          >
            My Reservations ({upcomingTrips.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#0EA5E9"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0EA5E9" />
          </View>
        ) : activeTab === 'AVAILABLE' ? (
          availableRides.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="calendar" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Advance Bookings Available
              </Text>
              <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                New scheduled airport and outstation rides for tomorrow will appear here.
              </Text>

              {__DEV__ && (
                <TouchableOpacity
                  style={styles.seedBtn}
                  onPress={() => setShowDevSheet(true)}
                >
                  <MaterialCommunityIcons name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.seedBtnText}>Seed Sample Advance Bookings</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            availableRides.map((ride) => (
              <ScheduledRideCard
                key={ride.id}
                ride={ride}
                onAccept={handleClaim}
                claiming={claimingId === ride.id}
              />
            ))
          )
        ) : upcomingTrips.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="check-circle" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Upcoming Reservations
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              You have not claimed any scheduled rides yet. Check the Available tab!
            </Text>

            <TouchableOpacity
              style={styles.seedBtn}
              onPress={() => setActiveTab('AVAILABLE')}
            >
              <Text style={styles.seedBtnText}>Browse Available Rides</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingTrips.map((trip) => (
            <UpcomingReservationCard
              key={trip.id}
              trip={trip}
              onStartHeading={handleStartHeading}
              onCancel={setSelectedTripToCancel}
              starting={startingId === trip.id}
            />
          ))
        )}
      </ScrollView>

      {/* Cancel Reservation Modal */}
      <CancelReservationModal
        visible={selectedTripToCancel !== null}
        trip={selectedTripToCancel}
        onClose={() => setSelectedTripToCancel(null)}
        onConfirmCancel={handleConfirmCancel}
      />

      {/* Developer Sandbox Simulator */}
      <ScheduledDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        onSimulated={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  sandboxBtn: { padding: 6 },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: '#0EA5E9' },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 16 },
  loadingWrap: { padding: 40, alignItems: 'center' },
  emptyWrap: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  seedBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
