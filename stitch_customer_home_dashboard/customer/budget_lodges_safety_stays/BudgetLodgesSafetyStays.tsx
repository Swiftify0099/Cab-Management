import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function BudgetLodgesSafetyStays() {
  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      <StatusBar barStyle="light-content" />

      {/* Blue Header */}
      <View className="bg-[#1D4ED8] px-4 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Budget Lodges & Safety Stays</Text>
        <TouchableOpacity>
          <Feather name="sliders" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white px-4 py-3 flex-row border-b border-gray-200">
        <TouchableOpacity className="bg-[#1D4ED8] px-4 py-2 rounded-l-lg border border-[#1D4ED8]">
          <Text className="text-white font-medium">Sort by: Safety Rating</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-white px-4 py-2 border-t border-b border-gray-300">
          <Text className="text-[#1D4ED8] font-medium">Sort by: Distance</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-white px-4 py-2 rounded-r-lg border border-gray-300">
          <Text className="text-[#1D4ED8] font-medium">More Filters</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Hotel Card 1 */}
        <View className="bg-white rounded-xl shadow-sm shadow-gray-300 mb-4 overflow-hidden border border-gray-100 flex-row">
          {/* Image Mock */}
          <View className="w-1/3 bg-gray-300 h-full justify-center items-center relative overflow-hidden">
             {/* Replace with <Image source={{uri: '...'}} className="w-full h-full" /> */}
             <View className="absolute inset-0 bg-[#E2E8F0]" />
             <MaterialCommunityIcons name="office-building" size={40} color="#94A3B8" />
          </View>

          <View className="flex-1 p-3">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-black text-lg font-bold text-[#1D4ED8]">$35<Text className="text-sm font-normal text-black">/night</Text></Text>
              <View className="items-end">
                <View className="flex-row items-center mb-0.5">
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star-half" size={12} color="#F59E0B" />
                  <Text className="text-black font-bold text-sm ml-1">4.5</Text>
                </View>
                <Text className="text-gray-500 text-[10px]">210 reviews</Text>
              </View>
            </View>
            
            <Text className="text-black font-bold text-lg mb-3 leading-5">City Center Hostel</Text>
            
            {/* Icons row */}
            <View className="flex-row justify-between mb-3 px-1">
              <View className="items-center w-16">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                   <Feather name="shield" size={14} color="#1D4ED8" />
                 </View>
                 <Text className="text-black text-[10px] text-center leading-[11px]">Safe for Solo Travelers</Text>
              </View>
              <View className="items-center w-16">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                   <Ionicons name="bus" size={14} color="#1D4ED8" />
                 </View>
                 <Text className="text-black text-[10px] text-center leading-[11px]">Near Bus Station</Text>
              </View>
              <View className="items-center w-16">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                   <Feather name="clock" size={14} color="#1D4ED8" />
                 </View>
                 <Text className="text-black text-[10px] text-center leading-[11px]">24/7 Check-in</Text>
              </View>
            </View>

            <TouchableOpacity className="bg-[#1D4ED8] py-2 rounded-lg items-center ml-auto px-6">
              <Text className="text-white font-semibold">Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hotel Card 2 */}
        <View className="bg-white rounded-xl shadow-sm shadow-gray-300 mb-4 overflow-hidden border border-gray-100 flex-row">
          <View className="w-1/3 bg-gray-300 h-full justify-center items-center relative overflow-hidden">
             <View className="absolute inset-0 bg-[#CBD5E1]" />
             <MaterialCommunityIcons name="home-modern" size={40} color="#94A3B8" />
          </View>

          <View className="flex-1 p-3">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-black text-lg font-bold text-[#1D4ED8]">$42<Text className="text-sm font-normal text-black">/night</Text></Text>
              <View className="items-end">
                <View className="flex-row items-center mb-0.5">
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star-half" size={12} color="#F59E0B" />
                  <Text className="text-black font-bold text-sm ml-1">4.3</Text>
                </View>
                <Text className="text-gray-500 text-[10px]">150 reviews</Text>
              </View>
            </View>
            
            <Text className="text-black font-bold text-lg mb-3 leading-5">Traveler's Haven Lodge</Text>
            
            <View className="flex-row justify-between mb-3 px-1">
              <View className="items-center w-16">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                   <Feather name="shield" size={14} color="#1D4ED8" />
                 </View>
                 <Text className="text-black text-[10px] text-center leading-[11px]">Safe for Solo Travelers</Text>
              </View>
              <View className="items-center w-16">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                   <Ionicons name="bus" size={14} color="#1D4ED8" />
                 </View>
                 <Text className="text-black text-[10px] text-center leading-[11px]">Near Bus Station</Text>
              </View>
              <View className="items-center w-16">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                   <Feather name="clock" size={14} color="#1D4ED8" />
                 </View>
                 <Text className="text-black text-[10px] text-center leading-[11px]">24/7 Check-in</Text>
              </View>
            </View>

            <TouchableOpacity className="bg-[#1D4ED8] py-2 rounded-lg items-center ml-auto px-6">
              <Text className="text-white font-semibold">Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hotel Card 3 */}
        <View className="bg-white rounded-xl shadow-sm shadow-gray-300 mb-6 overflow-hidden border border-gray-100 flex-row">
          <View className="w-1/3 bg-gray-300 h-full justify-center items-center relative overflow-hidden">
             <View className="absolute inset-0 bg-[#E2E8F0]" />
             <MaterialCommunityIcons name="office-building" size={40} color="#94A3B8" />
          </View>

          <View className="flex-1 p-3">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-black text-lg font-bold text-[#1D4ED8]">$28<Text className="text-sm font-normal text-black">/night</Text></Text>
              <View className="items-end">
                <View className="flex-row items-center mb-0.5">
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Ionicons name="star-outline" size={12} color="#F59E0B" />
                  <Text className="text-black font-bold text-sm ml-1">4.1</Text>
                </View>
                <Text className="text-gray-500 text-[10px]">95 reviews</Text>
              </View>
            </View>
            
            <Text className="text-black font-bold text-lg mb-3 leading-5">Budget Backpackers Inn</Text>
            
            <View className="flex-row justify-between mb-3 px-1">
              <View className="items-center w-16">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                   <Feather name="shield" size={14} color="#1D4ED8" />
                 </View>
                 <Text className="text-black text-[10px] text-center leading-[11px]">Safe for Solo Travelers</Text>
              </View>
              <View className="items-center w-16">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                   <Ionicons name="bus" size={14} color="#1D4ED8" />
                 </View>
                 <Text className="text-black text-[10px] text-center leading-[11px]">Near Bus Station</Text>
              </View>
              {/* Optional 3rd icon omitted or empty for variety if needed, but adding to match style */}
            </View>

            <TouchableOpacity className="bg-[#1D4ED8] py-2 rounded-lg items-center ml-auto px-6 mt-1">
              <Text className="text-white font-semibold">Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="h-10" />
      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="home" size={24} color="#1D4ED8" />
          <Text className="text-[#1D4ED8] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="calendar" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="bookmark" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Saved</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
