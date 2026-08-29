/**
 * Smart Radar Service — Feature 6
 * Fetches personalized radar opportunities, manages multi-selections, and submits match interest.
 */
import { api } from '../api/client'
import { SmartRadarCandidate, SmartRadarFilterType, SmartRadarMatchResult } from '../types/smartRadar'

class SmartRadarServiceClass {
  public async getCandidates(filterType: SmartRadarFilterType = 'all'): Promise<SmartRadarCandidate[]> {
    try {
      const res = await api.get(`/matching/radar/candidates?filter_type=${filterType}`)
      const candidates = res.data?.data?.candidates || res.data?.data?.rides || []
      return candidates
    } catch (err: any) {
      console.warn('[SmartRadarService] getCandidates API error:', err.message)
      return []
    }
  }

  public async submitMatchRequest(selectedRideIds: string[]): Promise<SmartRadarMatchResult> {
    try {
      const res = await api.post('/matching/radar/match', {
        selected_ride_ids: selectedRideIds,
      })
      return res.data?.data || res.data || { success: true, message: 'Match request submitted', status: 'matched' }
    } catch (err: any) {
      console.warn('[SmartRadarService] submitMatchRequest failed:', err)
      return {
        success: false,
        message: err?.response?.data?.detail || err.message || 'Failed to submit match interest',
        status: 'error',
      }
    }
  }

  /**
   * Safe empty fallback adhering to Zero Mock Data
   */
  public getFallbackCandidates(filterType: SmartRadarFilterType = 'all'): SmartRadarCandidate[] {
    return []
  }
}

export const SmartRadarService = new SmartRadarServiceClass()
