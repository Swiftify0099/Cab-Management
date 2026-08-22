/**
 * Feature 10: During Ride Types
 */

export interface RideStopItem {
  id: string
  sequence: number
  address: string
  latitude: number
  longitude: number
  status: 'pending' | 'accepted' | 'arrived' | 'completed' | 'skipped'
  stop_fee: number
  waiting_time_seconds?: number
  arrived_at?: string
  departed_at?: string
}

export interface DuringRideStatus {
  ride_id: string
  status: string
  started_at: string | null
  trip_seconds: number
  distance_travelled_km: number
  distance_remaining_km: number
  duration_remaining_min: number
  waiting_seconds: number
  waiting_fare: number
  current_estimated_fare: number
  final_estimated_fare: number
  destination: {
    address: string
    lat: number
    lng: number
  }
  has_active_sos: boolean
  stops: RideStopItem[]
}

export interface LocationTelemetryPayload {
  latitude: number
  longitude: number
  speed_kmh?: number
  heading?: number
  accuracy_m?: number
}

export interface DestinationUpdateResponse {
  success: boolean
  ride_id: string
  destination: {
    address: string
    lat: number
    lng: number
  }
  distance_km: number
  duration_min: number
  estimated_fare: number
  route_polyline?: string
}

export interface SOSResponse {
  success: boolean
  sos_id: string
  ride_id: string
  status: string
  police_number: string
  message: string
  created_at: string
}
