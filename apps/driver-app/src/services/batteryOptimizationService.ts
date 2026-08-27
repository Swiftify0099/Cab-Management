/**
 * Battery Optimization & Background Execution Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides native intent dispatchers for Android:
 *  1. Battery Optimization whitelist (Unrestricted mode / Ignore battery optimizations)
 *  2. Notification Channel Settings (Sound, Vibration & Override Do Not Disturb)
 *  3. System Alert Window ("Display over other apps" for popup on Google Maps)
 *  4. Location Permissions (Allow all the time)
 *  5. Manufacturer Autostart Managers (Xiaomi, Oppo, Vivo, Realme, OnePlus)
 */
import { Platform, Linking, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'

const BATTERY_OPT_KEY = '@driver_battery_opt_configured_v2'
const PACKAGE_NAME = 'com.cabooking.driver'

export interface BackgroundReadinessStatus {
  backgroundLocationGranted: boolean
  foregroundLocationGranted: boolean
  notificationsGranted: boolean
  batteryConfigured: boolean
}

export class BatteryOptimizationService {
  /**
   * 1. Request Android to Ignore Battery Optimizations (Unrestricted mode).
   * Pops the native Android system dialog:
   * "Stop optimizing battery usage? CabBooking Driver will be able to run in the background"
   */
  static async requestIgnoreBatteryOptimization(): Promise<void> {
    if (Platform.OS !== 'android') return

    try {
      // Direct intent to prompt system whitelist dialog
      await Linking.sendIntent('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', [
        { key: 'data', value: `package:${PACKAGE_NAME}` },
      ])
    } catch {
      try {
        // Fallback to battery optimization list
        await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS')
      } catch {
        // Fallback to app details settings
        await Linking.openSettings().catch(() => {
          Alert.alert(
            'Battery Settings',
            'Please open Settings > Apps > CabBooking Driver > Battery > Select "Unrestricted".'
          )
        })
      }
    }
  }

  /**
   * 2. Open Notification Channel Settings directly for "ride-requests".
   * Driver can toggle "Allow as priority", "Override Do Not Disturb", and custom loud sounds.
   */
  static async openNotificationChannelSettings(channelId: string = 'ride-requests'): Promise<void> {
    if (Platform.OS !== 'android') {
      await Linking.openSettings().catch(() => {})
      return
    }

    try {
      // Direct intent to specific notification channel settings
      await Linking.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: PACKAGE_NAME },
        { key: 'android.provider.extra.CHANNEL_ID', value: channelId },
      ])
    } catch {
      try {
        // Fallback to app notification settings
        await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
          { key: 'android.provider.extra.APP_PACKAGE', value: PACKAGE_NAME },
        ])
      } catch {
        await Linking.openSettings().catch(() => {})
      }
    }
  }

  /**
   * 3. Open "Display Over Other Apps" / System Alert Window settings.
   * Required so incoming ride requests pop up immediately on top of Google Maps / Waze.
   */
  static async openOverlaySettings(): Promise<void> {
    if (Platform.OS !== 'android') return

    try {
      await Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION', [
        { key: 'data', value: `package:${PACKAGE_NAME}` },
      ])
    } catch {
      await Linking.openSettings().catch(() => {})
    }
  }

  /**
   * 4. Open Location permissions settings page directly
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
