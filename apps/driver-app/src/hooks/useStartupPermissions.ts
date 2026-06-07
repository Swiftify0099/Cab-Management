/**
 * useStartupPermissions Hook
 * ─────────────────────────────────────────────────────────────
 * Requests ALL required permissions on first app launch:
 *  1. Location (foreground + background)
 *  2. Push Notifications
 *  3. Camera
 *  4. Media Library (Gallery)
 *  5. Contacts (for emergency contacts feature)
 *
 * Returns a status object so the UI can show a gate screen
 * until critical permissions (location) are granted.
 *
 * NOTE: expo-notifications is imported lazily (inside the function)
 * to avoid a module-init crash when the native module hasn't been
 * compiled yet — which would cause expo-router to receive undefined
 * for the layout module and throw "Cannot read property 'ErrorBoundary'".
 */
import { useState, useEffect, useCallback } from 'react'
import { Platform, Alert } from 'react-native'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'

export interface PermissionStatus {
  location: 'granted' | 'denied' | 'pending'
  backgroundLocation: 'granted' | 'denied' | 'pending' | 'unavailable'
  notifications: 'granted' | 'denied' | 'pending'
  camera: 'granted' | 'denied' | 'pending'
  mediaLibrary: 'granted' | 'denied' | 'pending'
  contacts: 'granted' | 'denied' | 'pending'
  allCriticalGranted: boolean
  isChecking: boolean
}

const INITIAL_STATUS: PermissionStatus = {
  location: 'pending',
  backgroundLocation: 'pending',
  notifications: 'pending',
  camera: 'pending',
  mediaLibrary: 'pending',
  contacts: 'pending',
  allCriticalGranted: false,
  isChecking: true,
}

export function useStartupPermissions(): {
  status: PermissionStatus
  requestAll: () => Promise<void>
} {
  const [status, setStatus] = useState<PermissionStatus>(INITIAL_STATUS)

  const requestAll = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true }))

    // ── 1. Foreground Location (critical) ──────────────────────
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync()
    const locationGranted = fgStatus === 'granted'

    // ── 2. Background Location ─────────────────────────────────
    let bgStatus: PermissionStatus['backgroundLocation'] = 'unavailable'
    if (locationGranted) {
      const { status: bg } = await Location.requestBackgroundPermissionsAsync()
      bgStatus = bg === 'granted' ? 'granted' : 'denied'
    }

    // ── 3. Push Notifications ──────────────────────────────────
    // Use PermissionsAndroid on Android 13+ (API 33+) — no native module needed.
    // expo-notifications requires a native rebuild; PermissionsAndroid is built-in.
    let notifStatus: PermissionStatus['notifications'] = 'pending'
    try {
      if (Platform.OS === 'android') {
        const { PermissionsAndroid, Platform: RNPlatform } = require('react-native')
        if (RNPlatform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'Allow CabBooking to send you ride alerts and trip updates.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Deny',
              buttonPositive: 'Allow',
            }
          )
          notifStatus = result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied'
        } else {
          // Android < 13 — notifications always allowed, no runtime permission needed
          notifStatus = 'granted'
        }
      } else {
        // iOS — handled after expo-notifications native rebuild is complete
        notifStatus = 'granted'
      }
    } catch {
      notifStatus = 'denied'
    }

    // ── 4. Camera ──────────────────────────────────────────────
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync()
    const cameraGranted = camStatus === 'granted'

    // ── 5. Media Library / Gallery ─────────────────────────────
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    const mediaGranted = mediaStatus === 'granted'

    // ── 6. Contacts (Android only — use PermissionsAndroid) ────
    let contactsGranted = false
    if (Platform.OS === 'android') {
      try {
        const { PermissionsAndroid } = require('react-native')
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'CabBooking needs access to your contacts for emergency contact features.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        )
        contactsGranted = result === PermissionsAndroid.RESULTS.GRANTED
      } catch {
        contactsGranted = false
      }
    } else {
      // iOS – contacts not required for core driver features
      contactsGranted = true
    }

    const allCritical = locationGranted

    setStatus({
      location: locationGranted ? 'granted' : 'denied',
      backgroundLocation: bgStatus,
      notifications: notifStatus,
      camera: cameraGranted ? 'granted' : 'denied',
      mediaLibrary: mediaGranted ? 'granted' : 'denied',
      contacts: contactsGranted ? 'granted' : 'denied',
      allCriticalGranted: allCritical,
      isChecking: false,
    })

    // Warn user if critical location was denied
    if (!locationGranted) {
      Alert.alert(
        'Location Required',
        'CabBooking needs location access to match you with passengers and track your trips. Please enable it in Settings.',
        [{ text: 'OK' }]
      )
    }
  }, [])

  // Auto-run on mount
  useEffect(() => {
    requestAll()
  }, [])

  return { status, requestAll }
}
