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
    const check = async () => {
      const token = await SecureStore.getItemAsync('access_token')
      if (token) {
        if (token !== 'demo_token') {
          try {
            await api.post('/driver/claim-driver-role', {})
          } catch {}
        }
        setTimeout(() => router.replace('/(tabs)' as any), 0)
      } else {
        setTimeout(() => router.replace('/auth/phone' as any), 0)
      }
    }
    check()
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  )
}
