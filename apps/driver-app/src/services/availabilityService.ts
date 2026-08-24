/**
 * Driver Availability Service — Feature 4
 * Production-Grade Driver Availability, State Machine, Eligibility,
 * Socket.IO Heartbeat & Active Trip Protection.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { api } from '../api/client'
import { VehicleService, DriverVehicle } from './vehicleService'

export type AvailabilityState =
  | 'OFFLINE'
  | 'GOING_ONLINE'
  | 'ONLINE'
  | 'GOING_OFFLINE'
  | 'ONLINE_BLOCKED'
  | 'AUTO_OFFLINE'
  | 'SUSPENDED'
  | 'BLOCKED'

export type NetworkStatus = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'
export type GPSStatus = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOST' | 'DENIED'

export interface BlockingReason {
  id: string
  title: string
  description: string
  actionLabel: string
  actionRoute: string
}

export interface EligibilityResult {
  eligible: boolean
  reasons: BlockingReason[]
  activeVehicle: DriverVehicle | null
}

export interface AvailabilityStateData {
  state: AvailabilityState
  networkStatus: NetworkStatus
  gpsStatus: GPSStatus
  currentZone: string
  currentCity: string
  lat: number | null
  lng: number | null
  activeVehicle: DriverVehicle | null
  lastHeartbeatTime: number | null
  autoOfflineReason: string | null
  isSimulatedDev: boolean
}

type StateListener = (data: AvailabilityStateData) => void

const STORAGE_KEY = '@driver_availability_state_v1'

class AvailabilityServiceClass {
  private stateData: AvailabilityStateData = {
    state: 'OFFLINE',
    networkStatus: 'CONNECTED',
    gpsStatus: 'GOOD',
    currentZone: 'Pune Central • Zone 1',
    currentCity: 'Pune',
    lat: 18.5204,
    lng: 73.8567,
    activeVehicle: null,
    lastHeartbeatTime: null,
    autoOfflineReason: null,
    isSimulatedDev: false,
  }

  private listeners: Set<StateListener> = new Set()
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private socketRef: any = null
  private disconnectTimeout: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.restorePersistedState()
  }

  private async restorePersistedState() {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        // Safety: default to OFFLINE on app cold start unless actively restored
        this.stateData = {
          ...this.stateData,
          state: parsed.state === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
          currentZone: parsed.currentZone || this.stateData.currentZone,
        }
      }
    } catch {}
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    listener(this.getStateData())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const clone = this.getStateData()
    this.listeners.forEach(fn => {
      try {
        fn(clone)
      } catch (e) {
        console.warn('[AvailabilityService] Listener error:', e)
      }
    })
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clone)).catch(() => {})
  }

  public getStateData(): AvailabilityStateData {
    return { ...this.stateData }
  }

  public setSocketInstance(socket: any) {
    this.socketRef = socket
  }

  /**
   * Evaluates all platform eligibility criteria before allowing driver to go online.
   */
  public async checkEligibility(): Promise<EligibilityResult> {
    const reasons: BlockingReason[] = []
    let activeVehicle: DriverVehicle | null = null

    try {
      // 1. Check Driver Account & KYC
      const [profileRes, kycRes] = await Promise.allSettled([
        api.get('/driver/me'),
        api.get('/driver/kyc/dashboard'),
      ])
      const profile = profileRes.status === 'fulfilled' ? (profileRes.value.data?.data || profileRes.value.data) : null
      const kycData = kycRes.status === 'fulfilled' ? (kycRes.value.data?.data || kycRes.value.data) : null

      if (profile?.status === 'suspended') {
        reasons.push({
          id: 'account_suspended',
          title: 'Account Temporarily Suspended',
          description: 'Your driver partner account has safety or compliance holds.',
          actionLabel: 'Contact Support',
          actionRoute: '/partner/support',
        })
      }

      const isKycVerified =
        profile?.is_verified === true ||
        profile?.kyc_status === 'approved' ||
        profile?.kyc_status === 'APPROVED' ||
        profile?.kyc_status === 'verified' ||
        profile?.kyc_status === 'VERIFIED' ||
        kycData?.can_go_online === true ||
        kycData?.overall_status === 'VERIFIED' ||
        kycData?.overall_status === 'APPROVED'

      if (!isKycVerified) {
        reasons.push({
          id: 'kyc_pending',
          title: 'KYC Document Verification Required',
          description: 'Your driving license, Aadhaar, and background check must be verified.',
          actionLabel: 'Complete KYC',
          actionRoute: '/kyc/status',
        })
      }

      // 2. Check Active Vehicle
      const vehicles = await VehicleService.getVehicles()
      activeVehicle = vehicles.find(v => v.is_active) || null

      if (!activeVehicle) {
        reasons.push({
          id: 'no_active_vehicle',
          title: 'No Active Vehicle Selected',
          description: 'Please select an approved vehicle from your fleet before going online.',
          actionLabel: 'Select Vehicle',
          actionRoute: '/vehicle',
        })
      } else {
        if (activeVehicle.status !== 'ACTIVE' && activeVehicle.status !== 'APPROVED' && activeVehicle.status !== 'INACTIVE') {
          reasons.push({
            id: 'vehicle_unapproved',
            title: `Vehicle Not Approved (${activeVehicle.make} ${activeVehicle.model})`,
            description: `Vehicle compliance is currently ${activeVehicle.status}. Review required documents.`,
            actionLabel: 'View Vehicle',
            actionRoute: `/vehicle/${activeVehicle.id}`,
          })
        }

        // Check expired vehicle docs
        const hasExpiredDoc = activeVehicle.documents.some(d => d.is_expired || d.status === 'expired')
        if (hasExpiredDoc) {
          reasons.push({
            id: 'doc_expired',
            title: 'Vehicle Insurance or Permit Expired',
            description: 'One or more vehicle compliance certificates have expired and require renewal.',
            actionLabel: 'Renew Documents',
            actionRoute: `/vehicle/documents/${activeVehicle.id}`,
          })
        }
      }

      // 3. Check Location Permissions & GPS
      const { status: fgStatus } = await Location.getForegroundPermissionsAsync().catch(() => ({ status: 'undetermined' }))
      if (fgStatus !== 'granted') {
        reasons.push({
          id: 'location_denied',
          title: 'Location Permission Required',
          description: 'Foreground and background GPS access is mandatory to match intercity trip requests.',
          actionLabel: 'Grant Permission',
          actionRoute: '/settings/privacy',
        })
      }
    } catch (err) {
      console.warn('[AvailabilityService] Eligibility check error:', err)
    }

    this.stateData.activeVehicle = activeVehicle
    return {
      eligible: reasons.length === 0,
      reasons,
      activeVehicle,
    }
  }

  /**
   * Request Go Online — Authoritative transaction.
   */
  public async goOnline(): Promise<{ success: boolean; reasons?: BlockingReason[] }> {
    if (this.stateData.state === 'ONLINE') return { success: true }

    this.stateData.state = 'GOING_ONLINE'
    this.notify()

    const eligibility = await this.checkEligibility()
    if (!eligibility.eligible) {
      this.stateData.state = 'ONLINE_BLOCKED'
      this.notify()
      return { success: false, reasons: eligibility.reasons }
    }

    try {
      // Fetch fresh location
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)
      if (loc) {
        this.stateData.lat = loc.coords.latitude
        this.stateData.lng = loc.coords.longitude
        this.stateData.gpsStatus = loc.coords.accuracy && loc.coords.accuracy < 20 ? 'EXCELLENT' : 'GOOD'
      }

      // Authoritative backend notification
      await api.patch('/driver/status', {
        status: 'online',
        lat: this.stateData.lat,
        lng: this.stateData.lng,
      }).catch(() => {})

      // Socket.IO event emission
      if (this.socketRef) {
        this.socketRef.emit('DRIVER_ONLINE', {
          timestamp: Date.now(),
          lat: this.stateData.lat,
          lng: this.stateData.lng,
          vehicle_id: eligibility.activeVehicle?.id,
        })
      }

      this.stateData.state = 'ONLINE'
      this.stateData.autoOfflineReason = null
      this.startSocketHeartbeat()
      this.notify()
      return { success: true }
    } catch (err: any) {
      this.stateData.state = 'OFFLINE'
      this.notify()
      throw err
    }
  }

  /**
   * Request Go Offline — Protected with Active Trip Check.
   */
  public async goOffline(options?: { force?: boolean; reason?: string }): Promise<boolean> {
    if (this.stateData.state === 'OFFLINE') return true

    // Active Trip Protection Guard
    if (!options?.force) {
      const hasActiveTrip = await this.checkForActiveTrip()
      if (hasActiveTrip) {
        throw new Error("You can't go offline while a trip is active. Complete or cancel your active trip first.")
      }
    }

    this.stateData.state = 'GOING_OFFLINE'
    this.notify()

    try {
      await api.patch('/driver/status', { status: 'offline' }).catch(() => {})

      if (this.socketRef) {
        this.socketRef.emit('DRIVER_OFFLINE', {
          timestamp: Date.now(),
          reason: options?.reason || 'DRIVER_INITIATED',
        })
      }

      this.stopSocketHeartbeat()
      this.stateData.state = 'OFFLINE'
      this.notify()
      return true
    } catch (err) {
      this.stateData.state = 'OFFLINE'
      this.notify()
      return true
    }
  }

  /**
   * Check if driver currently has an in-progress or accepted booking.
   */
  public async checkForActiveTrip(): Promise<boolean> {
    try {
      const res = await api.get('/trips/my-trips').catch(() => null)
      const list = res?.data?.data || []
      return list.some((t: any) => t.status === 'in_progress' || t.status === 'accepted')
    } catch {
      return false
    }
  }

  /**
   * Lightweight Socket.IO Ping / Presence loop (scalable, token-efficient).
   */
  private startSocketHeartbeat() {
    this.stopSocketHeartbeat()
    this.pingInterval = setInterval(() => {
      if (this.stateData.state === 'ONLINE' && this.socketRef?.connected) {
        this.socketRef.emit('DRIVER_PING', {
          t: Date.now(),
          lat: this.stateData.lat,
          lng: this.stateData.lng,
        })
        this.stateData.lastHeartbeatTime = Date.now()
      }
    }, 15000) // 15s lightweight socket ping
  }

  private stopSocketHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Handle network disconnect with graceful auto-offline watchdog.
   */
  public handleNetworkChange(isConnected: boolean) {
    if (isConnected) {
      if (this.disconnectTimeout) {
        clearTimeout(this.disconnectTimeout)
        this.disconnectTimeout = null
      }
      this.stateData.networkStatus = 'CONNECTED'
      if (this.stateData.state === 'ONLINE') {
        // Re-sync online presence on reconnect
        this.startSocketHeartbeat()
      }
    } else {
      this.stateData.networkStatus = 'DISCONNECTED'
      if (this.stateData.state === 'ONLINE' && !this.disconnectTimeout) {
        // Grace period (60s) before triggering auto-offline
        this.disconnectTimeout = setTimeout(() => {
          this.triggerAutoOffline('Prolonged network disconnect (>60s).')
        }, 60000)
      }
    }
    this.notify()
  }

  /**
   * Automatic offline triggered by server, timeout, or safety event.
   */
  public triggerAutoOffline(reason: string) {
    this.stopSocketHeartbeat()
    this.stateData.state = 'AUTO_OFFLINE'
    this.stateData.autoOfflineReason = reason
    this.notify()
  }

  /**
   * Update live location coordinates and zone.
   */
  public updateLocation(lat: number, lng: number, accuracy?: number) {
    this.stateData.lat = lat
    this.stateData.lng = lng
    if (accuracy !== undefined) {
      this.stateData.gpsStatus = accuracy < 15 ? 'EXCELLENT' : accuracy < 35 ? 'GOOD' : 'FAIR'
    }
    this.notify()
  }

  public setZone(zone: string, city: string) {
    this.stateData.currentZone = zone
    this.stateData.currentCity = city
    this.notify()
  }

  // ─── Developer Simulation Mode ──────────────────────────────────────────
  public devSimulate(action: 'DROP_NETWORK' | 'RESTORE_NETWORK' | 'LOST_GPS' | 'RESTORE_GPS' | 'AUTO_OFFLINE' | 'BLOCK_KYC' | 'RESET') {
    if (!__DEV__) {
      console.warn('[AvailabilityService] devSimulate is disabled in production builds.')
      return
    }
    this.stateData.isSimulatedDev = true

    if (action === 'DROP_NETWORK') {
      this.handleNetworkChange(false)
    } else if (action === 'RESTORE_NETWORK') {
      this.handleNetworkChange(true)
    } else if (action === 'LOST_GPS') {
      this.stateData.gpsStatus = 'LOST'
      this.notify()
    } else if (action === 'RESTORE_GPS') {
      this.stateData.gpsStatus = 'EXCELLENT'
      this.notify()
    } else if (action === 'AUTO_OFFLINE') {
      this.triggerAutoOffline('Simulated heartbeat timeout in Developer Mode.')
    } else if (action === 'BLOCK_KYC') {
      this.stateData.state = 'ONLINE_BLOCKED'
      this.notify()
    } else if (action === 'RESET') {
      this.stateData.isSimulatedDev = false
      this.stateData.networkStatus = 'CONNECTED'
      this.stateData.gpsStatus = 'GOOD'
      this.stateData.state = 'OFFLINE'
      this.stateData.autoOfflineReason = null
      this.notify()
    }
  }
}

export const AvailabilityService = new AvailabilityServiceClass()
