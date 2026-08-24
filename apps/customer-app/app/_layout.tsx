import { Slot, router } from 'expo-router'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/store/auth.store'
import { usePushNotifications } from '../src/hooks/usePushNotifications'
import { ThemeProvider } from '../src/contexts/ThemeContext'
import * as Notifications from 'expo-notifications'

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)
  usePushNotifications() // Automatically registers and syncs with backend

  useEffect(() => {
    initialize()
  }, [])

  // Feature 4: Handle tapped push notifications → deep link to correct reservation screen
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>
      if (!data) return

      const notifType: string = data.type || data.event || ''
      const reservationId: string = data.reservation_id || data.booking_id || ''
      const bookingId: string = data.booking_id || data.reservation_id || ''

      try {
        switch (notifType) {
          case 'RESERVATION_CONFIRMED':
          case 'RESERVATION_REMINDER':
            // Open reservation detail screen
            if (reservationId) {
              router.push({
                pathname: '/reservation-confirmed',
                params: {
                  reservationId,
                  scheduledAt: data.scheduled_at,
                  pickup: data.pickup_address,
                  destination: data.destination_address,
                  timezone: data.timezone,
                  fare: String(data.fare_estimate || 0),
                  category: data.category_name,
                },
              } as any)
            } else {
              router.push('/(tabs)/trips' as any)
            }
            break

          case 'RESERVATION_DRIVER_ASSIGNED':
          case 'RESERVATION_DRIVER_ARRIVING':
            // Open live tracking
            if (bookingId) {
              router.push(`/track?bookingId=${bookingId}` as any)
            } else {
              router.push('/(tabs)/trips' as any)
            }
            break

          case 'RESERVATION_CANCELLED':
          case 'RESERVATION_MODIFIED':
            // Open trips tab to see updated state
            router.push('/(tabs)/trips' as any)
            break

          default:
            // No-op for unknown notification types
            break
        }
      } catch {
        // Router not ready yet — ignore
      }
    })

    return () => subscription.remove()
  }, [])

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
