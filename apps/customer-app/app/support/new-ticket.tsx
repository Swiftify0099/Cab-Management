/**
 * Customer App — Create Service-Linked Support Ticket Screen
 * Route: /support/new-ticket
 * Feature 25: Polymorphic ticket creation linked to Rides, Parcels, Hotels, Transport, Rentals, Outstation, Airport.
 */
import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'

import { supportApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText,
  AppButton,
} from '../../src/components/ui'

const ISSUE_CATEGORIES = [
  { id: 'PAYMENT', label: 'Payment / Fare' },
  { id: 'RIDE', label: 'Ride / Driver' },
  { id: 'SAFETY', label: 'Safety / SOS' },
  { id: 'PARCEL', label: 'Parcel Delivery' },
  { id: 'HOTEL', label: 'Hotel Booking' },
  { id: 'TRANSPORT', label: 'Goods Transport' },
  { id: 'RENTAL', label: 'Hourly Rental' },
  { id: 'OUTSTATION', label: 'Outstation Trip' },
  { id: 'ACCOUNT', label: 'Account / Login' },
]

export default function NewSupportTicketScreen() {
  const { theme, isDark } = useTheme()
  const params = useLocalSearchParams()

  const [category, setCategory] = useState<string>((params.category as string) || 'RIDE')
  const [subject, setSubject] = useState<string>((params.subject as string) || '')
  const [description, setDescription] = useState<string>('')
  const [refType, setRefType] = useState<string>((params.ref_type as string) || '')
  const [refId, setRefId] = useState<string>((params.ref_id as string) || '')
  const [priority, setPriority] = useState<string>('normal')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!subject.trim() || subject.trim().length < 5) {
      Alert.alert('Incomplete Subject', 'Please enter a clear summary subject (min 5 characters).')
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Incomplete Description', 'Please provide detailed context about what happened (min 10 characters).')
      return
    }

    try {
      setSubmitting(true)
      const res = await supportApi.createTicket({
        category: category,
        subcategory: 'OTHER',
        subject: subject.trim(),
        description: description.trim(),
        reference_type: refType || undefined,
        reference_id: refId || undefined,
        priority: priority,
      })

      Alert.alert(
        'Ticket Created',
        `Ticket #${res.data?.data?.ticket_number || 'OPEN'} has been assigned to our support team. We will review and respond shortly.`,
        [
          {
            text: 'View My Tickets',
            onPress: () => router.replace('/support/tickets' as any),
          },
        ]
      )
    } catch (err: any) {
      Alert.alert('Submission Error', err.response?.data?.detail || 'Failed to create support ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="title" bold style={{ fontSize: 18 }}>
            Open Support Ticket
          </AppText>
          <AppText variant="caption" color="secondary">
            Get personalized assistance from our 24x7 team
          </AppText>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Linked Reference Banner */}
        {refId ? (
          <View style={[styles.linkedBanner, { backgroundColor: isDark ? '#1E293B' : '#F0F9FF', borderColor: theme.colors.primary }]}>
            <Ionicons name="link" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" style={{ color: theme.colors.primary }} bold>
                Linked to {refType || 'Order'} #{refId.slice(0, 10)}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ fontSize: 11 }}>
                Our support team will have immediate access to your order itinerary and fare record.
              </AppText>
            </View>
          </View>
        ) : null}

        {/* Issue Category Selector */}
        <AppText variant="caption" bold style={{ marginBottom: 8 }}>
          SELECT ISSUE CATEGORY
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {ISSUE_CATEGORIES.map((cat) => {
            const isSelected = category === cat.id
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: isSelected ? '#FFF' : theme.colors.textPrimary,
                  }}
                  bold={isSelected}
                >
                  {cat.label}
                </AppText>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Subject Input */}
        <AppText variant="caption" bold style={{ marginBottom: 4 }}>
          Subject / Brief Summary
        </AppText>
        <TextInput
          style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          placeholder="e.g. Overcharged on toll / Driver cancelled after arrival"
          placeholderTextColor="#94A3B8"
          value={subject}
          onChangeText={setSubject}
        />

        {/* Description Input */}
        <AppText variant="caption" bold style={{ marginTop: 14, marginBottom: 4 }}>
          Detailed Description
        </AppText>
        <TextInput
          style={[styles.textArea, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          placeholder="Please describe what happened in detail so we can resolve your issue as quickly as possible..."
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Priority Selector */}
        <AppText variant="caption" bold style={{ marginTop: 14, marginBottom: 8 }}>
          Severity / Priority
        </AppText>
        <View style={styles.priorityRow}>
          {[
            { id: 'low', label: 'Low', color: '#64748B' },
            { id: 'normal', label: 'Normal', color: '#0284C7' },
            { id: 'high', label: 'High', color: '#D97706' },
            { id: 'urgent', label: 'Urgent (Safety/SOS)', color: '#DC2626' },
          ].map((p) => {
            const isSelected = priority === p.id
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.priorityBtn,
                  {
                    backgroundColor: isSelected ? p.color + '20' : theme.colors.surface,
                    borderColor: isSelected ? p.color : theme.colors.border,
                  },
                ]}
                onPress={() => setPriority(p.id)}
              >
                <AppText variant="caption" style={{ color: isSelected ? p.color : theme.colors.textPrimary }} bold>
                  {p.label}
                </AppText>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Submit Button */}
        <View style={{ marginTop: 28 }}>
          <AppButton
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            size="lg"
          >
            {submitting ? 'Submitting...' : 'Submit Support Ticket'}
          </AppButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 14, padding: 4 },
  scrollArea: { flex: 1 },
  linkedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
})
