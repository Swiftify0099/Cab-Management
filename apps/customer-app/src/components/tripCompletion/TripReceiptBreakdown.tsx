/**
 * Feature 10: Itemized Transparent Trip Receipt Breakdown
 * Displays Base Fare, Distance, Duration, Waiting, Multi-Stop Fees, Tolls,
 * Taxes (GST), Discounts, and Final Payable Amount.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppBadge } from '../ui'

export interface ReceiptData {
  receipt_number: string
  ride_id: string
  pickup_address?: string
  destination_address?: string
  base_fare: number
  distance_km: number
  distance_charge: number
  duration_min: number
  time_charge: number
  waiting_charge?: number
  stops_fee?: number
  tolls_charge?: number
  parking_charge?: number
  taxes_and_fees?: number
  discount_amount?: number
  surge_multiplier?: number
  customer_final_fare: number
  tip_amount?: number
  payment_method: string
  payment_status: string
  completed_at?: string
}

interface TripReceiptBreakdownProps {
  receipt: ReceiptData
  compact?: boolean
}

export function TripReceiptBreakdown({ receipt, compact = false }: TripReceiptBreakdownProps) {
  const { theme, isDark } = useTheme()

  const isCash = receipt.payment_method?.toLowerCase() === 'cash'
  const isPaid = receipt.payment_status?.toLowerCase() === 'paid' || receipt.payment_status?.toLowerCase() === 'cash_collected'

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.colors.card : '#FFFFFF' }]}>
      {/* Receipt Header */}
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color="secondary" style={styles.receiptNo}>
            RECEIPT #{receipt.receipt_number || receipt.ride_id?.slice(0, 8).toUpperCase()}
          </AppText>
          <AppText variant="h3" style={styles.headerTitle}>Trip Fare Summary</AppText>
        </View>
        <AppBadge
          label={isCash ? (isPaid ? 'CASH COLLECTED' : 'PAY CASH') : isPaid ? 'PAID ONLINE' : 'PAYMENT PENDING'}
          variant={isPaid ? 'success' : isCash ? 'warning' : 'info'}
          size="sm"
        />
      </View>

      {/* Itemized Table */}
      <View style={styles.table}>
        {/* Base Fare */}
        <View style={styles.row}>
          <AppText variant="bodyS" color="secondary">Base Fare</AppText>
          <AppText variant="bodyS" bold style={styles.valText}>₹{receipt.base_fare?.toFixed(2) || '0.00'}</AppText>
        </View>

        {/* Distance Charge */}
        <View style={styles.row}>
          <AppText variant="bodyS" color="secondary">
            Distance Charge ({receipt.distance_km?.toFixed(1) || '0.0'} km)
          </AppText>
          <AppText variant="bodyS" bold style={styles.valText}>₹{receipt.distance_charge?.toFixed(2) || '0.00'}</AppText>
        </View>

        {/* Time Charge */}
        {receipt.time_charge > 0 && (
          <View style={styles.row}>
            <AppText variant="bodyS" color="secondary">
              Ride Time Charge ({receipt.duration_min || 0} min)
            </AppText>
            <AppText variant="bodyS" bold style={styles.valText}>₹{receipt.time_charge?.toFixed(2)}</AppText>
          </View>
        )}

        {/* Waiting Charge */}
        {Boolean(receipt.waiting_charge && receipt.waiting_charge > 0) && (
          <View style={styles.row}>
            <AppText variant="bodyS" color="secondary">Waiting Charges</AppText>
            <AppText variant="bodyS" bold style={styles.valText}>₹{receipt.waiting_charge?.toFixed(2)}</AppText>
          </View>
        )}

        {/* Intermediate Stops Fee */}
        {Boolean(receipt.stops_fee && receipt.stops_fee > 0) && (
          <View style={styles.row}>
            <AppText variant="bodyS" color="secondary">Waypoint Stops Fee</AppText>
            <AppText variant="bodyS" bold style={styles.valText}>₹{receipt.stops_fee?.toFixed(2)}</AppText>
          </View>
        )}

        {/* Tolls & Parking */}
        {Boolean((receipt.tolls_charge || 0) + (receipt.parking_charge || 0) > 0) && (
          <View style={styles.row}>
            <AppText variant="bodyS" color="secondary">Tolls & Parking</AppText>
            <AppText variant="bodyS" bold style={styles.valText}>
              ₹{((receipt.tolls_charge || 0) + (receipt.parking_charge || 0)).toFixed(2)}
            </AppText>
          </View>
        )}

        {/* Taxes & GST */}
        <View style={styles.row}>
          <AppText variant="bodyS" color="secondary">GST & Platform Fees (5%)</AppText>
          <AppText variant="bodyS" bold style={styles.valText}>₹{receipt.taxes_and_fees?.toFixed(2) || '0.00'}</AppText>
        </View>

        {/* Discount / Coupon */}
        {Boolean(receipt.discount_amount && receipt.discount_amount > 0) && (
          <View style={styles.row}>
            <AppText variant="bodyS" style={{ color: '#10B981', fontWeight: '600' }}>Promo Discount</AppText>
            <AppText variant="bodyS" style={{ color: '#10B981', fontWeight: '700' }}>
              -₹{receipt.discount_amount?.toFixed(2)}
            </AppText>
          </View>
        )}

        {/* Tip Amount if already added */}
        {Boolean(receipt.tip_amount && receipt.tip_amount > 0) && (
          <View style={styles.row}>
            <AppText variant="bodyS" style={{ color: '#3B82F6', fontWeight: '600' }}>Driver Tip</AppText>
            <AppText variant="bodyS" style={{ color: '#3B82F6', fontWeight: '700' }}>
              +₹{receipt.tip_amount?.toFixed(2)}
            </AppText>
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }]} />

        {/* Total Final Fare */}
        <View style={styles.totalRow}>
          <View>
            <AppText variant="h3" style={styles.totalLabel}>Total Fare</AppText>
            <AppText variant="caption" color="secondary">
              Payment via {receipt.payment_method?.toUpperCase()}
            </AppText>
          </View>
          <AppText variant="h2" style={styles.totalValue}>
            ₹{(receipt.customer_final_fare + (receipt.tip_amount || 0)).toFixed(2)}
          </AppText>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 18,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  receiptNo: {
    letterSpacing: 0.5,
    fontWeight: '700',
    fontSize: 11,
  },
  headerTitle: {
    fontSize: 18,
    marginTop: 2,
  },
  table: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valText: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalLabel: {
    fontWeight: '800',
  },
  totalValue: {
    color: '#10B981',
    fontWeight: '900',
  },
})
