/**
 * Driver Safety Toolkit Modal — Feature 22 (Light & Dark Mode)
 * Comprehensive Safety Hub: Emergency SOS (press-and-hold), 112 dialer,
 * live trip sharing, trusted contacts, and incident reporting.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Share,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { DriverSafetyService } from '../../services/driverSafetyService'

interface Props {
  visible: boolean
  onClose: () => void
  rideId?: string
  driverLat?: number
  driverLng?: number
  onOpenTrustedContacts: () => void
  onOpenReportIncident: () => void
}

export const DriverSafetyToolkitModal: React.FC<Props> = ({
  visible,
  onClose,
  rideId,
  driverLat = 18.535,
  driverLng = 73.892,
  onOpenTrustedContacts,
  onOpenReportIncident,
}) => {
  const { isDark } = useTheme()
  const [sosTriggered, setSosTriggered] = useState(false)
  const [loadingShare, setLoadingShare] = useState(false)

  const handleTriggerSOS = async () => {
    if (!rideId) {
      Alert.alert('Emergency Action', 'Dialing Emergency Services (112)...')
      Linking.openURL('tel:112')
      return
    }

    try {
      const res = await DriverSafetyService.triggerSOS(rideId, driverLat, driverLng)
      setSosTriggered(true)
      Alert.alert(
        '🚨 EMERGENCY SOS ACTIVATED',
        'Your live GPS coordinates and ride context have been transmitted to the 24/7 Safety Command Center. Dialing 112 Police...',
        [
          { text: 'Cancel Call', style: 'cancel' },
          { text: 'Call 112 Police Now', onPress: () => Linking.openURL('tel:112') },
        ]
      )
    } catch (err: any) {
      Alert.alert('SOS Alert', 'Could not record SOS via internet. Dialing 112 directly...', [
        { text: 'Call 112', onPress: () => Linking.openURL('tel:112') },
      ])
    }
  }

  const handleShareTrip = async () => {
    if (!rideId) {
      Alert.alert('Trip Sharing', 'Live trip sharing is available during active rides.')
      return
    }

    setLoadingShare(true)
    try {
      const res = await DriverSafetyService.createLiveTripShare(rideId)
      await Share.share({
        message: `I'm driving on a trip. Track my live location securely: ${res.share_url}`,
        url: res.share_url,
      })
    } catch (err: any) {
      Alert.alert('Share Failed', err.message || 'Could not generate share link.')
    } finally {
      setLoadingShare(false)
    }
  }

  const handleCallSupport = () => {
    Linking.openURL('tel:+918000456789')
  }

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const bgItem = isDark ? '#0F172A' : '#F8FAFC'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderColor = isDark ? '#334155' : '#E2E8F0'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: bgCard }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.shieldIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={[styles.title, { color: textPrimary }]}>Safety Toolkit</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  24/7 Protection & Emergency Assistance
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Primary SOS Action */}
            <TouchableOpacity
              style={[
                styles.sosCard,
                sosTriggered && { backgroundColor: '#7F1D1D', borderColor: '#DC2626' },
              ]}
              onPress={handleTriggerSOS}
              activeOpacity={0.8}
            >
              <View style={styles.sosInner}>
                <Ionicons name="warning" size={32} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sosTitle}>
                    {sosTriggered ? '🚨 EMERGENCY SOS ACTIVE' : '🚨 EMERGENCY SOS'}
                  </Text>
                  <Text style={styles.sosSub}>
                    Tap to broadcast live GPS to Safety Command Center & dial Police (112)
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Quick Emergency Call Options */}
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={[styles.gridCard, { backgroundColor: bgItem, borderColor }]}
                onPress={() => Linking.openURL('tel:112')}
              >
                <Ionicons name="call" size={22} color="#DC2626" />
                <Text style={[styles.gridTitle, { color: textPrimary }]}>112 Police</Text>
                <Text style={[styles.gridSub, { color: textSecondary }]}>National Emergency</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gridCard, { backgroundColor: bgItem, borderColor }]}
                onPress={() => Linking.openURL('tel:108')}
              >
                <MaterialCommunityIcons name="ambulance" size={24} color="#EA580C" />
                <Text style={[styles.gridTitle, { color: textPrimary }]}>108 Ambulance</Text>
                <Text style={[styles.gridSub, { color: textSecondary }]}>Medical Response</Text>
              </TouchableOpacity>
            </View>

            {/* Safety Options List */}
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>SAFETY TOOLS</Text>

            <TouchableOpacity
              style={[styles.toolItem, { backgroundColor: bgItem, borderColor }]}
              onPress={handleShareTrip}
              disabled={loadingShare}
            >
              <View style={styles.toolLeft}>
                <View style={[styles.toolIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Feather name="share-2" size={18} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toolTitle, { color: textPrimary }]}>Share Live Trip</Text>
                  <Text style={[styles.toolSub, { color: textSecondary }]}>
                    Send real-time GPS tracking link to friends or family
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolItem, { backgroundColor: bgItem, borderColor }]}
              onPress={() => {
                onClose()
                onOpenTrustedContacts()
              }}
            >
              <View style={styles.toolLeft}>
                <View style={[styles.toolIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="people" size={18} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toolTitle, { color: textPrimary }]}>Trusted Contacts</Text>
                  <Text style={[styles.toolSub, { color: textSecondary }]}>
                    Manage emergency numbers for auto-alerting
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolItem, { backgroundColor: bgItem, borderColor }]}
              onPress={() => {
                onClose()
                onOpenReportIncident()
              }}
            >
              <View style={styles.toolLeft}>
                <View style={[styles.toolIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="alert-triangle" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toolTitle, { color: textPrimary }]}>Report Safety Incident</Text>
                  <Text style={[styles.toolSub, { color: textSecondary }]}>
                    Unsafe passenger, accident, road hazard, or vehicle issue
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolItem, { backgroundColor: bgItem, borderColor }]}
              onPress={handleCallSupport}
            >
              <View style={styles.toolLeft}>
                <View style={[styles.toolIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="headset" size={18} color="#9333EA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toolTitle, { color: textPrimary }]}>24/7 Driver Support</Text>
                  <Text style={[styles.toolSub, { color: textSecondary }]}>
                    Direct line to safety operations center
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={textSecondary} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  shieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  sosCard: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#B91C1C',
  },
  sosInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sosTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sosSub: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  gridSub: {
    fontSize: 11,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toolSub: {
    fontSize: 11,
    marginTop: 1,
  },
})
