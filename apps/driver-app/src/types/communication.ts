/**
 * Feature 8: Customer Communication Types
 */

export type CallStatus = 'requesting' | 'ringing' | 'connected' | 'ended' | 'failed' | 'declined' | 'missed'

export interface CallSessionData {
  call_session_id: string
  status: CallStatus
  virtual_proxy_number: string
  provider_ref?: string
  customer_name: string
  rate_limit_remaining: number
}

export type MessageType = 'text' | 'quick_message' | 'system_message' | 'location_share'

export interface ChatMessage {
  id: string
  ride_id: string
  sender_id: string
  sender_type: 'driver' | 'customer' | 'system'
  content: string
  message_type: MessageType
  created_at: string
  is_delivered: boolean
  is_read: boolean
}

export type PickupIssueType = 'cant_find_customer' | 'wrong_location' | 'location_requested'

export interface PickupIssuePayload {
  issue_type: PickupIssueType
  details?: string
}

export interface NoShowResponse {
  success: boolean
  message: string
  cancellation_fee: number
  status: string
}
