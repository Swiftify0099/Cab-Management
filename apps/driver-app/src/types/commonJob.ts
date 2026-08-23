/**
 * Common Job Contract — TypeScript Types for Driver App
 * ════════════════════════════════════════════════════════════════════════════════
 * Matches the backend CommonJobContract response shapes exactly.
 * Used by the useCommonJob hook and any screen that displays active/past jobs.
 */

// ─── Common Job Status (normalized across all service domains) ────────────────
export type CommonJobStatus =
  | 'PENDING'
  | 'OFFERED'
  | 'ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'VERIFICATION'
  | 'ACTIVE'
  | 'NEAR_COMPLETION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'RETURN_REQUIRED'

// ─── Job Types (service domain identifiers) ──────────────────────────────────
export type CommonJobType =
  | 'RIDE'
  | 'PARCEL'
  | 'TRANSPORT'
  | 'AIRPORT'
  | 'RENTAL'
  | 'OUTSTATION'
  | 'BOOKING'

// ─── Commands (driver actions — backend validates and transitions state) ──────
export type CommonJobCommand =
  | 'ACCEPT'
  | 'REJECT'
  | 'ARRIVE_PICKUP'
  | 'VERIFY_OTP'
  | 'START'
  | 'ADD_STOP'
  | 'ARRIVE_DROPOFF'
  | 'COMPLETE'
  | 'CANCEL'
  | 'REPORT_ISSUE'
  | 'CONFIRM_PICKUP'
  | 'CONFIRM_DELIVERY'
  | 'START_LOADING'
  | 'FINISH_LOADING'
  | 'START_UNLOADING'
  | 'SUBMIT_POD'

// ─── Data Shapes ──────────────────────────────────────────────────────────────

export interface LocationPoint {
  latitude: number
  longitude: number
  address: string
}

export interface FareSnapshot {
  total_fare: number
  driver_earning: number
  currency: string
  payment_method?: string
  surge_multiplier?: number
}

export interface CustomerInfo {
  name: string
  phone_masked: string
  special_notes?: string
}

export interface CommonJob {
  job_type: CommonJobType
  job_id: string
  domain_id: string
  status: CommonJobStatus
  pickup: LocationPoint
  dropoff: LocationPoint
  fare_snapshot: FareSnapshot
  customer: CustomerInfo
  start_otp?: string | null
  created_at?: string | null
  updated_at?: string | null
  /** Domain-specific extensions (ride category, parcel weight, etc.) */
  service_specific: Record<string, any>
}

export interface CommandResult {
  success: boolean
  message: string
  updated_status?: CommonJobStatus | null
  data?: Record<string, any> | null
}

export interface JobListItem {
  job_type: CommonJobType
  job_id: string
  domain_id: string
  status: CommonJobStatus
  pickup_address: string
  dropoff_address: string
  fare_amount: number
  currency: string
  created_at?: string | null
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface JobResponse {
  success: boolean
  data: CommonJob | null
  message: string
}

export interface JobHistoryResponse {
  success: boolean
  data: {
    items: JobListItem[]
    total: number
  } | null
  message: string
}

export interface CommandResponse {
  success: boolean
  data: CommandResult | null
  message: string
}

// ─── Status Display Helpers ──────────────────────────────────────────────────

export const JOB_STATUS_LABELS: Record<CommonJobStatus, string> = {
  PENDING: 'Searching...',
  OFFERED: 'Offer Pending',
  ASSIGNED: 'Assigned',
  DRIVER_ARRIVING: 'En Route to Pickup',
  DRIVER_ARRIVED: 'At Pickup',
  VERIFICATION: 'Verifying...',
  ACTIVE: 'In Progress',
  NEAR_COMPLETION: 'Almost Done',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
  RETURN_REQUIRED: 'Return Required',
}

export const JOB_STATUS_COLORS: Record<CommonJobStatus, string> = {
  PENDING: '#F59E0B',
  OFFERED: '#3B82F6',
  ASSIGNED: '#10B981',
  DRIVER_ARRIVING: '#8B5CF6',
  DRIVER_ARRIVED: '#6D28D9',
  VERIFICATION: '#F97316',
  ACTIVE: '#059669',
  NEAR_COMPLETION: '#0891B2',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
  FAILED: '#DC2626',
  RETURN_REQUIRED: '#D97706',
}

export const JOB_TYPE_LABELS: Record<CommonJobType, string> = {
  RIDE: '🚗 Ride',
  PARCEL: '📦 Parcel',
  TRANSPORT: '🚛 Transport',
  AIRPORT: '✈️ Airport',
  RENTAL: '⏱️ Rental',
  OUTSTATION: '🛣️ Outstation',
  BOOKING: '🎫 Booking',
}

export const JOB_TYPE_ICONS: Record<CommonJobType, string> = {
  RIDE: 'car',
  PARCEL: 'package',
  TRANSPORT: 'truck',
  AIRPORT: 'navigation',
  RENTAL: 'clock',
  OUTSTATION: 'map',
  BOOKING: 'bookmark',
}
