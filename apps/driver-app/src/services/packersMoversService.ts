/**
 * Packers & Movers Service — Partner App
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative client for Residential / Office Shifting & Relocation Logistics:
 *  - Moving orders list & active relocation jobs
 *  - Inventory inspection (Move size, room items, fragile packaging, assembly)
 *  - Relocation quote bidding with crew size & truck type
 *  - Milestone execution (Packing Started -> Loaded -> In-Transit -> Unpacking -> Completed)
 *  - POD verification with delivery OTP & damage assessment
 */
import { api } from '../api/client'

export interface MovingOrderItem {
  id: string
  order_number?: string
  customer_id: string
  move_size: string // 1_BHK | 2_BHK | 3_BHK | 4_BHK | VILLA | OFFICE
  status: string
  status_label: string
  scheduled_move_date: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  pickup_floor: number
  pickup_has_lift: boolean
  drop_address: string
  drop_lat: number
  drop_lng: number
  drop_floor: number
  drop_has_lift: boolean
  distance_km: number
  requires_assembly: boolean
  requires_fragile_packing: boolean
  insurance_opted: boolean
  declared_value: number
  estimated_cost: number
  final_fare?: number
  items?: Array<{
    category: string
    name: string
    quantity: number
    is_fragile?: boolean
  }>
  created_at: string
}

export interface MovingQuotePayload {
  order_id: string
  mover_id: string
  quoted_fare: number
  crew_size: number
  truck_type: string
  estimated_hours: number
  notes?: string
}

class PackersMoversServiceClass {
  /**
   * Fetch all assigned moving orders for the authenticated partner
   */
  public async getMyMovingOrders(): Promise<MovingOrderItem[]> {
    try {
      const res = await api.get('/packers/my-orders')
      const list = res.data?.data?.orders || res.data?.data || []
      return Array.isArray(list) ? list : []
    } catch (err: any) {
      console.warn('[PackersMoversService] getMyMovingOrders error:', err.message)
      return []
    }
  }

  /**
   * Fetch available relocation leads/requests for quotation bidding
   */
  public async getOpenMovingRequests(): Promise<MovingOrderItem[]> {
    try {
      const res = await api.get('/packers/driver-requests')
      const list = res.data?.data || []
      return Array.isArray(list) ? list : []
    } catch (err: any) {
      console.warn('[PackersMoversService] getOpenMovingRequests error:', err.message)
      return []
    }
  }

  /**
   * Submit relocation quotation for an open moving request
   */
  public async submitMovingQuote(payload: MovingQuotePayload): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post('/packers/quotes', payload)
      return res.data?.data || res.data || { success: true, message: 'Quote submitted successfully' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to submit moving quote'
      throw new Error(msg)
    }
  }

  /**
   * Update relocation milestone
   */
  public async updateMilestone(orderId: string, newStatus: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/packers/orders/${orderId}/milestone`, {
        new_status: newStatus,
      })
      return res.data?.data || res.data || { success: true, message: 'Milestone updated' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to update moving milestone'
      throw new Error(msg)
    }
  }

  /**
   * Verify POD with 4-digit Delivery OTP and complete shifting order
   */
  public async verifyMovingPOD(payload: {
    order_id: string
    delivery_otp: string
    signature_url?: string
    damage_reported?: boolean
    damage_description?: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/packers/orders/${payload.order_id}/pod`, payload)
      return res.data?.data || res.data || { success: true, message: 'POD verified successfully' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to verify POD'
      throw new Error(msg)
    }
  }
}

export const PackersMoversService = new PackersMoversServiceClass()
