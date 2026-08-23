/**
 * Driver Request Coverage Service
 * Manages Driver Request Visibility preferences: ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX.
 */
import { api } from '../api/client'

export type VisibilityMode = 'all_city' | 'specific_city' | 'specific_hex'

export interface ServiceCityItem {
  city_id: string
  name: string
  state: string
  country: string
  center_lat?: number
  center_lng?: number
  is_selected?: boolean
  is_active?: boolean
}

export interface ServiceZoneItem {
  zone_id: string
  city_id: string
  name: string
  center_lat?: number
  center_lng?: number
}

export interface ServiceHexItem {
  hex_id: string
  h3_index: string
  display_name?: string
  center_lat: number
  center_lng: number
  resolution: number
  city_name?: string
}

export interface DriverCoverageData {
  visibility_mode: VisibilityMode
  covered_cities: ServiceCityItem[]
  covered_hexes: ServiceHexItem[]
}

class CoverageServiceClass {
  /**
   * Fetch all available service cities on the platform
   */
  public async getAvailableCities(): Promise<ServiceCityItem[]> {
    try {
      const res = await api.get('/matching/rides/coverage/cities')
      return res.data?.data?.cities || []
    } catch (err: any) {
      console.warn('[CoverageService] getAvailableCities error:', err.message)
      return [
        { city_id: 'city-sangli', name: 'Sangli', state: 'Maharashtra', country: 'India', is_active: true },
        { city_id: 'city-kolhapur', name: 'Kolhapur', state: 'Maharashtra', country: 'India', is_active: true },
        { city_id: 'city-pune', name: 'Pune', state: 'Maharashtra', country: 'India', is_active: true },
        { city_id: 'city-mumbai', name: 'Mumbai', state: 'Maharashtra', country: 'India', is_active: true },
      ]
    }
  }

  /**
   * Fetch zones for a given city
   */
  public async getCityZones(cityId: string): Promise<ServiceZoneItem[]> {
    try {
      const res = await api.get(`/matching/rides/coverage/zones/${cityId}`)
      return res.data?.data?.zones || []
    } catch (err: any) {
      console.warn('[CoverageService] getCityZones error:', err.message)
      return []
    }
  }

  /**
   * Fetch driver's current coverage config
   */
  public async getDriverCoverage(): Promise<DriverCoverageData> {
    try {
      const res = await api.get('/matching/rides/coverage')
      const data = res.data?.data
      return {
        visibility_mode: data?.visibility_mode || 'all_city',
        covered_cities: data?.covered_cities || [],
        covered_hexes: data?.covered_hexes || [],
      }
    } catch (err: any) {
      console.warn('[CoverageService] getDriverCoverage error:', err.message)
      return {
        visibility_mode: 'all_city',
        covered_cities: [
          { city_id: 'city-sangli', name: 'Sangli', state: 'Maharashtra', country: 'India', is_selected: true },
          { city_id: 'city-kolhapur', name: 'Kolhapur', state: 'Maharashtra', country: 'India', is_selected: true },
        ],
        covered_hexes: [],
      }
    }
  }

  /**
   * Update driver's visibility mode and coverage
   */
  public async updateDriverCoverage(params: {
    visibility_mode: VisibilityMode
    city_ids?: string[]
    hex_ids?: string[]
  }): Promise<boolean> {
    try {
      const res = await api.put('/matching/rides/coverage', params)
      return res.data?.success ?? true
    } catch (err: any) {
      console.warn('[CoverageService] updateDriverCoverage error:', err.message)
      return false
    }
  }

  /**
   * Fetch live radar request count for radar badge
   */
  public async getRadarCount(): Promise<number> {
    try {
      const res = await api.get('/matching/rides/radar/count')
      return res.data?.data?.count ?? 0
    } catch (err: any) {
      return 0
    }
  }
}

export const CoverageService = new CoverageServiceClass()
