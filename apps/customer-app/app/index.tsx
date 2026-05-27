import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../src/store/auth.store'

export default function Index() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuthStore()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace('/auth/phone')
    } else if (!user?.profileComplete) {
      router.replace('/auth/profile-setup')
    } else {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated, isLoading, user?.profileComplete])

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-slate-900">
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  )
}
