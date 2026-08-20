/**
 * Destination Mode API Service — Feature 20
 */
import { api } from '../api/client'
import {
  DestinationModeStatusData,
  SetDestinationModePayload,
} from '../types/destinationMode'

class DestinationModeServiceClass {
  public async getStatus(): Promise<DestinationModeStatusData> {
    try {
      const res = await api.get('/matching/destination-mode/status')
      if (res.data?.data) {
        return res.data.data
      }
      return {
        state: 'OFF',
        is_active: false,
        mode_preference: 'balanced',
        destination_address: null,
        destination_lat: null,
        destination_lng: null,
        activated_at: null,
        expires_at: null,
        remaining_seconds: 0,
        rides_completed: 0,
        max_rides: 2,
        radius_km: 1.5,
      }
    } catch (err) {
      console.warn('[DestinationModeService] getStatus error:', err)
      return {
        state: 'OFF',
        is_active: false,
        mode_preference: 'balanced',
        destination_address: null,
        destination_lat: null,
        destination_lng: null,
        activated_at: null,
        expires_at: null,
        remaining_seconds: 0,
        rides_completed: 0,
        max_rides: 2,
        radius_km: 1.5,
      }
    }
  }

  public async setDestinationMode(payload: SetDestinationModePayload): Promise<any> {
    const res = await api.post('/matching/destination-mode', payload)
    return res.data?.data
  }

  public async updateProgress(lat: number, lng: number): Promise<{ reached: boolean; state: string }> {
    const res = await api.post('/matching/destination-mode/progress', {
      latitude: lat,
      longitude: lng,
    })
    return res.data?.data || { reached: false, state: 'ACTIVE' }
  }
}

export const DestinationModeService = new DestinationModeServiceClass()
