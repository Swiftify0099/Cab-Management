import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrioritySirenAlertPopup() {
  return (
    <SafeAreaView className="flex-1 bg-black justify-center items-center">
      <StatusBar hidden />

      {/* Main Alert Container with multiple glowing borders */}
      <View className="w-[90%] rounded-[30px] border-[6px] border-[#EF4444] shadow-2xl shadow-red-600 relative overflow-hidden bg-[#2A0000]">
         
         {/* Inner glowing edge */}
         <View className="absolute inset-0 border-[4px] border-[#F97316]/50 rounded-[24px] pointer-events-none" />

         {/* Deep red radial gradient background mock */}
         <LinearGradient colors={['#7F1D1D', '#450a0a', '#2A0000']} className="absolute inset-0" />

         <View className="p-8 items-center pt-16 pb-12">
            
            <Text className="text-white text-5xl font-black text-center mb-8 leading-[56px] shadow-sm shadow-red-500">
               URGENT:{'\n'}HIGH FARE{'\n'}TRIP!
            </Text>

            <Text className="text-white text-xl text-center font-medium mb-8">
               Pickup location:{'\n'}123 Main St, Downtown
            </Text>

            {/* Payout Bonus Badge */}
            <View className="bg-[#7F1D1D] rounded-2xl flex-row items-center px-6 py-4 mb-12 border border-[#991B1B] shadow-lg shadow-black">
               <MaterialCommunityIcons name="star" size={28} color="#FBBF24" className="mr-3" />
               <Text className="text-white text-2xl font-bold ml-2">Payout: +20% Bonus</Text>
            </View>

            {/* Accept Button with massive glowing gradient */}
            <TouchableOpacity className="w-full mb-6">
               <LinearGradient 
                  colors={['#F59E0B', '#EA580C', '#C2410C']} 
                  className="w-full py-5 rounded-3xl items-center justify-center border-2 border-[#FDBA74]/30"
                  start={{x: 0, y: 0}} end={{x: 0, y: 1}}
               >
                  {/* Fake glow rings */}
                  <View className="absolute inset-0 rounded-3xl border border-[#FB923C]/50 scale-[1.05]" />
                  <View className="absolute inset-0 rounded-3xl border border-[#FB923C]/20 scale-[1.1]" />
                  
                  <Text className="text-white text-2xl font-black tracking-wider shadow-sm shadow-orange-900">
                     ACCEPT NOW
                  </Text>
               </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity className="py-2">
               <Text className="text-gray-400 text-lg underline decoration-gray-400 underline-offset-4">Decline</Text>
            </TouchableOpacity>

         </View>
      </View>

    </SafeAreaView>
  );
}
