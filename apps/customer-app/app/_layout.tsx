import { Slot } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '../src/store/auth.store'
import { usePushNotifications } from '../src/hooks/usePushNotifications'
import { ThemeProvider } from '../src/contexts/ThemeContext'

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)
  usePushNotifications() // Automatically registers and syncs with backend

  useEffect(() => {
    initialize()
  }, [])

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  )
}
