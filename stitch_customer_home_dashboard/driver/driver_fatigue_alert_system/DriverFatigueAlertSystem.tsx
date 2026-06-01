import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverFatigueAlertSystem() {
  return (
    <SafeAreaView className="flex-1 bg-[#A0E0A0] relative">
      <StatusBar barStyle="dark-content" />

      {/* Mock Map Background Layer */}
      <View className="absolute inset-0 bg-[#A0E0A0] z-0">
        {/* Mock road and river lines for map visual context */}
        <View className="absolute left-1/3 w-16 h-full bg-[#4A90E2] opacity-80" />
        <View className="absolute left-1/4 w-8 h-full bg-[#8A8A8A]" />
        
        {/* Mock Speed Limit Sign */}
        <View className="absolute top-32 left-4 w-14 h-16 bg-white border border-gray-400 rounded-md items-center justify-center">
          <Text className="text-black font-extrabold text-xl">65</Text>
          <Text className="text-gray-500 font-bold text-[10px]">MPH</Text>
        </View>

        {/* Mock Map controls */}
        <View className="absolute top-48 right-4 w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
           <Feather name="maximize-2" size={20} color="#374151" />
        </View>
        <View className="absolute top-64 right-4 w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
           <Ionicons name="volume-high" size={24} color="#374151" />
        </View>

        {/* Current Location Puck */}
        <View className="absolute bottom-40 left-1/2 -ml-6 w-12 h-12 bg-white rounded-full items-center justify-center shadow-lg">
           <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center">
              <Ionicons name="navigate" size={16} color="white" style={{ transform: [{rotate: '45deg'}] }} />
           </View>
        </View>
      </View>

      {/* Top Navigation Strip */}
      <View className="mx-4 mt-2 bg-[#1C1C1E] rounded-2xl p-4 flex-row items-center z-10 shadow-lg shadow-black/50">
        <MaterialCommunityIcons name="arrow-top-right" size={40} color="white" />
        <Text className="text-white text-xl ml-3">
          <Text className="font-bold">Exit 14B</Text> in 2 miles
        </Text>
      </View>

      {/* Red Modal Overlay (Fatigue Alert) */}
      <View className="absolute inset-0 z-20 items-center justify-center px-6">
        <View className="w-full bg-red-600/80 rounded-3xl p-8 items-center border border-red-500/50" style={styles.blurEffect}>
          
          <View className="flex-row items-center mb-4">
            <Feather name="lock" size={14} color="#FCA5A5" />
            <Text className="text-red-300 font-medium ml-1">Locked</Text>
          </View>

          <Text className="text-white text-3xl font-bold text-center mb-8 leading-tight">
            Fatigue Detected - Take a Break
          </Text>

          {/* Circular Timer */}
          <View className="w-48 h-48 rounded-full border-4 border-red-400/50 justify-center items-center mb-10 relative">
            {/* Active arc mock (white) */}
            <View className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-white rounded-tr-full" />
            
            <Text className="text-white text-5xl font-extrabold mb-1">15:00</Text>
            <Text className="text-white text-xs text-center font-medium px-4">Mandatory Rest Period</Text>
          </View>

          <TouchableOpacity className="w-full bg-white py-4 rounded-full items-center mb-4 shadow-lg shadow-black/20">
            <Text className="text-red-700 text-xl font-bold">Find Nearest Rest Area</Text>
          </TouchableOpacity>

          <Text className="text-red-200 text-sm">App locked for safety compliance</Text>

        </View>
      </View>

      {/* Bottom Information Strip */}
      <View className="absolute bottom-0 w-full bg-white pt-4 pb-8 px-6 flex-row items-center justify-between z-10 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <TouchableOpacity>
           <Feather name="search" size={28} color="#9CA3AF" />
        </TouchableOpacity>
        
        <View className="items-center">
          <Text className="text-black text-2xl font-bold">11:25 AM</Text>
          <Text className="text-gray-500 text-base font-medium">Exit 14B in 2 miles</Text>
        </View>

        <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
           <Feather name="chevron-up" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blurEffect: {
    // Basic backdrop-blur equivalent fallback for react native view
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  }
});
