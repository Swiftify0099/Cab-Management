import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RealTimeTripRequestAlert() {
  return (
    <SafeAreaView className="flex-1 bg-[#111827]">
      <StatusBar hidden />

      {/* Map Background Mock */}
      <View className="absolute inset-0 z-0">
         <View className="w-full h-full bg-[#1E293B] relative overflow-hidden">
            {/* Fake Roads */}
            <View className="absolute top-20 left-10 w-48 h-48 border-[3px] border-[#334155] rounded-full opacity-50" />
            <View className="absolute top-40 right-[-20] w-64 h-64 border-[3px] border-[#334155] rounded-full opacity-50" />
            
            {/* Route Highlight */}
            <View className="absolute top-32 left-16 w-32 h-32 border-l-[4px] border-b-[4px] border-[#3B82F6] rounded-bl-3xl opacity-80 shadow-md shadow-blue-500" />
            
            {/* Markers */}
            <View className="absolute top-32 left-16 w-4 h-4 rounded-full bg-white border-4 border-[#3B82F6] shadow-md shadow-black" />
            <Text className="absolute top-36 left-12 text-gray-300 font-bold text-lg">Mumbai</Text>
            
            <View className="absolute top-[250px] left-[250px] w-4 h-4 rounded-full bg-[#3B82F6] border-2 border-white shadow-md shadow-black" />
            <View className="absolute top-[240px] left-[240px] w-8 h-8 rounded-full bg-blue-500/20" />
            <Text className="absolute top-[260px] left-[240px] text-gray-300 font-bold text-lg">Pune</Text>
         </View>
      </View>

      {/* Alert Card overlay */}
      <View className="flex-1 justify-end px-4 pb-8 z-10">
         
         {/* Glassmorphic Container with glowing borders */}
         <View className="w-full bg-[#1E293B]/80 rounded-[30px] border border-white/20 p-6 shadow-2xl shadow-black relative overflow-hidden backdrop-blur-xl">
            
            {/* Glowing red left, blue right edges mock */}
            <LinearGradient colors={['rgba(239, 68, 68, 0.4)', 'transparent']} start={{x:0, y:0}} end={{x:0.5, y:0}} className="absolute inset-0" />
            <LinearGradient colors={['transparent', 'rgba(59, 130, 246, 0.4)']} start={{x:0.5, y:0}} end={{x:1, y:0}} className="absolute inset-0" />

            {/* Handle */}
            <View className="w-12 h-1.5 bg-white/30 rounded-full self-center mb-6" />

            {/* Title */}
            <View className="flex-row items-center justify-between mb-4">
               <Text className="text-white text-2xl font-bold">Incoming Ride Request 🚨</Text>
               <View className="w-6 h-6 rounded-full bg-gray-500/50 items-center justify-center">
                  <Text className="text-white text-xs font-bold">!</Text>
               </View>
            </View>

            {/* Trip Details Card inside */}
            <View className="bg-white/10 rounded-2xl p-4 mb-8 border border-white/10">
               <Text className="text-white text-lg font-bold mb-2">Intercity Trip: Mumbai to Pune</Text>
               <Text className="text-gray-300 text-base mb-1">Estimated Payout: $45.00</Text>
               <Text className="text-gray-300 text-base">Distance to Pickup: 2.4 km</Text>
            </View>

            {/* Circular Timer Mock */}
            <View className="items-center justify-center mb-6 relative">
               <View className="w-28 h-28 rounded-full border-4 border-gray-600/50 items-center justify-center absolute">
                  {/* Fake progress arc */}
                  <View className="w-full h-full rounded-full border-4 border-[#22C55E] absolute" style={{ borderLeftColor: 'transparent', borderTopColor: 'transparent', transform: [{rotate: '45deg'}] }} />
               </View>
               <View className="w-24 h-24 bg-[#111827]/80 rounded-full items-center justify-center shadow-inner">
                  <Text className="text-white text-4xl font-bold">12</Text>
               </View>
            </View>
            <Text className="text-gray-400 text-center text-sm font-medium mb-8">15s</Text>

            {/* Action Buttons */}
            <View className="flex-row justify-between w-full">
               <TouchableOpacity className="flex-1 py-4 rounded-xl border border-white/40 items-center justify-center mr-3 bg-white/5">
                  <Text className="text-white text-lg font-medium">Reject</Text>
               </TouchableOpacity>
               
               <TouchableOpacity className="flex-1 py-4 rounded-xl items-center justify-center bg-[#4ADE80] shadow-lg shadow-green-500/30">
                  <Text className="text-[#064E3B] text-lg font-bold">Accept</Text>
               </TouchableOpacity>
            </View>

         </View>
      </View>

    </SafeAreaView>
  );
}
