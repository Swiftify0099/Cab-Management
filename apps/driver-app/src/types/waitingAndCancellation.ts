/**
 * Feature 11 & 12: Waiting and Cancellation Types
 */

export interface WaitingStatus {
  ride_id: string
  is_arrived: boolean
  pickup_arrived_at?: string
  elapsed_seconds: number
  free_waiting_seconds_total: number
  free_waiting_remaining_seconds: number
  is_free_waiting: boolean
  paid_waiting_seconds: number
  is_paid_waiting: boolean
  waiting_rate_per_min: number
  waiting_charge: number
  distance_to_pickup_meters: number
  contact_attempts: number
  is_no_show_eligible: boolean
}

export interface CancellationReasonItem {
  code: string
  label: string
  is_penalty_exempt: boolean
  requires_arrival: boolean
}

export interface DriverCancellationMetrics {
  driver_id: string
  total_trips: number
  total_cancellations: number
  penalty_cancellations: number
  cancellation_rate: number
  cancellation_rate_percentage: string
  restriction_status: 'NORMAL' | 'WARNING' | 'RESTRICTED' | 'TEMPORARILY_SUSPENDED'
  restriction_reason?: string | null
  is_suspended: boolean
  suspension_until?: string | null
}

export interface CancellationHistoryItem {
  id: string
  ride_id: string
  reason_code: string
  reason_details?: string
  cancellation_fee: number
  driver_payout: number
  is_penalty_exempt: boolean
  created_at: string
}
