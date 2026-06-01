import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function VehicleMaintenanceAlerts() {
  return (
    <SafeAreaView className="flex-1 bg-[#0F172A]">
      <StatusBar barStyle="light-content" />

      {/* Background Map Mock */}
      <View className="absolute inset-0 opacity-20">
         {/* Fake map grid lines */}
         <View className="absolute top-[10%] w-full h-[1px] bg-[#3B82F6]" />
         <View className="absolute top-[20%] w-full h-[1px] bg-[#3B82F6]" />
         <View className="absolute top-[30%] w-full h-[1px] bg-[#3B82F6]" />
         <View className="absolute top-[40%] w-full h-[1px] bg-[#3B82F6]" />
         <View className="absolute top-[50%] w-full h-[1px] bg-[#3B82F6]" />
         <View className="absolute top-[60%] w-full h-[1px] bg-[#3B82F6]" />
         <View className="absolute left-[20%] w-[1px] h-full bg-[#3B82F6]" />
         <View className="absolute left-[40%] w-[1px] h-full bg-[#3B82F6]" />
         <View className="absolute left-[60%] w-[1px] h-full bg-[#3B82F6]" />
         <View className="absolute left-[80%] w-[1px] h-full bg-[#3B82F6]" />
         {/* Random diagonal routes */}
         <View className="absolute top-[20%] left-[-10%] w-[120%] h-[3px] bg-[#34D399] transform rotate-12" />
         <View className="absolute top-[40%] left-[-10%] w-[120%] h-[3px] bg-[#34D399] transform -rotate-6" />
      </View>

      <View className="flex-1 items-center justify-center px-4 relative mt-16">
         
         {/* The Big Popup Card */}
         <View className="w-full bg-[#1E293B] rounded-[32px] pt-24 border border-[#334155] shadow-2xl shadow-black relative overflow-hidden">
            
            {/* Engine Image Mock (sticks out top) */}
            <View className="absolute -top-16 left-[50%] ml-[-80px] w-40 h-40 bg-[#334155] rounded-2xl items-center justify-center border-4 border-[#1E293B] z-20 shadow-xl shadow-black">
               <MaterialCommunityIcons name="engine" size={80} color="#F97316" />
            </View>

            {/* Inner Content Container with Glassmorphic bottom */}
            <View className="px-6 pb-24">
               
               <Text className="text-white text-xl font-black text-center mb-8 tracking-wide">VEHICLE SERVICE REMINDER</Text>
               
               {/* List Item 1 */}
               <View className="flex-row items-center py-5 border-b border-[#334155]">
                  <MaterialCommunityIcons name="oil" size={36} color="#94A3B8" className="mr-4 opacity-80" />
                  <View className="flex-1 ml-4">
                     <Text className="text-white text-lg font-bold mb-1">OIL CHANGE DUE</Text>
                     <Text className="text-gray-400 text-sm font-medium">4,500 mi overdue</Text>
                  </View>
               </View>

               {/* List Item 2 */}
               <View className="flex-row items-center py-5 border-b border-[#334155]">
                  <MaterialCommunityIcons name="car-brake-alert" size={36} color="#94A3B8" className="mr-4 opacity-80" />
                  <View className="flex-1 ml-4">
                     <Text className="text-white text-lg font-bold mb-1">BRAKE PAD CHECK</Text>
                     <Text className="text-gray-400 text-sm font-medium">8,000 mi due in 2 weeks</Text>
                  </View>
               </View>

               {/* List Item 3 */}
               <View className="flex-row items-center py-5 border-b border-[#334155]">
                  <MaterialCommunityIcons name="tire" size={36} color="#94A3B8" className="mr-4 opacity-80" />
                  <View className="flex-1 ml-4">
                     <Text className="text-white text-lg font-bold mb-1">TIRE ROTATION</Text>
                     <Text className="text-gray-400 text-sm font-medium">6,000 mi due in 1 month</Text>
                  </View>
               </View>

            </View>

            {/* Glassmorphic Action Area */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-white/10 backdrop-blur-xl border-t border-white/10">
               
               <TouchableOpacity className="w-full rounded-2xl overflow-hidden mb-4 shadow-lg shadow-orange-500/20">
                  <LinearGradient colors={['#FDBA74', '#F97316']} start={{x: 0, y: 0}} end={{x: 0, y: 1}} className="w-full py-4 items-center">
                     <Text className="text-white text-lg font-bold tracking-wider">BOOK SERVICE AT PARTNER GARAGE</Text>
                  </LinearGradient>
               </TouchableOpacity>

               <TouchableOpacity className="w-full py-4 rounded-2xl border-2 border-[#38BDF8] items-center">
                  <Text className="text-[#38BDF8] text-lg font-bold tracking-wider">REMIND ME LATER</Text>
               </TouchableOpacity>

            </View>

         </View>

      </View>
    </SafeAreaView>
  );
}
