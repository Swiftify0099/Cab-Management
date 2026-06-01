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

export default function PartnerLeaderboardCommunity() {
  return (
    <SafeAreaView className="flex-1 bg-[#1E40AF]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center justify-between bg-[#1E40AF]">
        <TouchableOpacity className="flex-row items-center">
          <Feather name="chevron-left" size={28} color="white" />
          <Text className="text-white text-lg ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Partner Leaderboard & Community</Text>
        <TouchableOpacity>
          <Feather name="user" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Content wrapper with white rounded top */}
      <View className="flex-1 bg-[#F9FAFB] rounded-t-3xl overflow-hidden mt-2">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          
          {/* Top Earner Banner */}
          <View className="m-4 rounded-2xl bg-[#1E3A8A] overflow-hidden relative border border-blue-800 shadow-md">
             {/* Diagonal accent line */}
             <View className="absolute top-0 right-0 bottom-0 w-1/2 bg-blue-700 opacity-20 transform -skew-x-12 translate-x-10" />
             
             <View className="p-5 flex-row items-center relative z-10">
                <View className="relative">
                  <View className="w-20 h-20 rounded-full border-4 border-[#FBBF24] overflow-hidden items-center justify-center bg-gray-300">
                     <Ionicons name="person" size={50} color="gray" style={{marginTop: 10}}/>
                  </View>
                  <View className="absolute -left-6 bottom-0 w-12 h-16 items-center justify-center">
                     <MaterialCommunityIcons name="trophy" size={48} color="#FBBF24" />
                     <Ionicons name="star" size={16} color="white" className="absolute top-3 right-3" />
                  </View>
                </View>
                
                <View className="ml-6 flex-1">
                   <Text className="text-[#FBBF24] font-bold text-lg mb-1">This Month's Top Earner</Text>
                   <Text className="text-white text-base mb-2">
                     <Text className="font-bold">Alex Chen</Text> - Earned <Text className="font-bold text-[#FBBF24]">$3,450</Text>
                   </Text>
                   <TouchableOpacity className="bg-white py-1.5 px-4 rounded-md self-start">
                     <Text className="text-[#1E3A8A] font-bold text-sm">View Profile</Text>
                   </TouchableOpacity>
                </View>
             </View>
          </View>

          {/* Time Tabs */}
          <View className="flex-row mx-4 mb-6 border-b border-gray-200">
             <TouchableOpacity className="flex-1 bg-white border border-gray-200 rounded-full py-2.5 items-center shadow-sm">
                <Text className="text-black font-bold">This Month</Text>
             </TouchableOpacity>
             <TouchableOpacity className="flex-1 py-2.5 items-center">
                <Text className="text-gray-500 font-medium">Last Month</Text>
             </TouchableOpacity>
             <View className="w-[1px] h-6 bg-gray-300 self-center" />
             <TouchableOpacity className="flex-1 py-2.5 items-center">
                <Text className="text-gray-500 font-medium">All Time</Text>
             </TouchableOpacity>
          </View>

          <Text className="text-2xl font-bold text-black px-4 mb-4">Top Partners Leaderboard</Text>

          {/* Leaderboard List */}
          <View className="px-4">
             {/* #1 */}
             <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm shadow-gray-200 flex-row items-center">
                <Text className="text-black text-xl font-bold w-6">1.</Text>
                <View className="w-16 h-16 rounded-full bg-gray-300 mr-4 overflow-hidden border border-gray-200">
                   <Ionicons name="person" size={40} color="gray" style={{marginTop: 10, marginLeft: 12}}/>
                </View>
                <View className="flex-1">
                   <Text className="text-black text-lg font-bold mb-1">
                      Sarah Lee - 4.95 <Ionicons name="star" size={16} color="#FBBF24" />
                   </Text>
                   <View className="flex-row items-center mb-2">
                      <Text className="text-gray-700 text-sm">210 Trips,</Text>
                      <MaterialCommunityIcons name="shield-check" size={16} color="#1E3A8A" className="mx-1" />
                      <Text className="text-gray-700 text-sm">99% Safety</Text>
                   </View>
                   <View className="w-full h-2 bg-[#2563EB] rounded-full" />
                </View>
                <View className="ml-2">
                   <MaterialCommunityIcons name="medal" size={32} color="#FBBF24" />
                </View>
             </View>

             {/* #2 */}
             <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm shadow-gray-200 flex-row items-center">
                <Text className="text-black text-xl font-bold w-6">2.</Text>
                <View className="w-16 h-16 rounded-full bg-gray-300 mr-4 overflow-hidden border border-gray-200">
                   <Ionicons name="person" size={40} color="gray" style={{marginTop: 10, marginLeft: 12}}/>
                </View>
                <View className="flex-1">
                   <Text className="text-black text-lg font-bold mb-1">
                      Mike Davis - 4.92 <Ionicons name="star" size={16} color="#FBBF24" />
                   </Text>
                   <View className="flex-row items-center mb-2">
                      <Text className="text-gray-700 text-sm">195 Trips,</Text>
                      <MaterialCommunityIcons name="shield-check" size={16} color="#1E3A8A" className="mx-1" />
                      <Text className="text-gray-700 text-sm">97% Safety</Text>
                   </View>
                   <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <View className="w-[90%] h-full bg-[#1E3A8A] rounded-full" />
                   </View>
                </View>
                <View className="ml-2">
                   <MaterialCommunityIcons name="medal" size={32} color="#9CA3AF" />
                </View>
             </View>

             {/* #3 */}
             <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm shadow-gray-200 flex-row items-center">
                <Text className="text-black text-xl font-bold w-6">3.</Text>
                <View className="w-16 h-16 rounded-full bg-gray-300 mr-4 overflow-hidden border border-gray-200">
                   <Ionicons name="person" size={40} color="gray" style={{marginTop: 10, marginLeft: 12}}/>
                </View>
                <View className="flex-1">
                   <Text className="text-black text-lg font-bold mb-1">
                      Priya Sharma - 4.90 <Ionicons name="star" size={16} color="#FBBF24" />
                   </Text>
                   <View className="flex-row items-center mb-2">
                      <Text className="text-gray-700 text-sm">180 Trips,</Text>
                      <MaterialCommunityIcons name="shield-check" size={16} color="#1E3A8A" className="mx-1" />
                      <Text className="text-gray-700 text-sm">98% Safety</Text>
                   </View>
                   <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <View className="w-[85%] h-full bg-[#1E3A8A] rounded-full" />
                   </View>
                </View>
                <View className="ml-2">
                   <MaterialCommunityIcons name="medal" size={32} color="#D97706" />
                </View>
             </View>

          </View>

          {/* Driver Lounge Community Banner */}
          <View className="bg-[#3B82F6] mx-4 rounded-2xl p-4 flex-row items-center mb-8">
             <View className="mr-4 items-center justify-center">
                <View className="w-12 h-10 bg-[#FBBF24] rounded-lg items-center justify-center rounded-bl-none mb-1">
                   <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest">...</Text>
                </View>
                <View className="flex-row items-end">
                   <Ionicons name="person" size={16} color="#FCD34D" />
                   <Ionicons name="people" size={24} color="#FCD34D" />
                </View>
             </View>
             <View className="flex-1">
                <Text className="text-white text-lg font-bold mb-1">Driver Lounge Community</Text>
                <Text className="text-white text-sm">Join discussions, share tips, and network with fellow drivers.</Text>
             </View>
          </View>
          
          <View className="h-4" />
        </ScrollView>
      </View>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-2 pb-6 pt-3">
        <TouchableOpacity className="items-center px-4">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center px-4">
          <Ionicons name="car-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center px-4">
          <MaterialCommunityIcons name="currency-usd" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center px-4 border-t-2 border-[#1E40AF] -mt-3 py-2">
          <Ionicons name="chatbubbles" size={24} color="#1E40AF" />
          <Text className="text-[#1E40AF] text-xs mt-1 font-bold">Community</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center px-4">
          <Ionicons name="ellipsis-horizontal" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
