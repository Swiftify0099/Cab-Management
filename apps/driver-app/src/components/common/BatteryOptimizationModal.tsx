import React from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { BatteryOptimizationService } from '../../services/batteryOptimizationService'

interface BatteryOptimizationModalProps {
  visible: boolean
  onDismiss: () => void
  onConfigured?: () => void
}

export default function BatteryOptimizationModal({
  visible,
  onDismiss,
  onConfigured,
}: BatteryOptimizationModalProps) {
  const handleBatteryClick = async () => {
    await BatteryOptimizationService.requestIgnoreBatteryOptimization()
  }

  const handleNotificationClick = async () => {
    await BatteryOptimizationService.openNotificationChannelSettings('ride-requests')
  }

  const handleOverlayClick = async () => {
    await BatteryOptimizationService.openOverlaySettings()
  }

  const handleLocationClick = async () => {
    await BatteryOptimizationService.openLocationSettings()
  }

  const handleDismiss = async () => {
    await BatteryOptimizationService.setConfigured(true)
    onConfigured?.()
    onDismiss()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="shield-check" size={28} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.title}>Essential Background Permissions</Text>
              <Text style={styles.subtitle}>अखंड राईड रिक्वेस्ट्स मिळण्यासाठी आवश्यक सेटिंग्ज</Text>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.introText}>
              To receive loud ride alerts even when your phone is locked or you are using Google Maps, enable these 3 Android system permissions:
            </Text>

            {/* Step 1: Battery Unrestricted */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#10B98120' }]}>
                  <MaterialCommunityIcons name="battery-off" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>1. Set Battery to "Unrestricted"</Text>
                  <Text style={styles.stepSub}>बॅटरी सेव्हर बंद करा (Unrestricted)</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>
                Prevents Android from putting the app to sleep in the background.
              </Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: '#10B981' }]}
                onPress={handleBatteryClick}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="battery-charging-high" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.stepBtnText}>Set Battery to Unrestricted</Text>
              </TouchableOpacity>
            </View>

            {/* Step 2: Notification & DND Override */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#F59E0B20' }]}>
                  <MaterialCommunityIcons name="bell-ring" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>2. Sound & DND Override</Text>
                  <Text style={styles.stepSub}>आवाज व DND ओव्हरराइड सक्षम करा</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>
                Ensures loud siren ringing and vibration play even if phone is in Silent/Do Not Disturb mode.
              </Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: '#F59E0B' }]}
                onPress={handleNotificationClick}
                activeOpacity={0.85}
              >
                <Feather name="bell" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.stepBtnText}>Configure Sound & DND Priority</Text>
              </TouchableOpacity>
            </View>

            {/* Step 3: Draw over other apps */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#8B5CF620' }]}>
                  <MaterialCommunityIcons name="layers-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>3. Display Over Other Apps</Text>
                  <Text style={styles.stepSub}>इतर ॲप्सवर पॉप-अप दाखवा (Over Google Maps)</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>
                Instantly pops up the incoming ride dispatch banner over Google Maps or other navigation apps.
              </Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={handleOverlayClick}
                activeOpacity={0.85}
              >
                <Feather name="external-link" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.stepBtnText}>Enable Display Over Apps</Text>
              </TouchableOpacity>
            </View>

            {/* Step 4: Background Location */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="location" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>4. Location: "Allow all the time"</Text>
                  <Text style={styles.stepSub}>स्थान परवानगी "सर्व वेळ" निवडा</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>
                Maintains your live radar position so the backend can dispatch nearby rides.
              </Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: '#3B82F6' }]}
                onPress={handleLocationClick}
                activeOpacity={0.85}
              >
                <Ionicons name="location-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.stepBtnText}>Open Location Permission</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Done Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleDismiss}
              activeOpacity={0.85}
            >
              <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.doneBtnText}>I've Configured Permissions / Continue Online</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.80)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  introText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 19,
    marginBottom: 14,
  },
  stepCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepNumberBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  stepDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 10,
  },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  stepBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  doneBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})
