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
      const candidates = res.data?.data?.candidates || []
      return candidates
    } catch (err: any) {
      console.warn('[SmartRadarService] getCandidates API error, using fallback:', err.message)
      return this.getFallbackCandidates(filterType)
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
   * High-quality sample candidate pool for testing & offline demonstrations
   */
  public getFallbackCandidates(filterType: SmartRadarFilterType = 'all'): SmartRadarCandidate[] {
    const list: SmartRadarCandidate[] = [
      {
        ride_id: 'radar-sample-1',
        smart_score: 95.4,
        match_percentage: 95,
        human_reason: '95% Match • Airport Express',
        classification: {
          trip_type: 'AIRPORT',
          distance_class: 'MEDIUM',
          demand_level: 'NORMAL',
          earning_class: 'HIGH_EARNING',
          badge_label: '✈️ Airport Trip • 95% Match',
          badge_color: 'purple',
          earning_per_km: 37.5,
          earning_per_hour: 1020.0,
        },
        pickup_distance_km: 2.1,
        pickup_eta_min: 6,
        trip_distance_km: 14.5,
        trip_duration_min: 32,
        fare: 680.0,
        driver_earning: 544.0,
        pickup: {
          address: 'Koregaon Park North Main Rd, Pune',
          lat: 18.5362,
          lng: 73.8939,
          distance_km: 2.1,
          eta_min: 6,
        },
        destination: {
          address: 'Pune Airport Terminal 2 Departure Gate',
          lat: 18.5822,
          lng: 73.9197,
        },
        seats: 2,
        category_name: 'Economy',
        scoring_version: 'v1',
      },
      {
        ride_id: 'radar-sample-2',
        smart_score: 91.8,
        match_percentage: 92,
        human_reason: '92% Match • High Demand Zone',
        classification: {
          trip_type: 'LOCAL',
          distance_class: 'LONG',
          demand_level: 'VERY_HIGH',
          earning_class: 'HIGH_EARNING',
          badge_label: '🔥 High Demand • ₹32/km',
          badge_color: 'orange',
          earning_per_km: 32.0,
          earning_per_hour: 920.0,
        },
        pickup_distance_km: 3.4,
        pickup_eta_min: 9,
        trip_distance_km: 26.2,
        trip_duration_min: 48,
        fare: 920.0,
        driver_earning: 736.0,
        pickup: {
          address: 'Viman Nagar Near Phoenix Mall, Pune',
          lat: 18.5679,
          lng: 73.9143,
          distance_km: 3.4,
          eta_min: 9,
        },
        destination: {
          address: 'Hinjewadi Phase 3 Tech Park, Pune',
          lat: 18.5913,
          lng: 73.7389,
        },
        seats: 1,
        category_name: 'Premium',
        scoring_version: 'v1',
      },
      {
        ride_id: 'radar-sample-3',
        smart_score: 87.2,
        match_percentage: 87,
        human_reason: '87% Match • Quick Turnaround',
        classification: {
          trip_type: 'LOCAL',
          distance_class: 'SHORT',
          demand_level: 'NORMAL',
          earning_class: 'NORMAL',
          badge_label: '⚡ Quick Trip • 4.2 km',
          badge_color: 'blue',
          earning_per_km: 40.0,
          earning_per_hour: 840.0,
        },
        pickup_distance_km: 1.2,
        pickup_eta_min: 4,
        trip_distance_km: 4.2,
        trip_duration_min: 12,
        fare: 210.0,
        driver_earning: 168.0,
        pickup: {
          address: 'Kalyani Nagar Joggers Park, Pune',
          lat: 18.5478,
          lng: 73.9023,
          distance_km: 1.2,
          eta_min: 4,
        },
        destination: {
          address: 'Magarpatta Cybercity Tower 4',
          lat: 18.5135,
          lng: 73.9298,
        },
        seats: 1,
        category_name: 'Economy',
        scoring_version: 'v1',
      },
      {
        ride_id: 'radar-sample-4',
        smart_score: 82.0,
        match_percentage: 82,
        human_reason: '82% Match • Regular City Ride',
        classification: {
          trip_type: 'LOCAL',
          distance_class: 'MEDIUM',
          demand_level: 'NORMAL',
          earning_class: 'NORMAL',
          badge_label: '★ Great Match',
          badge_color: 'cyan',
          earning_per_km: 26.5,
          earning_per_hour: 680.0,
        },
        pickup_distance_km: 2.8,
        pickup_eta_min: 7,
        trip_distance_km: 11.2,
        trip_duration_min: 24,
        fare: 370.0,
        driver_earning: 296.0,
        pickup: {
          address: 'FC Road Deccan Gymkhana, Pune',
          lat: 18.5196,
          lng: 73.8406,
          distance_km: 2.8,
          eta_min: 7,
        },
        destination: {
          address: 'Baner High Street, Pune',
          lat: 18.5642,
          lng: 73.7769,
        },
        seats: 1,
        category_name: 'Economy',
        scoring_version: 'v1',
      },
    ]

    if (filterType === 'airport') return list.filter(c => c.classification.trip_type === 'AIRPORT')
    if (filterType === 'best_earnings') return list.filter(c => c.classification.earning_class === 'HIGH_EARNING')
    if (filterType === 'closest') return list.filter(c => c.pickup_distance_km <= 2.5)
    return list
  }
}

export const SmartRadarService = new SmartRadarServiceClass()
