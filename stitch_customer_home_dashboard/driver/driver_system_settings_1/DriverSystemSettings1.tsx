import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function DriverSystemSettings1() {
  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 flex-row items-center">
        <TouchableOpacity className="w-10">
          <Feather name="chevron-left" size={32} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center pr-10">KYC Rejection & Resolution</Text>
      </View>

      <View className="flex-1 items-center justify-center px-6">
         
         {/* Icon */}
         <View className="w-24 h-24 bg-[#EF4444] rounded-full items-center justify-center mb-6 shadow-md shadow-red-200">
            <Text className="text-white text-5xl font-bold">!</Text>
         </View>

         {/* Text Content */}
         <Text className="text-[#0F172A] text-3xl font-bold mb-4 text-center">KYC Rejected</Text>
         
         <Text className="text-[#334155] text-lg text-center leading-7 mb-12">
            Your Aadhaar document could not be verified because it appears blurry. Please re-upload a clear, readable image.
         </Text>

         {/* Action Buttons */}
         <TouchableOpacity className="w-full bg-[#F8FAFC] border border-[#60A5FA] py-4 rounded-xl items-center flex-row justify-center shadow-sm shadow-blue-100 mb-4">
            <Feather name="upload" size={20} color="#2563EB" className="mr-3" />
            <Text className="text-[#2563EB] text-lg font-medium">Re-upload Aadhaar</Text>
         </TouchableOpacity>

         <TouchableOpacity className="w-full bg-[#F8FAFC] border border-[#60A5FA] py-4 rounded-xl items-center flex-row justify-center shadow-sm shadow-blue-100">
            <Feather name="message-square" size={20} color="#2563EB" className="mr-3" />
            <Text className="text-[#2563EB] text-lg font-medium">Chat with Onboarding Team</Text>
         </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
