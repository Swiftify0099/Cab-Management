/**
 * Customer Home Tab — Book a Ride / Parcel
 * Phase 2 placeholder — booking map UI in Phase 3
 */
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/auth.store'

const QUICK_ACTIONS = [
  { icon: '🚗', label: 'Book Cab', color: 'bg-blue-600', route: '/book/cab' },
  { icon: '📦', label: 'Send Parcel', color: 'bg-purple-600', route: '/book/parcel' },
  { icon: '🏨', label: 'Book Hotel', color: 'bg-emerald-600', route: '/hotels' },
  { icon: '🗺️', label: 'My Trips', color: 'bg-amber-500', route: '/(tabs)/trips' },
]

export default function HomeTab() {
  const user = useAuthStore((s) => s.user)

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Greeting */}
        <View className="mt-4 mb-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            Good morning! 👋
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Where would you like to go today?
          </Text>
        </View>

        {/* Search / Destination Bar */}
        <TouchableOpacity
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm flex-row items-center gap-3"
          onPress={() => router.push('/book/cab' as any)}
          activeOpacity={0.85}
        >
          <View className="w-8 h-8 rounded-lg bg-blue-600 items-center justify-center">
            <Text className="text-white text-lg">📍</Text>
          </View>
          <Text className="text-slate-400 dark:text-slate-500 text-sm flex-1">
            Where do you want to go?
          </Text>
          <Text className="text-blue-600 text-sm font-semibold">→</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text className="text-base font-bold text-slate-900 dark:text-white mb-3">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => router.push(action.route as any)}
              className={`${action.color} rounded-2xl p-4 flex-1 min-w-36 items-start`}
              activeOpacity={0.85}
            >
              <Text className="text-3xl mb-2">{action.icon}</Text>
              <Text className="text-white font-semibold text-sm">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Trip placeholder */}
        <Text className="text-base font-bold text-slate-900 dark:text-white mb-3">
          Upcoming Trips
        </Text>
        <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 items-center">
          <Text className="text-4xl mb-3">🗺️</Text>
          <Text className="text-slate-600 dark:text-slate-300 font-medium text-center">
            No upcoming trips
          </Text>
          <Text className="text-slate-400 text-xs text-center mt-1">
            Book a cab or parcel and it will appear here
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
