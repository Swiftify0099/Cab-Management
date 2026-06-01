import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RewardPointsLoyaltyHub() {
  return (
    <SafeAreaView className="flex-1 bg-[#1A0B2E]">
      <StatusBar barStyle="light-content" />

      {/* Dynamic Background */}
      <LinearGradient 
         colors={['#2E1065', '#1A0B2E', '#000']} 
         className="absolute inset-0"
      />
      <View className="absolute top-[-100px] right-[-50px] w-[400px] h-[400px] bg-[#D4AF37] rounded-full opacity-20 blur-3xl" />
      <View className="absolute bottom-[200px] left-[-100px] w-[400px] h-[300px] bg-[#9333EA] rounded-full opacity-20 blur-3xl" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center justify-between z-10">
        <TouchableOpacity className="mr-4">
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1 text-center mr-4">Reward Points & Loyalty Hub</Text>
        <TouchableOpacity className="bg-white/20 p-1.5 rounded-full border border-white/30 backdrop-blur-md">
           <Ionicons name="person" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Main Glassmorphic Card */}
        <View className="w-full h-48 rounded-3xl border border-white/30 bg-white/10 p-6 mb-8 relative overflow-hidden backdrop-blur-2xl shadow-xl shadow-purple-900/50">
           
           {/* Internal gradient shine */}
           <LinearGradient colors={['rgba(255,255,255,0.4)', 'transparent']} start={{x:0, y:0}} end={{x:1, y:1}} className="absolute inset-0" />

           <View className="flex-row justify-between items-start relative z-10">
              <View>
                 <Text className="text-[#FBBF24] text-5xl font-bold tracking-tight mt-6 shadow-sm shadow-yellow-900/50">
                    12,540 <Text className="text-2xl font-normal text-[#D4AF37]">Points</Text>
                 </Text>
                 <Text className="text-white text-lg mt-1">Total Balance</Text>
              </View>
              
              <View className="bg-gradient-to-r from-[#FDE047] to-[#D4AF37] bg-[#D4AF37] rounded-full px-3 py-1.5 flex-row items-center border border-[#FDE047] shadow-md shadow-yellow-600/50">
                 <MaterialCommunityIcons name="crown" size={16} color="#451A03" className="mr-1" />
                 <Text className="text-[#451A03] font-bold text-xs">Gold Member</Text>
              </View>
           </View>
        </View>

        {/* Next Reward Progress */}
        <View className="mb-10 px-2">
           <Text className="text-white text-xl font-bold mb-4">Next Reward: Free Intercity Ride</Text>
           
           <View className="w-full h-4 bg-white/10 rounded-full mb-3 flex-row items-center relative overflow-visible border border-white/5">
              <LinearGradient colors={['#FDE047', '#D4AF37']} className="h-full w-[83%] rounded-full shadow-md shadow-yellow-500/50" start={{x:0, y:0}} end={{x:1, y:0}} />
              
              {/* Floating Bus Icon at current progress */}
              <View className="absolute left-[83%] -ml-6 bg-[#4C1D95] p-2 rounded-full border-2 border-[#D4AF37] shadow-lg shadow-black">
                 <MaterialCommunityIcons name="bus" size={18} color="#D4AF37" />
              </View>
           </View>

           <View className="flex-row justify-between px-1">
              <Text className="text-[#D4AF37] font-bold">12,540 / <Text className="text-gray-400 font-normal">15,000 Points</Text></Text>
              <Text className="text-gray-400 text-sm">2,460 Points to go!</Text>
           </View>
        </View>

        {/* Recent Points Earned */}
        <Text className="text-white text-xl font-bold mb-4 px-2">Recent Points Earned</Text>
        <View className="bg-[#2E1065]/40 rounded-3xl p-2 mb-8 border border-[#4C1D95] shadow-lg shadow-black backdrop-blur-md">
           
           <View className="flex-row items-center p-3 border-b border-[#4C1D95]/50">
              <View className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center mr-4 border border-white/5">
                 <MaterialCommunityIcons name="bus" size={24} color="#D4AF37" />
              </View>
              <View className="flex-1">
                 <Text className="text-white text-base font-medium">Intercity Trip: Delhi to Mumbai</Text>
              </View>
              <View className="items-end">
                 <Text className="text-[#D4AF37] font-bold text-base">+450 Points</Text>
                 <Text className="text-gray-400 text-xs">Yesterday</Text>
              </View>
           </View>

           <View className="flex-row items-center p-3 border-b border-[#4C1D95]/50">
              <View className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center mr-4 border border-white/5">
                 <MaterialCommunityIcons name="package-variant-closed" size={24} color="#D4AF37" />
              </View>
              <View className="flex-1">
                 <Text className="text-white text-base font-medium">Parcel Booking: Express Delivery</Text>
              </View>
              <View className="items-end">
                 <Text className="text-[#D4AF37] font-bold text-base">+120 Points</Text>
                 <Text className="text-gray-400 text-xs">2 days ago</Text>
              </View>
           </View>

           <View className="flex-row items-center p-3">
              <View className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center mr-4 border border-white/5">
                 <MaterialCommunityIcons name="bed" size={24} color="#D4AF37" />
              </View>
              <View className="flex-1">
                 <Text className="text-white text-base font-medium">Hotel Stay: The Grand Palace</Text>
              </View>
              <View className="items-end">
                 <Text className="text-[#D4AF37] font-bold text-base">+800 Points</Text>
                 <Text className="text-gray-400 text-xs">Last Week</Text>
              </View>
           </View>

        </View>

        {/* Redeem Now */}
        <Text className="text-white text-xl font-bold mb-4 px-2">Redeem Now</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 flex-row pb-4">
           
           {/* Card 1 */}
           <View className="w-40 bg-[#2E1065]/60 border border-[#4C1D95] rounded-3xl p-4 mr-4 shadow-lg shadow-black">
              <View className="w-10 h-10 bg-[#D4AF37]/20 rounded-full items-center justify-center mb-4">
                 <MaterialCommunityIcons name="ticket-percent" size={20} color="#D4AF37" />
              </View>
              <Text className="text-white font-bold text-lg leading-6 mb-1">₹500 Off{'\n'}Next Ride</Text>
              <Text className="text-[#D4AF37] text-xs mb-4">4,000 Points</Text>
              <TouchableOpacity className="w-full py-2 bg-[#D4AF37] rounded-xl items-center shadow-md shadow-yellow-600/30">
                 <Text className="text-[#451A03] font-bold">Redeem</Text>
              </TouchableOpacity>
           </View>

           {/* Card 2 */}
           <View className="w-40 bg-[#2E1065]/60 border border-[#4C1D95] rounded-3xl p-4 mr-4 shadow-lg shadow-black">
              <View className="w-10 h-10 bg-[#D4AF37]/20 rounded-full items-center justify-center mb-4">
                 <MaterialCommunityIcons name="percent" size={20} color="#D4AF37" />
              </View>
              <Text className="text-white font-bold text-lg leading-6 mb-1">20% Off{'\n'}Partner Hotels</Text>
              <Text className="text-[#D4AF37] text-xs mb-4">2,500 Points</Text>
              <TouchableOpacity className="w-full py-2 bg-[#D4AF37] rounded-xl items-center shadow-md shadow-yellow-600/30">
                 <Text className="text-[#451A03] font-bold">Redeem</Text>
              </TouchableOpacity>
           </View>

           {/* Card 3 */}
           <View className="w-40 bg-[#2E1065]/60 border border-[#4C1D95] rounded-3xl p-4 mr-4 shadow-lg shadow-black">
              <View className="w-10 h-10 bg-[#D4AF37]/20 rounded-full items-center justify-center mb-4">
                 <MaterialCommunityIcons name="coffee" size={20} color="#D4AF37" />
              </View>
              <Text className="text-white font-bold text-lg leading-6 mb-1">Free Premium{'\n'}Lounge Access</Text>
              <Text className="text-[#D4AF37] text-xs mb-4">1,500 Points</Text>
              <TouchableOpacity className="w-full py-2 bg-[#D4AF37] rounded-xl items-center shadow-md shadow-yellow-600/30">
                 <Text className="text-[#451A03] font-bold">Redeem</Text>
              </TouchableOpacity>
           </View>

        </ScrollView>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-[#0F0518]/90 border-t border-white/10 flex-row justify-around py-3 pb-8 backdrop-blur-xl">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="calendar-outline" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-xs mt-1">Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="star-circle" size={28} color="#D4AF37" className="-mt-1" />
          <Text className="text-[#D4AF37] text-xs mt-0.5 font-bold">Rewards</Text>
          <View className="absolute -top-3 w-10 h-1 bg-[#D4AF37] rounded-b-md shadow-sm shadow-yellow-500" />
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="wallet-outline" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-xs mt-1">Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="person-outline" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
