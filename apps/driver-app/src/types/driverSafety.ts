/**
 * Driver Safety Intelligence & Incident Types — Feature 22
 */

export interface SafetySOSResponse {
  success: boolean
  sos_id: string
  status: string
  ride_id?: string
  driver_id?: string
  latitude: number
  longitude: number
  police_number: string
  created_at: string
  message: string
}

export interface TrustedContactItem {
  contact_id: string
  name: string
  phone_masked: string
  relationship: string
  is_verified: boolean
  created_at?: string
}

export interface LiveTripShareData {
  success: boolean
  share_token: string
  share_url: string
  expires_at: string
  status: string
  message: string
}

export interface SharedTripTelemetry {
  status: string
  pickup_address: string
  destination_address: string
  distance_travelled_km: number
  estimated_distance_km: number
  started_at: string | null
  has_active_sos: boolean
  expires_at: string
}

export type SafetyAlertType = 'ROUTE_DEVIATION' | 'LONG_STOP' | 'OVERSPEED' | 'SUSPICIOUS_GPS'
export type SafetySeverity = 'NORMAL' | 'OBSERVATION' | 'WARNING' | 'URGENT'

export interface SafetyAlertItem {
  alert_id: string
  alert_type: SafetyAlertType
  severity: SafetySeverity
  status: 'ACTIVE' | 'ACKNOWLEDGED_SAFE' | 'ESCALATED' | 'AUTO_RESOLVED'
  details: Record<string, any>
  created_at: string
}

export type SafetyIncidentCategory =
  | 'UNSAFE_PASSENGER'
  | 'ACCIDENT'
  | 'ROAD_HAZARD'
  | 'VEHICLE_ISSUE'
  | 'MEDICAL_EMERGENCY'
  | 'HARASSMENT'
  | 'OTHER'

export interface SafetyIncidentPayload {
  ride_id?: string
  incident_category: SafetyIncidentCategory
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  evidence_urls?: string[]
  latitude?: number
  longitude?: number
}
