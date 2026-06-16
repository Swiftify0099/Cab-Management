import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { useAuthStore } from '../src/store/auth.store'
import { useTheme } from '../src/contexts/ThemeContext'
import { AppLoader } from '../src/components/ui'

export default function Index() {
  const router = useRouter()
  const { theme } = useTheme()
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
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <AppLoader size="large" />
    </View>
  )
}

