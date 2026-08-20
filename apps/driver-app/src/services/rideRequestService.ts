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
      const res = await api.post('/matching/rides/respond', {
        offer_id: payload.offer_id,
        accepted: payload.accepted,
        rejection_reason: payload.rejection_reason || null,
      })
      this.activeOffer = null
      return res.data?.data || res.data || { success: true, message: 'Response recorded', status: payload.accepted ? 'accepted' : 'rejected' }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err.message || 'Failed to submit response'
      throw new Error(errorMsg)
    }
  }

  /**
   * Fetch active assigned ride or pending offer on app reconnect
   */
  public async getActiveRide(): Promise<any> {
    try {
      const res = await api.get('/matching/rides/active')
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
      const res = await api.get('/matching/rides/categories')
      return res.data?.data || []
    } catch (err) {
      console.warn('[RideRequestService] getRideCategories error:', err)
      return []
    }
  }
}

export const RideRequestService = new RideRequestServiceClass()
