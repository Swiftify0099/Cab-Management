import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdvancedEarningsAnalytics() {
  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F8]">
      <StatusBar barStyle="dark-content" />

      {/* Background Grid Pattern Mock */}
      <View className="absolute inset-0 opacity-10">
         {/* Vertical lines */}
         <View className="absolute left-1/4 w-[1px] h-full bg-blue-900" />
         <View className="absolute left-2/4 w-[1px] h-full bg-blue-900" />
         <View className="absolute left-3/4 w-[1px] h-full bg-blue-900" />
         {/* Horizontal lines */}
         <View className="absolute top-1/4 w-full h-[1px] bg-blue-900" />
         <View className="absolute top-2/4 w-full h-[1px] bg-blue-900" />
         <View className="absolute top-3/4 w-full h-[1px] bg-blue-900" />
      </View>

      <View className="flex-1 px-4 py-8">
        {/* Main Modal Card */}
        <View className="flex-1 bg-white rounded-3xl shadow-2xl shadow-blue-900/10 overflow-hidden">
          
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-6 pb-2">
            <TouchableOpacity>
              <Feather name="chevron-left" size={28} color="black" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-black">Earnings Analytics</Text>
            <TouchableOpacity className="w-10 h-10 rounded-full border border-gray-300 items-center justify-center">
              <Feather name="user" size={20} color="black" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            
            {/* Chart Section */}
            <View className="px-6 pt-4 pb-2">
              <Text className="text-black text-lg font-semibold mb-1">Weekly Revenue</Text>
              <Text className="text-black text-4xl font-extrabold mb-1">$2,540.15</Text>
              <View className="flex-row items-center mb-8">
                <Text className="text-green-500 font-semibold text-sm">▲ +$420.30 (19.8%)</Text>
                <Text className="text-gray-500 text-sm ml-1">from last week</Text>
              </View>

              {/* Mock Spline Chart */}
              <View className="h-40 w-full mb-2 relative">
                 {/* Chart curve representation */}
                 <View className="absolute bottom-0 w-full h-full opacity-20 bg-blue-100 rounded-t-3xl" style={{ borderTopWidth: 2, borderColor: '#3B82F6' }} />
                 <View className="absolute bottom-0 w-full h-full opacity-40 bg-blue-50 rounded-t-[50px] ml-10" style={{ borderTopWidth: 2, borderColor: '#3B82F6' }} />
                 <View className="absolute top-8 right-16 w-3 h-3 bg-[#3B82F6] rounded-full border-2 border-white shadow-sm" />
                 
                 {/* Tooltip */}
                 <View className="absolute top-0 right-10 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm items-center">
                    <Text className="text-gray-500 text-[10px] font-bold">Oct 24</Text>
                    <Text className="text-black font-extrabold text-sm">$410.20</Text>
                 </View>
              </View>

              {/* X-Axis labels */}
              <View className="flex-row justify-between px-2 mb-6">
                 <Text className="text-gray-500 text-xs">Mon</Text>
                 <Text className="text-gray-500 text-xs">Tue</Text>
                 <Text className="text-gray-500 text-xs">Wed</Text>
                 <Text className="text-gray-500 text-xs">Thu</Text>
                 <Text className="text-gray-500 text-xs">Fri</Text>
                 <Text className="text-gray-500 text-xs">Sat</Text>
                 <Text className="text-gray-500 text-xs">Sun</Text>
              </View>
            </View>

            {/* Metric Cards Carousel */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6 mb-8" contentContainerStyle={{ paddingRight: 32 }}>
              
              {/* Card 1 */}
              <View className="bg-[#F8FAFC] rounded-2xl p-4 mr-3 w-32 border border-gray-100 shadow-sm shadow-gray-200" style={styles.glassEffect}>
                <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mb-6">
                  <MaterialCommunityIcons name="wallet-outline" size={20} color="black" />
                </View>
                <Text className="text-black font-semibold text-sm mb-1">Net Earnings</Text>
                <Text className="text-black font-bold text-lg">$1,980.00</Text>
              </View>

              {/* Card 2 */}
              <View className="bg-[#F8FAFC] rounded-2xl p-4 mr-3 w-32 border border-gray-100 shadow-sm shadow-gray-200" style={styles.glassEffect}>
                <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mb-6">
                  <MaterialCommunityIcons name="hand-coin-outline" size={20} color="black" />
                </View>
                <Text className="text-black font-semibold text-sm mb-1">Tips</Text>
                <Text className="text-black font-bold text-lg">$350.25</Text>
              </View>

              {/* Card 3 */}
              <View className="bg-[#F8FAFC] rounded-2xl p-4 mr-3 w-32 border border-gray-100 shadow-sm shadow-gray-200" style={styles.glassEffect}>
                <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mb-6">
                  <Text className="text-black font-bold text-lg">%</Text>
                </View>
                <Text className="text-black font-semibold text-sm mb-1">Platform Fee</Text>
                <Text className="text-[#DC2626] font-bold text-lg">-$140.50</Text>
              </View>

              {/* Card 4 */}
              <View className="bg-[#F8FAFC] rounded-2xl p-4 mr-3 w-32 border border-gray-100 shadow-sm shadow-gray-200" style={styles.glassEffect}>
                <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mb-6">
                  <Feather name="gift" size={20} color="black" />
                </View>
                <Text className="text-black font-semibold text-sm mb-1">Incentives</Text>
                <Text className="text-black font-bold text-lg">$350.40</Text>
              </View>

            </ScrollView>

            {/* Recent Payouts */}
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold text-black mb-4">Recent Payouts</Text>

              <View className="flex-row items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <View>
                  <Text className="text-black text-base">Oct 23, 2023</Text>
                  <Text className="text-gray-600 text-sm">Bank Transfer •••• 1234</Text>
                </View>
                <View className="items-end">
                  <View className="bg-green-100 px-3 py-1 rounded-full mb-1">
                    <Text className="text-green-700 text-xs font-semibold">Completed</Text>
                  </View>
                  <Text className="text-black text-lg font-semibold">$1,200.00</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <View>
                  <Text className="text-black text-base">Oct 20, 2023</Text>
                  <Text className="text-gray-600 text-sm">Instant Pay • Visa</Text>
                </View>
                <View className="items-end">
                  <View className="bg-green-100 px-3 py-1 rounded-full mb-1">
                    <Text className="text-green-700 text-xs font-semibold">Completed</Text>
                  </View>
                  <Text className="text-black text-lg font-semibold">$540.15</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between pb-2 mb-6">
                <View>
                  <Text className="text-black text-base">Oct 16, 2023</Text>
                  <Text className="text-gray-600 text-sm">Bank Transfer •••• 1234</Text>
                </View>
                <View className="items-end">
                  <View className="bg-yellow-100 px-3 py-1 rounded-full mb-1">
                    <Text className="text-yellow-700 text-xs font-semibold">Processing</Text>
                  </View>
                  <Text className="text-black text-lg font-semibold">$800.00</Text>
                </View>
              </View>

              {/* Cash Out Button */}
              <TouchableOpacity className="w-full bg-[#2563EB] py-4 rounded-xl items-center shadow-lg shadow-blue-500/30">
                <Text className="text-white text-lg font-bold">Cash Out Now</Text>
              </TouchableOpacity>

            </View>

          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassEffect: {
    backgroundColor: 'rgba(250, 250, 255, 0.85)',
  }
});
