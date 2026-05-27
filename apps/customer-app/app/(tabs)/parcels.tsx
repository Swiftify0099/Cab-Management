import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ParcelsTab() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2">Parcels</Text>
        <Text className="text-sm text-slate-400 text-center">Parcel bookings — Phase 7</Text>
      </View>
    </SafeAreaView>
  )
}
