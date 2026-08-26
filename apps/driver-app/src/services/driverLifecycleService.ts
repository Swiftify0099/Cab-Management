/**
 * Driver App Lifecycle & Network Watchdog Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Coordinates foreground/background transitions, OS lifecycle events,
 * network reconnects, and seamless session restoration.
 */
import { AppState, AppStateStatus } from 'react-native'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { DriverSocketService } from './driverSocketService'
import { AvailabilityService } from './availabilityService'
import { DriverBackgroundLocationService } from './driverBackgroundLocationService'

class DriverLifecycleServiceClass {
  private isInitialized: boolean = false
  private appStateSubscription: any = null
  private netInfoUnsubscribe: any = null
  private currentAppState: AppStateStatus = AppState.currentState

  public init() {
    if (this.isInitialized) return
    this.isInitialized = true

    // 1. Initial State Restoration
    AvailabilityService.restorePersistedState().catch(() => {})

    // 2. Listen to App Lifecycle Transitions
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange)

    // 3. Listen to Network Connectivity
    this.netInfoUnsubscribe = NetInfo.addEventListener(this.handleNetInfoChange)

    console.log('[DriverLifecycleService] Initialized')
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const prev = this.currentAppState
    this.currentAppState = nextAppState
    console.log(`[DriverLifecycleService] AppState: ${prev} -> ${nextAppState}`)

    const isOnline = AvailabilityService.getStateData().state === 'ONLINE'

    if (nextAppState === 'active') {
      // ── Returning to Foreground ───────────────────────────────────────────
      if (isOnline) {
        // Fast restore socket connection and reconcile pending ride offers
        await DriverSocketService.ensureConnected()
        await DriverSocketService.reconcileStateWithBackend()
        AvailabilityService.handleNetworkChange(true)
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // ── Moving to Background ──────────────────────────────────────────────
      if (isOnline) {
        // Ensure background location and foreground service keep socket alive
        const isRunning = await DriverBackgroundLocationService.isRunning()
        if (!isRunning) {
          await DriverBackgroundLocationService.startBackgroundTracking()
        }
      }
    }
  }

  private handleNetInfoChange = (state: NetInfoState) => {
    const isOnline = AvailabilityService.getStateData().state === 'ONLINE'
    if (state.isConnected && state.isInternetReachable !== false) {
      AvailabilityService.handleNetworkChange(true)
      if (isOnline) {
        DriverSocketService.ensureConnected().catch(() => {})
      }
    } else if (state.isConnected === false) {
      AvailabilityService.handleNetworkChange(false)
    }
  }

  public destroy() {
    this.appStateSubscription?.remove?.()
    this.netInfoUnsubscribe?.()
    this.isInitialized = false
  }
}

export const DriverLifecycleService = new DriverLifecycleServiceClass()
