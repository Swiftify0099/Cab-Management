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

export default function IncentivesQuestsDashboard() {
  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="bg-[#1E3A8A] px-4 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Incentives & Quests</Text>
        <TouchableOpacity>
          <Feather name="user" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* Main Circular Chart Area */}
        <View className="items-center justify-center mb-8">
           {/* Mocking the circular progress with nested views */}
           <View className="w-80 h-80 rounded-full bg-[#0EA5E9] items-center justify-center border-[16px] border-[#38BDF8]">
              {/* Fake progress arc */}
              <View className="absolute inset-0 rounded-full border-[16px] border-[#FBBF24] border-l-transparent border-b-transparent transform rotate-45" />
              <View className="absolute inset-0 rounded-full border-[16px] border-[#FBBF24] border-t-transparent border-r-transparent transform -rotate-[135deg] opacity-0" />
              
              <View className="w-64 h-64 bg-[#1D4ED8] rounded-full items-center justify-center border-4 border-[#2563EB] shadow-lg shadow-blue-900/50 px-6">
                 
                 <View className="mb-2 bg-yellow-100 p-2 rounded-full border-2 border-yellow-400">
                    <Ionicons name="trophy" size={32} color="#F59E0B" />
                 </View>

                 <Text className="text-[#FBBF24] text-xl font-bold text-center mb-1">Weekend Warrior Bonus</Text>
                 <Text className="text-white text-2xl font-extrabold text-center mb-2">3/5 Trips Completed</Text>
                 <Text className="text-blue-200 text-sm text-center mb-4">$100 Bonus Unlocked soon.</Text>
                 
                 <Text className="text-white text-center text-sm leading-5 mb-2">
                   Goal: Complete 5 Intercity{'\n'}Trips between Fri-Sun
                 </Text>

                 {/* Percentage Bar Inside Circle */}
                 <View className="w-40 h-6 bg-[#1E3A8A] rounded-full mt-2 overflow-hidden flex-row border border-blue-800">
                    <View className="h-full bg-[#FBBF24] items-end justify-center pr-2" style={{ width: '60%' }}>
                       <Text className="text-black text-xs font-bold">60%</Text>
                    </View>
                 </View>
              </View>
           </View>
        </View>

        <Text className="text-2xl font-bold text-black mb-4">Active Quests</Text>

        {/* Quest List */}
        
        {/* Quest 1 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <View className="w-16 h-16 bg-[#0EA5E9] rounded-2xl items-center justify-center mr-4">
              <Ionicons name="car-sport" size={32} color="white" />
           </View>
           <View className="flex-1">
             <Text className="text-black text-lg font-bold">Intercity Master</Text>
             <View className="flex-row justify-between mb-1">
                <Text className="text-black font-semibold text-sm">4/5 <Text className="font-normal text-gray-600">Trips Completed</Text></Text>
                <Text className="text-gray-600 text-sm">1 more to go!</Text>
             </View>
             <View className="w-full h-2 bg-gray-200 rounded-full mb-1 overflow-hidden">
                <View className="w-4/5 h-full bg-[#FBBF24] rounded-full" />
             </View>
             <Text className="text-black font-bold text-sm">$50 Extra</Text>
           </View>
           <View className="ml-2">
             <Ionicons name="star" size={32} color="#FBBF24" />
           </View>
        </View>

        {/* Quest 2 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <View className="w-16 h-16 bg-[#8B5CF6] rounded-2xl items-center justify-center mr-4">
              <Feather name="clock" size={32} color="white" />
           </View>
           <View className="flex-1">
             <Text className="text-black text-lg font-bold">Peak Hour Power</Text>
             <View className="flex-row justify-between mb-1">
                <Text className="text-black font-semibold text-sm">2/3 <Text className="font-normal text-gray-600">Trips Completed</Text></Text>
                <Text className="text-gray-600 text-sm">Almost there!</Text>
             </View>
             <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <View className="w-2/3 h-full bg-[#FBBF24] rounded-full" />
             </View>
           </View>
           <View className="ml-3">
             <MaterialCommunityIcons name="lightning-bolt" size={32} color="#D97706" />
           </View>
        </View>

        {/* Quest 3 */}
        <View className="bg-white rounded-2xl p-4 mb-8 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <View className="w-16 h-16 bg-[#22C55E] rounded-2xl items-center justify-center mr-4">
              <Feather name="shield" size={32} color="white" />
           </View>
           <View className="flex-1">
             <Text className="text-black text-lg font-bold">Safety Star</Text>
             <Text className="text-black text-sm mb-1">Reward: <Text className="font-bold">$30 Incentive</Text></Text>
             <View className="flex-row justify-between mb-1">
                <Text className="text-black font-semibold text-sm">0/1 <Text className="font-normal text-gray-600">Week Incident-Free</Text></Text>
                <Text className="text-gray-600 text-sm">Keep it up!</Text>
             </View>
             <View className="w-full h-2 bg-gray-200 rounded-full" />
           </View>
           <View className="ml-3">
             <Ionicons name="heart" size={32} color="#EF4444" />
           </View>
        </View>
        
        <View className="h-6" />
      </ScrollView>

      {/* Motivational Banner */}
      <View className="bg-[#1E3A8A] py-3 items-center">
        <Text className="text-white font-bold text-base">Keep pushing, Champion! 🌟</Text>
      </View>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="cash" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="file-document-outline" size={24} color="#1E3A8A" />
          <Text className="text-[#1E3A8A] text-xs mt-1 font-semibold">Quests</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
