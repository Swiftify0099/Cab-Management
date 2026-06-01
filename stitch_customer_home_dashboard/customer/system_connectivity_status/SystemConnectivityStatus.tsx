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

export default function SystemConnectivityStatus() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center bg-white shadow-sm shadow-gray-100 border-b border-gray-100">
        <TouchableOpacity className="w-10">
          <Feather name="arrow-left" size={28} color="#334155" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center">System Connectivity Status</Text>
        <TouchableOpacity className="w-10 items-end">
           <Ionicons name="person-circle" size={32} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
         
         {/* Weak GPS Card */}
         <View className="bg-white rounded-2xl border border-[#3B82F6] shadow-sm shadow-blue-100 overflow-hidden mb-6">
            <View className="px-5 py-4 border-b border-gray-100">
               <Text className="text-[#0F172A] text-lg font-semibold">Weak GPS</Text>
            </View>
            <View className="p-5 flex-row">
               {/* Mock Illustration Area */}
               <View className="w-24 items-center justify-center mr-4 relative">
                  <View className="w-20 h-20 rounded-full border border-dashed border-gray-300 items-center justify-center relative">
                     <MaterialCommunityIcons name="map-marker-outline" size={40} color="#64748B" />
                     <View className="absolute -top-3 -right-2 transform rotate-45 bg-white rounded-full p-0.5">
                        <MaterialCommunityIcons name="satellite-variant" size={24} color="#64748B" />
                     </View>
                     <View className="absolute -top-2 right-[-8px] w-4 h-4 bg-[#EF4444] rounded-full items-center justify-center border border-white">
                        <Feather name="x" size={10} color="white" />
                     </View>
                  </View>
               </View>

               <View className="flex-1">
                  <Text className="text-[#0F172A] text-xl font-bold mb-2">GPS Signal Lost</Text>
                  <Text className="text-gray-600 text-sm leading-5">
                     Please move to an open area to regain a strong GPS signal for better navigation.
                  </Text>
               </View>
            </View>
            <View className="px-5 pb-5 pt-2">
               <TouchableOpacity className="w-full bg-[#60A5FA] py-3.5 rounded-full items-center shadow-sm shadow-blue-300">
                  <Text className="text-white text-lg font-medium">Check Connection</Text>
               </TouchableOpacity>
            </View>
         </View>

         {/* No Internet Card */}
         <View className="bg-white rounded-2xl border border-[#F97316] shadow-sm shadow-orange-100 overflow-hidden">
            <View className="px-5 py-4 border-b border-gray-100">
               <Text className="text-[#0F172A] text-lg font-semibold">No Internet</Text>
            </View>
            <View className="p-5 flex-row">
               {/* Mock Illustration Area */}
               <View className="w-24 items-center justify-center mr-4">
                  <View className="relative items-center justify-center">
                     <MaterialCommunityIcons name="wifi" size={60} color="#CBD5E1" />
                     <View className="absolute w-full h-full items-center justify-center transform -rotate-12">
                        <View className="bg-white px-1 py-2 flex-row items-center border border-white rounded-md">
                           <View className="w-6 h-3 rounded-full border-2 border-[#EA580C] mr-0.5" />
                           <View className="w-6 h-3 rounded-full border-2 border-[#EA580C] -ml-2" />
                           {/* Broken link effect */}
                           <View className="absolute left-[40%] top-0 bottom-0 w-2 bg-white" />
                        </View>
                     </View>
                     <MaterialCommunityIcons name="cloud-off-outline" size={28} color="#94A3B8" className="absolute -bottom-2 -right-2 bg-white rounded-full" />
                  </View>
               </View>

               <View className="flex-1">
                  <Text className="text-[#0F172A] text-xl font-bold mb-2 leading-6">Connection{'\n'}Interrupted</Text>
                  <Text className="text-gray-600 text-sm leading-5">
                     We're having trouble connecting to the server. You can continue working in Offline Mode.
                  </Text>
               </View>
            </View>
            <View className="px-5 pb-5 pt-2">
               <TouchableOpacity className="w-full bg-[#F97316] py-3.5 rounded-full items-center shadow-sm shadow-orange-300">
                  <Text className="text-white text-lg font-medium">Try Offline Mode</Text>
               </TouchableOpacity>
            </View>
         </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8 absolute bottom-0 w-full z-20">
        <TouchableOpacity className="items-center">
          <Ionicons name="home" size={26} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-xs mt-1 font-semibold">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="car-multiple" size={28} color="#94A3B8" className="-mt-1" />
          <Text className="text-[#94A3B8] text-xs mt-0.5">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="currency-usd" size={28} color="#94A3B8" className="-mt-1" />
          <Text className="text-[#94A3B8] text-xs mt-0.5">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
