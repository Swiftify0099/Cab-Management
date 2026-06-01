import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function NightSafetyModeUi() {
  const [nightMode, setNightMode] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#0F172A]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity className="flex-row items-center w-24">
          <Feather name="chevron-left" size={32} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-lg font-medium ml-1">Home</Text>
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Night Safety Mode</Text>
        <View className="w-24" />
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Active Banner */}
        <View className="bg-[#1E3A8A]/40 rounded-2xl p-5 mb-6 border border-blue-900 flex-row items-center shadow-sm shadow-blue-900/50">
           <View className="w-14 h-14 bg-green-500/20 rounded-full items-center justify-center mr-4 relative border border-green-500/30">
              {/* Outer decorative dashes */}
              <View className="absolute inset-0 border-[3px] border-green-500 rounded-full border-dashed opacity-30" />
              <View className="w-8 h-8 bg-[#22C55E] rounded-full items-center justify-center">
                 <Feather name="check" size={20} color="white" />
              </View>
           </View>
           <View className="flex-1">
              <Text className="text-white text-base font-bold mb-1">Active Safety Monitoring On.</Text>
              <Text className="text-blue-200 text-sm leading-5">Your intercity trip is being monitored for safety.</Text>
           </View>
        </View>

        {/* Night Safety Mode Toggle */}
        <View className="bg-[#1E293B] rounded-2xl p-5 mb-6 shadow-sm shadow-gray-900 border border-gray-800">
           <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                 <MaterialCommunityIcons name="moon-waning-crescent" size={24} color="#3B82F6" className="mr-3" />
                 <Text className="text-white text-lg font-bold">Night Safety Mode</Text>
              </View>
              <Switch
                 trackColor={{ false: '#475569', true: '#22C55E' }}
                 thumbColor={'#ffffff'}
                 ios_backgroundColor="#475569"
                 onValueChange={setNightMode}
                 value={nightMode}
                 className="transform scale-110"
              />
           </View>
           <Text className="text-gray-400 text-base leading-6">
              Optimized for low-light driving to reduce glare and improve focus.
           </Text>
        </View>

        {/* Alertness Check-in */}
        <View className="bg-[#1E293B] rounded-2xl p-5 mb-6 shadow-sm shadow-gray-900 border border-gray-800">
           <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 bg-blue-500/20 rounded-lg items-center justify-center mr-3 border border-blue-500/30">
                 <Feather name="camera" size={18} color="#60A5FA" />
              </View>
              <Text className="text-white text-lg font-bold">Driver Alertness Check-in</Text>
           </View>
           <Text className="text-gray-400 text-base leading-6 mb-6">
              Please take a quick selfie before starting your night shift. This helps ensure you're rested and ready.
           </Text>
           <TouchableOpacity className="w-full bg-white/10 py-4 rounded-xl items-center flex-row justify-center border border-white/5">
              <Feather name="camera" size={20} color="#60A5FA" className="mr-2" />
              <Text className="text-[#60A5FA] text-lg font-medium">Take Selfie</Text>
           </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Floating SOS Button */}
      <View className="absolute bottom-12 right-6 items-center z-50">
         <TouchableOpacity className="w-20 h-20 rounded-full bg-[#FF4B4B] items-center justify-center mb-2 shadow-lg shadow-red-900/50">
            <Text className="text-white text-xl font-bold">SOS</Text>
         </TouchableOpacity>
         <Text className="text-white text-center font-medium leading-4">Emergency{'\n'}SOS</Text>
      </View>
    </SafeAreaView>
  );
}
