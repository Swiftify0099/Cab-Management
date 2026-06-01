import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function PartnerSupportHub() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Partner Support Hub</Text>
        <TouchableOpacity className="w-8 h-8 rounded-full border-2 border-black items-center justify-center">
          <Feather name="user" size={16} color="black" />
        </TouchableOpacity>
      </View>

      {/* Chat Banner */}
      <View className="bg-white px-4 pb-4 border-b border-gray-200">
        <View className="bg-[#1D4ED8] rounded-xl p-4 flex-row items-center justify-between">
           <View className="flex-row items-center flex-1 pr-2">
              <View className="relative w-10 h-10 mr-3 justify-center items-center">
                 <Ionicons name="chatbubbles" size={32} color="white" />
              </View>
              <Text className="text-white text-lg font-bold flex-shrink leading-6">Live Chat with Partner Support</Text>
           </View>
           <TouchableOpacity className="bg-white px-4 py-2 rounded-md shadow-sm">
             <Text className="text-[#1D4ED8] font-bold">Start Chat</Text>
           </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View className="bg-white flex-row mb-4 shadow-sm shadow-gray-200">
        <TouchableOpacity className="flex-1 items-center py-4 border-b-2 border-[#1D4ED8]">
           <Text className="text-[#1D4ED8] font-bold text-base">Active Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 items-center py-4 border-b border-gray-200">
           <Text className="text-gray-600 font-medium text-base">Resolved Issues</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        
        {/* Ticket 1 */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm shadow-gray-200">
          <View className="flex-row justify-between items-start mb-2">
             <View className="bg-[#FDBA74] px-3 py-1 rounded-full">
                <Text className="text-black text-xs font-medium">In Progress</Text>
             </View>
             <Text className="text-gray-600 text-sm">Today, 10:30 AM</Text>
          </View>
          <Text className="text-black text-lg font-bold mb-1">Payout Issue - Trip #1023</Text>
          <Text className="text-black text-base mb-2">Delayed payment enquiry for completed ride.</Text>
          <Text className="text-gray-500 text-sm">Today, 10:30 AM</Text>
        </View>

        {/* Ticket 2 */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm shadow-gray-200">
          <View className="flex-row justify-between items-start mb-2">
             <View className="bg-[#FDE047] px-3 py-1 rounded-full">
                <Text className="text-black text-xs font-medium">Pending</Text>
             </View>
             <Text className="text-gray-600 text-sm">Yesterday, 4:15 PM</Text>
          </View>
          <Text className="text-black text-lg font-bold mb-1">Vehicle Verification</Text>
          <Text className="text-black text-base mb-2">Docs submitted, awaiting approval</Text>
          <Text className="text-gray-500 text-sm">Yesterday, 4:15 PM</Text>
        </View>

        {/* Ticket 3 */}
        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm shadow-gray-200 relative overflow-hidden">
          <View className="flex-row justify-between items-start mb-2">
             <View className="bg-[#FDE047] px-3 py-1 rounded-full">
                <Text className="text-black text-xs font-medium">Pending</Text>
             </View>
             <Text className="text-gray-600 text-sm">Mar 12, 2024</Text>
          </View>
          <Text className="text-black text-lg font-bold mb-1">Route Assistance</Text>
          <Text className="text-black text-base mb-2">Issue with app navigation</Text>
          <Text className="text-gray-500 text-sm">Mar 12, 2024</Text>
        </View>
        
        <View className="h-20" />
      </ScrollView>

      {/* Floating Action Button */}
      <View className="absolute bottom-24 right-5 z-20">
        <TouchableOpacity className="bg-[#1D4ED8] w-16 h-16 rounded-full items-center justify-center shadow-lg shadow-blue-500/50">
          <Feather name="plus" size={32} color="white" />
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
          <Ionicons name="chatbubble-ellipses" size={24} color="#1D4ED8" />
          <Text className="text-[#1D4ED8] text-xs mt-1 font-semibold">Support</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
