/**
 * Ride Request Service — Feature 5
 * Manages on-demand ride offers, server responses, deduplication, and active ride recovery.
 */
import { api } from '../api/client'
import {
  RideOfferPayload,
  RideOfferResponsePayload,
  RideCategoryModel,
} from '../types/rideRequest'

class RideRequestServiceClass {
  private handledOfferIds: Set<string> = new Set()
  private activeOffer: RideOfferPayload | null = null

  /**
   * Check if offer was already processed/dismissed to prevent duplicate alerts
   */
  public isDuplicateOffer(offerId: string): boolean {
    if (!offerId) return false
    return this.handledOfferIds.has(offerId)
  }

  public registerOffer(offer: RideOfferPayload) {
    if (offer?.offer_id) {
      this.activeOffer = offer
      this.handledOfferIds.add(offer.offer_id)
      // Keep memory footprint small
      if (this.handledOfferIds.size > 100) {
        const oldest = Array.from(this.handledOfferIds).slice(0, 50)
        oldest.forEach(id => this.handledOfferIds.delete(id))
      }
    }
  }

  public clearActiveOffer() {
    this.activeOffer = null
  }

  public getActiveOffer(): RideOfferPayload | null {
    return this.activeOffer
  }

  /**
   * Respond to ride offer (Accept or Reject)
   */
  public async respondToOffer(payload: RideOfferResponsePayload): Promise<{
    success: boolean
    message: string
    status: string
    ride_request_id?: string
  }> {
    try {
      const requestData = {
        offer_id: payload.offer_id,
        ride_request_id: payload.ride_request_id,
        booking_id: payload.booking_id,
        accepted: payload.accepted,
        rejection_reason: payload.rejection_reason || null,
      }
      let res: any
      try {
        res = await api.post('/matching/rides/respond', requestData)
      } catch {
        res = await api.post('/rides/respond', requestData)
      }
      this.activeOffer = null
      return res.data?.data || res.data || { success: true, message: 'Response recorded', status: payload.accepted ? 'accepted' : 'rejected' }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err.message || 'Failed to submit response'
      throw new Error(errorMsg)
    }
  }

  /**
   * Verify if a specific offer is still active and valid on the server.
   * Used on notification tap or before responding.
   */
  public async verifyOfferAvailable(offerId: string): Promise<{ available: boolean; offer?: any; reason?: string }> {
    if (!offerId) return { available: false, reason: 'missing_id' }
    try {
      // 1. Try dedicated single offer status endpoint if available
      try {
        const res = await api.get(`/matching/rides/offer/${offerId}/status`)
        const data = res.data?.data || res.data
        return { available: Boolean(data?.available), offer: data?.offer, reason: data?.status }
      } catch {
        // Fallback: search in pending list
        const pending = await this.fetchPendingOffers()
        const match = pending.find((o: any) => o.offer_id === offerId || o.ride_request_id === offerId || o.booking_id === offerId)
        if (match) {
          return { available: true, offer: match }
        }
        return { available: false, reason: 'not_in_pending' }
      }
    } catch (err: any) {
      console.warn('[RideRequestService] verifyOfferAvailable error:', err)
      return { available: false, reason: err?.message || 'network_error' }
    }
  }

  /**
   * Fetch all active pending offers for authenticated driver (Pending Request Recovery)
   */
  public async fetchPendingOffers(): Promise<any[]> {
    try {
      let res: any
      try {
        res = await api.get('/matching/rides/pending')
      } catch {
        try {
          res = await api.get('/rides/pending')
        } catch {
          res = await api.get('/driver/ride-requests/pending')
        }
      }
      const list = res.data?.data || []
      return Array.isArray(list) ? list : []
    } catch (err) {
      console.warn('[RideRequestService] fetchPendingOffers error:', err)
      return []
    }
  }

  /**
   * Fetch active assigned ride or pending offer on app reconnect
   */
  public async getActiveRide(): Promise<any> {
    try {
      let res: any
      try {
        res = await api.get('/matching/rides/active')
      } catch {
        res = await api.get('/rides/active')
      }
      return res.data?.data || null
    } catch (err) {
      console.warn('[RideRequestService] getActiveRide error:', err)
      return null
    }
  }

  /**
   * Fetch all ride categories and current fare configs
   */
  public async getRideCategories(): Promise<RideCategoryModel[]> {
    try {
      let res: any
      try {
        res = await api.get('/matching/rides/categories')
      } catch {
        res = await api.get('/rides/categories')
      }
      return res.data?.data || []
    } catch (err) {
      console.warn('[RideRequestService] getRideCategories error:', err)
      return []
    }
  }
}

export const RideRequestService = new RideRequestServiceClass()
