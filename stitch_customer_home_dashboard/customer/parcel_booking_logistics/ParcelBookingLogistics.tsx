import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ParcelBookingLogistics() {
  return (
    <SafeAreaView className="flex-1 bg-[#0F172A]">
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient 
         colors={['#1E1B4B', '#0F172A', '#111827']} 
         className="absolute inset-0" 
      />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between z-10">
        <TouchableOpacity>
          <Feather name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Send a Parcel</Text>
        <TouchableOpacity>
          <Feather name="settings" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* Location Inputs */}
        <View className="bg-white/10 rounded-2xl px-4 py-3 mb-4 flex-row items-center border border-white/20 backdrop-blur-md">
           <Text className="text-gray-300 text-base font-medium mr-2">Pickup Location:</Text>
           <TextInput 
              placeholder="Enter address"
              placeholderTextColor="#6B7280"
              className="flex-1 text-white text-base"
           />
           <MaterialCommunityIcons name="map" size={24} color="#9CA3AF" />
        </View>

        <View className="bg-white/10 rounded-2xl px-4 py-3 mb-6 flex-row items-center border border-white/20 backdrop-blur-md">
           <Text className="text-gray-300 text-base font-medium mr-2">Drop-off Location:</Text>
           <TextInput 
              placeholder="Enter address"
              placeholderTextColor="#6B7280"
              className="flex-1 text-white text-base"
           />
           <MaterialCommunityIcons name="map" size={24} color="#9CA3AF" />
        </View>

        {/* Parcel Type */}
        <Text className="text-white text-lg font-bold mb-3">Parcel Type</Text>
        <View className="flex-row justify-between mb-6">
           <TouchableOpacity className="flex-1 bg-white/5 border border-white/10 rounded-xl items-center py-3 mr-2">
              <Feather name="mail" size={24} color="white" className="mb-1" />
              <Text className="text-white text-xs">Documents</Text>
           </TouchableOpacity>
           
           <TouchableOpacity className="flex-1 bg-white/20 border border-white/40 rounded-xl items-center py-3 mr-2 shadow-sm shadow-white/10">
              <Feather name="monitor" size={24} color="white" className="mb-1" />
              <Text className="text-white text-xs">Electronics</Text>
           </TouchableOpacity>

           <TouchableOpacity className="flex-1 bg-white/5 border border-white/10 rounded-xl items-center py-3 mr-2">
              <MaterialCommunityIcons name="glass-fragile" size={24} color="white" className="mb-1" />
              <Text className="text-white text-xs">Fragile</Text>
           </TouchableOpacity>

           <TouchableOpacity className="flex-1 bg-white/5 border border-white/10 rounded-xl items-center py-3">
              <Feather name="box" size={24} color="white" className="mb-1" />
              <Text className="text-white text-xs">Others</Text>
           </TouchableOpacity>
        </View>

        {/* Upload Image */}
        <Text className="text-white text-lg font-bold mb-3">Upload Parcel Image</Text>
        <TouchableOpacity className="bg-white/10 border border-white/20 rounded-2xl h-24 items-center justify-center mb-6 backdrop-blur-md">
           <Feather name="camera" size={32} color="#9CA3AF" className="mb-2" />
           <Text className="text-gray-300 text-sm">Tap to upload or take photo</Text>
        </TouchableOpacity>

        {/* Weight Calculator */}
        <View className="flex-row justify-between items-center mb-4">
           <Text className="text-white text-lg font-bold">Weight Calculator</Text>
           <View className="bg-white/10 px-3 py-1 rounded-md border border-white/20">
              <Text className="text-white font-medium">5.5kg</Text>
           </View>
        </View>
        
        {/* Fake Slider */}
        <View className="mb-8">
           <View className="h-2 bg-white/10 rounded-full flex-row">
              <View className="w-[30%] h-full bg-[#3B82F6] rounded-full" />
              <View className="w-5 h-5 bg-white rounded-full absolute -top-1.5 left-[30%] -ml-2.5 shadow-md shadow-blue-500/50" />
           </View>
           <View className="flex-row justify-between mt-2 px-1">
              <Text className="text-gray-400 text-xs">0kg</Text>
              <Text className="text-gray-400 text-xs">10kg</Text>
              <Text className="text-gray-400 text-xs">20kg</Text>
           </View>
        </View>

        {/* Bottom Booking Card */}
        <View className="bg-white/10 rounded-3xl p-5 mb-8 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/50">
           <Text className="text-white text-center text-lg font-bold mb-1">Estimated Delivery</Text>
           <Text className="text-white text-center text-base mb-6">₹450 | 2 Days</Text>

           <TouchableOpacity className="w-full h-14 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/30">
              <LinearGradient 
                 colors={['#3B82F6', '#2563EB']} 
                 className="flex-1 items-center justify-center"
              >
                 <Text className="text-white text-xl font-bold">Book Now</Text>
              </LinearGradient>
           </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-[#0F172A]/80 border-t border-white/10 flex-row justify-around py-3 pb-8 absolute bottom-0 w-full backdrop-blur-md">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="calendar" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="location-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Track</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
