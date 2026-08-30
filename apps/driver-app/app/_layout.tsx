/**
 * Root Layout
 * ─────────────────────────────────────────────────────────────
 * Wraps all screens with:
 *  1. ErrorBoundary — catches any render crash
 *  2. SafeAreaProvider — ensures safe area context is always present
 *  3. ThemeProvider — manages dark/light theme
 *  4. Stack Navigator — ALWAYS mounted so Expo Router never has missing context
 *  5. PermissionGate — displayed as an overlay if permissions are pending
 *  6. GlobalIncomingRequestOverlay — safely renders incoming ride requests
 */
import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { PermissionGate } from '../src/components/PermissionGate'
import { useStartupPermissions } from '../src/hooks/useStartupPermissions'
import { useDriverNotifications } from '../src/hooks/useDriverNotifications'
import { ThemeProvider } from '../src/theme'
// Ensure Background Location Task is defined at module parse time
import '../src/services/driverBackgroundLocationService'
import { DriverLifecycleService } from '../src/services/driverLifecycleService'
import { useDriverSocket } from '../src/hooks/useDriverSocket'
// IncomingRequestScreen is lazy-loaded to prevent react-native-maps from
// initializing at module scope (crashes Android 14 before JS bridge is ready).
let _IncomingRequestScreen: any = null
function getIncomingRequestScreen() {
  if (!_IncomingRequestScreen) {
    _IncomingRequestScreen = require('./incoming-request').default
  }
  return _IncomingRequestScreen
}

// Keep splash visible until initial render is ready
SplashScreen.preventAutoHideAsync().catch(() => {})

function GlobalIncomingRequestOverlay() {
  const { incomingRequest, clearRequest } = useDriverSocket()

  if (!incomingRequest) return null

  const IncomingRequestScreen = getIncomingRequestScreen()
  return (
    <IncomingRequestScreen
      request={incomingRequest}
      onDismiss={clearRequest}
    />
  )
}

function AppContent() {
  const { status, requestAll, skipGate } = useStartupPermissions()

  // Initialize notifications and lifecycle safely
  useDriverNotifications()

  useEffect(() => {
    try {
      DriverLifecycleService.init()
    } catch (e) {
      console.warn('[RootLayout] DriverLifecycleService.init error:', e)
    }
  }, [])

  useEffect(() => {
    // Hide splash screen once initial check completes
    if (!status.isChecking) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [status.isChecking])

  const showPermissionGate = !status.isChecking && !status.allCriticalGranted

  return (
    <View style={styles.root}>
      {/* 1. Main Navigation Stack — ALWAYS MOUNTED */}
      <Stack screenOptions={{ headerShown: false }} />

      {/* 2. Global Incoming Ride Request Overlay */}
      <GlobalIncomingRequestOverlay />

      {/* 3. Permission Gate Overlay — cleanly sits on top until granted */}
      {showPermissionGate && (
        <View style={StyleSheet.absoluteFill}>
          <PermissionGate
            status={status}
            onRequestAll={requestAll}
            onSkip={skipGate}
            isChecking={status.isChecking}
          />
        </View>
      )}
    </View>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
})
