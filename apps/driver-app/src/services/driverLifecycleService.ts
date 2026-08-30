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
import { RideQueueService } from './rideQueueService'

class DriverLifecycleServiceClass {
  private isInitialized: boolean = false
  private appStateSubscription: any = null
  private netInfoUnsubscribe: any = null
  private currentAppState: AppStateStatus = AppState.currentState
  // Debounce: prevent reconciliation spam on rapid state transitions
  private lastReconcileTime: number = 0
  private readonly RECONCILE_DEBOUNCE_MS = 5000 // 5 seconds minimum between reconciles

  public init() {
    if (this.isInitialized) return
    this.isInitialized = true

    // State is already restored by AvailabilityService constructor (deferred)
    // Calling restorePersistedState() here would race with the deferred init.

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
        // Fast restore socket connection
        await DriverSocketService.ensureConnected()
        AvailabilityService.handleNetworkChange(true)
        // Debounced reconciliation — source-of-truth sync with backend
        // This is the primary recovery mechanism for killed/backgrounded app:
        // fetches all current pending offers and replaces local queue state.
        await this.reconcileDebounced()
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // ── Moving to Background ──────────────────────────────────────────────
      // Note: Android 14 prohibits starting foreground services from the background.
      // The background service is already initiated when driver toggles "Go Online" in foreground.
    }
  }

  private handleNetInfoChange = (state: NetInfoState) => {
    const isOnline = AvailabilityService.getStateData().state === 'ONLINE'
    if (state.isConnected && state.isInternetReachable !== false) {
      AvailabilityService.handleNetworkChange(true)
      if (isOnline) {
        DriverSocketService.ensureConnected()
          .then(() => this.reconcileDebounced())
          .catch(() => {})
      }
    } else if (state.isConnected === false) {
      AvailabilityService.handleNetworkChange(false)
    }
  }

  /**
   * Debounced reconciliation — prevents multiple simultaneous reconcile calls
   * when rapid app state changes or network flaps occur.
   * Minimum 5 seconds between consecutive reconciliations.
   */
  private reconcileDebounced = async () => {
    const now = Date.now()
    if (now - this.lastReconcileTime < this.RECONCILE_DEBOUNCE_MS) {
      console.log('[DriverLifecycleService] Reconcile skipped (debounced)')
      return
    }
    this.lastReconcileTime = now
    try {
      await DriverSocketService.reconcileStateWithBackend()
    } catch (err) {
      console.warn('[DriverLifecycleService] Reconcile error:', err)
    }
  }

  public destroy() {
    this.appStateSubscription?.remove?.()
    this.netInfoUnsubscribe?.()
    this.isInitialized = false
  }
}

export const DriverLifecycleService = new DriverLifecycleServiceClass()
