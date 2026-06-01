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
import { LinearGradient } from 'expo-linear-gradient';

export default function ParcelDeliveryProgressTracker() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between bg-white z-10">
        <TouchableOpacity>
          <Feather name="chevron-left" size={32} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Parcel Tracker</Text>
        <TouchableOpacity>
          <Feather name="share" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* Info Card with Blur Background */}
        <View className="w-full rounded-3xl overflow-hidden mb-8 shadow-lg shadow-gray-400">
           {/* Fake blurred map background */}
           <View className="absolute inset-0 bg-blue-900">
              <LinearGradient colors={['#1E3A8A', '#064E3B']} className="flex-1 opacity-80" />
           </View>
           
           <View className="p-6 bg-black/20 backdrop-blur-md">
              <Text className="text-gray-300 text-sm mb-1">Estimated Delivery Time</Text>
              <Text className="text-white text-[22px] font-bold mb-6">Tomorrow, 10:00 AM - 2:00 PM</Text>

              <View className="h-px bg-white/20 w-full mb-4" />

              <Text className="text-gray-300 text-sm mb-3">Delivery Partner Details</Text>
              
              <View className="flex-row items-center justify-between">
                 <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-blue-500 mr-3 border-2 border-white items-center justify-center overflow-hidden">
                       <Ionicons name="person" size={28} color="white" style={{marginTop: 6}} />
                    </View>
                    <View>
                       <View className="flex-row items-center mb-1">
                          <Text className="text-white text-base font-bold mr-2">Apex Logistics - John D.</Text>
                       </View>
                       <View className="flex-row items-center">
                          <Text className="text-gray-200 text-sm mr-1">(4.8</Text>
                          <Ionicons name="star" size={14} color="#FBBF24" />
                          <Text className="text-gray-200 text-sm">)</Text>
                       </View>
                    </View>
                 </View>
                 <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center backdrop-blur-md">
                    <Feather name="phone" size={18} color="white" />
                 </TouchableOpacity>
              </View>
           </View>
        </View>

        {/* Vertical Timeline */}
        <View className="px-2 mb-8">
           
           {/* Picked Up Step */}
           <View className="flex-row mb-6 relative">
              <View className="items-center mr-4 z-10">
                 <View className="w-12 h-12 rounded-full bg-[#22C55E] items-center justify-center border-4 border-white shadow-sm shadow-green-200">
                    <Feather name="check" size={24} color="white" />
                 </View>
                 {/* Line down */}
                 <View className="w-1 h-full bg-[#22C55E] absolute top-12" />
              </View>
              <View className="flex-1 pt-1 pb-6">
                 <Text className="text-black text-xl font-bold mb-2">Picked Up</Text>
                 <View className="h-2 bg-[#22C55E] rounded-full w-full mb-2" />
                 <Text className="text-gray-700 text-base">Oct 25, 3:45 PM • Sender's Hub, City A</Text>
              </View>
           </View>

           {/* In Transit Step */}
           <View className="flex-row mb-6 relative">
              <View className="items-center mr-4 z-10">
                 <View className="w-12 h-12 rounded-full bg-[#3B82F6] items-center justify-center border-4 border-white shadow-sm shadow-blue-200">
                    <MaterialCommunityIcons name="truck-fast-outline" size={24} color="white" />
                 </View>
                 {/* Line down */}
                 <View className="w-1 h-full bg-[#3B82F6] absolute top-12" />
              </View>
              <View className="flex-1 pt-1 pb-6">
                 <Text className="text-black text-xl font-bold mb-2">In Transit</Text>
                 <View className="h-2 bg-blue-100 rounded-full w-full mb-2 flex-row">
                    <View className="h-full w-[80%] bg-[#3B82F6] rounded-full" />
                 </View>
                 <Text className="text-gray-700 text-base leading-6">Oct 25, 8:15 PM • Intercity Terminal, City B{'\n'}Arrived at facility</Text>
              </View>
           </View>

           {/* Out for Delivery Step */}
           <View className="flex-row mb-6 relative">
              <View className="items-center mr-4 z-10">
                 <View className="w-12 h-12 rounded-full bg-[#E2E8F0] items-center justify-center border-4 border-white">
                    <MaterialCommunityIcons name="truck-delivery-outline" size={24} color="#94A3B8" />
                 </View>
                 {/* Line down */}
                 <View className="w-1 h-full bg-[#E2E8F0] absolute top-12" />
              </View>
              <View className="flex-1 pt-1 pb-6">
                 <Text className="text-gray-500 text-xl font-bold mb-1">Out for Delivery</Text>
                 <Text className="text-gray-400 text-base">Pending</Text>
              </View>
           </View>

           {/* Delivered Step */}
           <View className="flex-row">
              <View className="items-center mr-4 z-10">
                 <View className="w-12 h-12 rounded-full bg-[#E2E8F0] items-center justify-center border-4 border-white">
                    <Feather name="package" size={24} color="#94A3B8" />
                 </View>
              </View>
              <View className="flex-1 pt-1">
                 <Text className="text-gray-500 text-xl font-bold mb-1">Delivered</Text>
                 <Text className="text-gray-400 text-base">Pending</Text>
              </View>
           </View>

        </View>

      </ScrollView>

      {/* Floating Action Button area */}
      <View className="px-5 pb-6 pt-2 bg-white border-t border-gray-100">
         <TouchableOpacity className="w-full bg-[#2563EB] py-4 rounded-full items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Text className="text-white text-lg font-bold">Live Tracking</Text>
         </TouchableOpacity>
      </View>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Feather name="search" size={24} color="#2563EB" />
          <Text className="text-[#2563EB] text-xs mt-1 font-semibold">Track</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
