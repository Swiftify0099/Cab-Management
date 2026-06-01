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

export default function ParcelTrackingTimelineUi() {
  return (
    <SafeAreaView className="flex-1 bg-white relative">
      <StatusBar barStyle="dark-content" />

      {/* Fake Map Background Overlay */}
      <View className="absolute inset-0 bg-[#E0F2FE]">
         <LinearGradient colors={['#BAE6FD', '#E0F2FE', '#F0F9FF']} className="flex-1 opacity-80" />
         {/* Fake Map Roads using borders */}
         <View className="absolute inset-0 opacity-20">
            <View className="w-full h-12 border-y-[6px] border-white transform rotate-12 top-20" />
            <View className="w-32 h-full border-x-[8px] border-white absolute left-20" />
            <View className="w-full h-20 border-y-[10px] border-white transform -rotate-45 top-64" />
            <View className="w-40 h-full border-x-[6px] border-white absolute right-10" />
            {/* Fake Water body */}
            <View className="absolute top-0 left-0 w-32 h-32 bg-blue-300 rounded-br-full opacity-40" />
         </View>
      </View>

      {/* Main Glassmorphic Container */}
      <View className="flex-1 m-4 mt-8 rounded-3xl overflow-hidden border border-white/60 bg-white/60 shadow-xl shadow-blue-900/10 backdrop-blur-3xl">
         <LinearGradient colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)', 'rgba(240,249,255,0.9)']} className="absolute inset-0" />

         {/* Header */}
         <View className="px-5 pt-6 pb-4 flex-row items-center justify-between">
            <TouchableOpacity>
               <Feather name="arrow-left" size={28} color="black" />
            </TouchableOpacity>
            <Text className="text-black text-xl font-bold">Parcel Status Timeline</Text>
            <TouchableOpacity>
               <Feather name="share" size={24} color="black" />
            </TouchableOpacity>
         </View>

         <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>
            
            {/* ID & ETA Card */}
            <View className="bg-white/50 rounded-2xl p-4 mb-8 border border-white shadow-sm shadow-blue-100">
               <Text className="text-black text-base font-medium mb-1">Tracking ID: <Text className="font-bold">P-3849201</Text></Text>
               <Text className="text-black text-base font-medium">Estimated Delivery: <Text className="font-bold">Today, 6:00 PM</Text></Text>
            </View>

            {/* Vertical Timeline */}
            <View className="px-2 mb-6">
               
               {/* Booking Confirmed */}
               <View className="flex-row mb-6 relative">
                  <View className="items-center mr-4 z-10">
                     <View className="w-12 h-12 rounded-full bg-[#22C55E] items-center justify-center">
                        <Feather name="check" size={24} color="white" />
                     </View>
                     <View className="w-0.5 h-full bg-[#22C55E] absolute top-12" />
                  </View>
                  <View className="flex-1 pt-1 pb-6 flex-row justify-between pr-2">
                     <View>
                        <Text className="text-black text-lg font-bold mb-1">Booking Confirmed</Text>
                        <Text className="text-gray-700 text-sm">Oct 25, 10:00 AM</Text>
                     </View>
                     <View className="bg-[#22C55E] px-3 h-6 justify-center rounded-full">
                        <Text className="text-white text-xs font-bold">Completed</Text>
                     </View>
                  </View>
               </View>

               {/* Driver Assigned */}
               <View className="flex-row mb-6 relative">
                  <View className="items-center mr-4 z-10">
                     <View className="w-12 h-12 rounded-full bg-[#22C55E] items-center justify-center">
                        <Feather name="check" size={24} color="white" />
                     </View>
                     <View className="w-0.5 h-full bg-[#22C55E] absolute top-12" />
                  </View>
                  <View className="flex-1 pt-1 pb-6 flex-row justify-between pr-2">
                     <View>
                        <Text className="text-black text-lg font-bold mb-1">Driver Assigned</Text>
                        <Text className="text-gray-700 text-sm">Oct 25, 11:15 AM</Text>
                     </View>
                     <View className="bg-[#22C55E] px-3 h-6 justify-center rounded-full">
                        <Text className="text-white text-xs font-bold">Completed</Text>
                     </View>
                  </View>
               </View>

               {/* In Transit */}
               <View className="flex-row mb-6 relative">
                  <View className="items-center mr-4 z-10">
                     <View className="w-12 h-12 rounded-full bg-[#3B82F6] items-center justify-center">
                        <MaterialCommunityIcons name="truck-fast" size={24} color="white" />
                     </View>
                     <View className="w-0.5 h-full bg-[#3B82F6] absolute top-12" />
                  </View>
                  <View className="flex-1 pt-1 pb-6 flex-row justify-between pr-2 items-start">
                     <View>
                        <Text className="text-black text-lg font-bold mb-1">In Transit (Mumbai)</Text>
                        <Text className="text-gray-700 text-sm">Oct 26, 2:30 PM</Text>
                     </View>
                     <View className="bg-[#3B82F6] px-3 h-6 justify-center rounded-full mt-1">
                        <Text className="text-white text-xs font-bold">In Progress</Text>
                     </View>
                  </View>
               </View>

               {/* Out for Delivery */}
               <View className="flex-row relative">
                  <View className="items-center mr-4 z-10">
                     <View className="w-12 h-12 rounded-full bg-[#3B82F6] items-center justify-center shadow-lg shadow-blue-500/50">
                        <MaterialCommunityIcons name="motorbike" size={24} color="white" />
                     </View>
                  </View>
                  <View className="flex-1 pt-1 flex-row justify-between pr-2 items-start">
                     <View className="flex-1 pr-2">
                        <Text className="text-black text-lg font-bold mb-1">Out for Delivery (Pune)</Text>
                        <Text className="text-gray-700 text-sm">Oct 27, 8:45 AM</Text>
                     </View>
                     <View className="bg-[#3B82F6] px-4 py-1.5 justify-center items-center rounded-2xl shadow-md shadow-blue-500/30">
                        <Text className="text-white text-xs font-bold leading-4 text-center">Current{'\n'}Status</Text>
                     </View>
                  </View>
               </View>
            </View>

            {/* Fragile Alert Box */}
            <View className="bg-white/60 rounded-2xl p-4 mb-4 border border-white shadow-sm shadow-red-100 flex-row items-center">
               <View className="w-12 h-12 rounded-full bg-[#EF4444] items-center justify-center mr-4 shadow-sm shadow-red-300">
                  <MaterialCommunityIcons name="glass-fragile" size={24} color="white" />
               </View>
               <View>
                  <Text className="text-black text-base font-bold mb-0.5">Fragile Item</Text>
                  <Text className="text-gray-700 text-sm">Handle with Care: Electronics</Text>
               </View>
            </View>

            {/* Recipient Details Box */}
            <View className="bg-white/60 rounded-2xl p-4 mb-8 border border-white shadow-sm shadow-blue-100">
               <Text className="text-black text-base font-bold mb-1">Recipient Details</Text>
               <Text className="text-gray-800 text-base">Rahul Sharma</Text>
               <Text className="text-gray-700 text-sm">Flat 4B, Pune City Center, Pune, MH</Text>
            </View>

         </ScrollView>

         {/* Bottom Navigation inside the Glass panel */}
         <View className="bg-white/80 border-t border-white/50 flex-row justify-around py-3 pb-6 backdrop-blur-xl">
           <TouchableOpacity className="items-center">
             <Ionicons name="home-outline" size={24} color="#64748B" />
             <Text className="text-[#64748B] text-xs mt-1">Home</Text>
           </TouchableOpacity>
           <TouchableOpacity className="items-center">
             <Feather name="box" size={24} color="#64748B" />
             <Text className="text-[#64748B] text-xs mt-1">Shipments</Text>
           </TouchableOpacity>
           <TouchableOpacity className="items-center">
             <Feather name="navigation" size={24} color="#2563EB" />
             <Text className="text-[#2563EB] text-xs mt-1 font-semibold">Track</Text>
             {/* Active indicator underline mock */}
             <View className="absolute -top-3 w-8 h-1 bg-[#2563EB] rounded-b-md" />
           </TouchableOpacity>
           <TouchableOpacity className="items-center">
             <Feather name="user" size={24} color="#64748B" />
             <Text className="text-[#64748B] text-xs mt-1">Profile</Text>
           </TouchableOpacity>
         </View>
      </View>

      {/* Brand logo at bottom */}
      <Text className="text-center text-gray-500 font-bold text-lg mb-2 absolute bottom-2 w-full z-0 opacity-50">ParcelPro</Text>

    </SafeAreaView>
  );
}
