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

export default function OnboardingCarousel() {
  return (
    <SafeAreaView className="flex-1 bg-[#EEF2FF]">
      <StatusBar barStyle="dark-content" />
      
      {/* Background Gradient */}
      <LinearGradient 
         colors={['#E0F2FE', '#E0E7FF', '#F3E8FF']} 
         className="absolute inset-0" 
      />

      {/* Mock 3D Car Graphic Area */}
      <View className="h-1/2 w-full mt-12 items-center justify-center relative">
         {/* Fake Road */}
         <View className="absolute bottom-10 w-full h-32 bg-[#CBD5E1] transform -skew-y-12 border-t-4 border-b-4 border-[#94A3B8] flex-row items-center justify-center overflow-hidden">
            {/* Road lines */}
            <View className="w-16 h-2 bg-white mx-4 opacity-50" />
            <View className="w-16 h-2 bg-white mx-4 opacity-50" />
            <View className="w-16 h-2 bg-white mx-4 opacity-50" />
         </View>

         {/* Fake Car Body */}
         <View className="w-64 h-32 bg-[#E2E8F0] rounded-3xl absolute bottom-20 shadow-xl shadow-gray-500/50 border-t border-white/50 items-center justify-center transform -skew-x-12 relative overflow-hidden">
            <LinearGradient colors={['#93C5FD', '#A78BFA']} className="absolute inset-0 opacity-40" />
            {/* Car Windows */}
            <View className="w-48 h-16 bg-gray-800 rounded-t-2xl absolute top-0 opacity-80" />
         </View>

         {/* Floating Parcel Icon */}
         <View className="absolute top-10 left-10 w-24 h-24 bg-white/40 backdrop-blur-md rounded-2xl items-center justify-center border border-white shadow-lg shadow-purple-200">
            <MaterialCommunityIcons name="package-variant-closed" size={48} color="#D97706" />
            <View className="absolute -bottom-4 right-0 w-8 h-8 bg-[#3B82F6] rounded-full items-center justify-center border-2 border-white transform rotate-45">
               <Feather name="arrow-right" size={16} color="white" />
            </View>
         </View>
      </View>

      {/* Text Content */}
      <View className="px-6 pt-4 flex-1">
         <Text className="text-[#0F172A] text-[40px] font-extrabold leading-[44px] mb-4">
            Intercity Travel{'\n'}Reimagined
         </Text>
         <Text className="text-[#334155] text-lg leading-7 pr-4">
            Seamlessly book rides and send parcels between cities with premium comfort and tracking.
         </Text>
      </View>

      {/* Bottom Controls */}
      <View className="px-6 pb-12 pt-4 absolute bottom-0 w-full z-10">
         <View className="bg-white/40 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-lg shadow-indigo-100/50">
            
            <TouchableOpacity className="w-full h-14 rounded-full overflow-hidden shadow-md shadow-blue-500/30 mb-6">
               <LinearGradient 
                  colors={['#60A5FA', '#3B82F6']} 
                  className="flex-1 items-center justify-center"
               >
                  <Text className="text-white text-lg font-bold">Next</Text>
               </LinearGradient>
            </TouchableOpacity>

            <View className="flex-row items-center justify-between">
               <View className="w-12" /> {/* Spacer for centering */}
               
               {/* Indicators */}
               <View className="flex-row items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-gray-500 mx-1" />
                  <View className="w-2.5 h-2.5 rounded-full bg-gray-300 mx-1" />
                  <View className="w-2.5 h-2.5 rounded-full bg-gray-300 mx-1" />
               </View>

               <TouchableOpacity className="w-12 items-end">
                  <Text className="text-gray-500 font-medium text-base">Skip</Text>
               </TouchableOpacity>
            </View>
         </View>
      </View>

    </SafeAreaView>
  );
}
