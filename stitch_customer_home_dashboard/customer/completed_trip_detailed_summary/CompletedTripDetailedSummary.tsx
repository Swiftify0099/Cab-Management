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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CompletedTripDetailedSummary() {
  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4 bg-[#F9FAFB]">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-black">Trip Summary</Text>
        <TouchableOpacity>
          <Feather name="upload" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        
        {/* Map Header Card */}
        <View className="w-full h-48 bg-[#BDE2F6] rounded-2xl mb-4 overflow-hidden relative shadow-sm shadow-gray-300">
           {/* Map texture mock */}
           <View className="absolute inset-0 opacity-40 bg-[#D4E8CE]" style={{ transform: [{rotate: '15deg'}, {scale: 1.5}] }}>
             {/* Mock roads */}
             <View className="w-full h-1 bg-white mb-10" />
             <View className="w-1 h-full bg-white ml-20 absolute" />
           </View>
           
           {/* Route mock */}
           <View className="absolute top-1/4 left-[20%] w-[60%] h-[50%] border-r-4 border-b-4 border-[#2563EB] rounded-br-[40px] shadow-sm" />
           
           {/* SF Pin */}
           <View className="absolute top-[20%] left-[18%] flex-row items-center">
             <Text className="text-black font-medium text-sm mr-1 shadow-sm shadow-white">San Francisco</Text>
             <View className="w-3 h-3 bg-white rounded-full border-2 border-[#2563EB]" />
           </View>

           {/* LA Pin */}
           <View className="absolute bottom-[20%] right-[18%] flex-row items-center">
             <View className="w-3 h-3 bg-[#2563EB] rounded-full border-2 border-white mr-1 shadow-sm" />
             <Text className="text-black font-medium text-sm shadow-sm shadow-white">Los Angeles</Text>
           </View>

           {/* Title overlay */}
           <View className="absolute bottom-4 left-4">
             <Text className="text-2xl font-extrabold text-black drop-shadow-md">SF to LA Intercity</Text>
           </View>
        </View>

        {/* Top Stats Cards */}
        <View className="flex-row justify-between mb-4">
          
          {/* Card 1: Distance */}
          <View className="flex-1 bg-white rounded-2xl p-4 items-center justify-center mr-2 shadow-sm shadow-gray-200 border border-gray-100">
            <Ionicons name="car-outline" size={28} color="#6B7280" className="mb-2" />
            <Text className="text-gray-600 text-xs font-medium mb-1">Distance Covered</Text>
            <Text className="text-black text-xl font-bold">382 miles</Text>
          </View>

          {/* Card 2: Time */}
          <View className="flex-1 bg-white rounded-2xl p-4 items-center justify-center mx-1 shadow-sm shadow-gray-200 border border-gray-100">
            <Feather name="clock" size={24} color="#6B7280" className="mb-3" />
            <Text className="text-gray-600 text-xs font-medium mb-1">Total Time</Text>
            <Text className="text-black text-xl font-bold">5h 45m</Text>
          </View>

          {/* Card 3: Rating */}
          <View className="flex-1 bg-white rounded-2xl p-4 items-center justify-center ml-2 shadow-sm shadow-gray-200 border border-gray-100">
            <Ionicons name="star" size={28} color="#6B7280" className="mb-2" />
            <Text className="text-gray-600 text-xs font-medium mb-1">Final Rating</Text>
            <Text className="text-black text-2xl font-bold">4.9</Text>
            <Text className="text-gray-400 text-[10px] mt-1">Customer Rating</Text>
          </View>
        </View>

        {/* Fare Breakdown Sheet */}
        <View className="bg-white rounded-3xl p-5 shadow-sm shadow-gray-200 border border-gray-100 mb-6">
          <Text className="text-lg font-bold text-black mb-4">Fare Breakdown</Text>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-black text-base">Base Fare</Text>
            <Text className="text-black text-base font-medium">$350.00</Text>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-black text-base">Distance Charge</Text>
            <Text className="text-black text-base font-medium">$76.40</Text>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-black text-base">Tolls & Fees</Text>
            <Text className="text-black text-base font-medium">$15.00</Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-black text-base">Surge Pricing</Text>
            <Text className="text-black text-base font-medium">$25.00</Text>
          </View>

          <View className="flex-row justify-between mb-4">
            <Text className="text-black text-base">Tips</Text>
            <Text className="text-black text-base font-medium">$40.00</Text>
          </View>

          <View className="h-[1px] bg-gray-200 mb-4" />

          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-black">Total Fare</Text>
            <Text className="text-xl font-bold text-[#22C55E]">$506.40</Text>
          </View>

          {/* Action Buttons inside Card */}
          <TouchableOpacity className="w-full bg-[#3B82F6] py-3.5 rounded-full items-center mb-3">
            <Text className="text-white text-lg font-semibold">View Receipt</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="w-full bg-white border-2 border-gray-300 py-3 rounded-full items-center">
            <Text className="text-gray-500 text-lg font-semibold">Download Summary</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Log */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-black mb-4 px-1">Premium SaaS Activity Log</Text>
          
          <View className="flex-row items-center mb-3 px-1">
            <View className="w-6 h-6 rounded-full bg-gray-500 items-center justify-center mr-3">
              <Feather name="check" size={14} color="white" />
            </View>
            <Text className="text-black text-base">Trip Completed - 10:30 AM</Text>
          </View>

          <View className="flex-row items-center mb-2 px-1">
            <View className="w-6 h-6 rounded-full bg-gray-500 items-center justify-center mr-3">
              <Feather name="clock" size={14} color="white" />
            </View>
            <Text className="text-black text-base">Receipt Generated - 10:32 AM</Text>
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
