import { View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/auth.store'
import { router } from 'expo-router'

export default function ProfileTab() {
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.replace('/auth/phone')
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="flex-1 px-6 pt-8">
        {/* Avatar */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center mb-3">
            <Text className="text-4xl">👤</Text>
          </View>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">
            {user?.phone || 'Customer'}
          </Text>
          <View className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full mt-1">
            <Text className="text-xs text-blue-600 font-semibold capitalize">{user?.role}</Text>
          </View>
        </View>

        {/* Menu items */}
        {[
          { icon: '👤', label: 'My Profile' },
          { icon: '💳', label: 'Payment Methods' },
          { icon: '🏠', label: 'Saved Addresses' },
          { icon: '🎁', label: 'Referrals & Rewards' },
          { icon: '❓', label: 'Help & Support' },
          { icon: '⚙️', label: 'Settings' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            className="flex-row items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-slate-200 dark:border-slate-700"
          >
            <Text className="text-xl">{item.icon}</Text>
            <Text className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {item.label}
            </Text>
            <Text className="text-slate-400">›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={handleLogout}
          className="mt-4 h-12 rounded-xl items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900"
        >
          <Text className="text-red-600 font-semibold text-sm">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
