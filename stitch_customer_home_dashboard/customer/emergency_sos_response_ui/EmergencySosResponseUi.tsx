import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function EmergencySosResponseUi() {
  return (
    <SafeAreaView className="flex-1 bg-[#111827]">
      <StatusBar barStyle="light-content" />

      {/* Subtle background red glow */}
      <View className="absolute inset-0 bg-[#111827]">
         <View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/30 rounded-full blur-3xl opacity-60" />
      </View>

      <View className="flex-1 items-center px-5 pt-8 z-10">
        
        {/* Header Texts */}
        <Text className="text-white text-3xl font-extrabold mb-2 text-center shadow-sm">Emergency Assistance</Text>
        <Text className="text-gray-300 text-lg mb-16 text-center">We are here to help</Text>

        {/* Huge SOS Button Component */}
        <View className="items-center justify-center mb-10 relative">
           
           {/* Outer Ripple Rings */}
           <View className="absolute w-80 h-80 rounded-full border border-red-500/20" />
           <View className="absolute w-72 h-72 rounded-full border 2 border-red-500/30" />
           <View className="absolute w-64 h-64 rounded-full border-4 border-red-500/40" />

           {/* Core Glowing Button */}
           <TouchableOpacity className="w-56 h-56 rounded-full bg-red-600 items-center justify-center border-4 border-red-500 shadow-2xl shadow-red-600 active:scale-95">
              {/* Inner gradient mock */}
              <View className="absolute inset-0 rounded-full bg-gradient-to-b from-red-500 to-red-700 opacity-50" />
              
              <MaterialCommunityIcons name="shield-alert-outline" size={40} color="white" className="mb-2 opacity-80" />
              <Text className="text-white text-3xl font-black text-center leading-9 tracking-wider">
                 HOLD TO{'\n'}ALERT
              </Text>
           </TouchableOpacity>
        </View>

        <Text className="text-gray-400 text-base mb-auto">Keep holding to send an alert</Text>

        {/* Action Buttons Grid */}
        <View className="w-full flex-row justify-between mb-8">
           
           <TouchableOpacity className="bg-[#1F2937] p-4 rounded-2xl items-center justify-center flex-1 mr-2 shadow-lg h-28 border border-gray-700">
              <Ionicons name="call" size={28} color="white" className="mb-2" />
              <Text className="text-white font-medium text-center leading-5 text-base">Call{'\n'}100</Text>
           </TouchableOpacity>

           <TouchableOpacity className="bg-[#1F2937] p-4 rounded-2xl items-center justify-center flex-1 mx-1 shadow-lg h-28 border border-gray-700">
              <Feather name="share" size={28} color="white" className="mb-2" />
              <Text className="text-white font-medium text-center leading-5 text-base">Share{'\n'}Live Trip</Text>
           </TouchableOpacity>

           <TouchableOpacity className="bg-[#1F2937] p-4 rounded-2xl items-center justify-center flex-1 ml-2 shadow-lg h-28 border border-gray-700">
              <Ionicons name="chatbubble" size={28} color="white" className="mb-2" />
              <Text className="text-white font-medium text-center leading-5 text-base">Chat with{'\n'}Support</Text>
           </TouchableOpacity>

        </View>

        {/* Cancel Button */}
        <TouchableOpacity className="mb-6 w-full items-center py-4">
           <Text className="text-white text-lg font-medium">Cancel Alert</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
