import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverSystemSettings2() {
  return (
    <SafeAreaView className="flex-1 bg-[#111827]">
      <StatusBar barStyle="light-content" />

      {/* Map Background Mock */}
      <View className="absolute inset-0 z-0 opacity-30">
         <View className="w-full h-full bg-[#0F172A] relative overflow-hidden">
            {/* Fake map grid lines */}
            <View className="absolute top-[10%] w-full h-[1px] bg-white/10" />
            <View className="absolute top-[20%] w-full h-[1px] bg-white/10" />
            <View className="absolute top-[30%] w-full h-[1px] bg-white/10" />
            <View className="absolute top-[40%] w-full h-[1px] bg-white/10" />
            <View className="absolute top-[50%] w-full h-[1px] bg-white/10" />
            <View className="absolute top-[60%] w-full h-[1px] bg-white/10" />
            <View className="absolute top-[70%] w-full h-[1px] bg-white/10" />
            <View className="absolute left-[20%] w-[1px] h-full bg-white/10" />
            <View className="absolute left-[40%] w-[1px] h-full bg-white/10" />
            <View className="absolute left-[60%] w-[1px] h-full bg-white/10" />
            <View className="absolute left-[80%] w-[1px] h-full bg-white/10" />
            {/* Random diagonal routes */}
            <View className="absolute top-[20%] left-[-10%] w-[120%] h-[2px] bg-white/10 transform rotate-12" />
            <View className="absolute top-[40%] left-[-10%] w-[120%] h-[2px] bg-white/10 transform -rotate-6" />
            <View className="absolute top-[70%] left-[-10%] w-[120%] h-[2px] bg-white/10 transform rotate-45" />
         </View>
      </View>

      <View className="flex-1 items-center justify-center px-6 z-10">
         
         {/* Glowing Circles Area */}
         <View className="items-center justify-center mb-16 relative">
            <View className="absolute w-80 h-80 rounded-full bg-[#8B5CF6]/10 blur-3xl" />
            <View className="absolute w-64 h-64 rounded-full bg-[#38BDF8]/20 blur-2xl" />
            
            <View className="w-56 h-56 rounded-full border-[12px] border-[#38BDF8]/20 items-center justify-center">
               <View className="w-44 h-44 rounded-full border-[16px] border-[#8B5CF6]/30 items-center justify-center">
                  <View className="w-24 h-24 rounded-full bg-white/10 items-center justify-center shadow-lg shadow-black/50 backdrop-blur-md">
                     <MaterialCommunityIcons name="car" size={40} color="#A78BFA" />
                  </View>
               </View>
               {/* Pulsing indicator mock */}
               <View className="absolute top-[-12px] left-[50%] ml-[-12px] w-6 h-6 bg-[#38BDF8] rounded-full shadow-md shadow-sky-400" />
            </View>
         </View>

         {/* Texts */}
         <Text className="text-white text-3xl font-bold text-center mb-4 leading-10">
            Matching you with the{'\n'}best intercity partner...
         </Text>
         <Text className="text-[#38BDF8] text-lg font-semibold mb-12">
            AI Fare Prediction: $42 - $48
         </Text>

         {/* Status Card */}
         <View className="w-full bg-white/10 rounded-2xl p-4 border border-white/20 backdrop-blur-xl flex-row items-center">
            <View className="w-16 h-12 bg-white/10 rounded-xl items-center justify-center mr-4">
               <MaterialCommunityIcons name="car-sports" size={28} color="#94A3B8" />
            </View>
            <View className="flex-1">
               <Text className="text-white text-base font-medium leading-5">Searching for premium{'\n'}sedans nearby</Text>
            </View>
         </View>

      </View>

    </SafeAreaView>
  );
}
