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

export default function ParcelSpaceLogisticsManager() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center justify-between bg-white border-b border-gray-200">
        <TouchableOpacity>
          <Feather name="arrow-left" size={24} color="#1D4ED8" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Parcel Request</Text>
        <TouchableOpacity>
          <Feather name="x" size={24} color="#1D4ED8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* Parcel Image Card */}
        <View className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm shadow-gray-300 border border-gray-100">
           <View className="h-48 bg-[#E2E8F0] items-center justify-center w-full">
              {/* Fake 3D Box using borders and background colors */}
              <View className="w-32 h-20 bg-[#D4A373] relative mt-8 transform -skew-x-12 border border-[#B08968]">
                 <View className="absolute -top-10 left-5 w-32 h-10 bg-[#E6CCB2] transform skew-x-12 border border-[#B08968]" />
                 <View className="absolute -left-10 top-[-20px] w-10 h-20 bg-[#C29565] transform skew-y-12 border border-[#B08968]" />
                 {/* Fake tape */}
                 <View className="absolute top-0 left-12 w-8 h-full bg-[#E6CCB2]/50 border-x border-[#B08968]/30" />
                 <View className="absolute -top-10 left-[68px] w-8 h-10 bg-[#F5EBE0]/50 transform skew-x-12 border-x border-[#B08968]/30" />
              </View>
           </View>
           <View className="p-3 items-center border-t border-gray-100">
              <Text className="text-gray-600 font-medium">Parcel Image Preview</Text>
           </View>
        </View>

        {/* Info Tags */}
        <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm shadow-gray-300 border border-gray-100 flex-row justify-between">
           <View className="flex-row items-center flex-1 border-r border-gray-200 pr-2">
              <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center mr-2">
                 <MaterialCommunityIcons name="glass-fragile" size={20} color="#1D4ED8" />
              </View>
              <View>
                 <Text className="text-gray-500 text-[10px] font-bold">Fragile:</Text>
                 <Text className="text-black font-bold">Yes</Text>
              </View>
           </View>

           <View className="flex-row items-center flex-1 border-r border-gray-200 px-2">
              <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center mr-2">
                 <MaterialCommunityIcons name="weight" size={20} color="#1D4ED8" />
              </View>
              <View>
                 <Text className="text-gray-500 text-[10px] font-bold">Weight:</Text>
                 <Text className="text-black font-bold">15kg</Text>
              </View>
           </View>

           <View className="flex-row items-center flex-1 pl-2">
              <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center mr-2">
                 <Feather name="box" size={20} color="#1D4ED8" />
              </View>
              <View>
                 <Text className="text-gray-500 text-[10px] font-bold">Dimensions:</Text>
                 <Text className="text-black font-bold">Medium</Text>
              </View>
           </View>
        </View>

        {/* Space Allocation section */}
        <Text className="text-black text-lg font-bold mb-3">Space Allocation</Text>
        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm shadow-gray-300 border border-gray-100 flex-row items-center">
           
           {/* Open Trunk Graphic Mock */}
           <View className="w-32 h-24 mr-4 relative justify-center items-center">
              {/* Car back outline */}
              <View className="w-28 h-16 bg-[#CBD5E1] rounded-b-2xl border-2 border-[#94A3B8] absolute bottom-0">
                 {/* Tail lights */}
                 <View className="absolute top-2 left-0 w-4 h-2 bg-[#FCA5A5]" />
                 <View className="absolute top-2 right-0 w-4 h-2 bg-[#FCA5A5]" />
              </View>
              {/* Open Trunk Lid */}
              <View className="w-24 h-12 bg-[#E2E8F0] border-2 border-[#94A3B8] rounded-t-2xl absolute top-0 transform -skew-x-12" />
              {/* Trunk Interior */}
              <View className="w-24 h-10 bg-[#64748B] absolute bottom-4 rounded border-b border-[#475569] flex-row items-end p-1 shadow-inner">
                 {/* Fake Box inside */}
                 <View className="w-10 h-8 bg-[#D4A373] border border-[#F97316] relative ml-2 shadow-lg shadow-black">
                    <View className="absolute inset-0 bg-[#F97316] opacity-20" />
                 </View>
              </View>
           </View>

           {/* 30% indicator */}
           <View className="flex-1 justify-center">
              <View className="flex-row w-full h-8 bg-[#E2E8F0] rounded-md mb-2 overflow-hidden border border-[#CBD5E1] relative">
                 <View className="w-[30%] h-full bg-[#1D4ED8] items-center justify-center">
                    <Text className="text-white text-xs font-bold">30%</Text>
                 </View>
                 {/* 3D Box wireframe overlay on the bar */}
                 <View className="absolute left-[20%] top-[-4px] w-8 h-10 border-2 border-[#F97316] bg-orange-50/50 shadow-md shadow-orange-500/20 transform skew-y-12" />
                 <View className="absolute left-[20%] top-[-4px] w-8 h-10 border-2 border-[#F97316] bg-transparent transform -skew-y-12" />

                 <View className="flex-1 flex-row">
                    <View className="flex-1 border-l border-white/50" />
                    <View className="flex-1 border-l border-white/50" />
                    <View className="flex-1 border-l border-white/50" />
                 </View>
              </View>
              <Text className="text-gray-700 text-sm">Occupies ~30% Trunk Space</Text>
           </View>
        </View>

        {/* Pickup Instruction */}
        <View className="bg-white rounded-2xl p-5 mb-8 shadow-sm shadow-gray-300 border border-gray-100 flex-row">
           <View className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center mr-4">
              <Ionicons name="document-text-outline" size={24} color="#1D4ED8" />
           </View>
           <View className="flex-1">
              <Text className="text-black text-lg font-bold mb-1">Pickup Instruction</Text>
              <Text className="text-gray-700 text-base leading-5">Gate code is 4521. Please call upon arrival. Package is with the concierge.</Text>
           </View>
        </View>

      </ScrollView>

      {/* Accept Button Footer */}
      <View className="px-4 pb-6 pt-2 bg-[#F1F5F9]">
         {/* Button with orange accent */}
         <TouchableOpacity className="w-full h-14 bg-[#1E3A8A] rounded-xl flex-row items-center justify-center shadow-lg shadow-blue-900/30 relative">
            <Text className="text-white text-lg font-bold">Accept Parcel</Text>
            {/* Orange accent on the right */}
            <View className="absolute right-0 top-0 h-full w-2 bg-[#F97316] rounded-r-xl" />
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
