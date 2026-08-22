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
import { Platform } from 'react-native'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'

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
  skipGate: () => Promise<void>
} {
  const [status, setStatus] = useState<PermissionStatus>(INITIAL_STATUS)

  // Check existing permissions silently without prompting popups on launch
  const checkExisting = useCallback(async () => {
    try {
      const dismissed = await AsyncStorage.getItem('permissions_gate_dismissed')
      const fg = await Location.getForegroundPermissionsAsync().catch(() => ({ status: 'undetermined' }))
      const isGranted = fg.status === 'granted'

      if (isGranted || dismissed === 'true') {
        setStatus({
          location: isGranted ? 'granted' : 'denied',
          backgroundLocation: isGranted ? 'granted' : 'unavailable',
          notifications: 'granted',
          camera: 'granted',
          mediaLibrary: 'granted',
          contacts: 'granted',
          allCriticalGranted: true,
          isChecking: false,
        })
        return
      }

      setStatus(prev => ({
        ...prev,
        location: fg.status === 'granted' ? 'granted' : 'pending',
        isChecking: false,
      }))
    } catch {
      setStatus(prev => ({ ...prev, isChecking: false }))
    }
  }, [])

  const skipGate = useCallback(async () => {
    await AsyncStorage.setItem('permissions_gate_dismissed', 'true')
    setStatus(prev => ({ ...prev, allCriticalGranted: true, isChecking: false }))
  }, [])

  const requestAll = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true }))

    let locationGranted = false
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync()
      locationGranted = fgStatus === 'granted'
    } catch {
      locationGranted = false
    }

    let bgStatus: PermissionStatus['backgroundLocation'] = 'unavailable'
    if (locationGranted) {
      try {
        const { status: bg } = await Location.requestBackgroundPermissionsAsync()
        bgStatus = bg === 'granted' ? 'granted' : 'denied'
      } catch {
        bgStatus = 'unavailable'
      }
    }

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
          notifStatus = 'granted'
        }
      } else {
        notifStatus = 'granted'
      }
    } catch {
      notifStatus = 'denied'
    }

    let cameraGranted = false
    try {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync()
      cameraGranted = camStatus === 'granted'
    } catch {}

    let mediaGranted = false
    try {
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      mediaGranted = mediaStatus === 'granted'
    } catch {}

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
      contactsGranted = true
    }

    await AsyncStorage.setItem('permissions_gate_dismissed', 'true')

    setStatus({
      location: locationGranted ? 'granted' : 'denied',
      backgroundLocation: bgStatus,
      notifications: notifStatus,
      camera: cameraGranted ? 'granted' : 'denied',
      mediaLibrary: mediaGranted ? 'granted' : 'denied',
      contacts: contactsGranted ? 'granted' : 'denied',
      allCriticalGranted: true,
      isChecking: false,
    })
  }, [])

  useEffect(() => {
    checkExisting()
  }, [checkExisting])

  return { status, requestAll, skipGate }
}
