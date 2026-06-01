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

export default function KycApprovalStatus() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center">
           <TouchableOpacity className="mr-4">
             <Feather name="chevron-left" size={28} color="black" />
           </TouchableOpacity>
           <Text className="text-black text-xl font-bold">KYC Approval Status</Text>
        </View>
        <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
          <Feather name="user" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-8 pt-8" showsVerticalScrollIndicator={false}>
        
        {/* Graphic */}
        <View className="items-center justify-center mb-8 relative h-48">
           <View className="absolute w-48 h-48 bg-blue-50 rounded-full" />
           <MaterialCommunityIcons name="file-document-outline" size={100} color="#9CA3AF" className="z-10" />
           <View className="absolute top-8 right-16 z-20 bg-white rounded-full p-1 shadow-sm">
              <MaterialCommunityIcons name="cog" size={32} color="#3B82F6" />
           </View>
           <View className="absolute bottom-8 left-16 z-20 bg-white rounded-full p-1 shadow-sm">
              <MaterialCommunityIcons name="file-search-outline" size={40} color="#3B82F6" />
           </View>
           <View className="absolute top-1/2 w-48 h-1 bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)] z-30" />
        </View>

        {/* Status Texts */}
        <Text className="text-black text-2xl font-extrabold text-center mb-3">Waiting for Approval</Text>
        <Text className="text-gray-600 text-center text-base leading-6 mb-12 px-4">
           Your documents are being reviewed. This usually takes 24-48 hours. You'll be notified once complete.
        </Text>

        {/* Vertical Timeline */}
        <View className="pl-4">
           
           {/* Step 1 */}
           <View className="flex-row mb-8 relative">
              {/* Connector line */}
              <View className="absolute left-[17px] top-10 bottom-[-32px] w-0.5 bg-gray-300" />
              
              <View className="w-9 h-9 rounded-full bg-[#22C55E] items-center justify-center mr-4 z-10">
                 <Feather name="check" size={20} color="white" />
              </View>
              <View>
                 <Text className="text-black text-lg font-bold">Documents Uploaded</Text>
                 <Text className="text-gray-500 text-sm">Today, 9:30 AM</Text>
              </View>
           </View>

           {/* Step 2 */}
           <View className="flex-row mb-8 relative">
              {/* Connector line */}
              <View className="absolute left-[17px] top-10 bottom-[-32px] w-0.5 bg-gray-300" />
              
              <View className="relative w-9 h-9 mr-4 z-10 items-center justify-center">
                 <View className="absolute inset-[-8px] border border-blue-200 rounded-full" />
                 <View className="absolute inset-[-4px] border border-blue-300 rounded-full" />
                 <View className="w-9 h-9 rounded-full bg-[#3B82F6] items-center justify-center">
                    <MaterialCommunityIcons name="file-search" size={20} color="white" />
                 </View>
              </View>
              <View className="justify-center">
                 <Text className="text-black text-lg font-bold">KYC Verification (In-Progress)</Text>
              </View>
           </View>

           {/* Step 3 */}
           <View className="flex-row mb-8 relative">
              {/* Connector line */}
              <View className="absolute left-[17px] top-10 bottom-[-32px] w-0.5 bg-gray-300" />
              
              <View className="w-9 h-9 rounded-full bg-gray-400 items-center justify-center mr-4 z-10">
                 <MaterialCommunityIcons name="clock-time-four" size={20} color="white" />
              </View>
              <View className="justify-center">
                 <Text className="text-gray-500 text-lg font-bold">Background Check</Text>
              </View>
           </View>

           {/* Step 4 */}
           <View className="flex-row mb-8 relative">
              <View className="w-9 h-9 rounded-full bg-gray-400 items-center justify-center mr-4 z-10">
                 <MaterialCommunityIcons name="car" size={20} color="white" />
              </View>
              <View className="justify-center">
                 <Text className="text-gray-500 text-lg font-bold">Active</Text>
              </View>
           </View>

        </View>

      </ScrollView>

      {/* Floating Contact Support Button */}
      <View className="absolute bottom-10 right-5 z-50">
         <TouchableOpacity className="bg-[#1D4ED8] px-6 py-4 rounded-full flex-row items-center shadow-lg shadow-blue-300">
            <MaterialCommunityIcons name="message-text" size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-base">Contact Support</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
