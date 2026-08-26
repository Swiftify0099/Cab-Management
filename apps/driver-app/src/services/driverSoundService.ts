/**
 * Driver Sound & Siren Service
 * ─────────────────────────────────────────────────────────────
 * Manages dynamic siren audio alerts and continuous vibration ringing
 * for all customer requests (Cab Booking, Parcel, Transport, Hotel transfers).
 *
 * Built with Expo SDK 56 `expo-audio` & native vibration APIs with resilient fallbacks.
 */
import { Platform, Vibration } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Sound source map
export interface SirenOption {
  id: string
  name: string
  subtitle: string
  icon: string
  file?: any
  uri?: string
  nativeSoundName: string // for Android notification channel
}

export const DRIVER_SIRENS: SirenOption[] = [
  {
    id: 'dr_siren',
    name: 'Driver Siren Alert',
    subtitle: 'Dynamic loud driver siren (Recommended)',
    icon: 'volume-2',
    file: require('../../assets/audio/drSiran.mp3'),
    nativeSoundName: 'drsiran',
  },
  {
    id: 'standard_siren',
    name: 'Standard Ride Siren',
    subtitle: 'Classic emergency siren tone',
    icon: 'bell',
    file: require('../../assets/audio/siren.mp3'),
    nativeSoundName: 'siren',
  },
  {
    id: 'urgent_alarm',
    name: 'Urgent Alarm Beep',
    subtitle: 'Fast continuous alarm tone',
    icon: 'alert-triangle',
    uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
    nativeSoundName: 'siren',
  },
  {
    id: 'digital_radar',
    name: 'Digital Radar Pulse',
    subtitle: 'High frequency digital dispatch beep',
    icon: 'activity',
    uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    nativeSoundName: 'siren',
  },
  {
    id: 'smooth_chime',
    name: 'Smooth Alert Chime',
    subtitle: 'Pleasant bugle dispatch chime',
    icon: 'music',
    uri: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg',
    nativeSoundName: 'siren',
  },
]

const STORAGE_KEY_SIREN = 'driver_selected_siren_id'
const STORAGE_KEY_VOLUME = 'driver_siren_volume'
const STORAGE_KEY_VIBRATE = 'driver_siren_vibration_enabled'
const STORAGE_KEY_SOUND_ENABLED = 'driver_sound_alerts_enabled'

type SoundStateListener = (state: {
  isPlaying: boolean
  isMuted: boolean
  activeSirenId: string
  volume: number
}) => void

class DriverSoundServiceImpl {
  private activePlayer: any = null
  private isPlaying: boolean = false
  private isMuted: boolean = false
  private selectedSirenId: string = 'dr_siren'
  private volume: number = 1.0
  private vibrationEnabled: boolean = true
  private soundEnabled: boolean = true
  private vibrationInterval: any = null
  private previewTimeout: any = null
  private listeners: Set<SoundStateListener> = new Set()
  private initialized: boolean = false

  constructor() {
    this.init()
  }

  public async init(): Promise<void> {
    if (this.initialized) return
    try {
      const [savedSiren, savedVol, savedVib, savedSound] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_SIREN),
        AsyncStorage.getItem(STORAGE_KEY_VOLUME),
        AsyncStorage.getItem(STORAGE_KEY_VIBRATE),
        AsyncStorage.getItem(STORAGE_KEY_SOUND_ENABLED),
      ])

      if (savedSiren && DRIVER_SIRENS.some(s => s.id === savedSiren)) {
        this.selectedSirenId = savedSiren
      }
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol) || 1.0
      }
      if (savedVib !== null) {
        this.vibrationEnabled = savedVib !== 'false'
      }
      if (savedSound !== null) {
        this.soundEnabled = savedSound !== 'false'
      }

      this.initialized = true
    } catch {
      this.initialized = true
    }
  }

  public getAvailableSirens(): SirenOption[] {
    return DRIVER_SIRENS
  }

  public getSelectedSirenId(): string {
    return this.selectedSirenId
  }

  public getSelectedSiren(): SirenOption {
    return DRIVER_SIRENS.find(s => s.id === this.selectedSirenId) || DRIVER_SIRENS[0]
  }

  public async setSelectedSirenId(id: string): Promise<void> {
    if (!DRIVER_SIRENS.some(s => s.id === id)) return
    this.selectedSirenId = id
    await AsyncStorage.setItem(STORAGE_KEY_SIREN, id).catch(() => {})
    this.notifyState()
  }

  public isAlertPlaying(): boolean {
    return this.isPlaying
  }

  public isAlertMuted(): boolean {
    return this.isMuted
  }

  public getVolume(): number {
    return this.volume
  }

  public async setVolume(vol: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.activePlayer && typeof this.activePlayer.setVolume === 'function') {
      try {
        this.activePlayer.setVolume(this.isMuted ? 0 : this.volume)
      } catch {}
    }
    await AsyncStorage.setItem(STORAGE_KEY_VOLUME, this.volume.toString()).catch(() => {})
    this.notifyState()
  }

  public async setVibrationEnabled(enabled: boolean): Promise<void> {
    this.vibrationEnabled = enabled
    await AsyncStorage.setItem(STORAGE_KEY_VIBRATE, enabled ? 'true' : 'false').catch(() => {})
  }

  public isVibrationEnabled(): boolean {
    return this.vibrationEnabled
  }

  public async setSoundEnabled(enabled: boolean): Promise<void> {
    this.soundEnabled = enabled
    await AsyncStorage.setItem(STORAGE_KEY_SOUND_ENABLED, enabled ? 'true' : 'false').catch(() => {})
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled
  }

  /**
   * Starts playing the driver's chosen siren in a continuous loop along with vibration
   */
  public async playIncomingAlert(options?: {
    sirenId?: string
    loop?: boolean
    volume?: number
  }): Promise<void> {
    await this.init()
    const targetSirenId = options?.sirenId || this.selectedSirenId
    const siren = DRIVER_SIRENS.find(s => s.id === targetSirenId) || DRIVER_SIRENS[0]
    const shouldLoop = options?.loop ?? true
    const vol = options?.volume ?? this.volume

    this.stopIncomingAlert()

    this.isPlaying = true
    this.isMuted = false
    this.notifyState()

    // 1. Trigger Continuous Looping Vibration
    if (this.vibrationEnabled) {
      try {
        Vibration.cancel()
        // Looping vibration pattern: [wait, buzz, pause, buzz, pause, buzz]
        Vibration.vibrate([0, 500, 200, 500, 200, 500], true)

        // Android fallback heartbeat interval for prolonged ringing (every 2.5s)
        this.vibrationInterval = setInterval(() => {
          if (!this.isPlaying) {
            clearInterval(this.vibrationInterval)
            return
          }
          if (Platform.OS === 'android') {
            Vibration.vibrate([0, 500, 200, 500, 200, 500], false)
          }
        }, 2500)
      } catch (err) {
        console.warn('[DriverSoundService] Vibration error:', err)
      }
    }

    // 2. Play Looping Audio
    if (this.soundEnabled) {
      try {
        const expoAudio = await this.loadExpoAudio()
        if (expoAudio) {
          const { createAudioPlayer, setAudioModeAsync } = expoAudio
          if (typeof setAudioModeAsync === 'function') {
            await setAudioModeAsync({
              playsInSilentMode: true,
            }).catch(() => {})
          }

          const source = siren.file || { uri: siren.uri }
          const player = createAudioPlayer(source)
          if (player) {
            this.activePlayer = player
            if (typeof player.setVolume === 'function') {
              player.setVolume(vol)
            }
            if (typeof player.loop === 'boolean' || 'loop' in player) {
              player.loop = shouldLoop
            }
            if (typeof player.play === 'function') {
              player.play()
            }
          }
        }
      } catch (err) {
        console.warn('[DriverSoundService] Audio playback failed with primary player:', err)
      }
    }
  }

  /**
   * Immediately stops audio playback, cancels vibration and releases resources
   */
  public stopIncomingAlert(): void {
    this.isPlaying = false
    this.isMuted = false

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout)
      this.previewTimeout = null
    }

    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval)
      this.vibrationInterval = null
    }

    try {
      Vibration.cancel()
    } catch {}

    if (this.activePlayer) {
      try {
        if (typeof this.activePlayer.stop === 'function') {
          this.activePlayer.stop()
        }
        if (typeof this.activePlayer.pause === 'function') {
          this.activePlayer.pause()
        }
        if (typeof this.activePlayer.release === 'function') {
          this.activePlayer.release()
        } else if (typeof this.activePlayer.remove === 'function') {
          this.activePlayer.remove()
        }
      } catch (err) {
        console.warn('[DriverSoundService] Player cleanup warning:', err)
      }
      this.activePlayer = null
    }

    this.notifyState()
  }

  /**
   * Mutes or unmutes the audio during active ringing without dismissing the request
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (this.activePlayer && typeof this.activePlayer.setVolume === 'function') {
      try {
        this.activePlayer.setVolume(this.isMuted ? 0 : this.volume)
      } catch {}
    }
    this.notifyState()
    return this.isMuted
  }

  /**
   * Plays a 4-second preview of any chosen siren without locking the state
   */
  public async previewSiren(sirenId: string): Promise<void> {
    await this.init()
    const siren = DRIVER_SIRENS.find(s => s.id === sirenId) || DRIVER_SIRENS[0]

    this.stopIncomingAlert()

    // Short tactile feedback
    try {
      Vibration.vibrate(200)
    } catch {}

    try {
      const expoAudio = await this.loadExpoAudio()
      if (expoAudio) {
        const { createAudioPlayer, setAudioModeAsync } = expoAudio
        if (typeof setAudioModeAsync === 'function') {
          await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
        }

        const source = siren.file || { uri: siren.uri }
        const player = createAudioPlayer(source)
        if (player) {
          this.activePlayer = player
          this.isPlaying = true
          this.notifyState()

          if (typeof player.setVolume === 'function') {
            player.setVolume(this.volume)
          }
          if (typeof player.play === 'function') {
            player.play()
          }

          this.previewTimeout = setTimeout(() => {
            this.stopIncomingAlert()
          }, 4000)
        }
      }
    } catch (err) {
      console.warn('[DriverSoundService] Preview failed:', err)
      this.stopIncomingAlert()
    }
  }

  /**
   * Runs a 5-second complete test simulation with sound and vibration
   * for direct hardware verification on device.
   */
  public async testRinging(sirenId?: string): Promise<void> {
    const target = sirenId || this.selectedSirenId
    await this.playIncomingAlert({ sirenId: target, loop: true })

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout)
    }
    this.previewTimeout = setTimeout(() => {
      this.stopIncomingAlert()
    }, 5000)
  }

  /**
   * Dynamic loader for expo-audio
   */
  private async loadExpoAudio(): Promise<any> {
    try {
      // Dynamic import to prevent crash if native module is hot-reloaded
      const mod = await import('expo-audio')
      return mod
    } catch {
      try {
        const globalMod = Function('return import("expo-audio")')()
        return await globalMod
      } catch {
        return null
      }
    }
  }

  public async playAcceptedSound(): Promise<void> {
    this.stopIncomingAlert()
    try {
      Vibration.vibrate([0, 100, 50, 150])
    } catch {}
  }

  public subscribe(listener: SoundStateListener): () => void {
    this.listeners.add(listener)
    listener({
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      activeSirenId: this.selectedSirenId,
      volume: this.volume,
    })
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyState(): void {
    const state = {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      activeSirenId: this.selectedSirenId,
      volume: this.volume,
    }
    this.listeners.forEach(fn => {
      try {
        fn(state)
      } catch {}
    })
  }
}

export const DriverSoundService = new DriverSoundServiceImpl()
