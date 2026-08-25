/**
 * Ride Request Card UI — Feature 5 (Approved Light Mode with Dark Mode support)
 * Production-quality bottom-sheet presentation with full trip, fare, earning & seat details.
 */
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { RideOfferPayload, RideRequestDisplayState } from '../../types/rideRequest'
import { RideRequestTimer } from './RideRequestTimer'

interface Props {
  offer: RideOfferPayload
  timeLeft: number
  state: RideRequestDisplayState
  isDark?: boolean
  isMuted?: boolean
  sirenName?: string
  isPreferred?: boolean  // ⭐ Customer explicitly requested this driver
  onToggleMute?: () => void
  onAccept: () => void
  onReject: () => void
  onDismiss: () => void
}

export const RideRequestCard: React.FC<Props> = ({
  offer,
  timeLeft,
  state,
  isDark = false,
  isMuted = false,
  sirenName,
  isPreferred = false,
  onToggleMute,
  onAccept,
  onReject,
  onDismiss,
}) => {
  const pickup = offer?.pickup
  const dest = offer?.destination
  const trip = offer?.trip
  const seatInfo = offer?.seat_info
  const category = offer?.category || { name: 'Economy', icon: 'car' }
  const serviceType = offer?.service_type || (trip?.has_parcel ? 'parcel' : 'cab')

  const isResponding = state === 'ACCEPTING' || state === 'REJECTING'
  const isAccepted = state === 'ACCEPTED'
  const isExpired = state === 'EXPIRED'
  const isCancelled = state === 'CUSTOMER_CANCELLED'
  const isSuperseded = state === 'ALREADY_ASSIGNED'

  // Colors
  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'
  const infoBg = isDark ? '#0F172A' : '#F8FAFC'

  const getServiceHeader = () => {
    switch (serviceType) {
      case 'parcel':
        return { label: 'PARCEL DELIVERY REQUEST', icon: 'package', color: '#F59E0B' }
      case 'transport':
        return { label: 'INTERCITY TRANSPORT MATCH', icon: 'bus', color: '#0EA5E9' }
      case 'hotel':
        return { label: 'HOTEL LOGISTICS TRANSFER', icon: 'domain', color: '#8B5CF6' }
      default:
        return { label: 'NEW CAB BOOKING REQUEST', icon: 'car-side', color: '#10B981' }
    }
  }

  const sHeader = getServiceHeader()

  return (
    <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
      {/* Top Handle */}
      <View style={[styles.handle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />

      {/* ⭐ Preferred Driver Request Banner */}
      {isPreferred && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 10, marginBottom: 8, marginHorizontal: 4, gap: 8 }}>
          <Text style={{ fontSize: 20 }}>⭐</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: '#92400E', fontSize: 13 }}>Preferred Driver Request</Text>
            <Text style={{ color: '#78350F', fontSize: 11 }}>The customer specifically chose YOU for this ride!</Text>
          </View>
        </View>
      )}

      {/* ─── Dynamic Siren Ringing & Mute Control Strip ─────────────── */}
      {!isAccepted && !isExpired && !isCancelled && !isSuperseded && (
        <View
          style={[
            styles.sirenStatusRow,
            {
              backgroundColor: isMuted
                ? (isDark ? '#1E293B' : '#F1F5F9')
                : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'),
              borderColor: isMuted ? borderCol : '#FCA5A5',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <MaterialCommunityIcons
              name={isMuted ? 'volume-variant-off' : 'volume-high'}
              size={18}
              color={isMuted ? textSecondary : '#EF4444'}
            />
            <Text
              style={[
                styles.sirenStatusText,
                { color: isMuted ? textSecondary : (isDark ? '#FCA5A5' : '#DC2626') },
              ]}
              numberOfLines={1}
            >
              {isMuted ? '🔊 Siren Muted' : `🔊 Ringing: ${sirenName || 'Driver Siren Alert'}`}
            </Text>
            {!isMuted && <View style={styles.soundWavePulse} />}
          </View>

          {onToggleMute && (
            <TouchableOpacity
              style={[
                styles.muteToggleBtn,
                { backgroundColor: isMuted ? '#0284C7' : 'rgba(239,68,68,0.2)' },
              ]}
              onPress={onToggleMute}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.muteToggleBtnText,
                  { color: isMuted ? '#FFFFFF' : (isDark ? '#FCA5A5' : '#DC2626') },
                ]}
              >
                {isMuted ? 'UNMUTE' : 'MUTE'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── State Banner Overlays (Expired / Cancelled / Assigned) ─────── */}
      {isCancelled && (
        <View style={styles.cancelledBanner}>
          <Feather name="x-circle" size={18} color="#EF4444" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.cancelledTitle}>Customer Cancelled Request</Text>
            <Text style={styles.cancelledSub}>Don't worry — other customer requests are searching for you!</Text>
          </View>
          <TouchableOpacity style={styles.bannerDismissBtn} onPress={onDismiss}>
            <Text style={styles.bannerDismissText}>Got It</Text>
          </TouchableOpacity>
        </View>
      )}

      {isExpired && (
        <View style={styles.expiredBanner}>
          <Feather name="clock" size={18} color="#F59E0B" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.expiredTitle}>Request Expired (180s)</Text>
            <Text style={styles.expiredSub}>You're still online and ready for new requests.</Text>
          </View>
          <TouchableOpacity style={styles.bannerDismissBtn} onPress={onDismiss}>
            <Text style={styles.bannerDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSuperseded && (
        <View style={styles.supersededBanner}>
          <Feather name="info" size={18} color="#3B82F6" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.supersededTitle}>Assigned to Another Partner</Text>
            <Text style={styles.supersededSub}>Another nearby driver accepted first.</Text>
          </View>
          <TouchableOpacity style={styles.bannerDismissBtn} onPress={onDismiss}>
            <Text style={styles.bannerDismissText}>OK</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAccepted && (
        <View style={styles.acceptedBanner}>
          <Feather name="check-circle" size={24} color="#10B981" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.acceptedTitle}>Request Confirmed! 🎉</Text>
            <Text style={styles.acceptedSub}>Starting live GPS route navigation to customer pickup point...</Text>
          </View>
        </View>
      )}

      {/* ─── Header: Title + Pulsing Indicator + 180s Timer ────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.pulseDot, { backgroundColor: sHeader.color }]} />
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            {sHeader.label}
          </Text>
        </View>
        <RideRequestTimer
          timeLeft={timeLeft}
          totalTime={offer.timeout_sec || 180}
          isDark={isDark}
        />
      </View>

      {/* ─── Pickup & Destination Section ─────────────────────────────── */}
      <View style={[styles.locationsContainer, { backgroundColor: infoBg, borderColor: borderCol }]}>
        {/* Pickup Row */}
        <View style={styles.locationRow}>
          <View style={styles.pinCol}>
            <View style={styles.pickupDot} />
            <View style={styles.routeDash} />
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={[styles.locationLabel, { color: textSecondary }]}>PICKUP</Text>
            <Text style={[styles.locationAddress, { color: textPrimary }]} numberOfLines={1}>
              {pickup?.address || 'Customer Location'}
            </Text>
            <View style={styles.pickupMetaRow}>
              <Text style={styles.pickupMetaText}>
                📍 {pickup?.distance_km ?? 2.4} km away • {pickup?.eta_min ?? 7} min ETA
              </Text>
            </View>
          </View>
        </View>

        {/* Drop Row */}
        <View style={[styles.locationRow, { marginTop: 8 }]}>
          <View style={styles.pinCol}>
            <View style={styles.dropDot} />
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={[styles.locationLabel, { color: textSecondary }]}>DROP</Text>
            <Text style={[styles.locationAddress, { color: textPrimary }]} numberOfLines={1}>
              {dest?.address || 'Destination'}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── Trip Meta & Category Badge ───────────────────────────────── */}
      <View style={styles.tripMetaRow}>
        <View style={[styles.metaChip, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
          <MaterialCommunityIcons name="road-variant" size={15} color="#0284C7" />
          <Text style={[styles.metaChipText, { color: textPrimary }]}>
            {trip?.distance_km ?? 12.8} km • ~{trip?.duration_min ?? 28} min
          </Text>
        </View>

        <View style={[styles.categoryPill, { backgroundColor: 'rgba(14,165,233,0.12)' }]}>
          <Ionicons name="car-sport" size={14} color="#0284C7" />
          <Text style={styles.categoryPillText}>
            {category?.name?.toUpperCase() || 'ECONOMY'}
          </Text>
        </View>
      </View>

      {/* ─── Available Seats & Allocated Seats Information Chip ──────── */}
      <View style={[styles.seatInfoCard, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: '#BFDBFE' }]}>
        <MaterialCommunityIcons name="car-seat" size={18} color="#2563EB" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.seatInfoTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
            🪑 {seatInfo?.requested_seats ?? trip?.seats ?? 1} Seat Requested • {seatInfo?.available_seats ?? 4} Seats in Vehicle
          </Text>
          <Text style={[styles.seatInfoSub, { color: isDark ? '#CBD5E1' : '#3B82F6' }]} numberOfLines={1}>
            Available: {seatInfo?.available_labels?.join(', ') || 'Front Window, Rear Left, Rear Right'}
          </Text>
        </View>
        <View style={{ backgroundColor: offer?.paid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: offer?.paid ? '#10B981' : '#D97706' }}>
            {offer?.paid ? 'PAID' : 'CASH'}
          </Text>
        </View>
      </View>

      {/* ─── Operational Note Banner (Gate No, etc.) ──────────── */}
      {(offer?.pickup_notes || (offer as any)?.notes) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 10, gap: 6 }}>
          <Feather name="message-square" size={14} color="#D97706" />
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: isDark ? '#FCD34D' : '#92400E' }} numberOfLines={2}>
            Rider Note: "{(offer?.pickup_notes || (offer as any)?.notes)}"
          </Text>
        </View>
      )}

      {/* ─── Fare & Driver Earning Cards ──────────────────────────────── */}
      <View style={styles.pricingRow}>
        <View style={[styles.fareCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}>
          <Text style={[styles.pricingLabel, { color: textSecondary }]}>💰 Trip Fare</Text>
          <Text style={[styles.fareValue, { color: textPrimary }]}>
            ₹{trip?.fare ?? 285}
          </Text>
        </View>

        <View style={[styles.earningCard, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.earningLabel}>🟢 Your Net Earning</Text>
            {trip?.duration_min ? (
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>
                ~₹{Math.round(((trip?.earning ?? Math.round((trip?.fare ?? 285) * 0.8)) / (trip.duration_min)) * 60)}/hr
              </Text>
            ) : null}
          </View>
          <Text style={styles.earningValue}>
            ₹{trip?.earning ?? Math.round((trip?.fare ?? 285) * 0.8)}
          </Text>
        </View>
      </View>

      {/* ─── Action Buttons: REJECT & ACCEPT ──────────────────────────── */}
      {!isAccepted && !isExpired && !isCancelled && !isSuperseded && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.rejectBtn, { borderColor: isDark ? '#475569' : '#CBD5E1' }]}
            onPress={onReject}
            disabled={isResponding}
            activeOpacity={0.7}
          >
            {state === 'REJECTING' ? (
              <ActivityIndicator size="small" color={textPrimary} />
            ) : (
              <Text style={[styles.rejectBtnText, { color: textPrimary }]}>REJECT</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptBtn, isResponding && { opacity: 0.85 }]}
            onPress={onAccept}
            disabled={isResponding}
            activeOpacity={0.85}
          >
            {state === 'ACCEPTING' ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.acceptBtnText, { marginLeft: 8 }]}>ACCEPTING...</Text>
              </View>
            ) : (
              <Text style={styles.acceptBtnText}>ACCEPT ✓</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  locationsContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pinCol: {
    alignItems: 'center',
    width: 18,
    paddingTop: 3,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  routeDash: {
    width: 1.5,
    height: 22,
    backgroundColor: '#94A3B8',
    marginVertical: 2,
  },
  dropDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  locationTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  pickupMetaRow: {
    marginTop: 3,
  },
  pickupMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  seatInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  seatInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  seatInfoSub: {
    fontSize: 11,
    marginTop: 1,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fareCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pricingLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  fareValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  earningCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  earningLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  earningValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  rejectBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  cancelledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  cancelledSub: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  expiredTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  expiredSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  supersededBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  supersededTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  supersededSub: {
    fontSize: 11,
    color: '#1D4ED8',
    marginTop: 2,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  acceptedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  acceptedSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  bannerDismissBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  bannerDismissText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sirenStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  sirenStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  soundWavePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  muteToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  muteToggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
