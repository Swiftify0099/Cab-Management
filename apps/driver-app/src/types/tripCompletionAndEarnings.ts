/**
 * Features 13 & 14: Trip Completion, Receipts and Earnings Ledger Types
 */

export interface RideReceiptData {
  receipt_number: string
  ride_id: string
  base_fare: number
  distance_km: number
  distance_charge: number
  duration_min: number
  time_charge: number
  waiting_charge: number
  stops_fee: number
  tolls_charge: number
  parking_charge: number
  taxes_and_fees: number
  surge_multiplier: number
  customer_final_fare: number
  platform_commission: number
  driver_net_earning: number
  tip_amount: number
  payment_method: 'cash' | 'upi' | 'card' | 'wallet'
  payment_status: 'paid' | 'payment_pending' | 'cash_collected' | 'failed'
  created_at?: string
}

export interface DriverEarningsSummary {
  period: 'today' | 'week' | 'month'
  start_date: string
  total_net_earnings: number
  trip_count: number
  cash_collected: number
  online_earnings: number
  tips_total: number
  online_hours: number
  earning_per_hour: number
  available_wallet_balance: number
  daily_breakdown?: Array<{
    day: string
    date: string
    amount: number
    is_today: boolean
  }>
}

export interface LedgerEntryItem {
  id: string
  ride_id?: string | null
  entry_type: 'TRIP_EARNING' | 'COMMISSION' | 'TIP' | 'INCENTIVE' | 'BONUS' | 'CASH_COLLECTED' | 'REFUND_ADJUSTMENT' | 'PAYOUT' | 'PAYOUT_RESERVE' | 'PAYOUT_REVERSAL' | string
  amount: number
  currency: string
  direction: 'CREDIT' | 'DEBIT'
  status: 'SETTLED' | 'PENDING' | 'FAILED'
  description: string
  effective_date: string
  created_at?: string
}

export interface CustomerRatingPayload {
  rating: number
  tags: string[]
  feedback?: string
}
