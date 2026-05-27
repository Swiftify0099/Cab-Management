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
        router.replace('/(tabs)')
      } else {
        router.replace('/auth/phone')
      }
    }
    check()
  }, [])

  return (
    <View className="flex-1 items-center justify-center bg-slate-900">
      <ActivityIndicator size="large" color="#F59E0B" />
    </View>
  )
}
