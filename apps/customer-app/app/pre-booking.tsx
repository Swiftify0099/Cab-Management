/**
 * Pre-Booking Screen — Customer
 *
 * Allows a customer to register travel intent BEFORE any driver has created
 * a matching trip. Backend stores it in pending_bookings and instantly
 * reverse-scans published trips.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, ActivityIndicator, Alert, StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { profileApi, bookingApi } from '../src/api/client';
import DateTimePicker from '@react-native-community/datetimepicker';

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

const ADDRESS_ICONS: Record<string, any> = {
  home: 'home',
  work: 'briefcase',
  office: 'monitor',
  trip: 'map-pin',
  holiday: 'sun',
};

export default function PreBookingScreen() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Form state
  const [pickupId, setPickupId] = useState<string>('');
  const [destId, setDestId] = useState<string>('');
  const [travelDate, setTravelDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fromTime, setFromTime] = useState('08:00');
  const [toTime, setToTime] = useState('20:00');
  const [seats, setSeats] = useState(1);
  const [parcel, setParcel] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await profileApi.getAddresses();
      const list = res.data?.data || [];
      setAddresses(list);
      // Auto-select default as pickup
      const def = list.find((a: SavedAddress) => a.is_default);
      if (def) setPickupId(def.id);
      else if (list.length > 0) setPickupId(list[0].id);
    } catch (e) {
      // ignore
    } finally {
      setLoadingAddresses(false);
    }
  };

  const getAddressById = (id: string) => addresses.find(a => a.id === id);

  const validate = (): string | null => {
    if (!pickupId) return 'Please select a pickup address';
    if (!destId) return 'Please select a destination address';
    if (pickupId === destId) return 'Pickup and destination cannot be the same';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { Alert.alert('Incomplete', err); return; }

    const p = getAddressById(pickupId);
    const d = getAddressById(destId);
    if (!p || !d) return;

    setLoading(true);
    try {
      const dateStr = travelDate.toISOString().split('T')[0];
      const res = await bookingApi.createPendingBooking({
        pickup_address: p.address,
        pickup_lat: p.latitude,
        pickup_lng: p.longitude,
        destination_address: d.address,
        destination_lat: d.latitude,
        destination_lng: d.longitude,
        travel_date: dateStr,
        from_time: fromTime,
        to_time: toTime,
        seats_required: seats,
        parcel,
        women_only: womenOnly,
        promo_code: appliedPromo ? appliedPromo.code : undefined,
      });

      setSubmittedId(res.data?.data?.id || null);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Submission Failed', e?.response?.data?.detail || 'Please check your details');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />
        <View style={styles.successContainer}>
          <LinearGradient colors={['rgba(99,102,241,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#6366F1" />
          </View>
          <Text style={styles.successTitle}>Booking Request Sent!</Text>
          <Text style={styles.successSub}>
            We'll notify you instantly when a driver matches your route.{'\n'}
            Keep the app open for real-time alerts.
          </Text>
          {womenOnly && (
            <View style={styles.womenBadge}>
              <Text style={styles.womenBadgeText}>👩 Women-only filter active</Text>
            </View>
          )}

          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.waitBtn}
              onPress={() => router.push(`/matching-waiting?bookingId=&pendingBookingId=${submittedId}` as any)}
            >
              <LinearGradient colors={['#6366F1','#8B5CF6']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.waitBtnGrad}>
                <Feather name="bell" size={18} color="#fff" />
                <Text style={styles.waitBtnText}>Wait for Notification</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)/home' as any)}>
              <Text style={styles.homeBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const renderAddressSelector = (title: string, selectedId: string, onSelect: (id: string) => void, excludeId?: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {loadingAddresses ? (
        <ActivityIndicator color="#6366F1" style={{ marginVertical: 20 }} />
      ) : addresses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No saved addresses</Text>
          <TouchableOpacity onPress={() => router.push('/auth/address-setup' as any)}>
            <Text style={styles.linkText}>+ Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, paddingBottom: 5 }}>
          {addresses.map(a => {
            if (a.id === excludeId) return null;
            const isSelected = selectedId === a.id;
            const iconName = ADDRESS_ICONS[a.label.toLowerCase()] || 'map-pin';
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => onSelect(a.id)}
                style={[styles.addressCard, isSelected && styles.addressCardSelected]}
              >
                <Feather name={iconName} size={18} color={isSelected ? '#fff' : '#94A3B8'} style={{ marginBottom: 6 }} />
                <Text style={[styles.addressCardLabel, isSelected && { color: '#fff' }]}>
                  {a.label.charAt(0).toUpperCase() + a.label.slice(1)}
                </Text>
                <Text style={[styles.addressCardText, isSelected && { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
                  {a.address}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Where to?</Text>
        <TouchableOpacity onPress={() => router.push('/auth/address-setup' as any)} style={styles.backBtn}>
          <Feather name="map-pin" size={18} color="#A78BFA" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {renderAddressSelector('Pickup Point', pickupId, setPickupId)}
        {renderAddressSelector('Destination', destId, setDestId, pickupId)}

        {/* Travel Window */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel Window</Text>
          <TouchableOpacity style={styles.inputBox} onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={18} color="#6366F1" />
            <Text style={styles.inputText}>{travelDate.toDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={travelDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(e, date) => {
                setShowDatePicker(false);
                if (date) setTravelDate(date);
              }}
            />
          )}

          <View style={styles.timeRow}>
            <View style={[styles.inputBox, { flex: 1 }]}>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Earliest</Text>
              <Text style={styles.inputText}>08:00 AM</Text>
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputBox, { flex: 1 }]}>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Latest</Text>
              <Text style={styles.inputText}>08:00 PM</Text>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.seatRow}>
            <Text style={styles.seatLabel}>Seats Required</Text>
            <View style={styles.seatCounter}>
              <TouchableOpacity style={styles.seatBtn} onPress={() => setSeats(s => Math.max(1, s - 1))}>
                <Feather name="minus" size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.seatNum}>{seats}</Text>
              <TouchableOpacity style={styles.seatBtn} onPress={() => setSeats(s => Math.min(10, s + 1))}>
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>📦 Send a Parcel</Text>
              <Text style={styles.toggleSub}>Select if you only want to send items</Text>
            </View>
            <Switch value={parcel} onValueChange={setParcel} trackColor={{ false: '#374151', true: '#6366F1' }} thumbColor="#fff" />
          </View>

          <View style={[styles.toggleRow, womenOnly && styles.toggleRowActive]}>
            <View>
              <Text style={styles.toggleLabel}>👩 Women-Only Ride</Text>
              <Text style={styles.toggleSub}>Match only with female drivers</Text>
            </View>
            <Switch value={womenOnly} onValueChange={setWomenOnly} trackColor={{ false: '#374151', true: '#EC4899' }} thumbColor="#fff" />
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotions</Text>
          <View style={styles.promoRow}>
            <View style={styles.promoInputWrapper}>
              <Feather name="tag" size={16} color="#94A3B8" />
              <TextInput
                style={styles.promoInput}
                placeholder="Enter Promo Code"
                placeholderTextColor="#94A3B8"
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
                editable={!appliedPromo}
              />
            </View>
            {appliedPromo ? (
              <TouchableOpacity 
                style={styles.promoRemoveBtn} 
                onPress={() => { setAppliedPromo(null); setPromoCode(''); }}
              >
                <Feather name="x" size={16} color="#EF4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.promoApplyBtn, !promoCode.trim() && { opacity: 0.5 }]} 
                onPress={() => {
                  if (promoCode.trim().length > 0) {
                    // For now just simulate an applied promo visually since fare isn't calculated till checkout
                    setAppliedPromo({ code: promoCode.trim().toUpperCase() });
                    Alert.alert('Promo Applied', 'Promo code will be applied at checkout.');
                  }
                }}
                disabled={!promoCode.trim() || applyingPromo}
              >
                {applyingPromo ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.promoApplyText}>Apply</Text>}
              </TouchableOpacity>
            )}
          </View>
          {appliedPromo && (
            <Text style={styles.promoSuccessText}>
              Promo code {appliedPromo.code} applied!
            </Text>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Request Ride</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#0A0F1E' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  form:            { padding: 20, paddingBottom: 48 },

  section:         { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  sectionTitle:    { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 12 },

  emptyState:      { alignItems: 'center', paddingVertical: 16 },
  emptyText:       { color: '#94A3B8', fontSize: 14, marginBottom: 8 },
  linkText:        { color: '#6366F1', fontSize: 14, fontWeight: '600' },

  addressCard:     { width: 140, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, marginRight: 12, borderWidth: 1, borderColor: 'transparent' },
  addressCardSelected: { backgroundColor: '#6366F1', borderColor: '#8B5CF6' },
  addressCardLabel:{ color: '#94A3B8', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  addressCardText: { color: '#64748B', fontSize: 12 },

  inputBox:        { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 12 },
  inputText:       { color: '#fff', fontSize: 15, marginLeft: 10, fontWeight: '500' },
  timeRow:         { flexDirection: 'row' },

  seatRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seatLabel:       { color: '#fff', fontSize: 14, fontWeight: '600' },
  seatCounter:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12 },
  seatBtn:         { padding: 10, paddingHorizontal: 14 },
  seatNum:         { color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 16 },

  toggleRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  toggleRowActive: { borderRadius: 12, backgroundColor: 'rgba(236,72,153,0.07)', paddingHorizontal: 8, marginHorizontal: -8 },
  toggleLabel:     { color: '#fff', fontSize: 14, fontWeight: '600' },
  toggleSub:       { color: '#6B7280', fontSize: 12, marginTop: 2 },

  promoRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoInputWrapper:{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  promoInput:      { flex: 1, color: '#fff', fontSize: 14, marginLeft: 8, height: '100%' },
  promoApplyBtn:   { backgroundColor: '#6366F1', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  promoApplyText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  promoRemoveBtn:  { backgroundColor: 'rgba(239,68,68,0.1)', height: 48, width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  promoSuccessText:{ color: '#34D399', fontSize: 12, marginTop: 8 },

  submitBtn:       { borderRadius: 18, overflow: 'hidden', marginTop: 10 },
  submitGrad:      { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  submitText:      { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon:      { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle:     { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  successSub:       { color: '#9CA3AF', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  womenBadge:       { backgroundColor: 'rgba(244,114,182,0.15)', borderRadius: 12, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(244,114,182,0.3)' },
  womenBadgeText:   { color: '#F472B6', fontSize: 13, textAlign: 'center' },
  successActions:   { width: '100%', gap: 12 },
  waitBtn:          { borderRadius: 16, overflow: 'hidden' },
  waitBtnGrad:      { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  homeBtn:          { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  homeBtnText:      { color: '#9CA3AF', fontSize: 15 },
});
