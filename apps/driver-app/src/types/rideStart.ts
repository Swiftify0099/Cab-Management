/**
 * Feature 9: Ride Start & Customer Verification Types
 */

export interface VerificationCustomerInfo {
  name: string
  rating: number
  seats: number
}

export interface VerificationVehicleInfo {
  registration: string
  model: string
  verified: boolean
}

export interface VerificationPickupInfo {
  address: string
  distance_meters: number
  proximity_ok: boolean
  accuracy_meters: number
  accuracy_ok: boolean
}

export interface VerificationWaitingTimer {
  arrived_at: string | null
  elapsed_seconds: number
  no_show_eligible: boolean
  contact_attempts: number
}

export interface VerificationPinStatus {
  attempts_remaining: number
  is_locked: boolean
  dev_pin?: string
}

export interface RideVerificationStatus {
  ride_id: string
  status: string
  customer: VerificationCustomerInfo
  vehicle: VerificationVehicleInfo
  pickup: VerificationPickupInfo
  destination: {
    address: string
    lat: number
    lng: number
  }
  waiting_timer: VerificationWaitingTimer
  pin: VerificationPinStatus
  fare: number
}

export interface StartRideResponse {
  success: boolean
  message: string
  ride_id: string
  status: string
  started_at: string
  destination: {
    address: string
    lat: number
    lng: number
  }
  fare: number
  route_polyline?: string
}
