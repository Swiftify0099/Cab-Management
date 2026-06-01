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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ManageSavedAddresses() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="light-content" />

      {/* Header Gradient */}
      <LinearGradient 
         colors={['#1D4ED8', '#7E22CE']} 
         start={{ x: 0, y: 0 }} 
         end={{ x: 1, y: 0 }}
         className="px-4 pt-4 pb-4 flex-row items-center justify-between rounded-b-2xl"
      >
        <TouchableOpacity>
          <Feather name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Manage Saved Addresses</Text>
        <TouchableOpacity className="w-10 h-10 rounded-full border-2 border-white items-center justify-center bg-white/20">
          <Feather name="user" size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View className="px-5 py-4">
         <View className="flex-row items-center bg-[#F1F5F9] rounded-xl px-4 h-14 shadow-sm shadow-gray-200 border border-gray-100">
            <Feather name="search" size={22} color="#9CA3AF" className="mr-3" />
            <TextInput 
               placeholder="Search saved addresses or map"
               placeholderTextColor="#9CA3AF"
               className="flex-1 text-black text-base"
            />
            {/* Mock Google Maps Icon */}
            <View className="flex-row w-6 h-6 items-center justify-center ml-2 relative">
               <View className="absolute left-0 top-1 w-2 h-4 bg-red-500 rounded-sm transform -rotate-45" />
               <View className="absolute right-0 top-1 w-2 h-4 bg-green-500 rounded-sm transform rotate-45" />
               <View className="absolute bottom-0 w-3 h-2 bg-yellow-500 rounded-sm" />
               <View className="absolute top-0 w-2 h-2 bg-blue-500 rounded-full" />
            </View>
         </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <Text className="text-black text-xl font-bold mb-4">Saved Locations</Text>

        {/* Address Card 1 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <LinearGradient 
              colors={['#BAE6FD', '#E9D5FF']} 
              className="w-16 h-16 rounded-xl mr-4 items-center justify-center opacity-80"
           >
              <MaterialCommunityIcons name="home-outline" size={36} color="#4F46E5" />
           </LinearGradient>
           
           <View className="flex-1">
              <Text className="text-black text-xl font-bold mb-1">Home</Text>
              <Text className="text-gray-700 text-base leading-5">123 Maple Street, Apt 4B, San Francisco, CA 94102</Text>
           </View>
           
           <TouchableOpacity className="p-2 self-start ml-2">
              <Feather name="edit" size={20} color="#1D4ED8" />
           </TouchableOpacity>
        </View>

        {/* Address Card 2 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <LinearGradient 
              colors={['#BAE6FD', '#E9D5FF']} 
              className="w-16 h-16 rounded-xl mr-4 items-center justify-center opacity-80"
           >
              <MaterialCommunityIcons name="office-building-outline" size={36} color="#4F46E5" />
           </LinearGradient>
           
           <View className="flex-1">
              <Text className="text-black text-xl font-bold mb-1">Work</Text>
              <Text className="text-gray-700 text-base leading-5">456 Tech Park Blvd, Suite 200, Santa Clara, CA 95054</Text>
           </View>
        </View>

        {/* Address Card 3 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <LinearGradient 
              colors={['#BAE6FD', '#E9D5FF']} 
              className="w-16 h-16 rounded-xl mr-4 items-center justify-center opacity-80"
           >
              <MaterialCommunityIcons name="city-variant-outline" size={36} color="#4F46E5" />
           </LinearGradient>
           
           <View className="flex-1">
              <Text className="text-black text-xl font-bold mb-1">Pune Office</Text>
              <Text className="text-gray-700 text-base leading-5">Hinjewadi Phase 1, Pune, Maharashtra 411057</Text>
           </View>
        </View>

        {/* Address Card 4 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <LinearGradient 
              colors={['#BAE6FD', '#E9D5FF']} 
              className="w-16 h-16 rounded-xl mr-4 items-center justify-center opacity-80"
           >
              <MaterialCommunityIcons name="airplane" size={36} color="#4F46E5" className="transform -rotate-45" />
           </LinearGradient>
           
           <View className="flex-1">
              <Text className="text-black text-xl font-bold mb-1">Mumbai Airport</Text>
              <Text className="text-gray-700 text-base leading-5">Chhatrapati Shivaji Maharaj International Airport, Mumbai</Text>
           </View>
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <View className="absolute bottom-8 right-6 z-50">
         <LinearGradient 
            colors={['#3B82F6', '#8B5CF6']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
            className="w-28 h-28 rounded-full items-center justify-center shadow-lg shadow-purple-500"
         >
            <TouchableOpacity className="w-full h-full items-center justify-center">
               <Feather name="plus" size={32} color="white" className="mb-1" />
               <Text className="text-white text-sm font-medium text-center leading-4">Add New{'\n'}Address</Text>
            </TouchableOpacity>
         </LinearGradient>
      </View>

    </SafeAreaView>
  );
}
