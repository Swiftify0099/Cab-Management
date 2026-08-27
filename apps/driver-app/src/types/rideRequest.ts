/**
 * Ride Request & On-Demand Dispatch Types — Feature 5
 */

export type RideRequestDisplayState =
  | 'NEW_OFFER'
  | 'ACCEPTING'
  | 'ACCEPTED'
  | 'REJECTING'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CUSTOMER_CANCELLED'
  | 'ALREADY_ASSIGNED'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'SERVER_ERROR'
  | 'LOCATION_UNAVAILABLE'
  | 'DRIVER_OFFLINE'
  | 'DISMISSED'

export interface RideLocationPoint {
  address: string
  lat: number
  lng: number
  distance_km?: number
  eta_min?: number
}

export interface RideTripDetails {
  from: string
  to: string
  distance_km: number
  duration_min: number
  fare: number
  earning: number
  seats?: number
  has_parcel?: boolean
}

export interface SeatAllocationInfo {
  total_seats: number
  available_seats: number
  available_labels: string[]
  requested_seats: number
}

export interface RideCategoryInfo {
  name: string
  icon?: string
  display_name?: string
}

export interface RideOfferPayload {
  offer_id: string
  ride_request_id: string
  booking_id?: string // for backward compatibility
  driver_id?: string
  service_type?: 'cab' | 'parcel' | 'transport' | 'hotel' | 'outstation' | string
  is_preferred?: boolean  // ⭐ Customer explicitly requested this driver
  pickup: RideLocationPoint
  destination: RideLocationPoint
  trip: RideTripDetails
  category?: RideCategoryInfo
  seat_info?: SeatAllocationInfo
  expires_at: string
  timeout_sec: number
  paid?: boolean
  pickup_notes?: string
  customer?: {
    id?: string
    name?: string
    rating?: number
  }
}

export interface RideOfferResponsePayload {
  offer_id: string
  ride_request_id?: string
  booking_id?: string
  accepted: boolean
  rejection_reason?: string
}

export interface RideCategoryModel {
  id: string
  name: string
  display_name: string
  base_fare: number
  per_km_rate: number
  per_min_rate: number
  min_fare: number
  platform_commission_pct: number
  surge_multiplier: number
  icon_name?: string
}
