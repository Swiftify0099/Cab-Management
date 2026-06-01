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

export default function ParcelDeliveryProofSignature() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center bg-white border-b border-gray-200">
        <TouchableOpacity className="mr-6">
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold flex-1 text-center mr-10">Proof of Delivery</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-8" showsVerticalScrollIndicator={false}>
        
        {/* Success Icon & Text */}
        <View className="items-center mb-8">
           <View className="w-20 h-20 bg-[#22C55E] rounded-full items-center justify-center mb-4 shadow-lg shadow-green-200 border-4 border-green-100">
              <Feather name="check" size={40} color="white" />
           </View>
           <Text className="text-black text-3xl font-extrabold mb-2 text-center">Delivery Completed!</Text>
           <Text className="text-gray-600 text-lg">Thank you, driver.</Text>
        </View>

        {/* Trip Summary Card */}
        <Text className="text-black text-xl font-bold mb-3">Trip Summary</Text>
        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm shadow-gray-200 border border-gray-100">
           <View className="flex-row mb-3">
              <Text className="text-black text-base font-bold w-32">Order ID:</Text>
              <Text className="text-gray-700 text-base flex-1">#39482751</Text>
           </View>
           <View className="flex-row mb-3">
              <Text className="text-black text-base font-bold w-32">Recipient:</Text>
              <Text className="text-gray-700 text-base flex-1">Sarah Jenkins</Text>
           </View>
           <View className="flex-row mb-3">
              <Text className="text-black text-base font-bold w-32">Address:</Text>
              <Text className="text-gray-700 text-base flex-1 leading-5">123 Maple Ave, Suite 4B, Springfield</Text>
           </View>
           <View className="flex-row">
              <Text className="text-black text-base font-bold w-32">Delivered At:</Text>
              <Text className="text-gray-700 text-base flex-1">10:45 AM</Text>
           </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity className="w-full bg-white border-2 border-[#1D4ED8] py-4 rounded-xl items-center flex-row justify-center mb-4 shadow-sm shadow-blue-100">
           <MaterialCommunityIcons name="barcode-scan" size={24} color="#1D4ED8" className="mr-3" />
           <Text className="text-[#1D4ED8] text-lg font-bold">Scan Parcel Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity className="w-full bg-white border-2 border-[#1D4ED8] py-4 rounded-xl items-center flex-row justify-center mb-8 shadow-sm shadow-blue-100">
           <Feather name="camera" size={24} color="#1D4ED8" className="mr-3" />
           <Text className="text-[#1D4ED8] text-lg font-bold">Take Photo of Delivered Parcel</Text>
        </TouchableOpacity>

        {/* Signature Area */}
        <Text className="text-black text-xl font-bold mb-3">Recipient Signature</Text>
        <View className="bg-white rounded-2xl p-4 mb-8 shadow-sm shadow-gray-200 border border-gray-100">
           
           <View className="w-full h-32 bg-[#F1F5F9] rounded-xl mb-4 border border-gray-200 items-center justify-center">
              {/* Fake signature area */}
           </View>

           <View className="flex-row justify-between">
              <TouchableOpacity className="bg-white border border-gray-300 py-3 rounded-lg flex-1 mr-2 items-center">
                 <Text className="text-gray-500 font-bold text-base">Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-[#94A3B8] py-3 rounded-lg flex-[2] ml-2 items-center">
                 <Text className="text-white font-bold text-base">Confirm Signature</Text>
              </TouchableOpacity>
           </View>
        </View>

      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#1D4ED8" />
          <Text className="text-[#1D4ED8] text-xs mt-1 font-semibold">Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="location-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Map</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
