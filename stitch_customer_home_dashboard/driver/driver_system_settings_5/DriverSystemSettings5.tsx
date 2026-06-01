import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function DriverSystemSettings5() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center bg-white border-b border-gray-100 shadow-sm shadow-gray-100 z-20">
        <TouchableOpacity className="w-10">
          <Feather name="chevron-left" size={32} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center pr-10">No Drivers Nearby</Text>
      </View>

      <View className="flex-1 p-5 relative">
         
         {/* Top Image Mock Area */}
         <View className="w-full h-[60%] bg-[#E2E8F0] rounded-3xl overflow-hidden relative shadow-lg shadow-gray-200">
            <LinearGradient colors={['#D8B4E2', '#A78BFA', '#60A5FA']} className="absolute inset-0 opacity-40" />
            
            {/* Abstract scenery shapes mock */}
            <View className="absolute bottom-0 left-0 right-0 h-[40%] bg-[#94A3B8] transform -skew-y-6" />
            <View className="absolute bottom-0 left-0 right-0 h-[30%] bg-[#64748B] transform skew-y-12" />
            
            {/* Road Mock */}
            <View className="absolute bottom-0 left-[20%] right-[20%] h-[50%] bg-[#334155]" style={{ borderTopLeftRadius: 100, borderTopRightRadius: 100, transform: [{ perspective: 100 }, { rotateX: '60deg' }] }} />
            
            <View className="absolute inset-0 items-center justify-center opacity-30">
               <MaterialCommunityIcons name="image-outline" size={80} color="#1E293B" />
            </View>
         </View>

         {/* Floating Card */}
         <View className="bg-white/90 rounded-3xl p-6 shadow-xl shadow-gray-300 backdrop-blur-xl absolute top-[45%] left-5 right-5 border border-white">
            <Text className="text-[#0F172A] text-xl font-semibold mb-6 leading-8">
               We're sorry, all drivers are currently busy or unavailable.
            </Text>

            <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-100">
               <Feather name="clock" size={24} color="#0F172A" className="mr-4" />
               <Text className="text-[#0F172A] text-lg">Try scheduling for later</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center py-4">
               <Feather name="map-pin" size={24} color="#0F172A" className="mr-4" />
               <Text className="text-[#0F172A] text-lg">Change destination</Text>
            </TouchableOpacity>
         </View>

         {/* Bottom Actions */}
         <View className="absolute bottom-10 left-5 right-5 items-center">
            <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-blue-500/30 mb-4">
               <Feather name="bell" size={20} color="white" className="mr-3" />
               <Text className="text-white text-lg font-bold">Notify Me</Text>
            </TouchableOpacity>
            <Text className="text-[#0F172A] text-base font-medium">When drivers become available</Text>
         </View>

      </View>
    </SafeAreaView>
  );
}
