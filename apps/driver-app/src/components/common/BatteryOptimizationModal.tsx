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
  const handleOpenBatterySettings = async () => {
    await BatteryOptimizationService.requestIgnoreBatteryOptimization()
    await BatteryOptimizationService.setConfigured(true)
    onConfigured?.()
  }

  const handleDismiss = async () => {
    await BatteryOptimizationService.setConfigured(true)
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
              <MaterialCommunityIcons name="battery-charging-high" size={28} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.title}>Background & Battery Setup</Text>
              <Text style={styles.subtitle}>अखंड राईड रिक्वेस्ट्स मिळण्यासाठी आवश्यक सेटिंग्ज</Text>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.introText}>
              When your phone is locked or you are using Google Maps, Android pauses apps to save battery. Follow these 2 quick steps:
            </Text>

            {/* Step 1: Battery Unrestricted */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#10B98120' }]}>
                  <MaterialCommunityIcons name="battery-off" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>1. Set Battery to "Unrestricted"</Text>
                  <Text style={styles.stepSub}>बॅटरी सेव्हर बंद (Unrestricted) करा</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>
                Prevents Android from putting the app to sleep. Go to{' '}
                <Text style={styles.boldText}>App Settings ➔ Battery ➔ Select "Unrestricted"</Text>.
              </Text>
            </View>

            {/* Step 2: Background Location */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="location" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>2. Allow Location "All the time"</Text>
                  <Text style={styles.stepSub}>स्थान परवानगी "सर्व वेळ" (All the time) निवडा</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>
                Ensures you continue receiving customer trip dispatches along your route even outside the app.
              </Text>
            </View>

            {/* Step 3: Draw over other apps */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#8B5CF620' }]}>
                  <MaterialCommunityIcons name="layers-outline" size={18} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>3. Display Over Other Apps</Text>
                  <Text style={styles.stepSub}>इतर ॲप्सवर दाखवा (Pop-up banner on Maps)</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>
                Instantly pops up the incoming ride dispatch banner and loud ringing siren on top of navigation.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleOpenBatterySettings}
              activeOpacity={0.85}
            >
              <Feather name="settings" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Open Settings to Configure</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>I've Done This / Continue Online</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
    fontSize: 17,
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
    marginBottom: 8,
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  },
  boldText: {
    color: '#10B981',
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  primaryBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
})
