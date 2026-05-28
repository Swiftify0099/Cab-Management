import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import * as SecureStore from 'expo-secure-store'

export default function DriverIndex() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const token = await SecureStore.getItemAsync('access_token')
      if (token) {
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
