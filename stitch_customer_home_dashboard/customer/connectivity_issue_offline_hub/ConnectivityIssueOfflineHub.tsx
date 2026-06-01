import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ConnectivityIssueOfflineHub() {
  return (
    <SafeAreaView className="flex-1 bg-[#1A1C29]">
      <StatusBar barStyle="light-content" />

      {/* Abstract background gradient mock using basic views */}
      <View className="absolute inset-0 bg-[#1A1C29]">
        <View className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#2E3150] rounded-full blur-3xl opacity-40" />
      </View>

      <View className="flex-1 px-6 justify-center items-center relative z-10">
        
        {/* 3D Icon Mock */}
        <View className="mb-10 items-center justify-center relative w-48 h-48">
           {/* Mocking the coiled cable */}
           <View className="w-32 h-16 rounded-[40px] border-4 border-[#4F46E5] absolute bottom-8 opacity-40" />
           <View className="w-32 h-16 rounded-[40px] border-4 border-[#6366F1] absolute bottom-10 opacity-70" />
           <View className="w-32 h-16 rounded-[40px] border-4 border-[#818CF8] absolute bottom-12" />
           <View className="w-32 h-16 rounded-[40px] border-4 border-[#A5B4FC] absolute bottom-14" />
           
           {/* Plug end mock */}
           <View className="absolute top-8 left-12 transform -rotate-12 flex-row items-center">
              <View className="w-16 h-8 bg-[#6366F1] rounded-l-lg border-r-2 border-indigo-900 justify-center pl-2">
                 <View className="w-10 h-4 bg-[#4F46E5] rounded-sm" />
              </View>
              <View className="w-4 h-6 bg-yellow-600 rounded-r-sm" />
              <Feather name="x" size={24} color="#EF4444" className="ml-2" />
           </View>
           
           {/* Wireless signal mock */}
           <View className="absolute top-4 right-4">
              <MaterialCommunityIcons name="wifi-off" size={48} color="#EF4444" />
           </View>
        </View>

        <Text className="text-white text-3xl font-bold text-center mb-4 leading-10">
          You're offline, but{'\n'}we've got you.
        </Text>
        
        <Text className="text-gray-400 text-base text-center mb-10 px-4 leading-6">
          Don't worry, you can still access{'\n'}essential features.
        </Text>

        <Text className="text-white text-xl font-bold mb-4">Offline Features</Text>

        <View className="flex-row w-full justify-between mb-16">
          <TouchableOpacity className="flex-1 bg-[#F8FAFC] rounded-2xl p-4 mr-2 items-center justify-center border border-gray-200">
            <Feather name="phone-call" size={28} color="#0F172A" className="mb-2" />
            <Text className="text-[#0F172A] font-bold text-lg mb-1">Call Driver</Text>
            <Text className="text-gray-500 text-xs">If trip is active</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-1 bg-[#F8FAFC] rounded-2xl p-4 ml-2 items-center justify-center border border-gray-200">
            <MaterialCommunityIcons name="clipboard-text-outline" size={28} color="#0F172A" className="mb-2" />
            <Text className="text-[#0F172A] font-bold text-lg mb-1 text-center leading-5">View Saved{'\n'}Bookings</Text>
            <Text className="text-gray-500 text-xs">Access your itineraries</Text>
          </TouchableOpacity>
        </View>

        {/* Retry Button */}
        <View className="w-full relative items-center">
           {/* Glowing background */}
           <View className="absolute w-full h-16 bg-[#F97316] rounded-full blur-xl opacity-40 scale-110" />
           
           <TouchableOpacity className="w-full bg-[#F97316] py-4 rounded-full items-center border border-orange-400">
             <Text className="text-white text-lg font-bold">Retry</Text>
           </TouchableOpacity>
           
           <Text className="text-gray-500 text-sm mt-3">Tap to reconnect</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}
