/**
 * Back-to-Back Rides Continuous Dispatch Service — Feature 21
 */
import { api } from '../api/client'
import {
  BackToBackEligibilityData,
  BackToBackCandidate,
  BackToBackReservationResponse,
} from '../types/backToBack'

class BackToBackServiceClass {
  public async checkEligibility(
    rideId: string,
    lat: number,
    lng: number
  ): Promise<BackToBackEligibilityData> {
    try {
      const res = await api.get(`/matching/rides/${rideId}/back-to-back/eligibility`, {
        params: { lat, lng },
      })
      return res.data?.data || { eligible: false, reason: 'Failed to evaluate' }
    } catch (err) {
      console.warn('[BackToBackService] checkEligibility error:', err)
      return {
        eligible: false,
        distance_to_dropoff_km: 10.0,
        estimated_dropoff_eta_min: 25,
        dropoff_address: '',
        reason: 'Network error',
      }
    }
  }

  public async getCandidates(rideId: string): Promise<BackToBackCandidate[]> {
    try {
      const res = await api.get(`/matching/rides/${rideId}/back-to-back/candidates`)
      return res.data?.data || []
    } catch (err) {
      console.warn('[BackToBackService] getCandidates error:', err)
      return []
    }
  }

  public async reserveNextRide(
    currentRideId: string,
    nextRideId: string
  ): Promise<BackToBackReservationResponse> {
    const res = await api.post(`/matching/rides/${currentRideId}/back-to-back/reserve`, {
      next_ride_id: nextRideId,
    })
    return res.data?.data
  }

  public async releaseNextRide(
    currentRideId: string,
    reason: string = 'Driver requested'
  ): Promise<any> {
    const res = await api.post(`/matching/rides/${currentRideId}/back-to-back/release`, {
      reason,
    })
    return res.data?.data
  }
}

export const BackToBackService = new BackToBackServiceClass()
