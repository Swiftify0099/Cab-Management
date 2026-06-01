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

export default function PartnerTrainingCertification() {
  return (
    <SafeAreaView className="flex-1 bg-[#E0F2FE]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-100">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Partner Training & Certification</Text>
        <View className="w-8" />
      </View>

      {/* Sub Header */}
      <View className="bg-[#3B82F6] py-3 flex-row items-center px-4">
        <TouchableOpacity>
          <Feather name="chevron-left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1 text-center mr-6">Partner Training</Text>
      </View>

      <ScrollView className="flex-1 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Safety Score Card */}
        <View className="bg-white mx-4 rounded-2xl p-5 shadow-sm shadow-blue-200 border border-blue-50 flex-row items-center mb-6">
           <View className="w-20 h-20 rounded-full border-[6px] border-[#3B82F6] items-center justify-center mr-4 border-l-gray-200 transform -rotate-45">
              <View className="transform rotate-45">
                 <Text className="text-black text-xl font-bold">85%</Text>
              </View>
           </View>
           <View className="flex-1">
              <Text className="text-black text-xl font-bold mb-2">Safety Score</Text>
              <View className="w-full h-2.5 bg-gray-200 rounded-full mb-2 overflow-hidden">
                 <View className="w-[85%] h-full bg-[#3B82F6] rounded-full" />
              </View>
              <Text className="text-gray-700 text-sm leading-5">Safety Score: Good - Keep up the progress!</Text>
           </View>
        </View>

        <Text className="text-2xl font-bold text-black px-4 mb-4">Required Training Modules</Text>

        {/* Training Modules Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-4 mb-6" contentContainerStyle={{ paddingRight: 16 }}>
           
           {/* Module 1 */}
           <TouchableOpacity className="bg-white rounded-2xl w-44 mr-4 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
              <View className="h-32 bg-[#F1F5F9] items-center justify-center relative">
                 <MaterialCommunityIcons name="road-variant" size={64} color="#64748B" />
                 <View className="absolute bottom-2 right-2 bg-gray-500/50 rounded-full">
                    <Ionicons name="play-circle" size={32} color="white" />
                 </View>
              </View>
              <View className="w-full h-1 bg-gray-200">
                 <View className="w-[45%] h-full bg-[#3B82F6]" />
              </View>
              <View className="p-3">
                 <Text className="text-black font-bold text-base mb-2 leading-5">Intercity Driving Best Practices</Text>
                 <Text className="text-gray-500 text-sm">In Progress - 45%</Text>
              </View>
           </TouchableOpacity>

           {/* Module 2 */}
           <TouchableOpacity className="bg-white rounded-2xl w-44 mr-4 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
              <View className="h-32 bg-[#F1F5F9] items-center justify-center relative">
                 <MaterialCommunityIcons name="handshake" size={64} color="#3B82F6" />
                 <View className="absolute bottom-2 right-2 bg-gray-500/50 rounded-full">
                    <Ionicons name="play-circle" size={32} color="white" />
                 </View>
              </View>
              <View className="w-full h-1 bg-[#10B981]" />
              <View className="p-3">
                 <Text className="text-black font-bold text-base mb-2 leading-5">Customer Etiquette</Text>
                 <View className="flex-row items-center">
                    <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" className="mr-1" />
                    <Text className="text-gray-800 text-sm font-medium">Completed</Text>
                 </View>
              </View>
           </TouchableOpacity>

           {/* Module 3 */}
           <TouchableOpacity className="bg-white rounded-2xl w-44 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
              <View className="h-32 bg-[#F1F5F9] items-center justify-center relative">
                 <Ionicons name="warning-outline" size={64} color="#EF4444" />
              </View>
              <View className="p-3">
                 <Text className="text-black font-bold text-base mb-2 leading-5">Emergency Handling</Text>
                 <Text className="text-gray-500 text-sm">Not Started</Text>
              </View>
           </TouchableOpacity>

        </ScrollView>

        <Text className="text-2xl font-bold text-black px-4 mb-4">Earned Badges</Text>

        {/* Badges Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-4 pb-8" contentContainerStyle={{ paddingRight: 16 }}>
           
           {/* Badge 1 */}
           <View className="bg-white rounded-2xl w-32 mr-4 shadow-sm shadow-gray-200 border border-gray-100 p-4 items-center">
              <View className="w-20 h-20 bg-[#DBEAFE] rounded-full items-center justify-center mb-3 border-4 border-[#93C5FD]">
                 <View className="w-12 h-14 bg-[#3B82F6] items-center justify-center rounded-sm">
                    <Ionicons name="star" size={24} color="#FCD34D" />
                 </View>
              </View>
              <Text className="text-black font-medium text-center leading-5">Safe Driver Level 1</Text>
           </View>

           {/* Badge 2 */}
           <View className="bg-white rounded-2xl w-32 mr-4 shadow-sm shadow-gray-200 border border-gray-100 p-4 items-center">
              <View className="w-20 h-20 bg-[#FEF3C7] rounded-full items-center justify-center mb-3 border-4 border-[#FDE68A]">
                 <MaterialCommunityIcons name="steering" size={40} color="#D97706" />
              </View>
              <Text className="text-black font-medium text-center leading-5">Punctuality Pro</Text>
           </View>

           {/* Badge 3 */}
           <View className="bg-white rounded-2xl w-32 shadow-sm shadow-gray-200 border border-gray-100 p-4 items-center">
              <View className="w-20 h-20 bg-[#E0E7FF] rounded-full items-center justify-center mb-3 border-4 border-[#A5B4FC]">
                 <MaterialCommunityIcons name="handshake-outline" size={40} color="#4F46E5" />
              </View>
              <Text className="text-black font-medium text-center leading-5">Service Excellence</Text>
           </View>

        </ScrollView>

      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="car-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="currency-usd" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="book" size={24} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-xs mt-1 font-semibold">Training</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
