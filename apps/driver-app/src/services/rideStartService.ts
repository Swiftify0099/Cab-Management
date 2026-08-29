/**
 * Feature 9: Ride Start & Customer Verification Service (Driver App Client)
 * Connects mobile to authoritative 4-point verification checklist and PIN ride start API.
 */
import { api } from '../api/client'
import { RideVerificationStatus, StartRideResponse } from '../types/rideStart'

class RideStartServiceClass {
  /**
   * Fetches live 4-point verification checklist status & server waiting timer.
   */
  public async getVerificationStatus(
    rideId: string,
    latitude: number,
    longitude: number,
    accuracy: number = 10.0
  ): Promise<RideVerificationStatus> {
    try {
      const res = await api.get(`/matching/rides/${rideId}/verification-status`, {
        params: {
          latitude,
          longitude,
          accuracy,
        },
      })
      if (res.data?.data) {
        return res.data.data
      }
      throw new Error('No verification status returned from server.')
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message
      throw new Error(detail || 'Could not fetch verification status.')
    }
  }

  /**
   * Submits 4-digit ride start PIN with driver GPS coordinates for atomic verification.
   */
  public async verifyAndStartRide(
    rideId: string,
    pin: string,
    latitude: number,
    longitude: number,
    accuracy: number = 10.0
  ): Promise<StartRideResponse> {
    try {
      const res = await api.post(`/matching/rides/${rideId}/start`, {
        ride_start_pin: pin,
        latitude,
        longitude,
        accuracy,
      })
      if (res.data?.data) {
        return res.data.data
      }
      return res.data
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message
      throw new Error(detail || 'Failed to verify PIN & start ride.')
    }
  }
}

export const RideStartService = new RideStartServiceClass()
