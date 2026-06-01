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

export default function DriverRatingsOverviewUi() {
  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" />

      {/* Blue Header */}
      <View className="bg-[#1E40AF] px-4 pt-4 pb-6 flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Driver Ratings Overview</Text>
        <TouchableOpacity>
          <Feather name="settings" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 -mt-3" showsVerticalScrollIndicator={false}>
        
        {/* Main Rating Card */}
        <View className="bg-white rounded-2xl p-6 shadow-md shadow-gray-200 border border-gray-100 flex-row justify-between mb-8">
          <View>
            <Text className="text-black font-bold text-lg mb-1">Global Star Rating</Text>
            <Text className="text-[#1E40AF] font-extrabold text-7xl -ml-1">4.9</Text>
            <View className="flex-row mt-1 mb-2">
              <Ionicons name="star" size={20} color="#FBBF24" />
              <Ionicons name="star" size={20} color="#FBBF24" />
              <Ionicons name="star" size={20} color="#FBBF24" />
              <Ionicons name="star" size={20} color="#FBBF24" />
              <Ionicons name="star-half" size={20} color="#FBBF24" />
            </View>
            <Text className="text-gray-500 text-base">472 Ratings</Text>
          </View>
          
          <View className="items-center justify-center">
             {/* Mock Gold Badge */}
             <View className="w-28 h-28 bg-[#FBBF24] rounded-full items-center justify-center border-4 border-yellow-200 shadow-lg mb-2 relative">
               <View className="absolute w-24 h-24 rounded-full border border-yellow-600" />
               <View className="w-20 h-20 bg-[#1E40AF] rounded-full items-center justify-center border-2 border-[#FBBF24]">
                 <MaterialCommunityIcons name="shield-check" size={28} color="#60A5FA" />
                 <Text className="text-[#FBBF24] font-bold text-[10px] text-center mt-1 leading-3 uppercase px-1">Top Rated Partner</Text>
               </View>
             </View>
             <Text className="text-black text-sm">Elite Status</Text>
          </View>
        </View>

        {/* Top Compliments */}
        <Text className="text-2xl font-bold text-black mb-4 px-1">Top Compliments</Text>
        
        <View className="mb-8">
          <View className="bg-[#F3F4F6] rounded-xl p-3 flex-row items-center justify-between mb-3 border border-gray-100">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                <MaterialCommunityIcons name="map-marker-path" size={20} color="#1E40AF" />
              </View>
              <Text className="text-black font-bold text-lg">Excellent Navigation</Text>
            </View>
            <Text className="text-gray-700 text-base">182 times</Text>
          </View>

          <View className="bg-[#F3F4F6] rounded-xl p-3 flex-row items-center justify-between mb-3 border border-gray-100">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-yellow-100 rounded-lg items-center justify-center mr-3">
                <Feather name="smile" size={20} color="#D97706" />
              </View>
              <Text className="text-black font-bold text-lg">Friendly Service</Text>
            </View>
            <Text className="text-gray-700 text-base">155 times</Text>
          </View>

          <View className="bg-[#F3F4F6] rounded-xl p-3 flex-row items-center justify-between border border-gray-100">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="car-outline" size={20} color="#1E40AF" />
              </View>
              <Text className="text-black font-bold text-lg">Clean Vehicle</Text>
            </View>
            <Text className="text-gray-700 text-base">138 times</Text>
          </View>
        </View>

        {/* Areas to Improve (AI Insights) */}
        <Text className="text-2xl font-bold text-black mb-4 px-1">Areas to Improve (AI Insights)</Text>

        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4 border-l-[#F97316] border border-gray-100 flex-row">
           <View className="w-12 h-12 bg-orange-100 rounded-lg items-center justify-center mr-4">
              <Feather name="clock" size={24} color="#EA580C" />
           </View>
           <View className="flex-1">
             <Text className="text-black font-bold text-lg mb-1">Punctuality</Text>
             <Text className="text-black text-sm leading-5 pr-2">Slight delays noted on recent trips. Aim for earlier arrival.</Text>
           </View>
        </View>

        <View className="bg-white rounded-xl p-4 mb-8 shadow-sm border-l-4 border-l-[#F97316] border border-gray-100 flex-row">
           <View className="w-12 h-12 bg-orange-100 rounded-lg items-center justify-center mr-4">
              <MaterialCommunityIcons name="routes" size={24} color="#EA580C" />
           </View>
           <View className="flex-1">
             <Text className="text-black font-bold text-lg mb-1">Route Optimization</Text>
             <Text className="text-black text-sm leading-5">Consider alternative routes during peak hours.</Text>
           </View>
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-2 pb-6 pt-3">
        <TouchableOpacity className="items-center py-2 px-4 border-t-2 border-[#1E40AF] -mt-3">
          <Ionicons name="speedometer-outline" size={24} color="#1E40AF" />
          <Text className="text-[#1E40AF] text-xs mt-1 font-medium">Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center px-4">
          <MaterialCommunityIcons name="map" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center px-4">
          <MaterialCommunityIcons name="cash" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center px-4">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
