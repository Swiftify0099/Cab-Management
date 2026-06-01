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

export default function PartnerDisputeComplaintCenter() {
  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-2 bg-[#F9FAFB] flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <TouchableOpacity className="w-10 h-10 rounded-full border-2 border-black items-center justify-center">
          <Feather name="user" size={20} color="black" />
        </TouchableOpacity>
      </View>

      <View className="px-5 pb-4">
        <Text className="text-4xl font-extrabold text-black mt-2 mb-4">Complaint Center</Text>

        {/* Segmented Control */}
        <View className="bg-[#E5E7EB] rounded-xl p-1 flex-row">
          <TouchableOpacity className="flex-1 bg-white py-2.5 items-center rounded-lg shadow-sm shadow-gray-300">
            <Text className="text-black font-semibold">Active Disputes</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 py-2.5 items-center rounded-lg">
            <Text className="text-gray-600 font-medium">Resolved</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
        
        {/* List Items */}

        {/* Item 1 - OPEN */}
        <TouchableOpacity className="px-5 py-4 border-b border-gray-100">
          <View className="bg-[#FDE047] self-start px-2 py-1 rounded mb-2">
            <Text className="text-black text-xs font-bold uppercase">Open</Text>
          </View>
          <Text className="text-black text-lg font-bold mb-1">Incorrect Trip Fare - ID #4582</Text>
          <Text className="text-black text-base mb-2 leading-5">Passenger charged less than estimate. Trip to Boston.</Text>
          <Text className="text-gray-500 text-sm">Today, 10:30 AM</Text>
        </TouchableOpacity>

        {/* Item 2 - UNDER REVIEW */}
        <TouchableOpacity className="px-5 py-4 border-b border-gray-100">
          <View className="bg-[#3B82F6] self-start px-2 py-1 rounded mb-2">
            <Text className="text-white text-xs font-bold uppercase">Under Review</Text>
          </View>
          <Text className="text-black text-lg font-bold mb-1">Passenger Behavior Issue - ID #4579</Text>
          <Text className="text-black text-base mb-2 leading-5">Passenger was rude and refused to wear a mask.</Text>
          <Text className="text-gray-500 text-sm">Yesterday, 4:15 PM</Text>
        </TouchableOpacity>

        {/* Item 3 - RESOLVED */}
        <TouchableOpacity className="px-5 py-4 border-b border-gray-100 opacity-60">
          <View className="bg-[#22C55E] self-start px-2 py-1 rounded mb-2">
            <Text className="text-white text-xs font-bold uppercase">Resolved</Text>
          </View>
          <Text className="text-black text-lg font-bold mb-1">Payment Delay - ID #4561</Text>
          <Text className="text-black text-base mb-2 leading-5">Weekly earnings payment delayed by 2 days.</Text>
          <Text className="text-gray-500 text-sm">Oct 24, 2023</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Floating Action Button */}
      <View className="absolute bottom-24 right-5 z-20">
        <TouchableOpacity className="bg-[#2563EB] flex-row items-center px-5 py-4 rounded-full shadow-lg shadow-blue-500/50">
          <Feather name="plus" size={24} color="white" className="mr-2" />
          <Text className="text-white font-semibold text-lg">Raise a Dispute</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8 z-10">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="car-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="currency-usd" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#2563EB" />
          <Text className="text-[#2563EB] text-xs mt-1 font-semibold">Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
