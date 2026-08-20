/**
 * PickupAssistanceSheet — Feature 8: Pickup Problem Resolution
 * Structured workflows for: Can't find customer, Wrong pickup point, and Location request.
 */
import React from 'react'
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { CommunicationService } from '../../services/communicationService'
import { PickupIssueType } from '../../types/communication'

interface PickupAssistanceSheetProps {
  visible: boolean
  isDark: boolean
  rideId: string
  onClose: () => void
  onOpenCall: () => void
  onOpenChat: () => void
}

export function PickupAssistanceSheet({
  visible,
  isDark,
  rideId,
  onClose,
  onOpenCall,
  onOpenChat,
}: PickupAssistanceSheetProps) {
  const handleSelectIssue = async (type: PickupIssueType) => {
    try {
      if (type === 'cant_find_customer') {
        await CommunicationService.reportPickupIssue(rideId, 'cant_find_customer', 'Driver near pickup spot')
        Alert.alert(
          "Can't Find Customer",
          'We have alerted the passenger. Would you like to call or send a quick chat message?',
          [
            { text: 'Send Message', onPress: () => { onClose(); onOpenChat() } },
            { text: 'Call Passenger', onPress: () => { onClose(); onOpenCall() } },
            { text: 'Dismiss', style: 'cancel', onPress: onClose },
          ]
        )
      } else if (type === 'wrong_location') {
        await CommunicationService.reportPickupIssue(rideId, 'wrong_location', 'Landmark mismatch reported')
        Alert.alert('Pickup Mismatch Reported', 'Passenger notified to verify landmark & meetup point.')
        onClose()
      } else if (type === 'location_requested') {
        await CommunicationService.sendMessage(
          rideId,
          'Please share your exact live landmark/location.',
          'location_share'
        )
        Alert.alert('Location Requested', 'A location request message was sent to the passenger.')
        onClose()
      }
    } catch (err: any) {
      Alert.alert('Assistance Error', err.message || 'Could not log assistance.')
    }
  }

  const bgCard = isDark ? '#0F172A' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgCard }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: textPrimary }]}>Pickup Assistance</Text>
              <Text style={[styles.subTitle, { color: textSecondary }]}>Select an issue to resolve pickup confusion</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {/* Option 1: Can't Find Customer */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
              onPress={() => handleSelectIssue('cant_find_customer')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#E0F2FE' }]}>
                <MaterialCommunityIcons name="account-search-outline" size={24} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: textPrimary }]}>I cannot find the passenger</Text>
                <Text style={[styles.optionDesc, { color: textSecondary }]}>
                  Alerts passenger and suggests immediate masked call or chat.
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={textSecondary} />
            </TouchableOpacity>

            {/* Option 2: Wrong Pickup Location */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
              onPress={() => handleSelectIssue('wrong_location')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="map-marker-question-outline" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: textPrimary }]}>Pickup location seems incorrect</Text>
                <Text style={[styles.optionDesc, { color: textSecondary }]}>
                  Reports landmark confusion so passenger can clarify exact spot.
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={textSecondary} />
            </TouchableOpacity>

            {/* Option 3: Request Location */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
              onPress={() => handleSelectIssue('location_requested')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: textPrimary }]}>Request exact live location</Text>
                <Text style={[styles.optionDesc, { color: textSecondary }]}>
                  Sends a direct prompt in chat requesting passenger GPS pin.
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
})
