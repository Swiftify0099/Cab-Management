/**
 * Cab Seat Preference & Confirmation Screen
 * Phase 2: wired to real bookingId from params, ₹ prices
 */
import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, StatusBar, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

const { width } = Dimensions.get('window')

type SeatId = 'front' | 'mid1' | 'mid2' | 'mid3' | 'back1' | 'back2'

const SEAT_CONFIG: Record<SeatId, { label: string; surcharge: number; isWindow: boolean }> = {
  front:  { label: 'Front Seat',       surcharge: 8,  isWindow: false },
  mid1:   { label: 'Mid Left Seat',    surcharge: 3,  isWindow: true  },
  mid2:   { label: 'Mid Center Seat',  surcharge: 0,  isWindow: false },
  mid3:   { label: 'Mid Right Seat',   surcharge: 3,  isWindow: true  },
  back1:  { label: 'Back Left Seat',   surcharge: 3,  isWindow: true  },
  back2:  { label: 'Back Right Seat',  surcharge: 3,  isWindow: true  },
}

export default function SeatSelectionScreen() {
  const { bookingId, fare } = useLocalSearchParams<{ bookingId: string; fare: string }>()
  // Base fare from booking params; fallback = 0 (unknown until API)
  const baseFare = parseInt(fare || '0', 10)

  const [quietRide, setQuietRide] = useState(true)
  const [tempControl, setTempControl] = useState(true)
  const [selectedSeat, setSelectedSeat] = useState<SeatId>('front')

  const config = SEAT_CONFIG[selectedSeat]
  const totalFare = baseFare + config.surcharge

  const seatStyle = (id: SeatId) => {
    const active = selectedSeat === id
    return [
      styles.seat,
      active ? styles.seatActive : styles.seatInactive,
    ]
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF4FF" />

      {/* Header */}
      <SafeAreaView style={styles.safeHeader} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="chevron-left" size={28} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seat Selection</Text>
          <Text style={styles.headerStep}>Step 2 of 4</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressFill} />
          <View style={styles.progressFill} />
          <View style={styles.progressEmpty} />
          <View style={styles.progressEmpty} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Car Diagram ───────────────────────────────── */}
        <View style={styles.carSection}>

          {/* ── The Car Body ── */}
          <View style={styles.carBody}>

            {/* Side mirrors */}
            <View style={[styles.mirror, { left: -18, top: 100 }]} />
            <View style={[styles.mirror, { right: -18, top: 100 }]} />

            {/* Door handles / orange trim top */}
            <View style={[styles.doorHandle, { left: 8, top: 118 }]} />
            <View style={[styles.doorHandle, { right: 8, top: 118 }]} />

            {/* Door handles / red trim bottom */}
            <View style={[styles.doorHandleRed, { left: 18, bottom: 32 }]} />
            <View style={[styles.doorHandleRed, { right: 18, bottom: 32 }]} />

            {/* Cabin interior dark background */}
            <View style={styles.cabin}>

              {/* Windshield / dashboard area */}
              <View style={styles.dashboardArea}>
                <View style={styles.steeringCircle} />
                <View style={styles.dashboardLine} />
              </View>

              {/* ── ROW 1: Driver + Front Passenger ── */}
              <View style={styles.row}>
                {/* Driver (non-selectable) */}
                <View style={[styles.seat, styles.seatDriver]}>
                  <View style={styles.seatHeadrest} />
                  <View style={styles.seatBack} />
                  <View style={styles.seatBase2} />
                </View>

                {/* Front Passenger (selectable, shows glow when active) */}
                <TouchableOpacity
                  onPress={() => setSelectedSeat('front')}
                  activeOpacity={0.85}
                  style={[styles.seatTouchable, selectedSeat === 'front' && styles.seatGlowWrap]}
                >
                  <View style={[styles.seatIllustrated, selectedSeat === 'front' ? styles.seatIllustratedActive : styles.seatIllustratedInactive]}>
                    <View style={[styles.seatHeadrest, selectedSeat === 'front' && styles.headrestActive]} />
                    <View style={[styles.seatBack, selectedSeat === 'front' && styles.seatBackActive]} />
                    <View style={[styles.seatBase2, selectedSeat === 'front' && styles.seatBase2Active]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* ── ROW DIVIDER ── */}
              <View style={styles.rowDivider} />

              {/* ── ROW 2: Mid 3 seats ── */}
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() => setSelectedSeat('mid1')}
                  activeOpacity={0.85}
                  style={[styles.seatTouchable, selectedSeat === 'mid1' && styles.seatGlowWrap]}
                >
                  <View style={[styles.seatIllustrated, styles.seatSmall, selectedSeat === 'mid1' ? styles.seatIllustratedActive : styles.seatIllustratedInactive]}>
                    <View style={[styles.seatHeadrest, selectedSeat === 'mid1' && styles.headrestActive]} />
                    <View style={[styles.seatBack, selectedSeat === 'mid1' && styles.seatBackActive]} />
                    <View style={[styles.seatBase2, selectedSeat === 'mid1' && styles.seatBase2Active]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedSeat('mid2')}
                  activeOpacity={0.85}
                  style={[styles.seatTouchable, selectedSeat === 'mid2' && styles.seatGlowWrap]}
                >
                  <View style={[styles.seatIllustrated, styles.seatSmall, selectedSeat === 'mid2' ? styles.seatIllustratedActive : styles.seatIllustratedInactive]}>
                    <View style={[styles.seatHeadrest, selectedSeat === 'mid2' && styles.headrestActive]} />
                    <View style={[styles.seatBack, selectedSeat === 'mid2' && styles.seatBackActive]} />
                    <View style={[styles.seatBase2, selectedSeat === 'mid2' && styles.seatBase2Active]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedSeat('mid3')}
                  activeOpacity={0.85}
                  style={[styles.seatTouchable, selectedSeat === 'mid3' && styles.seatGlowWrap]}
                >
                  <View style={[styles.seatIllustrated, styles.seatSmall, selectedSeat === 'mid3' ? styles.seatIllustratedActive : styles.seatIllustratedInactive]}>
                    <View style={[styles.seatHeadrest, selectedSeat === 'mid3' && styles.headrestActive]} />
                    <View style={[styles.seatBack, selectedSeat === 'mid3' && styles.seatBackActive]} />
                    <View style={[styles.seatBase2, selectedSeat === 'mid3' && styles.seatBase2Active]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* ── ROW DIVIDER ── */}
              <View style={styles.rowDivider} />

              {/* ── ROW 3: Back 2 seats ── */}
              <View style={[styles.row, { justifyContent: 'space-around' }]}>
                <TouchableOpacity
                  onPress={() => setSelectedSeat('back1')}
                  activeOpacity={0.85}
                  style={[styles.seatTouchable, selectedSeat === 'back1' && styles.seatGlowWrap]}
                >
                  <View style={[styles.seatIllustrated, styles.seatLarge, selectedSeat === 'back1' ? styles.seatIllustratedActive : styles.seatIllustratedInactive]}>
                    <View style={[styles.seatHeadrest, selectedSeat === 'back1' && styles.headrestActive]} />
                    <View style={[styles.seatBack, selectedSeat === 'back1' && styles.seatBackActive]} />
                    <View style={[styles.seatBase2, selectedSeat === 'back1' && styles.seatBase2Active]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedSeat('back2')}
                  activeOpacity={0.85}
                  style={[styles.seatTouchable, selectedSeat === 'back2' && styles.seatGlowWrap]}
                >
                  <View style={[styles.seatIllustrated, styles.seatLarge, selectedSeat === 'back2' ? styles.seatIllustratedActive : styles.seatIllustratedInactive]}>
                    <View style={[styles.seatHeadrest, selectedSeat === 'back2' && styles.headrestActive]} />
                    <View style={[styles.seatBack, selectedSeat === 'back2' && styles.seatBackActive]} />
                    <View style={[styles.seatBase2, selectedSeat === 'back2' && styles.seatBase2Active]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Rear window tint */}
              <View style={styles.rearWindow} />
            </View>
          </View>

          {/* ── Tooltips (outside carBody, absolutely positioned) ── */}

          {/* +₹8 tooltip */}
          <View style={styles.tooltipFront}>
            <View style={styles.ttBubble}>
              <Text style={styles.ttPrice}>+₹8</Text>
              <Text style={styles.ttText}>Extra{'\n'}Legroom</Text>
              <View style={styles.ttTriangle} />
            </View>
            <MaterialCommunityIcons name="crown" size={26} color="#F59E0B" style={styles.ttCrown} />
          </View>

          {/* Mid Left */}
          <View style={[styles.windowBadge, styles.windowBadgeMidLeft]}>
            <Text style={styles.wbText}>Window{'\n'}Seat</Text>
            <View style={styles.wbIcon}>
              <View style={styles.customWindowIcon}><View style={styles.customWindowInner} /></View>
            </View>
            <View style={styles.wbPill}><Text style={styles.wbPillText}>+₹3</Text></View>
          </View>

          {/* Mid Right */}
          <View style={[styles.windowBadge, styles.windowBadgeMidRight]}>
            <Text style={styles.wbText}>Window{'\n'}Seat</Text>
            <View style={styles.wbIcon}>
              <View style={styles.customWindowIcon}><View style={styles.customWindowInner} /></View>
            </View>
            <View style={styles.wbPill}><Text style={styles.wbPillText}>+₹3</Text></View>
          </View>

          {/* Back Left */}
          <View style={[styles.windowBadge, styles.windowBadgeBackLeft]}>
            <Text style={styles.wbText}>Window{'\n'}Seat</Text>
            <View style={styles.wbIcon}>
              <View style={styles.customWindowIcon}><View style={styles.customWindowInner} /></View>
            </View>
            <View style={styles.wbPill}><Text style={styles.wbPillText}>+₹3</Text></View>
          </View>

          {/* Back Right */}
          <View style={[styles.windowBadge, styles.windowBadgeBackRight]}>
            <Text style={styles.wbText}>Window{'\n'}Seat</Text>
            <View style={styles.wbIcon}>
              <View style={styles.customWindowIcon}><View style={styles.customWindowInner} /></View>
            </View>
            <View style={styles.wbPill}><Text style={styles.wbPillText}>+₹3</Text></View>
          </View>

        </View>

        {/* ── Preferences ───────────────────────────────── */}
        <View style={styles.prefsCard}>
          <Text style={styles.prefsTitle}>Preferences</Text>

          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Text style={styles.prefName}>Quiet Ride</Text>
              <Text style={styles.prefDesc}>Quiet ride can mtieet to quiet ride.</Text>
            </View>
            <Switch
              value={quietRide}
              onValueChange={setQuietRide}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.prefRow, { marginBottom: 0 }]}>
            <View style={styles.prefLeft}>
              <Text style={styles.prefName}>Temperature Control</Text>
              <Text style={styles.prefDesc}>Temperature control for temperature.</Text>
            </View>
            <Switch
              value={tempControl}
              onValueChange={setTempControl}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* ── Bottom Bar ───────────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.bottomLabel}>Selected Seat:</Text>
            <Text style={styles.bottomValue}>{config.label}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.bottomLabel}>Total Fare:</Text>
            <Text style={styles.bottomValue}>
              {baseFare > 0 ? `₹${totalFare}` : `Base + ₹${config.surcharge} surcharge`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => {
            if (!bookingId) {
              router.back()
              return
            }
            router.push(`/payment?bookingId=${bookingId}` as any)
          }}
          activeOpacity={0.9}
        >
          <Text style={styles.confirmBtnText}>Confirm Selection</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const CAR_W = Math.min(width * 0.55, 220)
const CAR_H = CAR_W * 1.85

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF4FF' },
  safeHeader: { backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF',
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', letterSpacing: 0.2 },
  headerStep: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  progressRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14,
    gap: 6, backgroundColor: '#FFFFFF',
  },
  progressFill: { flex: 1, height: 4, backgroundColor: '#2563EB', borderRadius: 2 },
  progressEmpty: { flex: 1, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 24 },

  // ── Car Section ──────────────────────────────────────
  carSection: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 28,
    paddingHorizontal: 60,
    minHeight: CAR_H + 80,
  },

  carBody: {
    width: CAR_W,
    height: CAR_H,
    backgroundColor: '#DBEAFE',
    borderTopLeftRadius: CAR_W * 0.48,
    borderTopRightRadius: CAR_W * 0.48,
    borderBottomLeftRadius: CAR_W * 0.25,
    borderBottomRightRadius: CAR_W * 0.25,
    borderWidth: 3,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    overflow: 'visible',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },

  mirror: {
    position: 'absolute',
    width: 22,
    height: 36,
    backgroundColor: '#BFDBFE',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#93C5FD',
  },

  doorHandle: {
    position: 'absolute',
    width: 8,
    height: 28,
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },

  doorHandleRed: {
    position: 'absolute',
    width: 28,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },

  cabin: {
    marginTop: CAR_H * 0.12,
    width: CAR_W * 0.82,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 12,
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
  },

  dashboardArea: {
    width: '100%',
    height: 44,
    backgroundColor: '#0F2744',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 20,
  },
  steeringCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#334155',
    backgroundColor: '#0F2744',
  },
  dashboardLine: {
    width: 40,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 4,
    gap: 6,
  },

  rowDivider: {
    width: '95%',
    height: 6,
    backgroundColor: '#0F2744',
    borderRadius: 2,
    marginVertical: 6,
  },

  rearWindow: {
    width: '90%',
    height: 20,
    backgroundColor: '#0F2744',
    borderRadius: 8,
    marginTop: 4,
    opacity: 0.9,
  },

  // seat touchable wrapper
  seatTouchable: {
    flex: 1,
    borderRadius: 10,
    overflow: 'visible',
  },
  seatGlowWrap: {
    shadowColor: '#06B6D4',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },

  // Illustrated seat
  seatIllustrated: {
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
    flex: 1,
    height: 68,
  },
  seatIllustratedInactive: {
    backgroundColor: '#94A3B8',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  seatIllustratedActive: {
    backgroundColor: '#2563EB',
    borderWidth: 1.5,
    borderColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },

  seatSmall: { height: 62 },
  seatLarge: { height: 72, flex: 1.1 },

  seatHeadrest: {
    width: '70%',
    height: 12,
    backgroundColor: '#CBD5E1',
    borderRadius: 6,
    marginBottom: 3,
  },
  headrestActive: { backgroundColor: '#93C5FD' },

  seatBack: {
    width: '88%',
    flex: 1,
    backgroundColor: '#A8B5C5',
    borderRadius: 6,
    marginBottom: 3,
  },
  seatBackActive: { backgroundColor: '#60A5FA' },

  seatBase2: {
    width: '80%',
    height: 10,
    backgroundColor: '#8898A8',
    borderRadius: 4,
  },
  seatBase2Active: { backgroundColor: '#3B82F6' },

  // Driver seat (non-interactive)
  seat: {},
  seatDriver: {},
  seatActive: {},
  seatInactive: {},

  // ── Tooltips ─────────────────────────────────────────

  // Front Extra Legroom
  tooltipFront: {
    position: 'absolute',
    top: 60,
    right: 8,
    alignItems: 'flex-end',
  },
  ttBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  ttPrice: { color: '#2563EB', fontWeight: '900', fontSize: 18 },
  ttText: { color: '#374151', fontSize: 11, fontWeight: '600', lineHeight: 14 },
  ttTriangle: {
    position: 'absolute',
    bottom: -7,
    left: 18,
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  ttCrown: {
    position: 'absolute',
    top: -18,
    right: -2,
    transform: [{ rotate: '15deg' }],
  },

  // Window seat badges
  windowBadge: {
    position: 'absolute',
    backgroundColor: '#EEF4FF',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 72,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wbText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
  },
  wbIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  customWindowIcon: {
    width: 12, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center'
  },
  customWindowInner: {
    width: 4, height: 8, borderRadius: 2, backgroundColor: '#93C5FD'
  },
  wbPill: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  wbPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  windowBadgeMidLeft: { top: CAR_H * 0.41, left: 6 },
  windowBadgeMidRight: { top: CAR_H * 0.41, right: 6 },
  windowBadgeBackLeft: { top: CAR_H * 0.62, left: 6 },
  windowBadgeBackRight: { top: CAR_H * 0.62, right: 6 },

  // ── Preferences Card ─────────────────────────────────
  prefsCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#94A3B8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  prefsTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  prefRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  prefLeft: { flex: 1, paddingRight: 12 },
  prefName: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  prefDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  // ── Bottom Bar ────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#1E50B3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  bottomLabel: { color: '#BFDBFE', fontSize: 13, marginBottom: 4, fontWeight: '500' },
  bottomValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },

  confirmBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnText: { color: '#10B981', fontSize: 18, fontWeight: '800' },
})
