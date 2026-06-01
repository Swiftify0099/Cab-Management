import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function HotelBookingSuccessSummary() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <View className="flex-1 px-5 pt-12 items-center">
        
        {/* Success Icon */}
        <View className="mb-8 items-center justify-center relative">
          <View className="w-40 h-40 rounded-full bg-[#E5F7ED] items-center justify-center absolute opacity-50" />
          <View className="w-32 h-32 rounded-full bg-[#4ADE80] items-center justify-center shadow-lg shadow-green-500/30">
            <Feather name="check" size={60} color="white" />
          </View>
          {/* Confetti Dots (Mocked with absolute positioning) */}
          <View className="absolute top-0 right-4 w-2 h-2 rounded-full bg-green-300" />
          <View className="absolute bottom-4 left-4 w-3 h-3 rounded-full bg-green-400" />
          <View className="absolute top-10 left-0 w-2 h-2 rounded-full bg-green-200" />
        </View>

        {/* Title & Subtitle */}
        <Text className="text-3xl font-extrabold text-black mb-2 text-center">Booking Confirmed!</Text>
        <Text className="text-gray-600 text-base text-center mb-10">
          Thank you. Your reservation is successful.
        </Text>

        {/* Booking Card */}
        <View className="w-full bg-white rounded-3xl p-4 border border-gray-100 shadow-sm shadow-gray-200/50">
          
          {/* Hotel Info */}
          <View className="flex-row items-center mb-6">
            <View className="w-24 h-24 bg-gray-200 rounded-xl mr-4 overflow-hidden">
              {/* Using a placeholder view for the hotel image */}
              <View className="w-full h-full bg-blue-100 items-center justify-center">
                 <MaterialCommunityIcons name="office-building" size={40} color="#9CA3AF" />
              </View>
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-xl font-bold text-black mb-1">Grand Hyatt Mumbai</Text>
              <Text className="text-gray-500 text-sm">Standard Queen Room</Text>
            </View>
          </View>

          {/* Dates & ID Info */}
          <View className="border border-gray-100 rounded-2xl p-4 mb-6">
            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
              <View className="flex-row items-center flex-1">
                <Feather name="calendar" size={20} color="#6B7280" className="mr-3" />
                <View className="ml-3">
                  <Text className="text-gray-500 text-xs">Check-in:</Text>
                  <Text className="text-black font-bold">Oct 15, 2024</Text>
                </View>
              </View>
              <View className="px-2">
                <Ionicons name="arrow-forward-outline" size={20} color="#9CA3AF" />
              </View>
              <View className="flex-1 items-end">
                <View>
                  <Text className="text-gray-500 text-xs">Check-out:</Text>
                  <Text className="text-black font-bold">Oct 17, 2024</Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="key-outline" size={20} color="#6B7280" className="mr-3" />
              <Text className="text-gray-500 text-sm ml-3">
                Booking ID: <Text className="text-black font-bold">#GHM12345</Text>
              </Text>
            </View>
          </View>

          {/* View Voucher Button */}
          <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center shadow-md shadow-blue-500/30">
            <Text className="text-white text-lg font-bold">View Voucher</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Bottom Floating Action */}
      <View className="bg-[#EFF6FF] pb-8 pt-4 items-center justify-center">
        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="car-outline" size={24} color="#2563EB" />
          <Text className="text-[#2563EB] font-bold text-lg ml-2 mr-1">Book a Cab to Hotel</Text>
          <Feather name="chevron-right" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
