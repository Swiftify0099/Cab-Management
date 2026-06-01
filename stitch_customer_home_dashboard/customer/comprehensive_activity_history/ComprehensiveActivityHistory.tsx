import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ComprehensiveActivityHistory() {
  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 bg-[#F4F7FB]">
        <Text className="text-4xl font-extrabold text-[#0F172A]">Activity History</Text>
      </View>

      {/* Segmented Control / Tabs */}
      <View className="px-5 mb-6">
        <View className="bg-[#E2E8F0] rounded-xl p-1 flex-row">
          <TouchableOpacity className="flex-1 py-2 items-center rounded-lg">
            <Text className="text-gray-600 font-medium">Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 py-2 items-center rounded-lg bg-[#E2ECF8] shadow-sm shadow-blue-200">
            <Text className="text-[#0F172A] font-bold">Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 py-2 items-center rounded-lg">
            <Text className="text-gray-600 font-medium">Cancelled</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        
        {/* Activity Card 1: Ride */}
        <View className="bg-[#F8FAFC] rounded-2xl p-5 mb-4 shadow-sm shadow-gray-200 border border-white">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#E2E8F0] items-center justify-center mr-3">
                 <MaterialCommunityIcons name="car-outline" size={20} color="black" />
              </View>
              <Text className="text-black text-lg">Ride</Text>
            </View>
            <View className="bg-[#E2E8F0] px-3 py-1.5 rounded-full">
              <Text className="text-black text-xs font-semibold">Ride Completed</Text>
            </View>
          </View>
          
          <Text className="text-black text-2xl font-bold mb-1 leading-7">Seattle to Portland</Text>
          <Text className="text-black text-base mb-2">Oct 24, 2023, 2:30 PM</Text>
          <Text className="text-black text-xl font-medium">$145.00</Text>
        </View>

        {/* Activity Card 2: Parcel */}
        <View className="bg-[#F8FAFC] rounded-2xl p-5 mb-4 shadow-sm shadow-gray-200 border border-white">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#E2E8F0] items-center justify-center mr-3">
                 <Feather name="box" size={20} color="black" />
              </View>
              <Text className="text-black text-lg">Parcel</Text>
            </View>
            <View className="bg-[#E2E8F0] px-3 py-1.5 rounded-full">
              <Text className="text-black text-xs font-semibold">Delivered</Text>
            </View>
          </View>
          
          <Text className="text-black text-2xl font-bold mb-1 leading-7">San Francisco to Los Angeles</Text>
          <Text className="text-black text-base mb-2">Oct 20, 2023, 10:15 AM</Text>
          <Text className="text-black text-xl font-medium">$55.00</Text>
        </View>

        {/* Activity Card 3: Ride */}
        <View className="bg-[#F8FAFC] rounded-2xl p-5 mb-6 shadow-sm shadow-gray-200 border border-white">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#E2E8F0] items-center justify-center mr-3">
                 <MaterialCommunityIcons name="car-outline" size={20} color="black" />
                 {/* Empty icon if needed, using car for consistency with "Ride" */}
              </View>
              <Text className="text-black text-lg">Ride</Text>
            </View>
            <View className="bg-[#E2E8F0] px-3 py-1.5 rounded-full">
              <Text className="text-black text-xs font-semibold">Ride Completed</Text>
            </View>
          </View>
          
          <Text className="text-black text-2xl font-bold mb-1 leading-7">Austin to Dallas</Text>
          <Text className="text-black text-base mb-2">Oct 15, 2023, 5:00 PM</Text>
          <Text className="text-black text-xl font-medium">$95.00</Text>
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Feather name="home" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="chart-bar" size={24} color="#0F172A" />
          <Text className="text-[#0F172A] text-xs mt-1 font-bold">Activity</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="calendar" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Book</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
