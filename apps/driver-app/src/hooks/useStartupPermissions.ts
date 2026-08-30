/**
 * useStartupPermissions Hook
 * ─────────────────────────────────────────────────────────────
 * Requests required permissions on startup:
 *  1. Location (foreground)
 *  2. Push Notifications
 *  3. Camera
 *  4. Media Library (Gallery)
 *  5. Contacts (for emergency contacts feature)
 *
 * Robust error handling so no platform exception can crash the app.
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
    } catch (e) {
      console.warn('[useStartupPermissions] checkExisting error:', e)
      setStatus(prev => ({ ...prev, isChecking: false }))
    }
  }, [])

  const skipGate = useCallback(async () => {
    try {
      await AsyncStorage.setItem('permissions_gate_dismissed', 'true')
    } catch {}
    setStatus(prev => ({ ...prev, allCriticalGranted: true, isChecking: false }))
  }, [])

  const requestAll = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true }))

    let locationGranted = false
    try {
      const fgRes = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }))
      locationGranted = fgRes.status === 'granted'
    } catch {
      locationGranted = false
    }

    let bgStatus: PermissionStatus['backgroundLocation'] = 'unavailable'
    if (locationGranted) {
      try {
        // Silently check if background location is already granted (do NOT prompt concurrently)
        const bgRes = await Location.getBackgroundPermissionsAsync().catch(() => ({ status: 'undetermined' }))
        bgStatus = bgRes.status === 'granted' ? 'granted' : 'pending'
      } catch {
        bgStatus = 'unavailable'
      }
    }

    let notifStatus: PermissionStatus['notifications'] = 'granted'
    try {
      const Notifications = require('expo-notifications')
      const notifRes = await Notifications.requestPermissionsAsync().catch(() => ({ status: 'denied' }))
      notifStatus = notifRes.status === 'granted' ? 'granted' : 'denied'
    } catch {
      notifStatus = 'denied'
    }

    let cameraGranted = false
    try {
      const camRes = await ImagePicker.requestCameraPermissionsAsync().catch(() => ({ status: 'denied' }))
      cameraGranted = camRes.status === 'granted'
    } catch {
      cameraGranted = false
    }

    let mediaGranted = false
    try {
      const mediaRes = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => ({ status: 'denied' }))
      mediaGranted = mediaRes.status === 'granted'
    } catch {
      mediaGranted = false
    }

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
        ).catch(() => PermissionsAndroid.RESULTS.DENIED)
        contactsGranted = result === PermissionsAndroid.RESULTS.GRANTED
      } catch {
        contactsGranted = false
      }
    } else {
      contactsGranted = true
    }

    try {
      await AsyncStorage.setItem('permissions_gate_dismissed', 'true')
    } catch {}

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
