/**
 * Smart Ride Selection & Smart Radar Types — Feature 6
 */

export type DrivingFocusMode =
  | 'balanced'
  | 'earnings_focus'
  | 'nearby_focus'
  | 'short_trips'
  | 'long_trips'
  | 'airport_focus'

export type DestinationMode = 'off' | 'flexible' | 'strict'

export type SmartRadarFilterType =
  | 'all'
  | 'recommended'
  | 'best_earnings'
  | 'closest'
  | 'airport'

export interface ServiceCustomizationsData {
  transport?: {
    max_payload_kg?: number
    helpers_provided?: number
    accept_fragile?: boolean
    vehicle_category?: string
  }
  airport?: {
    meet_and_greet_enabled?: boolean
    auto_flight_delay_adjust?: boolean
    queue_mode?: boolean
  }
  packers?: {
    crew_size?: number
    provides_assembly?: boolean
    provides_fragile_packing?: boolean
    truck_type?: string
  }
  parcel?: {
    max_parcel_kg?: number
    accept_express?: boolean
  }
  rental?: {
    min_package_hours?: number
    max_package_hours?: number
  }
  outstation?: {
    accept_round_trip?: boolean
    accept_one_way?: boolean
    max_distance_km?: number
  }
  carpool?: {
    luggage_friendly?: boolean
    ac_available?: boolean
    quiet_ride?: boolean
  }
}

export interface DriverPreferencesData {
  mode: DrivingFocusMode
  visibility_mode?: string
  allow_local: boolean
  allow_airport: boolean
  allow_outstation: boolean
  allow_rental: boolean
  allow_parcel: boolean
  allow_transport: boolean
  allow_packers: boolean
  allow_carpool: boolean
  allow_scheduled: boolean
  ladies_only_accepted: boolean
  service_customizations: ServiceCustomizationsData
  min_earning_cutoff: number
  max_pickup_distance_km: number
  max_pickup_eta_min: number
  destination_mode: DestinationMode
  destination_address?: string | null
  destination_lat?: number | null
  destination_lng?: number | null
}

export interface RideClassificationData {
  trip_type: 'LOCAL' | 'AIRPORT' | 'OUTSTATION' | 'SCHEDULED'
  distance_class: 'SHORT' | 'MEDIUM' | 'LONG'
  demand_level: 'NORMAL' | 'HIGH' | 'VERY_HIGH'
  earning_class: 'NORMAL' | 'HIGH_EARNING'
  badge_label: string
  badge_color: 'purple' | 'orange' | 'green' | 'blue' | 'indigo' | 'cyan'
  earning_per_km: number
  earning_per_hour: number
}

export interface SmartRadarCandidate {
  ride_id: string
  smart_score: number
  match_percentage: number
  human_reason: string
  classification: RideClassificationData
  pickup_distance_km: number
  pickup_eta_min: number
  trip_distance_km: number
  trip_duration_min: number
  fare: number
  driver_earning: number
  pickup: {
    address: string
    lat: number
    lng: number
    distance_km: number
    eta_min: number
  }
  destination: {
    address: string
    lat: number
    lng: number
  }
  seats: number
  category_name: string
  scoring_version: string
}

export interface SmartRadarMatchResult {
  success: boolean
  message: string
  status: 'matched' | 'not_matched' | 'expired' | 'error'
  matched_ride_id?: string | null
}
