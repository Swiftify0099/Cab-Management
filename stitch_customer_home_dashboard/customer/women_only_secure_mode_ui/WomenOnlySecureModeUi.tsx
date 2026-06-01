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

export default function WomenOnlySecureModeUi() {
  return (
    <SafeAreaView className="flex-1 bg-[#E9D5FF]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center">
        <TouchableOpacity className="w-10">
          <Feather name="arrow-left" size={28} color="#1E1B4B" />
        </TouchableOpacity>
        <Text className="text-[#1E1B4B] text-xl font-bold flex-1 text-center pr-2">Women-Only Secure Ride</Text>
        <TouchableOpacity className="w-10 items-end relative">
           <View className="w-10 h-10 bg-[#4C1D95] rounded-full items-center justify-center">
              <Feather name="user" size={20} color="white" />
           </View>
           <View className="absolute bottom-0 right-0 w-4 h-4 bg-[#FBBF24] rounded-full items-center justify-center border-2 border-[#E9D5FF]">
              <Feather name="shield" size={8} color="#4C1D95" />
           </View>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
         
         {/* Verified Banner */}
         <LinearGradient 
            colors={['#D97706', '#FCD34D', '#A78BFA', '#7C3AED']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl p-5 flex-row items-center mb-6 shadow-sm shadow-purple-300"
         >
            <View className="flex-1">
               <Text className="text-[#1E1B4B] text-lg font-bold mb-1">Verified Women-Only Mode Active.</Text>
               <Text className="text-[#1E1B4B] text-sm font-medium">Travel with peace of mind.</Text>
            </View>
            <View className="w-16 h-16 bg-[#4C1D95] rounded-full ml-4 items-center justify-center relative overflow-hidden">
               <Feather name="user" size={40} color="#FBBF24" className="mt-4" />
               <View className="absolute bottom-1 right-1 w-6 h-6 bg-[#FBBF24] rounded-full items-center justify-center border-2 border-[#4C1D95]">
                  <Feather name="check" size={12} color="#4C1D95" />
               </View>
            </View>
         </LinearGradient>

         {/* Ride Options */}
         <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-purple-200">
            <Text className="text-[#1E1B4B] font-bold text-lg mb-4">Ride Options</Text>
            <View className="flex-row justify-between">
               <TouchableOpacity className="flex-1 mr-2 relative">
                  <LinearGradient colors={['#FCD34D', '#D97706']} className="rounded-xl p-3 flex-row items-center h-20 shadow-sm shadow-amber-200">
                     <View className="w-10 h-10 bg-[#4C1D95] rounded-full items-center justify-center mr-3">
                        <Feather name="user" size={20} color="white" />
                     </View>
                     <Text className="text-[#1E1B4B] font-semibold text-sm flex-1 leading-4">Female-Only{'\n'}Driver</Text>
                  </LinearGradient>
                  <View className="absolute top-2 right-2 w-5 h-5 bg-[#4C1D95] rounded-full items-center justify-center border-2 border-white">
                     <Feather name="check" size={12} color="white" />
                  </View>
               </TouchableOpacity>

               <TouchableOpacity className="flex-1 relative">
                  <LinearGradient colors={['#FCD34D', '#D97706']} className="rounded-xl p-3 flex-row items-center h-20 shadow-sm shadow-amber-200 opacity-80">
                     <View className="w-10 h-10 bg-[#4C1D95] rounded-full items-center justify-center mr-3">
                        <Feather name="users" size={20} color="white" />
                     </View>
                     <Text className="text-[#1E1B4B] font-semibold text-sm flex-1 leading-4">Carpool with{'\n'}Verified Women</Text>
                  </LinearGradient>
                  <View className="absolute top-2 right-2 w-5 h-5 bg-[#4C1D95] rounded-full items-center justify-center border-2 border-white">
                     <Feather name="check" size={12} color="white" />
                  </View>
               </TouchableOpacity>
            </View>
         </View>

         {/* Ride Details */}
         <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-purple-200">
            <Text className="text-[#1E1B4B] font-bold text-lg mb-4">Ride Details</Text>
            
            <View className="border border-gray-200 rounded-xl overflow-hidden mb-6">
               <View className="flex-row items-center p-3.5 border-b border-gray-100 bg-white">
                  <Feather name="map-pin" size={20} color="#94A3B8" className="mr-3" />
                  <TextInput 
                     placeholder="Pickup Location (e.g., Current Location)"
                     placeholderTextColor="#64748B"
                     className="flex-1 text-[#1E1B4B] text-base"
                  />
               </View>
               <View className="flex-row items-center p-3.5 border-b border-gray-100 bg-white">
                  <Feather name="map-pin" size={20} color="#94A3B8" className="mr-3" />
                  <TextInput 
                     placeholder="Drop-off Location (e.g., Office)"
                     placeholderTextColor="#64748B"
                     className="flex-1 text-[#1E1B4B] text-base"
                  />
               </View>
               <View className="flex-row items-center p-3.5 bg-white">
                  <Feather name="calendar" size={20} color="#94A3B8" className="mr-3" />
                  <TextInput 
                     placeholder="Schedule Ride (e.g., Now or Later)"
                     placeholderTextColor="#64748B"
                     className="flex-1 text-[#1E1B4B] text-base"
                  />
               </View>
            </View>

            <TouchableOpacity className="w-full rounded-full overflow-hidden shadow-sm shadow-amber-300">
               <LinearGradient colors={['#FCD34D', '#B45309']} className="w-full py-4 items-center border border-[#B45309]/50 rounded-full">
                  <Text className="text-[#1E1B4B] text-lg font-bold">Request Women-Only Ride</Text>
               </LinearGradient>
            </TouchableOpacity>
         </View>

         {/* Safety & Security */}
         <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm shadow-purple-200">
            <Text className="text-[#1E1B4B] font-bold text-lg mb-4">Safety & Security</Text>
            
            <TouchableOpacity className="rounded-xl overflow-hidden mb-3">
               <LinearGradient colors={['#4C1D95', '#B45309', '#FCD34D']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} className="w-full p-4 flex-row items-center">
                  <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4">
                     <MaterialCommunityIcons name="alarm-light-outline" size={24} color="white" />
                  </View>
                  <View>
                     <Text className="text-[#1E1B4B] text-lg font-bold">Quick SOS</Text>
                     <Text className="text-[#1E1B4B] text-sm">Share with Trusted Contacts</Text>
                  </View>
               </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity className="rounded-xl overflow-hidden mb-6">
               <LinearGradient colors={['#4C1D95', '#B45309', '#FCD34D']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} className="w-full p-4 flex-row items-center">
                  <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4">
                     <Feather name="map-pin" size={24} color="white" />
                  </View>
                  <View>
                     <Text className="text-[#1E1B4B] text-lg font-bold">Live Location Sharing</Text>
                     <Text className="text-[#1E1B4B] text-sm">Share with Trusted Contacts</Text>
                  </View>
               </LinearGradient>
            </TouchableOpacity>

            <View className="flex-row justify-between items-center px-1">
               <TouchableOpacity className="flex-row items-center">
                  <Text className="text-[#1E1B4B] font-medium mr-1">Emergency Contacts</Text>
                  <Feather name="chevron-right" size={16} color="#1E1B4B" />
               </TouchableOpacity>
               <TouchableOpacity className="flex-row items-center">
                  <Text className="text-[#1E1B4B] font-medium mr-1">Verified Driver Profiles</Text>
                  <Feather name="chevron-right" size={16} color="#1E1B4B" />
               </TouchableOpacity>
            </View>
         </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-white flex-row justify-around py-3 pb-8 absolute bottom-0 w-full z-20 shadow-lg shadow-purple-500 rounded-t-3xl border-t border-purple-100">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1 font-medium">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="calendar" size={24} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <View className="w-10 h-2 bg-[#FBBF24] rounded-full absolute -top-3" />
          <Feather name="shield" size={24} color="#B45309" />
          <Text className="text-[#B45309] text-xs mt-1 font-bold">Secure Mode</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
