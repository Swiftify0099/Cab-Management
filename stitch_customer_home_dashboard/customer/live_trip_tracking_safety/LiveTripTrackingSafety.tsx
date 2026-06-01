import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LiveTripTrackingSafety() {
  return (
    <SafeAreaView className="flex-1 bg-[#F0F9FF]">
      <StatusBar barStyle="dark-content" />

      {/* Map Background (Mock) */}
      <View className="absolute inset-0 bg-[#E0F2FE]">
         {/* Fake map lines */}
         <View className="absolute top-1/4 left-0 w-full h-1 bg-[#BAE6FD]" />
         <View className="absolute top-1/2 left-0 w-full h-1 bg-[#BAE6FD]" />
         <View className="absolute top-0 left-1/4 w-1 h-full bg-[#BAE6FD]" />
         <View className="absolute top-0 right-1/4 w-1 h-full bg-[#BAE6FD]" />
         <View className="absolute top-1/3 left-0 w-full h-1 bg-[#BAE6FD] transform rotate-12" />
         <View className="absolute top-0 left-1/3 w-1 h-full bg-[#BAE6FD] transform -rotate-12" />
         
         {/* Route Line */}
         <View className="absolute top-1/4 left-10 w-64 h-64 border-b-4 border-l-4 border-[#3B82F6] rounded-bl-[100px] transform rotate-45" />
         <View className="absolute top-[20%] left-10 w-4 h-4 bg-[#3B82F6] rounded-full border-2 border-white" />
         
         <View className="absolute top-1/2 right-1/4 w-40 h-40 border-t-4 border-r-4 border-[#3B82F6] rounded-tr-[50px] transform rotate-12" />
         <View className="absolute bottom-1/4 right-10 w-6 h-6 bg-gray-500 rounded-full items-center justify-center">
            <Feather name="phone" size={12} color="white" />
         </View>

         {/* Car Marker */}
         <View className="absolute top-[42%] left-[45%] w-12 h-20 bg-white rounded-3xl border border-gray-300 shadow-md transform rotate-[-30deg] items-center justify-center overflow-hidden">
            <View className="w-8 h-4 bg-gray-800 rounded-t-sm absolute top-2" />
            <View className="w-8 h-4 bg-gray-800 rounded-b-sm absolute bottom-2" />
         </View>

         {/* Stop Tooltip */}
         <View className="absolute top-[50%] right-[30%] items-center z-20">
            <View className="flex-row items-center mb-1">
               <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center border-2 border-white shadow-sm mr-1">
                  <MaterialCommunityIcons name="gas-station" size={16} color="white" />
               </View>
               <View className="w-8 h-8 bg-orange-500 rounded-full items-center justify-center border-2 border-white shadow-sm">
                  <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="white" />
               </View>
            </View>
            <View className="bg-white px-3 py-2 rounded-xl shadow-md border border-gray-100">
               <Text className="text-black font-bold text-sm text-center leading-4">Next Stop:{'\n'}Fuel & Food</Text>
            </View>
         </View>

      </View>

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between z-20">
         <View className="flex-1">
            <TouchableOpacity className="mb-4">
              <Feather name="chevron-left" size={32} color="black" />
            </TouchableOpacity>
            <Text className="text-black text-4xl font-extrabold leading-10 shadow-sm shadow-white">Live Trip Tracking{'\n'}& Safety</Text>
         </View>
         
         <View className="items-center">
            <TouchableOpacity className="w-20 h-20 bg-red-500 rounded-full items-center justify-center border-4 border-white shadow-xl shadow-red-500/50 mb-2 relative">
               <View className="absolute inset-[-10px] rounded-full border-2 border-red-500/30" />
               <View className="absolute inset-[-20px] rounded-full border border-red-500/10" />
               <MaterialCommunityIcons name="shield-check" size={32} color="white" />
            </TouchableOpacity>
            <Text className="text-black font-bold text-center">Emergency{'\n'}SOS</Text>
         </View>
      </View>

      <View className="flex-1" />

      {/* Bottom Sheet */}
      <View className="bg-white/90 backdrop-blur-xl mx-4 mb-8 rounded-3xl p-5 shadow-lg shadow-gray-300 border border-white z-20">
         
         {/* Driver Info */}
         <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
               <View className="w-16 h-16 bg-gray-300 rounded-full mr-4 border-2 border-white shadow-sm overflow-hidden items-center justify-center">
                  <Ionicons name="person" size={40} color="gray" style={{marginTop:8}}/>
               </View>
               <View>
                  <Text className="text-black text-2xl font-bold mb-1">Alex Chen</Text>
                  <View className="flex-row items-center">
                     <Ionicons name="star" size={20} color="#0F172A" className="mr-1" />
                     <Text className="text-black text-lg">4.9 Rating</Text>
                  </View>
               </View>
            </View>
            <View className="border-l border-gray-300 pl-4 py-1">
               <Text className="text-black text-base leading-5">Silver</Text>
               <Text className="text-black text-base leading-5">Tesla Model 3, CA</Text>
               <Text className="text-black text-base leading-5">8GHD52</Text>
            </View>
         </View>

         {/* ETA Card */}
         <View className="bg-white rounded-2xl py-6 items-center shadow-sm shadow-blue-100 mb-6 border border-blue-50">
            <Text className="text-black text-4xl font-extrabold mb-1">ETA: 14 min</Text>
            <Text className="text-gray-600 text-lg">Arriving at 5:45 PM</Text>
         </View>

         {/* Action Buttons */}
         <View className="flex-row justify-between">
            <TouchableOpacity className="flex-1 bg-white py-4 rounded-2xl mr-2 items-center justify-center shadow-sm shadow-blue-100 border border-gray-100">
               <MaterialCommunityIcons name="share" size={24} color="#64748B" className="mb-2" />
               <Text className="text-black text-sm font-medium">Share Live Trip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-1 bg-white py-4 rounded-2xl mx-1 items-center justify-center shadow-sm shadow-blue-100 border border-gray-100">
               <Ionicons name="chatbubble" size={24} color="#64748B" className="mb-2" />
               <Text className="text-black text-sm font-medium">Chat with Driver</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-1 bg-white py-4 rounded-2xl ml-2 items-center justify-center shadow-sm shadow-blue-100 border border-gray-100">
               <Ionicons name="call" size={24} color="#64748B" className="mb-2" />
               <Text className="text-black text-sm font-medium">Call</Text>
            </TouchableOpacity>
         </View>

      </View>
    </SafeAreaView>
  );
}
