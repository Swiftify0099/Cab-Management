import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { api } from '../../src/api/client';
import { SupportService } from '../../src/services/supportService';

export default function NewTicketScreen() {
  const { theme, isDark } = useTheme();
  const params = useLocalSearchParams<{ initial_category?: string; initial_ride_id?: string }>();

  const [category, setCategory] = useState(params.initial_category || 'TRIPS');
  const [subcategory, setSubcategory] = useState('FARE_DISPUTE');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [selectedRideId, setSelectedRideId] = useState<string | null>(params.initial_ride_id || null);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: 'TRIPS', label: 'Trip Issue', subcats: ['FARE_DISPUTE', 'CANCELLATION_FEE', 'ROUTE_DEVIATION', 'PASSENGER_ISSUE', 'OTHER'] },
    { id: 'PAYMENTS', label: 'Payment / Fare', subcats: ['CASH_COLLECTION', 'MISSING_FARE', 'TOLL_DISPUTE', 'TIP_ISSUE', 'OTHER'] },
    { id: 'PAYOUT', label: 'Bank & Payout', subcats: ['INSTANT_WITHDRAWAL_DELAY', 'BANK_ACCOUNT_CHANGE', 'UPI_FAILURE', 'OTHER'] },
    { id: 'VEHICLE', label: 'Vehicle Issue', subcats: ['APPROVAL_DELAY', 'DOCUMENT_UPDATE', 'VEHICLE_REPLACEMENT', 'OTHER'] },
    { id: 'KYC', label: 'KYC & Documents', subcats: ['LICENCE_REJECTED', 'RC_REJECTED', 'VERIFICATION_PENDING', 'OTHER'] },
    { id: 'SAFETY', label: 'Safety Incident', subcats: ['PASSENGER_MISCONDUCT', 'ROAD_HAZARD', 'ACCIDENT', 'OTHER'] },
    { id: 'ACCOUNT', label: 'Account & Login', subcats: ['PHONE_CHANGE', 'OTP_ISSUE', 'APP_SETTINGS', 'OTHER'] },
  ];

  useEffect(() => {
    // Fetch recent trips to allow linking
    const fetchTrips = async () => {
      try {
        const res = await api.get('/trips/my-trips');
        const trips = res.data?.data || res.data || [];
        setRecentTrips(trips.slice(0, 5));
      } catch (e) {
        console.warn('[NewTicket] fetchTrips error:', e);
      }
    };
    fetchTrips();
  }, []);

  const currentCategoryObj = categories.find((c) => c.id === category) || categories[0];

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Missing Subject', 'Please enter a short subject for your ticket.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Description Required', 'Please provide at least 10 characters explaining your issue.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await SupportService.createTicket({
        category,
        subcategory,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        ride_id: selectedRideId,
      });

      if (res.success && res.ticket_id) {
        Alert.alert('Ticket Created', res.message || 'Our team will review and respond shortly.', [
          {
            text: 'Open Ticket',
            onPress: () => {
              router.replace({
                pathname: '/support/chat' as any,
                params: { ticket_id: res.ticket_id },
              });
            },
          },
        ]);
      } else {
        Alert.alert('Submission Failed', res.message || 'Could not raise ticket.');
      }
    } finally {
      setSubmitting(false);
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Raise Support Ticket</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Category Picker */}
        <Text style={[styles.label, { color: theme.colors.text }]}>1. Select Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.categoryChip,
                category === c.id
                  ? styles.categoryChipActive
                  : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => {
                setCategory(c.id);
                setSubcategory(c.subcats[0]);
              }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === c.id ? styles.categoryChipTextActive : { color: theme.colors.text },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subcategory */}
        <Text style={[styles.label, { color: theme.colors.text, marginTop: 14 }]}>2. Specific Issue Type</Text>
        <View style={styles.subcatWrap}>
          {currentCategoryObj.subcats.map((sc) => (
            <TouchableOpacity
              key={sc}
              style={[
                styles.subcatChip,
                subcategory === sc
                  ? styles.subcatChipActive
                  : { backgroundColor: isDark ? '#131B2E' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' },
              ]}
              onPress={() => setSubcategory(sc)}
            >
              <Text
                style={[
                  styles.subcatText,
                  subcategory === sc ? { color: '#6366F1', fontWeight: '800' } : { color: theme.colors.textSecondary },
                ]}
              >
                {sc.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Context Trip Selector (If TRIPS / PAYMENTS) */}
        {['TRIPS', 'PAYMENTS'].includes(category) && recentTrips.length > 0 && (
          <View style={styles.tripSection}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Attach Recent Trip (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {recentTrips.map((tr) => (
                <TouchableOpacity
                  key={tr.id}
                  style={[
                    styles.tripOptionCard,
                    selectedRideId === tr.id
                      ? styles.tripOptionCardActive
                      : { backgroundColor: isDark ? '#131B2E' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' },
                  ]}
                  onPress={() => setSelectedRideId(selectedRideId === tr.id ? null : tr.id)}
                >
                  <Text style={[styles.tripRoute, { color: theme.colors.text }]} numberOfLines={1}>
                    {tr.pickup_city || 'City'} → {tr.destination_city || 'Dest'}
                  </Text>
                  <Text style={[styles.tripMeta, { color: theme.colors.textSecondary }]}>
                    ₹{tr.base_fare} · {new Date(tr.departure_time || tr.created_at).toLocaleDateString('en-IN')}
                  </Text>
                  {selectedRideId === tr.id && (
                    <View style={styles.attachedPill}>
                      <Text style={styles.attachedPillText}>✓ ATTACHED</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Subject */}
        <Text style={[styles.label, { color: theme.colors.text, marginTop: 14 }]}>3. Subject</Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
              color: theme.colors.text,
            },
          ]}
          placeholder="Brief summary of the issue..."
          placeholderTextColor={theme.colors.textSecondary}
          value={subject}
          onChangeText={setSubject}
        />

        {/* Description */}
        <Text style={[styles.label, { color: theme.colors.text, marginTop: 14 }]}>4. Describe the Issue</Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
              color: theme.colors.text,
            },
          ]}
          placeholder="Please provide details (timestamps, amount, customer details if applicable)..."
          placeholderTextColor={theme.colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Priority Selector */}
        <Text style={[styles.label, { color: theme.colors.text, marginTop: 14 }]}>5. Priority Level</Text>
        <View style={styles.priorityRow}>
          {(['normal', 'high', 'urgent'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.priorityBtn,
                priority === p
                  ? { backgroundColor: p === 'urgent' ? '#EF4444' : p === 'high' ? '#F59E0B' : '#6366F1' }
                  : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => setPriority(p)}
            >
              <Text
                style={[
                  styles.priorityText,
                  priority === p ? { color: '#FFFFFF' } : { color: theme.colors.text },
                ]}
              >
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit Support Ticket</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: { fontSize: 16, fontWeight: '800' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  horizontalScroll: { marginBottom: 6 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#6366F1' },
  categoryChipText: { fontSize: 12, fontWeight: '700' },
  categoryChipTextActive: { color: '#FFFFFF' },
  subcatWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subcatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  subcatChipActive: { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  subcatText: { fontSize: 11, fontWeight: '600' },
  tripSection: { marginTop: 14 },
  tripOptionCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    width: 140,
  },
  tripOptionCardActive: { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.08)' },
  tripRoute: { fontSize: 12, fontWeight: '700' },
  tripMeta: { fontSize: 10, marginTop: 2 },
  attachedPill: { marginTop: 4 },
  attachedPillText: { fontSize: 9, fontWeight: '800', color: '#10B981' },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  textArea: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    minHeight: 90,
  },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityText: { fontSize: 11, fontWeight: '800' },
  submitBtn: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
