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

export default function TripStopsBreakTimeline() {
  return (
    <SafeAreaView className="flex-1 bg-[#111827]">
      <StatusBar barStyle="light-content" />

      {/* Map Background Mock */}
      <View className="absolute inset-0 z-0 opacity-40">
         <View className="w-full h-full bg-[#0F172A] relative overflow-hidden">
            {/* Map lines */}
            <View className="absolute top-[10%] left-[-10%] w-[120%] h-[2px] bg-[#334155] transform rotate-12" />
            <View className="absolute top-[30%] left-[-10%] w-[120%] h-[2px] bg-[#334155] transform -rotate-6" />
            <View className="absolute top-[60%] left-[-10%] w-[120%] h-[2px] bg-[#334155] transform rotate-45" />
            
            {/* Route Line */}
            <View className="absolute top-0 bottom-0 left-[50%] w-[4px] bg-[#38BDF8] transform -rotate-12 shadow-md shadow-sky-500" />
         </View>
      </View>

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center z-10">
        <TouchableOpacity className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center border border-white/20">
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1 text-center">Trip Stops & Break Timeline</Text>
        <TouchableOpacity className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center border border-white/20">
           <Ionicons name="person" size={24} color="gray" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4 z-10" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
         
         {/* Main Glassmorphic Container */}
         <View className="bg-[#1E293B]/80 rounded-[32px] p-6 border border-[#38BDF8]/30 shadow-2xl shadow-sky-900/50 mb-8 overflow-hidden relative">
            
            {/* Glowing borders mock */}
            <View className="absolute -top-10 -left-10 w-40 h-40 bg-sky-500 rounded-full opacity-20 blur-3xl" />
            <View className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-20 blur-3xl" />

            {/* Header Section */}
            <View className="flex-row items-center mb-8 pl-16 relative">
               {/* Timeline top icon */}
               <View className="absolute left-0 w-10 h-10 bg-[#334155] rounded-full items-center justify-center border-2 border-[#1E293B] shadow-lg shadow-black z-10">
                  <MaterialCommunityIcons name="map-marker" size={24} color="#60A5FA" />
               </View>

               <View className="flex-1">
                  <Text className="text-white text-xl font-bold mb-1">En Route to Mumbai</Text>
                  <Text className="text-gray-400 text-base">Live tracking</Text>
               </View>
               <MaterialCommunityIcons name="access-point" size={28} color="#38BDF8" className="animate-pulse" />
            </View>

            {/* Timeline Line */}
            <View className="absolute left-[43px] top-[70px] bottom-10 w-1 bg-gray-600 z-0" />

            {/* Stop 1 */}
            <View className="pl-16 mb-8 relative">
               {/* Timeline Dot */}
               <View className="absolute left-[-24px] top-[40%] w-6 h-6 bg-[#334155] rounded-full items-center justify-center border-[3px] border-[#1E293B] shadow-lg shadow-black z-10">
                  <View className="w-2.5 h-2.5 bg-[#60A5FA] rounded-full" />
               </View>

               <View className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
                  <View className="flex-row items-center mb-3">
                     <View className="w-12 h-12 bg-white/10 rounded-xl items-center justify-center mr-4">
                        <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#60A5FA" />
                     </View>
                     <View>
                        <Text className="text-white text-lg font-bold">Food Break</Text>
                        <View className="flex-row items-center mt-1">
                           <Ionicons name="star" size={14} color="#F59E0B" />
                           <Ionicons name="star" size={14} color="#F59E0B" />
                           <Ionicons name="star" size={14} color="#F59E0B" />
                           <Ionicons name="star" size={14} color="#F59E0B" />
                           <Ionicons name="star-half" size={14} color="#F59E0B" />
                           <Text className="text-gray-400 text-sm ml-2">(120)</Text>
                        </View>
                     </View>
                  </View>
                  <Text className="text-gray-400 text-sm mb-1">Duration: <Text className="text-gray-200">30 mins</Text></Text>
                  <Text className="text-gray-400 text-sm mb-4">Estimated: <Text className="text-gray-200">1:45 PM</Text></Text>
                  <View className="h-[1px] bg-white/10 w-full mb-4" />
                  <Text className="text-gray-300 text-base">Highway Haven Restaurant</Text>
               </View>
            </View>

            {/* Stop 2 */}
            <View className="pl-16 relative">
               {/* Timeline Dot */}
               <View className="absolute left-[-24px] top-[40%] w-6 h-6 bg-[#334155] rounded-full items-center justify-center border-[3px] border-[#1E293B] shadow-lg shadow-black z-10">
                  <View className="w-2.5 h-2.5 bg-[#38BDF8] rounded-full" />
               </View>

               <View className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
                  <View className="flex-row items-center mb-3">
                     <View className="w-12 h-12 bg-white/10 rounded-xl items-center justify-center mr-4">
                        <MaterialCommunityIcons name="gas-station" size={24} color="#38BDF8" />
                     </View>
                     <View>
                        <Text className="text-white text-lg font-bold">Fuel Stop</Text>
                        <View className="flex-row items-center mt-1">
                           <Ionicons name="star" size={14} color="#F59E0B" />
                           <Ionicons name="star" size={14} color="#F59E0B" />
                           <Ionicons name="star" size={14} color="#F59E0B" />
                           <Ionicons name="star" size={14} color="#F59E0B" />
                           <Ionicons name="star-half" size={14} color="#F59E0B" />
                           <Text className="text-gray-400 text-sm ml-2">(85)</Text>
                        </View>
                     </View>
                  </View>
                  <Text className="text-gray-400 text-sm mb-1">Duration: <Text className="text-gray-200">15 mins</Text></Text>
                  <Text className="text-gray-400 text-sm mb-4">Estimated: <Text className="text-gray-200">3:30 PM</Text></Text>
                  <View className="h-[1px] bg-white/10 w-full mb-4" />
                  <Text className="text-gray-300 text-base">Shell Service Station</Text>
               </View>
            </View>

         </View>
      </ScrollView>

      {/* Request Break Button Area */}
      <View className="absolute bottom-[90px] left-0 right-0 px-6 z-20">
         <TouchableOpacity className="w-full rounded-full overflow-hidden shadow-lg shadow-blue-500/50">
            <LinearGradient colors={['#60A5FA', '#2563EB']} className="w-full py-4 items-center border border-blue-400/50 rounded-full">
               <Text className="text-white text-xl font-bold tracking-wide">Request a Break</Text>
            </LinearGradient>
         </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View className="bg-[#1E293B] border-t border-gray-800 flex-row justify-around py-3 pb-8 absolute bottom-0 w-full z-30">
        <TouchableOpacity className="items-center">
          <Ionicons name="home" size={26} color="#64748B" />
          <Text className="text-[#64748B] text-xs mt-1 font-semibold">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="car-multiple" size={28} color="#3B82F6" className="-mt-1" />
          <Text className="text-[#3B82F6] text-xs mt-0.5">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="wallet-outline" size={26} color="#64748B" />
          <Text className="text-[#64748B] text-xs mt-1">Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={26} color="#64748B" />
          <Text className="text-[#64748B] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
