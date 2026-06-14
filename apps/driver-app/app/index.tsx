import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { api } from '../src/api/client'

export default function DriverIndex() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const token = await SecureStore.getItemAsync('access_token')
      if (token && token !== 'demo_token') {
        // Ensure the DB user role is 'driver' — heals old tokens with role=customer.
        // This is idempotent: if role is already driver it's a no-op.
        try {
          await api.post('/driver/claim-driver-role', {})
        } catch {
          // If this fails (e.g. network issue), still navigate — driver endpoints
          // will return 403 and the user can logout/login to fix it.
        }
        setTimeout(() => router.replace('/(tabs)'), 0)
      } else {
        setTimeout(() => router.replace('/auth/phone'), 0)
      }
    }
    check()
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
      <ActivityIndicator size="large" color="#F59E0B" />
    </View>
  )
}
