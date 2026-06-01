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

export default function ManageFavoriteDrivers() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-100 z-10">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="#475569" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Manage Favorite Drivers</Text>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
          <Feather name="user" size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="bg-white px-5 py-3 border-b border-gray-200">
         <View className="flex-row items-center bg-gray-100 rounded-xl px-4 h-12 shadow-sm shadow-gray-100">
            <Feather name="search" size={20} color="#9CA3AF" className="mr-3" />
            <TextInput 
               placeholder="Search favorite drivers..."
               placeholderTextColor="#9CA3AF"
               className="flex-1 text-black text-base"
            />
         </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6 bg-[#F8FAFC]" showsVerticalScrollIndicator={false}>
        
        {/* Driver Card 1 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-200">
           
           <View className="flex-row justify-between mb-4">
              <View className="flex-row">
                 <View className="w-16 h-16 bg-gray-300 rounded-full mr-4 border border-gray-200 overflow-hidden items-center justify-center">
                    <Ionicons name="person" size={40} color="gray" style={{marginTop: 8}}/>
                 </View>
                 <View className="justify-center">
                    <Text className="text-black text-xl font-bold mb-1">Sarah Jenkins</Text>
                    <View className="flex-row items-center">
                       <Ionicons name="star" size={18} color="#FBBF24" className="mr-1" />
                       <Text className="text-black text-base font-medium">5.0</Text>
                    </View>
                 </View>
              </View>
              <View className="items-end justify-center">
                 <MaterialCommunityIcons name="car-side" size={24} color="#6B7280" className="mb-1" />
                 <Text className="text-gray-800 text-sm">Premium Sedan</Text>
              </View>
           </View>

           <View className="flex-row justify-between items-center">
              <View>
                 <Text className="text-black text-base mb-1">Trips with you: <Text className="font-medium">12</Text></Text>
                 <Text className="text-black text-base">Current Rating: <Text className="font-medium">5.0</Text></Text>
              </View>
              <View className="items-end">
                 <TouchableOpacity className="bg-[#1D4ED8] px-6 py-2 rounded-lg mb-2 shadow-sm shadow-blue-200 w-32 items-center">
                    <Text className="text-white font-medium text-base">Quick Book</Text>
                 </TouchableOpacity>
                 <TouchableOpacity className="bg-white border border-[#1D4ED8] px-6 py-2 rounded-lg w-32 items-center">
                    <Text className="text-[#1D4ED8] font-medium text-base">Remove</Text>
                 </TouchableOpacity>
              </View>
           </View>

        </View>

        {/* Driver Card 2 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-200">
           
           <View className="flex-row justify-between mb-4">
              <View className="flex-row">
                 <View className="w-16 h-16 bg-gray-300 rounded-full mr-4 border border-gray-200 overflow-hidden items-center justify-center">
                    <Ionicons name="person" size={40} color="gray" style={{marginTop: 8}}/>
                 </View>
                 <View className="justify-center">
                    <Text className="text-black text-xl font-bold mb-1">Michael Chen</Text>
                    <View className="flex-row items-center">
                       <Ionicons name="star" size={18} color="#FBBF24" className="mr-1" />
                       <Text className="text-black text-base font-medium">5.0</Text>
                    </View>
                 </View>
              </View>
              <View className="items-end justify-center">
                 <MaterialCommunityIcons name="car-estate" size={24} color="#6B7280" className="mb-1" />
                 <Text className="text-gray-800 text-sm">Luxury SUV</Text>
              </View>
           </View>

           <View className="flex-row justify-between items-center">
              <View>
                 <Text className="text-black text-base mb-1">Trips with you: <Text className="font-medium">8</Text></Text>
                 <Text className="text-black text-base">Current Rating: <Text className="font-medium">5.0</Text></Text>
              </View>
              <View className="items-end">
                 <TouchableOpacity className="bg-[#1D4ED8] px-6 py-2 rounded-lg mb-2 shadow-sm shadow-blue-200 w-32 items-center">
                    <Text className="text-white font-medium text-base">Quick Book</Text>
                 </TouchableOpacity>
                 <TouchableOpacity className="bg-white border border-[#1D4ED8] px-6 py-2 rounded-lg w-32 items-center">
                    <Text className="text-[#1D4ED8] font-medium text-base">Remove</Text>
                 </TouchableOpacity>
              </View>
           </View>

        </View>

        {/* Driver Card 3 */}
        <View className="bg-white rounded-2xl p-4 mb-8 shadow-sm shadow-gray-200 border border-gray-200">
           
           <View className="flex-row justify-between mb-4">
              <View className="flex-row">
                 <View className="w-16 h-16 bg-gray-300 rounded-full mr-4 border border-gray-200 overflow-hidden items-center justify-center">
                    <Ionicons name="person" size={40} color="gray" style={{marginTop: 8}}/>
                 </View>
                 <View className="justify-center">
                    <Text className="text-black text-xl font-bold mb-1">Priya Patel</Text>
                    <View className="flex-row items-center">
                       <Ionicons name="star" size={18} color="#FBBF24" className="mr-1" />
                       <Text className="text-black text-base font-medium">4.9</Text>
                    </View>
                 </View>
              </View>
              <View className="items-end justify-center">
                 <MaterialCommunityIcons name="car-electric" size={24} color="#6B7280" className="mb-1" />
                 <Text className="text-gray-800 text-sm">Electric Sedan</Text>
              </View>
           </View>

           <View className="flex-row justify-between items-center">
              <View>
                 <Text className="text-black text-base mb-1">Trips with you: <Text className="font-medium">15</Text></Text>
                 <Text className="text-black text-base">Current Rating: <Text className="font-medium">4.9</Text></Text>
              </View>
              <View className="items-end">
                 <TouchableOpacity className="bg-[#1D4ED8] px-6 py-2 rounded-lg mb-2 shadow-sm shadow-blue-200 w-32 items-center">
                    <Text className="text-white font-medium text-base">Quick Book</Text>
                 </TouchableOpacity>
                 <TouchableOpacity className="bg-white border border-[#1D4ED8] px-6 py-2 rounded-lg w-32 items-center">
                    <Text className="text-[#1D4ED8] font-medium text-base">Remove</Text>
                 </TouchableOpacity>
              </View>
           </View>

        </View>

      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="car-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="heart" size={24} color="#1D4ED8" />
          <Text className="text-[#1D4ED8] text-xs mt-1 font-semibold">Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
