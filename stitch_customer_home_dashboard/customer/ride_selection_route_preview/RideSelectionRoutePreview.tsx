import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RideSelectionRoutePreview() {
  return (
    <SafeAreaView className="flex-1 bg-[#111827]">
      <StatusBar hidden />

      {/* Map Background Mock */}
      <View className="absolute inset-0 z-0">
         <View className="w-full h-full bg-[#1E293B] relative overflow-hidden">
            {/* Fake map elements */}
            <View className="absolute top-20 right-10 w-96 h-96 bg-[#0F172A] rounded-full opacity-60 blur-3xl" />
            <View className="absolute bottom-20 left-10 w-96 h-96 bg-[#0F172A] rounded-full opacity-60 blur-3xl" />
            
            {/* Fake Roads */}
            <View className="absolute top-[10%] left-[20%] w-64 h-64 border-[1px] border-[#334155] rounded-full opacity-50" />
            <View className="absolute top-[40%] right-[-10%] w-80 h-80 border-[1px] border-[#334155] rounded-full opacity-50" />
            <View className="absolute top-[30%] left-[10%] w-[120%] h-[1px] bg-[#334155] transform rotate-45" />
            <View className="absolute top-[60%] left-[-20%] w-[120%] h-[1px] bg-[#334155] transform -rotate-12" />

            {/* Route Highlight with Gradient */}
            <LinearGradient 
               colors={['#8B5CF6', '#3B82F6', '#06B6D4']} 
               start={{x:0, y:0}} end={{x:1, y:1}}
               className="absolute top-[20%] left-[25%] w-[50%] h-[50%] rounded-xl opacity-90 shadow-lg shadow-cyan-500/50"
               style={{
                  borderLeftWidth: 6,
                  borderBottomWidth: 6,
                  borderColor: 'transparent',
                  borderBottomLeftRadius: 40,
                  borderTopRightRadius: 20
               }}
            />
            {/* Inner line for the route */}
            <View className="absolute top-[20%] left-[25%] w-[50%] h-[50%] rounded-xl"
               style={{
                  borderLeftWidth: 3,
                  borderBottomWidth: 3,
                  borderColor: '#E0E7FF',
                  borderBottomLeftRadius: 40,
                  borderTopRightRadius: 20
               }}
            />

            {/* Car Markers */}
            <View className="absolute top-[18%] left-[22%] bg-white rounded-md p-1 transform rotate-45 shadow-md shadow-black">
               <MaterialCommunityIcons name="car-side" size={16} color="#334155" />
            </View>
            <View className="absolute top-[68%] left-[73%] bg-white rounded-md p-1 transform -rotate-45 shadow-md shadow-black">
               <MaterialCommunityIcons name="car-side" size={16} color="#334155" />
            </View>

            {/* Text Labels */}
            <View className="absolute top-[14%] left-[10%]">
               <Text className="text-gray-300 font-bold text-xs">San Francisco, CA</Text>
               <Text className="text-gray-400 text-[10px]">- 123 Market St</Text>
            </View>

            <View className="absolute top-[72%] left-[50%]">
               <Text className="text-gray-300 font-bold text-xs">Palo Alto, CA</Text>
               <Text className="text-gray-400 text-[10px]">456 University Ave</Text>
            </View>

            {/* Map Controls */}
            <View className="absolute top-1/2 left-4 bg-[#1E293B]/80 rounded-xl overflow-hidden border border-gray-600">
               <TouchableOpacity className="p-3 border-b border-gray-600 items-center justify-center">
                  <Feather name="plus" size={20} color="#94A3B8" />
               </TouchableOpacity>
               <TouchableOpacity className="p-3 items-center justify-center">
                  <Feather name="minus" size={20} color="#94A3B8" />
               </TouchableOpacity>
            </View>

            <View className="absolute top-1/2 right-4 bg-[#1E293B]/80 rounded-xl overflow-hidden border border-gray-600">
               <TouchableOpacity className="p-3 border-b border-gray-600 items-center justify-center">
                  <Feather name="navigation" size={20} color="#94A3B8" />
               </TouchableOpacity>
               <TouchableOpacity className="p-3 items-center justify-center">
                  <Feather name="layers" size={20} color="#94A3B8" />
               </TouchableOpacity>
            </View>
         </View>
      </View>

      {/* Header Overlay */}
      <View className="px-6 pt-12 z-10">
         <Text className="text-white text-3xl font-bold leading-10 shadow-md shadow-black">Ride Selection &{'\n'}Route Preview</Text>
      </View>

      {/* Bottom Sheet */}
      <View className="absolute bottom-0 w-full h-[55%] bg-[#1F2937]/90 rounded-t-[30px] border-t border-gray-600 shadow-2xl shadow-black backdrop-blur-3xl z-20">
         <View className="w-12 h-1.5 bg-gray-500 rounded-full self-center mt-3 mb-4" />
         
         <View className="px-6 flex-row items-center justify-between mb-6">
            <Text className="text-white text-2xl font-bold tracking-wide">Select Your Ride</Text>
            <TouchableOpacity className="w-8 h-8 rounded-full bg-gray-700 items-center justify-center">
               <Feather name="x" size={18} color="#D1D5DB" />
            </TouchableOpacity>
         </View>

         {/* Vehicle Types ScrollView */}
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-6 h-56 flex-grow-0">
            
            {/* Economy Card */}
            <TouchableOpacity className="w-36 h-[200px] bg-[#374151]/50 rounded-2xl mr-4 border border-[#8B5CF6] p-3 relative overflow-hidden shadow-lg shadow-purple-900/30">
               <LinearGradient colors={['rgba(139, 92, 246, 0.1)', 'transparent']} className="absolute inset-0" />
               <Text className="text-white text-lg font-bold mb-3">Economy</Text>
               <View className="h-16 items-center justify-center mb-4">
                  <MaterialCommunityIcons name="car-side" size={56} color="#E5E7EB" />
               </View>
               <View className="flex-row items-center mb-1">
                  <Feather name="clock" size={12} color="#9CA3AF" className="mr-1.5" />
                  <Text className="text-gray-300 text-xs">1h 15m</Text>
               </View>
               <View className="flex-row items-center mb-3">
                  <Feather name="user" size={12} color="#9CA3AF" className="mr-1.5" />
                  <Text className="text-gray-300 text-xs">4 Seats</Text>
               </View>
               <Text className="text-white font-bold text-lg leading-5">$45.50</Text>
               <Text className="text-gray-400 text-[10px]">(Includes Tolls)</Text>
            </TouchableOpacity>

            {/* Business Card */}
            <TouchableOpacity className="w-36 h-[200px] bg-[#374151]/50 rounded-2xl mr-4 border border-gray-600 p-3 relative">
               <Text className="text-white text-lg font-bold mb-3">Business</Text>
               <View className="h-16 items-center justify-center mb-4">
                  <MaterialCommunityIcons name="car-sports" size={60} color="#94A3B8" />
               </View>
               <View className="flex-row items-center mb-1">
                  <Feather name="clock" size={12} color="#9CA3AF" className="mr-1.5" />
                  <Text className="text-gray-300 text-xs">1h 10m</Text>
               </View>
               <View className="flex-row items-center mb-3">
                  <Feather name="user" size={12} color="#9CA3AF" className="mr-1.5" />
                  <Text className="text-gray-300 text-xs">4 Seats</Text>
               </View>
               <Text className="text-white font-bold text-lg leading-5">$85.00</Text>
               <Text className="text-gray-400 text-[10px]">(Includes Tolls)</Text>
            </TouchableOpacity>

            {/* XL Card */}
            <TouchableOpacity className="w-36 h-[200px] bg-[#374151]/50 rounded-2xl mr-4 border border-gray-600 p-3 relative">
               <Text className="text-white text-lg font-bold mb-3">XL</Text>
               <View className="h-16 items-center justify-center mb-4">
                  <MaterialCommunityIcons name="car-estate" size={60} color="#94A3B8" />
               </View>
               <View className="flex-row items-center mb-1">
                  <Feather name="clock" size={12} color="#9CA3AF" className="mr-1.5" />
                  <Text className="text-gray-300 text-xs">1h 25m</Text>
               </View>
               <View className="flex-row items-center mb-3">
                  <Feather name="user" size={12} color="#9CA3AF" className="mr-1.5" />
                  <Text className="text-gray-300 text-xs">6 Seats</Text>
               </View>
               <Text className="text-white font-bold text-lg leading-5">$65.00</Text>
               <Text className="text-gray-400 text-[10px]">(Includes Tolls)</Text>
            </TouchableOpacity>

            {/* Parcel Card */}
            <TouchableOpacity className="w-36 h-[200px] bg-[#374151]/50 rounded-2xl mr-4 border border-gray-600 p-3 relative">
               <Text className="text-white text-lg font-bold mb-3">Parcel</Text>
               <View className="h-16 items-center justify-center mb-4">
                  <MaterialCommunityIcons name="truck-delivery" size={60} color="#94A3B8" />
               </View>
               <View className="flex-row items-center mb-1">
                  <Feather name="clock" size={12} color="#9CA3AF" className="mr-1.5" />
                  <Text className="text-gray-300 text-xs">1h 05m</Text>
               </View>
               <View className="flex-row items-center mb-3">
                  <Feather name="user" size={12} color="#9CA3AF" className="mr-1.5" />
                  <Text className="text-gray-300 text-xs">2 Seats</Text>
               </View>
               <Text className="text-white font-bold text-lg leading-5">$35.00</Text>
               <Text className="text-gray-400 text-[10px]">(Delivery)</Text>
            </TouchableOpacity>

         </ScrollView>

         {/* Options and Button */}
         <View className="px-6 flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
               <Switch value={true} onValueChange={()=>{}} trackColor={{true: '#6366F1', false: '#4B5563'}} thumbColor="#ffffff" />
               <Text className="text-white text-base ml-3">Family Trip</Text>
            </View>
            <TouchableOpacity className="flex-row items-center bg-[#374151] px-4 py-3 rounded-xl border border-gray-600">
               <Text className="text-white mr-2">Apply Coupon</Text>
               <MaterialCommunityIcons name="tag-outline" size={18} color="white" />
            </TouchableOpacity>
         </View>

         <View className="px-6 pb-8">
            <TouchableOpacity className="w-full rounded-2xl overflow-hidden shadow-lg shadow-blue-500/30">
               <LinearGradient colors={['#06B6D4', '#3B82F6', '#8B5CF6']} start={{x:0, y:0}} end={{x:1, y:0}} className="w-full py-4 items-center justify-center flex-row">
                  <Text className="text-white text-xl font-bold mr-2">Book Now</Text>
                  <Feather name="arrow-right" size={20} color="white" />
               </LinearGradient>
            </TouchableOpacity>
         </View>

      </View>
    </SafeAreaView>
  );
}
