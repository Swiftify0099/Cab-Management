/**
 * Destination Mode Types — Feature 20
 */

export type DestinationModeState =
  | 'OFF'
  | 'SETTING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'REACHED'
  | 'EXPIRED'
  | 'DISABLED'

export type DestinationPreferenceMode = 'flexible' | 'balanced' | 'strict'

export interface DestinationModeStatusData {
  state: DestinationModeState
  is_active: boolean
  mode_preference: DestinationPreferenceMode
  destination_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  activated_at: string | null
  expires_at: string | null
  remaining_seconds: number
  rides_completed: number
  max_rides: number
  radius_km: number
}

export interface SetDestinationModePayload {
  destination_address?: string | null
  destination_lat?: number | null
  destination_lng?: number | null
  preference_mode?: DestinationPreferenceMode
  max_rides?: number
  turn_off?: boolean
}

export interface DestinationAlignmentResult {
  alignment_score: number
  cosine_similarity: number
  angle_degrees: number
  is_aligned: boolean
  label: string
  progress_km: number
  distance_to_target_km: number
}
