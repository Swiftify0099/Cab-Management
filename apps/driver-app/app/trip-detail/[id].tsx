/**
 * Driver: Trip Detail Screen — Booked Customers List
 * ====================================================
 * Shows all accepted customers for a driver's trip.
 * Route: /trip-detail/[id]
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { api } from '../../src/api/client';

interface Customer {
  booking_id: string;
  customer_name: string;
  seat_count: number;
  window_seat: boolean;
  has_parcel: boolean;
  pickup_address: string;
  drop_address: string;
  status: string;
  total_fare: number;
}

const BOOKING_STATUS_COLOR: Record<string, string> = {
  driver_accepted: '#10B981',
  confirmed:       '#3B82F6',
  trip_started:    '#8B5CF6',
  completed:       '#6B7280',
  cancelled:       '#EF4444',
};

export default function TripDetailScreen() {
  const { theme, isDark } = useTheme();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalFare, setTotalFare] = useState(0);
  const [totalSeats, setTotalSeats] = useState(0);

  const loadCustomers = async () => {
    try {
      const res = await api.get(`/matching/trips/${tripId}/customers`);
      const data: Customer[] = res.data?.data || [];
      setCustomers(data);
      setTotalFare(data.reduce((sum, c) => sum + (c.total_fare || 0), 0));
      setTotalSeats(data.reduce((sum, c) => sum + (c.seat_count || 0), 0));
    } catch (err: any) {
      console.warn('[TripDetail] Load error:', err?.response?.data || err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (tripId) loadCustomers();
  }, [tripId]);

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    summaryRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 16,
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '800',
      marginTop: 4,
    },
    summaryLabel: {
      fontSize: 12,
      marginTop: 2,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    card: {
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    customerName: {
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    metaChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    addressRow: {
      gap: 4,
    },
    addressLine: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    addressText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 17,
    },
    fareText: {
      fontSize: 15,
      fontWeight: '700',
      marginTop: 8,
    },
    emptyState: {
      alignItems: 'center',
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

  const renderCustomer = (c: Customer) => {
    const statusColor = BOOKING_STATUS_COLOR[c.status] || '#6B7280';
    return (
      <View
        key={c.booking_id}
        style={[s.card, {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderColor: isDark ? '#374151' : '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 6,
          elevation: 2,
        }]}
      >
        {/* Top Row */}
        <View style={s.cardTop}>
          <Text style={[s.customerName, { color: theme.colors.text }]} numberOfLines={1}>
            👤 {c.customer_name}
          </Text>
          <View style={[s.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={s.statusText}>{c.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Chips */}
        <View style={s.metaRow}>
          <View style={s.metaChip}>
            <MaterialCommunityIcons name="seat" size={12} color={theme.colors.textSecondary} />
            <Text style={s.metaChipText}>{c.seat_count} seat{c.seat_count !== 1 ? 's' : ''}</Text>
          </View>
          {c.window_seat && (
            <View style={s.metaChip}>
              <MaterialCommunityIcons name="window-open" size={12} color="#3B82F6" />
              <Text style={[s.metaChipText, { color: '#3B82F6' }]}>Window</Text>
            </View>
          )}
          {c.has_parcel && (
            <View style={s.metaChip}>
              <MaterialCommunityIcons name="package-variant" size={12} color="#F59E0B" />
              <Text style={[s.metaChipText, { color: '#F59E0B' }]}>Parcel</Text>
            </View>
          )}
        </View>

        {/* Addresses */}
        {c.pickup_address && (
          <View style={s.addressRow}>
            <View style={s.addressLine}>
              <MaterialCommunityIcons name="map-marker" size={12} color="#10B981" />
              <Text style={s.addressText} numberOfLines={2}>{c.pickup_address}</Text>
            </View>
            {c.drop_address && (
              <View style={s.addressLine}>
                <MaterialCommunityIcons name="map-marker-check" size={12} color="#EF4444" />
                <Text style={s.addressText} numberOfLines={2}>{c.drop_address}</Text>
              </View>
            )}
          </View>
        )}

        {/* Fare */}
        <Text style={[s.fareText, { color: theme.colors.primary }]}>
          ₹{c.total_fare?.toFixed(0)}
        </Text>
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
        <Text style={s.headerTitle}>Trip Passengers</Text>
      </View>

      {/* Summary */}
      {!loading && customers.length > 0 && (
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, {
            backgroundColor: isDark ? '#1F2937' : '#F0FDF4',
            borderColor: '#10B981',
          }]}>
            <MaterialCommunityIcons name="account-group" size={20} color="#10B981" />
            <Text style={[s.summaryValue, { color: '#10B981' }]}>{customers.length}</Text>
            <Text style={[s.summaryLabel, { color: '#10B981' }]}>Customers</Text>
          </View>
          <View style={[s.summaryCard, {
            backgroundColor: isDark ? '#1F2937' : '#EFF6FF',
            borderColor: '#3B82F6',
          }]}>
            <MaterialCommunityIcons name="seat" size={20} color="#3B82F6" />
            <Text style={[s.summaryValue, { color: '#3B82F6' }]}>{totalSeats}</Text>
            <Text style={[s.summaryLabel, { color: '#3B82F6' }]}>Total Seats</Text>
          </View>
          <View style={[s.summaryCard, {
            backgroundColor: isDark ? '#1F2937' : '#FEFCE8',
            borderColor: '#F59E0B',
          }]}>
            <MaterialCommunityIcons name="currency-inr" size={20} color="#F59E0B" />
            <Text style={[s.summaryValue, { color: '#F59E0B' }]}>₹{totalFare.toFixed(0)}</Text>
            <Text style={[s.summaryLabel, { color: '#F59E0B' }]}>Total Fare</Text>
          </View>
        </View>
      )}

      {/* Customer List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadCustomers(); }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : customers.length === 0 ? (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="account-off" size={56} color={isDark ? '#374151' : '#D1D5DB'} />
            <Text style={s.emptyTitle}>No Passengers Yet</Text>
            <Text style={s.emptyDesc}>
              Once customers book seats on your trip, they'll appear here.
            </Text>
          </View>
        ) : (
          customers.map(renderCustomer)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
