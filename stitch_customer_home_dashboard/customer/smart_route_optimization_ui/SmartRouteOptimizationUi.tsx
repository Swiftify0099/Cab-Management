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

export default function SmartRouteOptimizationUi() {
  return (
    <SafeAreaView className="flex-1 bg-[#0F172A]">
      <StatusBar barStyle="light-content" />

      {/* Map Background Mock */}
      <View className="absolute inset-0 z-0">
         <View className="w-full h-full bg-[#1E293B] relative overflow-hidden">
            {/* Fake map elements */}
            <View className="absolute top-0 right-0 w-96 h-96 bg-[#0F172A] rounded-full opacity-50 blur-3xl" />
            <View className="absolute bottom-20 left-10 w-96 h-96 bg-[#0F172A] rounded-full opacity-50 blur-3xl" />
            
            {/* Route Line Mock */}
            <View className="absolute top-[25%] left-[20%] w-[60%] h-[50%] border-l-4 border-b-4 border-[#3B82F6] rounded-bl-full transform rotate-12 opacity-80 shadow-md shadow-blue-500" />
            <View className="absolute top-[28%] left-[24%] w-[55%] h-[45%] border-l-4 border-b-4 border-[#3B82F6] rounded-bl-full transform rotate-12 opacity-40 blur-sm" />

            {/* Markers */}
            <View className="absolute top-[22%] left-[18%] items-center">
               <View className="w-4 h-4 bg-white rounded-full border-4 border-[#3B82F6] shadow-md shadow-black mb-1" />
               <Text className="text-gray-300 font-medium text-sm drop-shadow-md">San Francisco</Text>
            </View>

            <View className="absolute top-[75%] left-[78%] items-center">
               <View className="w-6 h-6 bg-white rounded-full border-[6px] border-[#3B82F6] shadow-md shadow-black mb-1" />
               <Text className="text-gray-300 font-medium text-sm drop-shadow-md">Los Angeles</Text>
            </View>
         </View>
      </View>

      {/* Header Overlay */}
      <View className="px-4 pt-4 pb-4 flex-row items-center z-10">
        <TouchableOpacity className="mr-4 flex-row items-center">
          <Feather name="chevron-left" size={28} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-lg font-medium ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">Smart Route Optimization</Text>
      </View>

      <ScrollView className="flex-1 px-4 z-10" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
         
         {/* Current Trip Card */}
         <View className="w-[85%] bg-white/10 rounded-2xl p-4 mb-6 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/50 mt-4">
            <Text className="text-white text-lg font-bold mb-1">Current Trip:</Text>
            <Text className="text-gray-200 text-base">456 mi • 6h 30m remaining • ETA 5:15 AM</Text>
         </View>

         {/* Suggested Breaks Card */}
         <View className="bg-white/10 rounded-3xl p-4 mb-6 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/50">
            <Text className="text-white text-lg font-bold mb-4 w-3/4">Suggested Breaks (AI Optimized)</Text>
            
            {/* Break 1 */}
            <View className="bg-white/90 rounded-2xl p-4 mb-3 shadow-md shadow-black/20 flex-row items-center">
               <View className="mr-4">
                  <MaterialCommunityIcons name="bed" size={32} color="#334155" />
               </View>
               <View className="flex-1">
                  <Text className="text-[#0F172A] font-bold text-base mb-1">Hotel Break (Fatigue Alert)</Text>
                  <Text className="text-gray-600 text-sm mb-2 leading-5">Comfort Inn & Suites,{'\n'}Bakersfield</Text>
                  <Text className="text-gray-500 text-sm">125 mi ahead</Text>
               </View>
               <TouchableOpacity className="bg-[#E2E8F0] px-4 py-2 rounded-full border border-gray-300">
                  <Text className="text-[#0F172A] font-semibold text-sm">Book Now</Text>
               </TouchableOpacity>
            </View>

            {/* Break 2 */}
            <View className="bg-white/90 rounded-2xl p-4 shadow-md shadow-black/20 flex-row items-center">
               <View className="mr-4">
                  <MaterialCommunityIcons name="gas-station" size={32} color="#334155" />
               </View>
               <View className="flex-1">
                  <Text className="text-[#0F172A] font-bold text-base mb-1">Fuel Stop (Low Fuel)</Text>
                  <Text className="text-gray-600 text-sm mb-2 leading-5">Shell, Kettleman City</Text>
                  <View className="flex-row justify-between pr-4 items-center mt-1">
                     <Text className="text-gray-500 text-sm">180 mi ahead</Text>
                     <Text className="text-gray-600 font-medium text-sm">$4.59/gal</Text>
                  </View>
               </View>
               <TouchableOpacity className="bg-[#E2E8F0] px-4 py-2 rounded-full border border-gray-300">
                  <Text className="text-[#0F172A] font-semibold text-sm">Add Stop</Text>
               </TouchableOpacity>
            </View>
         </View>

         {/* Driver Status */}
         <View className="w-[85%] bg-white/10 rounded-2xl p-4 mb-8 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/50 mt-4">
            <Text className="text-white text-lg font-bold mb-2">Driver Status:</Text>
            <Text className="text-gray-200 text-base mb-1">Fatigue Level (Moderate)</Text>
            <Text className="text-gray-200 text-base">Fuel Level (25%)</Text>
         </View>

      </ScrollView>

      {/* Bottom Floating Area */}
      <View className="absolute bottom-24 left-0 right-0 px-6 z-20">
         <TouchableOpacity className="w-full rounded-full overflow-hidden shadow-lg shadow-blue-500/50">
            <LinearGradient colors={['#3B82F6', '#2563EB']} className="w-full py-4 items-center">
               <Text className="text-white text-xl font-medium tracking-wide">Recalculate for Efficiency</Text>
            </LinearGradient>
         </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8 absolute bottom-0 w-full z-30">
        <TouchableOpacity className="items-center">
          <Ionicons name="home" size={24} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-xs mt-1 font-semibold">Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="navigation" size={24} color="#94A3B8" className="transform -rotate-45" />
          <Text className="text-gray-400 text-xs mt-1">Navigation</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="map-marker-path" size={24} color="#94A3B8" />
          <Text className="text-gray-400 text-xs mt-1">Stops</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="settings" size={24} color="#94A3B8" />
          <Text className="text-gray-400 text-xs mt-1">Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
