/**
 * Transport & Commercial Logistics Service — Partner App
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative client for Commercial Freight, Goods Transport & Logistics:
 *  - Real-time active transport job retrieval (via Common Job Contract / Transport Service)
 *  - Open cargo quote bidding and counter-offers
 *  - Milestone execution (Arrive Pickup -> Loading -> In-Transit -> Unloading -> POD)
 *  - Proof-of-Delivery (POD) verification with Delivery OTP & Receiver Sign-off
 */
import { api } from '../api/client'

export interface TransportCargoDetails {
  goods_category: string
  goods_description: string
  weight_kg: number
  package_count: number
  length_ft?: number
  width_ft?: number
  height_ft?: number
  loading_required: boolean
  unloading_required: boolean
  helpers_count: number
  fragile_handling: boolean
  declared_value?: number
}

export interface TransportOrderItem {
  id: string
  order_number: string
  status: string
  status_label: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  pickup_contact_name: string
  pickup_contact_phone: string
  drop_address: string
  drop_lat: number
  drop_lng: number
  drop_contact_name: string
  drop_contact_phone: string
  cargo: TransportCargoDetails
  vehicle_category_required: string
  estimated_fare: number
  final_fare?: number
  created_at: string
  scheduled_pickup_time?: string
  milestones?: {
    arrived_pickup_at?: string
    loading_completed_at?: string
    in_transit_at?: string
    arrived_drop_at?: string
    delivered_at?: string
  }
}

export interface TransportQuoteRequest {
  order_id: string
  driver_id: string
  vehicle_id: string
  amount: number
  included_helpers: number
  estimated_pickup_eta_min: number
  estimated_transit_duration_min: number
  notes?: string
}

class TransportLogisticsServiceClass {
  /**
   * Fetch driver's active transport job from unified Common Job Contract
   */
  public async getActiveTransportJob(): Promise<any | null> {
    try {
      const res = await api.get('/driver/jobs/active')
      const job = res.data?.data
      if (job && job.job_type === 'TRANSPORT') {
        return job
      }
      return null
    } catch (err: any) {
      console.warn('[TransportLogisticsService] getActiveTransportJob error:', err.message)
      return null
    }
  }

  /**
   * Fetch all assigned commercial transport orders for authenticated driver
   */
  public async getMyTransportOrders(): Promise<TransportOrderItem[]> {
    try {
      let res: any
      try {
        res = await api.get('/transport/my-orders')
      } catch {
        res = await api.get('/driver/jobs/history/list?job_type=TRANSPORT')
      }
      const data = res.data?.data?.orders || res.data?.data || []
      return Array.isArray(data) ? data : []
    } catch (err: any) {
      console.warn('[TransportLogisticsService] getMyTransportOrders error:', err.message)
      return []
    }
  }

  /**
   * Fetch open cargo requests available for quote bidding in driver's operating zones
   */
  public async getOpenFreightRequests(): Promise<TransportOrderItem[]> {
    try {
      const res = await api.get('/transport/driver-requests')
      const data = res.data?.data || []
      return Array.isArray(data) ? data : []
    } catch (err: any) {
      console.warn('[TransportLogisticsService] getOpenFreightRequests error:', err.message)
      return []
    }
  }

  /**
   * Submit competitive quotation for an open commercial freight order
   */
  public async submitQuote(payload: TransportQuoteRequest): Promise<{ success: boolean; message: string; quote_id?: string }> {
    try {
      const res = await api.post('/transport/quotes', payload)
      return res.data?.data || res.data || { success: true, message: 'Quote submitted successfully' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to submit quote'
      throw new Error(msg)
    }
  }

  /**
   * Advance transport milestone (Arrived Pickup -> Loading -> Loaded -> In-Transit -> Arrived Drop -> Unloaded)
   */
  public async executeCommand(jobId: string, command: string, params?: Record<string, any>): Promise<{ success: boolean; message: string; next_status?: string }> {
    try {
      let res: any
      try {
        res = await api.post(`/driver/jobs/${jobId}/command`, {
          command,
          params: params || {},
        })
      } catch {
        res = await api.post('/transport/status', {
          order_id: jobId,
          next_status: command,
          notes: params?.notes,
          latitude: params?.latitude,
          longitude: params?.longitude,
        })
      }
      return res.data?.data || res.data || { success: true, message: 'Status updated' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to update transport milestone'
      throw new Error(msg)
    }
  }

  /**
   * Verify Proof of Delivery (POD) with customer 4-digit Delivery OTP and optional signature/photo
   */
  public async verifyPOD(payload: {
    order_id: string
    driver_id: string
    receiver_name: string
    receiver_phone: string
    delivery_otp: string
    photo_url?: string
    signature_url?: string
    delivery_notes?: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      let res: any
      try {
        res = await api.post(`/driver/jobs/${payload.order_id}/command`, {
          command: 'COMPLETE',
          params: {
            otp: payload.delivery_otp,
            signature_url: payload.signature_url,
            photo_url: payload.photo_url,
            receiver_name: payload.receiver_name,
            receiver_phone: payload.receiver_phone,
            delivery_notes: payload.delivery_notes,
          },
        })
      } catch {
        res = await api.post('/transport/pod', payload)
      }
      return res.data?.data || res.data || { success: true, message: 'Delivery confirmed and POD verified' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to verify POD'
      throw new Error(msg)
    }
  }
}

export const TransportLogisticsService = new TransportLogisticsServiceClass()
