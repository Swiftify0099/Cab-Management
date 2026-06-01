import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function DriverSystemSettings4() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center bg-white z-10">
        <TouchableOpacity className="w-10">
          <Feather name="chevron-left" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-lg font-bold flex-1 text-center pr-10">Trip Rating & Driver Tip</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
         
         {/* Driver Image Mock */}
         <View className="w-full h-64 bg-gray-200 relative mb-4">
            <View className="absolute inset-0 bg-gray-400 items-center justify-center">
               <Feather name="image" size={48} color="#94A3B8" />
               <Text className="text-gray-500 mt-2">Driver Photo Area</Text>
            </View>
            
            {/* Overlay Gradient for readability of floating card */}
            <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/80 to-transparent" />
         </View>

         <View className="px-5 -mt-20">
            {/* Stars Card */}
            <View className="bg-white/90 rounded-2xl p-6 shadow-xl shadow-gray-200 backdrop-blur-md mb-6 border border-gray-100">
               <View className="flex-row justify-center space-x-2 mb-6">
                  <Ionicons name="star" size={40} color="#FBBF24" />
                  <Ionicons name="star" size={40} color="#FBBF24" />
                  <Ionicons name="star" size={40} color="#FBBF24" />
                  <Ionicons name="star" size={40} color="#FBBF24" />
                  <Ionicons name="star" size={40} color="#FBBF24" />
               </View>

               {/* Feedback Chips */}
               <View className="flex-row flex-wrap justify-center gap-2 mb-2">
                  <TouchableOpacity className="bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-2 rounded-full">
                     <Text className="text-[#1D4ED8] font-medium text-sm">Safe Driving</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full">
                     <Text className="text-gray-600 font-medium text-sm">Clean Car</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full">
                     <Text className="text-gray-600 font-medium text-sm">Professional</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full">
                     <Text className="text-gray-600 font-medium text-sm">Polite</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full">
                     <Text className="text-gray-600 font-medium text-sm">Smooth Ride</Text>
                  </TouchableOpacity>
               </View>
            </View>

            {/* Additional Comments */}
            <Text className="text-[#0F172A] font-bold text-sm mb-2 ml-1">Additional Comments</Text>
            <View className="bg-white border border-gray-200 rounded-xl p-4 h-28 mb-6 shadow-sm shadow-gray-100">
               <TextInput 
                  placeholder="Write a review..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  className="flex-1 text-[#0F172A] text-base"
                  style={{ textAlignVertical: 'top' }}
               />
            </View>

            {/* Tip Driver */}
            <Text className="text-[#0F172A] font-bold text-sm mb-2 ml-1">Tip Driver</Text>
            <View className="flex-row justify-between mb-8">
               <TouchableOpacity className="flex-1 bg-gray-100 py-3 rounded-xl items-center mr-2">
                  <Text className="text-gray-700 font-semibold text-lg">$1</Text>
               </TouchableOpacity>
               <TouchableOpacity className="flex-1 bg-[#EFF6FF] border border-[#BFDBFE] py-3 rounded-xl items-center mr-2">
                  <Text className="text-[#1D4ED8] font-semibold text-lg">$3</Text>
               </TouchableOpacity>
               <TouchableOpacity className="flex-1 bg-gray-100 py-3 rounded-xl items-center mr-2">
                  <Text className="text-gray-700 font-semibold text-lg">$5</Text>
               </TouchableOpacity>
               <TouchableOpacity className="flex-1 bg-white border border-gray-200 py-3 rounded-xl items-center">
                  <Text className="text-gray-400 font-medium text-base">Custom</Text>
               </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center shadow-md shadow-blue-500/30">
               <Text className="text-white text-lg font-bold tracking-wide">Submit Feedback & Tip</Text>
            </TouchableOpacity>

         </View>
      </ScrollView>

    </SafeAreaView>
  );
}
