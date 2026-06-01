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

export default function OfflineModeGpsSyncState() {
  return (
    <SafeAreaView className="flex-1 bg-[#4C88D6]">
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient 
         colors={['#60A5FA', '#3B82F6', '#2563EB']} 
         className="absolute inset-0" 
      />

      <ScrollView className="flex-1 px-6 pt-12" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
        
        {/* Giant Satellite Icon Mock */}
        <View className="w-64 h-64 items-center justify-center mb-6 relative">
           <Ionicons name="cloud" size={80} color="rgba(255,255,255,0.4)" className="absolute top-10 right-4" />
           <Ionicons name="cloud" size={50} color="rgba(255,255,255,0.6)" className="absolute top-24 right-0" />
           <MaterialCommunityIcons name="satellite-uplink" size={160} color="white" className="opacity-90" />
           <View className="absolute top-4 w-12 h-12 border-t-4 border-r-4 border-white opacity-80 rounded-tr-3xl transform rotate-12" />
        </View>

        {/* Header Text */}
        <Text className="text-white text-4xl font-extrabold text-center mb-8 leading-[44px]">
           Offline Mode &{'\n'}Weak GPS
        </Text>

        {/* Glassmorphic Card */}
        <View className="w-full bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-lg shadow-blue-900/20 mb-8">
           <Text className="text-white text-lg text-center leading-7 mb-8 font-medium">
              Don't worry. You can continue the trip offline. All data will automatically re-sync once connectivity is restored. Follow in-app directions.
           </Text>

           <TouchableOpacity className="w-full h-14 bg-[#1D4ED8] rounded-xl items-center justify-center shadow-md shadow-blue-900/30">
              <Text className="text-white text-lg font-bold">Re-sync Data</Text>
           </TouchableOpacity>
        </View>

        {/* Secondary Button */}
        <TouchableOpacity className="bg-white/20 px-6 py-3 rounded-xl border border-white/40 flex-row items-center mb-8">
           <Feather name="phone-call" size={20} color="white" className="mr-3" />
           <Text className="text-white text-base font-semibold">Call Emergency Support</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white flex-row justify-around py-3 pb-8 shadow-2xl">
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="road-variant" size={28} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="map" size={28} color="#1D4ED8" />
          <Text className="text-[#1D4ED8] text-xs mt-1 font-semibold">Map</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="currency-usd" size={28} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={28} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
