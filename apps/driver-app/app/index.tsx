import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { api } from '../src/api/client'
import { useTheme } from '../src/theme'

export default function DriverIndex() {
  const router = useRouter()
  const { theme } = useTheme()

  useEffect(() => {
    let isMounted = true
    console.log('[BOOT-03] DriverIndex mounted, checking authentication token')
    const check = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token')
        if (!isMounted) return

        if (token) {
          console.log('[BOOT-04] Valid token found, transitioning to (tabs)')
          if (token !== 'demo_token') {
            try {
              await api.post('/driver/claim-driver-role', {})
            } catch {}
          }
          if (isMounted) {
            router.replace('/(tabs)' as any)
          }
        } else {
          console.log('[BOOT-04] No token found, transitioning to /auth/phone')
          if (isMounted) {
            router.replace('/auth/phone' as any)
          }
        }
      } catch (e) {
        console.warn('[BOOT-WARN] Auth check error:', e)
        if (isMounted) {
          router.replace('/auth/phone' as any)
        }
      }
    }
    check()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  )
}
