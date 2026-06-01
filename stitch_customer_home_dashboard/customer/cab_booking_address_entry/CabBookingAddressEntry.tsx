import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function CabBookingAddressEntry() {
  return (
    <SafeAreaView className="flex-1 bg-[#090C15]">
      <StatusBar barStyle="light-content" />

      {/* Map Background (Mocked) */}
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-[#061B30] z-0 justify-center items-center">
        {/* Mocking the neon route line on map */}
        <View className="absolute w-64 h-64 border-l-4 border-b-4 border-[#00B4D8] rotate-45 top-1/3 left-1/4 shadow-lg shadow-[#00B4D8]/50" />
        <View className="absolute w-4 h-4 rounded-full bg-white border-4 border-[#00B4D8] top-[30%] left-[20%]" />
        <View className="absolute w-4 h-4 rounded-full bg-white border-4 border-[#00B4D8] bottom-[40%] right-[30%]" />
      </View>

      <View className="flex-1 z-10 px-5 pt-4 flex-col justify-between">
        
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Where to?</Text>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 justify-center items-center">
            <Ionicons name="person" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Input Card */}
        <View className="bg-white/10 rounded-3xl p-5 border border-white/10" style={styles.glassEffect}>
          
          {/* Inputs */}
          <View className="relative">
            {/* Timeline connectors */}
            <View className="absolute left-2.5 top-6 bottom-6 w-0.5 bg-[#00B4D8]/50 z-10" />

            {/* Current Location */}
            <View className="flex-row items-center bg-[#2A2D3C] rounded-xl px-4 py-3 mb-3 border border-white/5">
              <View className="w-3 h-3 rounded-full bg-[#00B4D8] mr-3 z-20" />
              <TextInput
                value="Current Location: 123 Main St"
                className="flex-1 text-white font-medium"
                placeholderTextColor="#9CA3AF"
                editable={false}
              />
            </View>

            {/* Destination */}
            <View className="flex-row items-center bg-[#2A2D3C] rounded-xl px-4 py-3 border border-[#00B4D8]/30">
              <View className="w-3 h-3 bg-[#00B4D8] mr-3 z-20" />
              <TextInput
                placeholder="Enter Destination"
                className="flex-1 text-white font-medium"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>
          </View>

          {/* Recent Destinations */}
          <Text className="text-white font-semibold mt-6 mb-3">Recent Destinations</Text>
          <View className="flex-row flex-wrap">
            <TouchableOpacity className="flex-row items-center bg-white/10 px-4 py-2 rounded-full mr-3 mb-3 border border-white/5">
              <Feather name="clock" size={14} color="#9CA3AF" />
              <Text className="text-gray-300 ml-2 font-medium">SFO Airport</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center bg-white/10 px-4 py-2 rounded-full mr-3 mb-3 border border-white/5">
              <Feather name="clock" size={14} color="#9CA3AF" />
              <Text className="text-gray-300 ml-2 font-medium">Tech Park</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center bg-white/10 px-4 py-2 rounded-full mb-3 border border-white/5">
              <Feather name="clock" size={14} color="#9CA3AF" />
              <Text className="text-gray-300 ml-2 font-medium">City Center</Text>
            </TouchableOpacity>
          </View>

          {/* Saved Places */}
          <Text className="text-white font-semibold mt-4 mb-3">Saved Places</Text>
          <View className="flex-row flex-wrap">
            <TouchableOpacity className="flex-row items-center bg-white/10 px-4 py-2 rounded-full mr-3 border border-white/5">
              <MaterialIcons name="home" size={16} color="#9CA3AF" />
              <Text className="text-gray-300 ml-2 font-medium">Home</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center bg-white/10 px-4 py-2 rounded-full border border-white/5">
              <MaterialIcons name="work" size={16} color="#9CA3AF" />
              <Text className="text-gray-300 ml-2 font-medium">Work</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer */}
        <View className="flex-1" />

        {/* Bottom Button */}
        <View className="pb-10">
          <TouchableOpacity className="bg-[#00B4D8] py-4 rounded-full items-center shadow-lg shadow-[#00B4D8]/50">
            <Text className="text-white text-lg font-bold">Done</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassEffect: {
    backgroundColor: 'rgba(30, 33, 53, 0.75)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  }
});
