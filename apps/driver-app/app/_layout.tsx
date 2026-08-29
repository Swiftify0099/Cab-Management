/**
 * Root Layout
 * ─────────────────────────────────────────────────────────────
 * Wraps all screens with:
 *  1. ErrorBoundary — catches any render crash
 *  2. SplashScreen — held open until permissions are resolved
 *  3. PermissionGate — requests startup permissions before
 *     allowing navigation into the app
 *  4. useDriverNotifications — registered AFTER permissions are
 *     granted so it never fires before the native modules are ready
 */
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { PermissionGate } from '../src/components/PermissionGate'
import { useStartupPermissions } from '../src/hooks/useStartupPermissions'
import { useDriverNotifications } from '../src/hooks/useDriverNotifications'
import { ThemeProvider } from '../src/theme'
// Ensure Background Location Task is defined at module parse time
import '../src/services/driverBackgroundLocationService'
import { DriverLifecycleService } from '../src/services/driverLifecycleService'

// Keep the splash screen visible while permissions are being checked.
// This prevents the flash of unstyled content between splash and PermissionGate.
SplashScreen.preventAutoHideAsync()

// ── Inner component: runs after permissions are confirmed ──────────────────────
import { useDriverSocket } from '../src/hooks/useDriverSocket'
import IncomingRequestScreen from './incoming-request'

function GlobalIncomingRequestOverlay() {
  const { incomingRequest, clearRequest } = useDriverSocket()

  if (!incomingRequest) return null

  return (
    <IncomingRequestScreen
      request={incomingRequest}
      onDismiss={clearRequest}
    />
  )
}

function AppReady() {
  // Register for push notifications ONLY after app is fully initialised
  useDriverNotifications()

  // Initialize lifecycle & connection watchdog
  useEffect(() => {
    DriverLifecycleService.init()
  }, [])

  // Hide splash now that we have the correct screen to show
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalIncomingRequestOverlay />
    </>
  )
}

// ── Outer component: handles permission gate ───────────────────────────────────
function AppWithPermissions() {
  const { status, requestAll, skipGate } = useStartupPermissions()

  if (status.isChecking || !status.allCriticalGranted) {
    return (
      <PermissionGate
        status={status}
        onRequestAll={requestAll}
        onSkip={skipGate}
        isChecking={status.isChecking}
      />
    )
  }

  return <AppReady />
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppWithPermissions />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
