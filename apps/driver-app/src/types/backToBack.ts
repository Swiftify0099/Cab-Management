/**
 * Back-to-Back Rides Continuous Dispatch Types — Feature 21
 */

export interface BackToBackEligibilityData {
  eligible: boolean
  distance_to_dropoff_km: number
  estimated_dropoff_eta_min: number
  dropoff_address: string
  reason: string
  next_ride_id?: string
}

export interface BackToBackCandidate {
  ride_id: string
  smart_score: number
  match_percentage: number
  human_reason: string
  pickup_distance_km: number
  pickup_eta_min: number
  trip_distance_km: number
  trip_duration_min: number
  fare: number
  driver_earning: number
  pickup_distance_from_current_dropoff_km: number
  pickup_eta_from_current_dropoff_min: number
  is_back_to_back: boolean
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
  category_name: string
}

export interface BackToBackReservationResponse {
  success: boolean
  status: 'RESERVED' | 'RELEASED' | 'FAILED'
  current_ride_id: string
  next_ride_id: string
  pickup_address: string
  destination_address: string
  estimated_fare: number
  driver_earning: number
  reserved_at: string
  message: string
}
