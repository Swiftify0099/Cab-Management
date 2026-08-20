/**
 * Driver Preference Service — Feature 6
 * Manages driving focus modes, trip types, and destination mode preferences.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../api/client'
import { DriverPreferencesData } from '../types/smartRadar'

const STORAGE_KEY = '@driver_ride_preferences_v1'

const DEFAULT_PREFERENCES: DriverPreferencesData = {
  mode: 'balanced',
  allow_local: true,
  allow_airport: true,
  allow_outstation: false,
  allow_scheduled: true,
  min_earning_cutoff: 0,
  max_pickup_distance_km: 7.0,
  max_pickup_eta_min: 15,
  destination_mode: 'off',
  destination_address: null,
  destination_lat: null,
  destination_lng: null,
}

class DriverPreferenceServiceClass {
  private cachedPreferences: DriverPreferencesData = { ...DEFAULT_PREFERENCES }

  constructor() {
    this.loadFromCache()
  }

  private async loadFromCache() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (raw) {
        this.cachedPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
      }
    } catch {}
  }

  public getCachedPreferences(): DriverPreferencesData {
    return { ...this.cachedPreferences }
  }

  public async getPreferences(): Promise<DriverPreferencesData> {
    try {
      const res = await api.get('/matching/preferences')
      if (res.data?.data) {
        this.cachedPreferences = { ...DEFAULT_PREFERENCES, ...res.data.data }
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedPreferences))
      }
      return { ...this.cachedPreferences }
    } catch (err) {
      console.warn('[DriverPreferenceService] getPreferences failed, using cached:', err)
      return { ...this.cachedPreferences }
    }
  }

  public async updatePreferences(data: Partial<DriverPreferencesData>): Promise<DriverPreferencesData> {
    this.cachedPreferences = { ...this.cachedPreferences, ...data }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedPreferences))

    try {
      const res = await api.patch('/matching/preferences', data)
      if (res.data?.data) {
        this.cachedPreferences = { ...DEFAULT_PREFERENCES, ...res.data.data }
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedPreferences))
      }
      return { ...this.cachedPreferences }
    } catch (err: any) {
      console.warn('[DriverPreferenceService] updatePreferences server sync failed:', err)
      return { ...this.cachedPreferences }
    }
  }
}

export const DriverPreferenceService = new DriverPreferenceServiceClass()
