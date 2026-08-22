/**
 * Feature 15: Payout & Wallet Type Definitions
 */

export type PayoutMethodType = 'BANK' | 'UPI'
export type PayoutStatus = 'REQUESTED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED' | 'CANCELLED'

export interface PayoutMethodItem {
  id: string
  method_type: PayoutMethodType
  is_default: boolean
  display_label: string
  bank_name?: string
  account_holder_name?: string
  account_number_masked?: string
  ifsc_code?: string
  upi_id_masked?: string
  is_verified: boolean
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'DISABLED'
}

export interface PayoutRecordItem {
  id: string
  reference: string
  amount: number
  fee?: number
  net_payout: number
  currency?: string
  payout_method: PayoutMethodType
  destination_masked: string
  status: PayoutStatus
  failure_reason?: string | null
  requested_at: string
  settled_at?: string | null
  is_auto_payout?: boolean
}

export interface AutoPayoutConfig {
  is_enabled: boolean
  threshold_amount: number
  frequency: 'DAILY' | 'WEEKLY' | 'THRESHOLD_ONLY'
  payout_method_type: PayoutMethodType
  payout_method_id?: string | null
  last_auto_payout_at?: string | null
}

export interface DriverWalletSummaryData {
  driver_id: string
  available_balance: number
  pending_balance: number
  reserved_balance: number
  currency: string
  min_payout_amount: number
  max_payout_amount: number
  payout_methods: PayoutMethodItem[]
  auto_payout: AutoPayoutConfig
  recent_payouts: PayoutRecordItem[]
  can_withdraw: boolean
}

export interface SettlementBreakdownItem {
  id: string
  period_start: string
  period_end: string
  gross_earnings: number
  commission_deducted: number
  penalties_deducted: number
  net_amount: number
  status: string
  paid_at?: string | null
  bank_ref?: string | null
}

export interface WithdrawalResult {
  success: boolean
  payout_id: string
  reference: string
  amount: number
  net_payout: number
  payout_method: string
  destination_masked: string
  status: PayoutStatus
  message: string
}
