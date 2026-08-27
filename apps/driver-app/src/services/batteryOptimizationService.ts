/**
 * Battery Optimization & Background Execution Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides helpers and system intents for Android Doze Mode / Battery Optimization
 * Whitelisting, Background Location (Allow all the time), and System Alert Overlays.
 */
import { Platform, Linking, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'

const BATTERY_OPT_KEY = '@driver_battery_opt_configured_v2'

export interface BackgroundReadinessStatus {
  backgroundLocationGranted: boolean
  foregroundLocationGranted: boolean
  notificationsGranted: boolean
  batteryConfigured: boolean
}

export class BatteryOptimizationService {
  /**
   * Request Android to Ignore Battery Optimizations (Unrestricted mode).
   * Opens Android Application Details / Settings where user can toggle Battery to 'Unrestricted'.
   */
  static async requestIgnoreBatteryOptimization(): Promise<void> {
    if (Platform.OS !== 'android') return

    try {
      // Open device app settings where user can tap Battery -> Unrestricted
      await Linking.openSettings().catch(() => {
        Alert.alert(
          'Battery Settings',
          'Please open Android Settings > Apps > CabBooking Driver > Battery > Select "Unrestricted".'
        )
      })
    } catch (e) {
      console.warn('[BatteryOptimizationService] Error opening battery settings:', e)
      Linking.openSettings().catch(() => {})
    }
  }

  /**
   * Open Location permissions settings page directly
   */
  static async openLocationSettings(): Promise<void> {
    try {
      await Linking.openSettings().catch(() => {})
    } catch (e) {
      console.warn('[BatteryOptimizationService] Error opening location settings:', e)
    }
  }

  /**
   * Check if user has acknowledged or configured battery optimization
   */
  static async isConfigured(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(BATTERY_OPT_KEY)
      return val === 'true'
    } catch {
      return false
    }
  }

  /**
   * Save user configuration state
   */
  static async setConfigured(value: boolean = true): Promise<void> {
    try {
      await AsyncStorage.setItem(BATTERY_OPT_KEY, value ? 'true' : 'false')
    } catch {}
  }

  /**
   * Verify all background readiness parameters
   */
  static async checkBackgroundReadiness(): Promise<BackgroundReadinessStatus> {
    let backgroundLocationGranted = false
    let foregroundLocationGranted = false
    let notificationsGranted = false
    let batteryConfigured = false

    try {
      const fgPerm = await Location.getForegroundPermissionsAsync().catch(() => null)
      foregroundLocationGranted = fgPerm?.status === 'granted'

      const bgPerm = await Location.getBackgroundPermissionsAsync().catch(() => null)
      backgroundLocationGranted = bgPerm?.status === 'granted'

      const notifPerm = await Notifications.getPermissionsAsync().catch(() => null)
      notificationsGranted = notifPerm?.status === 'granted'

      batteryConfigured = await this.isConfigured()
    } catch (e) {
      console.warn('[BatteryOptimizationService] checkBackgroundReadiness error:', e)
    }

    return {
      foregroundLocationGranted,
      backgroundLocationGranted,
      notificationsGranted,
      batteryConfigured,
    }
  }
}
