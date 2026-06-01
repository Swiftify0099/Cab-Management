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

export default function DestinationStayRecommendations() {
  return (
    <SafeAreaView className="flex-1 bg-[#F0F8FF]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-100">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Destination Stay Recommendations</Text>
        <TouchableOpacity>
          <Feather name="user" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Arrival Status Card */}
        <View className="bg-white m-4 rounded-2xl p-4 shadow-sm shadow-blue-100 border border-blue-50 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-black text-2xl font-bold mb-2">Arriving in San Francisco</Text>
            
            <View className="w-full h-2 bg-gray-200 rounded-full mb-2 overflow-hidden">
              <View className="w-[80%] h-full bg-[#1D4ED8] rounded-full" />
            </View>
            
            <Text className="text-black text-base">45 min remaining</Text>
          </View>
          
          {/* Mini Map Mock */}
          <View className="w-16 h-16 bg-[#FEF3C7] rounded-xl border border-yellow-200 overflow-hidden relative items-center justify-center">
            {/* Map lines */}
            <View className="w-full h-[1px] bg-yellow-300 absolute top-4 transform rotate-12" />
            <View className="w-[1px] h-full bg-yellow-300 absolute left-8 transform -rotate-12" />
            <View className="w-full h-[1px] bg-yellow-300 absolute bottom-4 transform -rotate-45" />
            
            <View className="w-3 h-3 bg-[#1D4ED8] rounded-full border-2 border-white shadow-sm z-10" />
            <View className="w-6 h-6 bg-blue-500/20 rounded-full absolute z-0" />
          </View>
        </View>

        <Text className="text-2xl font-bold text-black px-4 mb-4">Highly-Rated Hotels Near You</Text>

        {/* Horizontal Hotel List */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-4 pb-8" contentContainerStyle={{ paddingRight: 16 }}>
          
          {/* Hotel 1 */}
          <View className="bg-white rounded-2xl w-72 mr-4 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
            <View className="w-full h-48 bg-gray-300 relative items-center justify-center">
               <View className="absolute inset-0 bg-[#E2E8F0]" />
               <MaterialCommunityIcons name="city-variant" size={60} color="#94A3B8" />
            </View>
            <View className="p-4">
              <Text className="text-black text-xl font-bold mb-1 leading-6">The Marker San Francisco</Text>
              
              <View className="flex-row items-center mb-3">
                <Text className="text-black font-bold mr-1">4.8</Text>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text className="text-gray-500 ml-1">(1,205 reviews)</Text>
              </View>

              <Text className="text-black text-2xl font-extrabold mb-2">$249 <Text className="text-base font-normal">/ night</Text></Text>
              
              <View className="bg-green-100 self-start px-2 py-1 rounded-md mb-4">
                <Text className="text-green-800 text-xs font-semibold">Express Check-in Available</Text>
              </View>

              <TouchableOpacity className="w-full py-3 border border-[#1D4ED8] rounded-xl items-center">
                <Text className="text-[#1D4ED8] font-bold text-lg">View Details</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hotel 2 */}
          <View className="bg-white rounded-2xl w-72 mr-4 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
            <View className="w-full h-48 bg-gray-300 relative items-center justify-center">
               <View className="absolute inset-0 bg-[#F1F5F9]" />
               <MaterialCommunityIcons name="home-modern" size={60} color="#94A3B8" />
            </View>
            <View className="p-4">
              <Text className="text-black text-xl font-bold mb-1 leading-6">Fairmont San Francisco</Text>
              
              <View className="flex-row items-center mb-3">
                <Text className="text-black font-bold mr-1">4.7</Text>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text className="text-gray-500 ml-1">(3,500 reviews)</Text>
              </View>

              <Text className="text-black text-2xl font-extrabold mb-2">$320 <Text className="text-base font-normal">/ night</Text></Text>
              
              <View className="bg-green-100 self-start px-2 py-1 rounded-md mb-4">
                <Text className="text-green-800 text-xs font-semibold">Express Check-in Available</Text>
              </View>

              <TouchableOpacity className="w-full py-3 border border-[#1D4ED8] rounded-xl items-center">
                <Text className="text-[#1D4ED8] font-bold text-lg">View Details</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hotel 3 Partial View */}
          <View className="bg-white rounded-2xl w-72 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
            <View className="w-full h-48 bg-gray-300 relative items-center justify-center">
               <View className="absolute inset-0 bg-[#E2E8F0]" />
               <MaterialCommunityIcons name="bed-king-outline" size={60} color="#94A3B8" />
            </View>
            <View className="p-4">
              <Text className="text-black text-xl font-bold mb-1 leading-6">Hotel Drisco</Text>
              
              <View className="flex-row items-center mb-3">
                <Text className="text-black font-bold mr-1">4.7</Text>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text className="text-gray-500 ml-1">(890 reviews)</Text>
              </View>

              <Text className="text-black text-2xl font-extrabold mb-2">$230 <Text className="text-base font-normal">/ night</Text></Text>
              
              <View className="bg-green-100 self-start px-2 py-1 rounded-md mb-4">
                <Text className="text-green-800 text-xs font-semibold">Express Check-in</Text>
              </View>

              <TouchableOpacity className="w-full py-3 border border-[#1D4ED8] rounded-xl items-center">
                <Text className="text-[#1D4ED8] font-bold text-lg">View Details</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="car-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="bed-outline" size={24} color="#1D4ED8" />
          <Text className="text-[#1D4ED8] text-xs mt-1 font-semibold">Stays</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="briefcase" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
