/**
 * Driver: My Published Trips Management Screen
 * =============================================
 * Shows all trips created by the driver with status tabs.
 * Handles:
 *   - Daily recurrence renewal (DRAFT → confirm/cancel today)
 *   - Trip management (view customers, cancel trip)
 *   - Real-time trip status display
 */
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
import { api } from '../../src/api/client';

interface Trip {
  trip_id: string;
  service_type: string;
  status: string;
  pickup_city: string;
  pickup_address: string;
  destination_city: string;
  destination_address: string;
  departure_time: string | null;
  total_seats: number;
  available_seats: number;
  occupied_seats: number;
  is_full: boolean;
  base_fare: number;
  distance_km: number | null;
  women_only: boolean;
  recurrence_type: string | null;
  accepted_bookings: number;
  schedule_template_id: string | null;
}

const STATUS_TABS = ['all', 'published', 'draft', 'full', 'active', 'completed', 'cancelled'];

const STATUS_COLOR: Record<string, string> = {
  published:   '#10B981',
  draft:       '#F59E0B',
  full:        '#3B82F6',
  active:      '#8B5CF6',
  in_progress: '#8B5CF6',
  completed:   '#6B7280',
  cancelled:   '#EF4444',
};

const SERVICE_EMOJI: Record<string, string> = {
  cab:          '🚕',
  transport:    '🚛',
  organization: '🏫',
  parcel:       '📦',
  hotel:        '🏨',
  airport:      '✈️',
  packers:      '📦',
};

function formatDeparture(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function MyTripsScreen() {
  const { theme, isDark } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await api.get('/matching/trips/my-trips', { params });
      setTrips(res.data?.data?.trips || []);
    } catch (err: any) {
      console.warn('[MyTrips] Load error:', err?.response?.data || err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Real-time refresh: listen for new carpool booking or daily renewal
  useEffect(() => {
    const { DriverSocketService } = require('../../src/services/driverSocketService');

    const handleNewBooking = () => {
      console.log('[MyTrips] NEW_CARPOOL_BOOKING — refreshing trips list');
      loadTrips();
    };

    const handleRenewal = () => {
      console.log('[MyTrips] DAILY_TRIP_RENEWAL — refreshing trips list');
      loadTrips();
    };

    DriverSocketService.on('NEW_CARPOOL_BOOKING', handleNewBooking);
    DriverSocketService.on('DAILY_TRIP_RENEWAL', handleRenewal);

    return () => {
      DriverSocketService.off('NEW_CARPOOL_BOOKING', handleNewBooking);
      DriverSocketService.off('DAILY_TRIP_RENEWAL', handleRenewal);
    };
  }, [loadTrips]);

  const handleConfirmToday = async (tripId: string) => {
    Alert.alert(
      'Confirm Today\'s Trip',
      'This will publish the trip so customers can book seats. Ready to go?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Publish',
          style: 'default',
          onPress: async () => {
            setActionLoading(tripId + '_confirm');
            try {
              await api.post(`/matching/trips/${tripId}/confirm`, {});
              Alert.alert('✅ Trip Published!', 'Customers can now book seats on your trip.');
              await loadTrips();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.detail || 'Could not confirm trip.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelToday = async (tripId: string) => {
    Alert.alert(
      'Cancel Today\'s Trip',
      'This cancels only today\'s instance. Your recurring schedule will continue tomorrow.',
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Today',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(tripId + '_cancel_today');
            try {
              await api.post(`/matching/trips/${tripId}/cancel-today`, {});
              Alert.alert('Trip Cancelled', 'Today\'s trip cancelled. Schedule continues tomorrow.');
              await loadTrips();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.detail || 'Could not cancel.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelTrip = async (tripId: string) => {
    Alert.alert(
      'Cancel Trip',
      'This will cancel the trip and notify all booked customers.',
      [
        { text: 'Keep Trip', style: 'cancel' },
        {
          text: 'Cancel Trip',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(tripId + '_cancel');
            try {
              await api.post(`/matching/trips/${tripId}/cancel`, {});
              Alert.alert('Trip Cancelled', 'Customers have been notified.');
              await loadTrips();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.detail || 'Could not cancel.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    createBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    createBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    tabBar: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    tabScroll: {
      flexDirection: 'row',
      gap: 8,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    card: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    serviceType: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },
    routeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    routeCity: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
    },
    routeArrow: {
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    seatBar: {
      height: 5,
      borderRadius: 3,
      backgroundColor: isDark ? '#374151' : '#E5E7EB',
      marginBottom: 10,
      overflow: 'hidden',
    },
    seatFill: {
      height: '100%',
      borderRadius: 3,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },
    renewalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#451A03' : '#FEF3C7',
      borderRadius: 10,
      padding: 10,
      marginBottom: 10,
      gap: 8,
    },
    renewalText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#FDE68A' : '#92400E',
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    emptyDesc: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
  });

  const renderTrip = (trip: Trip) => {
    const statusColor = STATUS_COLOR[trip.status] || '#6B7280';
    const occupiedPct = trip.total_seats > 0
      ? Math.min((trip.occupied_seats / trip.total_seats) * 100, 100)
      : 0;
    const isDraft = trip.status === 'draft';
    const isRecurring = !!trip.schedule_template_id;

    return (
      <View
        key={trip.trip_id}
        style={[s.card, {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderColor: isDraft
            ? '#F59E0B'
            : isDark ? '#374151' : '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 8,
          elevation: 3,
        }]}
      >
        {/* Daily renewal banner for DRAFT recurring trips */}
        {isDraft && isRecurring && (
          <View style={s.renewalBanner}>
            <MaterialCommunityIcons name="calendar-clock" size={18} color="#F59E0B" />
            <Text style={s.renewalText}>
              Today's recurring trip needs your confirmation before customers can book.
            </Text>
          </View>
        )}

        {/* Card Top */}
        <View style={s.cardTop}>
          <View style={s.serviceRow}>
            <Text style={{ fontSize: 18 }}>{SERVICE_EMOJI[trip.service_type] || '🚗'}</Text>
            <Text style={[s.serviceType, { color: theme.colors.textSecondary }]}>
              {trip.service_type}
            </Text>
            {isRecurring && (
              <MaterialCommunityIcons name="refresh" size={14} color={theme.colors.textSecondary} />
            )}
            {trip.women_only && (
              <MaterialCommunityIcons name="gender-female" size={14} color="#EC4899" />
            )}
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={s.statusText}>{trip.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={s.routeRow}>
          <Text style={s.routeCity}>{trip.pickup_city || 'Origin'}</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.textSecondary} />
          <Text style={s.routeCity}>{trip.destination_city || 'Destination'}</Text>
        </View>

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Feather name="clock" size={12} color={theme.colors.textSecondary} />
            <Text style={s.metaText}>{formatDeparture(trip.departure_time)}</Text>
          </View>
          <View style={s.metaItem}>
            <MaterialCommunityIcons name="account-group" size={12} color={theme.colors.textSecondary} />
            <Text style={s.metaText}>{trip.accepted_bookings} booked</Text>
          </View>
          <View style={s.metaItem}>
            <MaterialCommunityIcons name="currency-inr" size={12} color={theme.colors.textSecondary} />
            <Text style={s.metaText}>₹{trip.base_fare?.toFixed(0)}</Text>
          </View>
          {trip.distance_km && (
            <View style={s.metaItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={12} color={theme.colors.textSecondary} />
              <Text style={s.metaText}>{trip.distance_km} km</Text>
            </View>
          )}
        </View>

        {/* Seat occupancy bar */}
        {trip.total_seats > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[s.metaText, { fontSize: 11 }]}>
                {trip.occupied_seats}/{trip.total_seats} seats filled
              </Text>
              <Text style={[s.metaText, { fontSize: 11 }]}>
                {trip.available_seats} available
              </Text>
            </View>
            <View style={s.seatBar}>
              <View style={[s.seatFill, {
                width: `${occupiedPct}%`,
                backgroundColor: trip.is_full ? '#EF4444' : theme.colors.primary,
              }]} />
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View style={s.actionRow}>
          {isDraft ? (
            <>
              {/* Confirm Today */}
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleConfirmToday(trip.trip_id)}
                disabled={actionLoading === trip.trip_id + '_confirm'}
              >
                {actionLoading === trip.trip_id + '_confirm' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check-circle" size={14} color="#FFFFFF" />
                    <Text style={[s.actionBtnText, { color: '#FFFFFF' }]}>Confirm</Text>
                  </>
                )}
              </TouchableOpacity>
              {/* Cancel Today */}
              <TouchableOpacity
                style={[s.actionBtn, {
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: '#EF4444',
                }]}
                onPress={() => handleCancelToday(trip.trip_id)}
                disabled={actionLoading === trip.trip_id + '_cancel_today'}
              >
                {actionLoading === trip.trip_id + '_cancel_today' ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Skip Today</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* View Customers */}
              <TouchableOpacity
                style={[s.actionBtn, {
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: theme.colors.primary,
                }]}
                onPress={() => router.push(`/trip-detail/${trip.trip_id}`)}
              >
                <Feather name="users" size={14} color={theme.colors.primary} />
                <Text style={[s.actionBtnText, { color: theme.colors.primary }]}>
                  Customers
                </Text>
              </TouchableOpacity>

              {/* Cancel (only for published/active) */}
              {['published', 'active', 'draft'].includes(trip.status) && (
                <TouchableOpacity
                  style={[s.actionBtn, {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: '#EF4444',
                  }]}
                  onPress={() => handleCancelTrip(trip.trip_id)}
                  disabled={actionLoading === trip.trip_id + '_cancel'}
                >
                  {actionLoading === trip.trip_id + '_cancel' ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Cancel</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Trips</Text>
        <TouchableOpacity style={s.createBtn} onPress={() => router.push('/create-trip')}>
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={s.createBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
          {STATUS_TABS.map(tab => {
            const isActive = activeTab === tab;
            const color = tab === 'all' ? theme.colors.primary : (STATUS_COLOR[tab] || theme.colors.primary);
            return (
              <TouchableOpacity
                key={tab}
                style={[s.tab, {
                  backgroundColor: isActive ? color : 'transparent',
                  borderColor: color,
                }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[s.tabText, { color: isActive ? '#FFFFFF' : color }]}>
                  {tab === 'all' ? '📋 All' : tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Trip List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadTrips(); }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : trips.length === 0 ? (
          <View style={s.emptyState}>
            <MaterialCommunityIcons
              name="car-multiple"
              size={56}
              color={isDark ? '#374151' : '#D1D5DB'}
            />
            <Text style={s.emptyTitle}>No Trips Yet</Text>
            <Text style={s.emptyDesc}>
              Create your first intercity trip and let customers book seats on your route.
            </Text>
            <TouchableOpacity
              style={[s.createBtn, { marginTop: 8 }]}
              onPress={() => router.push('/create-trip')}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text style={s.createBtnText}>Create Trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          trips.map(renderTrip)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
