/**
 * Feature 9: Central Safety Toolkit Sheet
 * Provides high-priority access to Emergency SOS, Share Live Trip, Trusted Contacts,
 * Direct 112 Call, Masked Driver Call, and Incident Reporting.
 */
import React from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Platform,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from '../../i18n'
import { AppText, AppBadge } from '../ui'

interface SafetyToolkitSheetProps {
  visible: boolean
  onClose: () => void
  onOpenSOS: () => void
  onOpenShareTrip: () => void
  onOpenTrustedContacts: () => void
  onOpenReportIssue: () => void
  onMaskedCall: () => void
  rideId?: string
  driverName?: string
}

export function SafetyToolkitSheet({
  visible,
  onClose,
  onOpenSOS,
  onOpenShareTrip,
  onOpenTrustedContacts,
  onOpenReportIssue,
  onMaskedCall,
  rideId,
  driverName = 'Driver Partner',
}: SafetyToolkitSheetProps) {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const handleCall112 = () => {
    Linking.openURL('tel:112').catch(() => {})
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={[styles.sheet, { backgroundColor: isDark ? theme.colors.card : '#FFFFFF' }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.shieldIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              </View>
              <View style={styles.headerTextCol}>
                <AppText variant="h3" style={styles.headerTitle}>Safety Toolkit</AppText>
                <AppText variant="caption" color="secondary">Active Protection & 24/7 Response</AppText>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* 1. EMERGENCY SOS HERO BANNER */}
            <TouchableOpacity
              style={[styles.sosHeroCard, { backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2', borderColor: '#EF4444' }]}
              activeOpacity={0.88}
              onPress={() => {
                onClose()
                onOpenSOS()
              }}
            >
              <View style={styles.sosLeft}>
                <View style={styles.sosIconCircle}>
                  <MaterialCommunityIcons name="alarm-light" size={26} color="#FFFFFF" />
                </View>
                <View style={styles.sosTextCol}>
                  <View style={styles.sosBadgeRow}>
                    <AppText style={styles.sosHeroTitle}>Emergency SOS</AppText>
                    <AppBadge label="24/7 RESPONSE" variant="error" size="sm" />
                  </View>
                  <AppText style={[styles.sosHeroSub, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                    Press & hold 3s to alert Safety Ops & 112 Police
                  </AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#EF4444" />
            </TouchableOpacity>

            {/* 2. SAFETY ACTION GRID */}
            <AppText variant="label" color="secondary" style={styles.sectionHeading}>
              SAFETY TOOLS & ASSISTANCE
            </AppText>

            {/* Share My Trip */}
            <TouchableOpacity
              style={[styles.actionRow, { backgroundColor: isDark ? theme.colors.surface : '#F8FAFC' }]}
              onPress={() => {
                onClose()
                onOpenShareTrip()
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                <Feather name="share-2" size={18} color="#3B82F6" />
              </View>
              <View style={styles.actionTextCol}>
                <AppText variant="body" bold style={styles.actionTitle}>Share Live Trip</AppText>
                <AppText variant="caption" color="secondary">Send live tracking link to family or friends</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Trusted Contacts */}
            <TouchableOpacity
              style={[styles.actionRow, { backgroundColor: isDark ? theme.colors.surface : '#F8FAFC' }]}
              onPress={() => {
                onClose()
                onOpenTrustedContacts()
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF' }]}>
                <Feather name="users" size={18} color="#A855F7" />
              </View>
              <View style={styles.actionTextCol}>
                <AppText variant="body" bold style={styles.actionTitle}>Trusted Emergency Contacts</AppText>
                <AppText variant="caption" color="secondary">Manage contacts auto-notified during emergencies</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Call Police (112) */}
            <TouchableOpacity
              style={[styles.actionRow, { backgroundColor: isDark ? theme.colors.surface : '#F8FAFC' }]}
              onPress={handleCall112}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                <Feather name="phone-call" size={18} color="#EF4444" />
              </View>
              <View style={styles.actionTextCol}>
                <AppText variant="body" bold style={styles.actionTitle}>Call Police Dispatch (112)</AppText>
                <AppText variant="caption" color="secondary">Immediate direct dial to emergency helpline</AppText>
              </View>
              <AppBadge label="112" variant="error" size="sm" />
            </TouchableOpacity>

            {/* Masked Driver Call */}
            <TouchableOpacity
              style={[styles.actionRow, { backgroundColor: isDark ? theme.colors.surface : '#F8FAFC' }]}
              onPress={() => {
                onClose()
                onMaskedCall()
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                <Feather name="shield" size={18} color="#10B981" />
              </View>
              <View style={styles.actionTextCol}>
                <AppText variant="body" bold style={styles.actionTitle}>Private Masked Call</AppText>
                <AppText variant="caption" color="secondary">Call {driverName} with your phone number protected</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Report Safety Concern */}
            <TouchableOpacity
              style={[styles.actionRow, { backgroundColor: isDark ? theme.colors.surface : '#F8FAFC' }]}
              onPress={() => {
                onClose()
                onOpenReportIssue()
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' }]}>
                <Feather name="alert-triangle" size={18} color="#F59E0B" />
              </View>
              <View style={styles.actionTextCol}>
                <AppText variant="body" bold style={styles.actionTitle}>Report a Safety Concern</AppText>
                <AppText variant="caption" color="secondary">Unsafe driving, route deviation, harassment</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Safety Guarantee Footer */}
            <View style={styles.safetyFooter}>
              <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
              <AppText variant="caption" color="muted">
                All trips are monitored by 24/7 Safety Command Center
              </AppText>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextCol: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScroll: {
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  sosHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  sosLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sosIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sosTextCol: {
    flex: 1,
  },
  sosBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sosHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
  sosHeroSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  safetyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
})
