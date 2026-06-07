/**
 * Root Layout
 * ─────────────────────────────────────────────────────────────
 * Wraps all screens with:
 *  1. ErrorBoundary — catches any render crash
 *  2. PermissionGate — requests startup permissions before
 *     allowing navigation into the app
 */
import { Stack } from 'expo-router'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { PermissionGate } from '../src/components/PermissionGate'
import { useStartupPermissions } from '../src/hooks/useStartupPermissions'

function AppWithPermissions() {
  const { status, requestAll } = useStartupPermissions()

  // Show permission gate while checking OR if critical perms not granted
  if (status.isChecking || !status.allCriticalGranted) {
    return (
      <PermissionGate
        status={status}
        onRequestAll={requestAll}
        isChecking={status.isChecking}
      />
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppWithPermissions />
    </ErrorBoundary>
  )
}

