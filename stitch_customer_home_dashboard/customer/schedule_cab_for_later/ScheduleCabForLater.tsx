import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ScheduleCabForLater() {
  return (
    <SafeAreaView className="flex-1 bg-[#0F0F0F]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-[#222]">
        <TouchableOpacity className="mr-4 w-8 h-8 items-center justify-center">
          <Feather name="chevron-left" size={28} color="#3B82F6" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold flex-1 text-center mr-12">Schedule Cab for Later</Text>
      </View>

      {/* Date Picker (Horizontal) */}
      <View className="border-b border-[#222]">
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-3 px-2">
            <TouchableOpacity className="px-4 py-2 mr-2 rounded-lg border border-transparent">
               <Text className="text-gray-400">Oct 26, Sat</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-2 mr-2 rounded-lg border border-transparent">
               <Text className="text-gray-400">Oct 27, Sun</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-2 mr-2 bg-[#333] rounded-lg">
               <Text className="text-white font-medium">Oct 28, Mon</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-2 mr-2 rounded-lg border border-transparent">
               <Text className="text-gray-400">Oct 29, Tue</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-2 mr-2 rounded-lg border border-transparent">
               <Text className="text-gray-400">Oct 30, Wed</Text>
            </TouchableOpacity>
         </ScrollView>
      </View>

      {/* Time Picker Mock (Vertical Wheel) */}
      <View className="h-64 justify-center items-center relative overflow-hidden bg-[#1A1A1A]">
         {/* Highlight Bar */}
         <View className="absolute top-1/2 -mt-7 w-[90%] h-14 bg-[#2A2A2A] rounded-xl z-0" />
         
         <View className="flex-row w-full justify-center px-10 z-10 h-full items-center">
            {/* Hours */}
            <View className="flex-1 items-center justify-around h-[200px]">
               <Text className="text-[#444] text-xl font-medium">08</Text>
               <Text className="text-[#666] text-2xl font-medium">09</Text>
               <Text className="text-white text-4xl font-light">10</Text>
               <Text className="text-[#666] text-2xl font-medium">11</Text>
               <Text className="text-[#444] text-xl font-medium">12</Text>
            </View>
            
            {/* Minutes */}
            <View className="flex-1 items-center justify-around h-[200px]">
               <Text className="text-[#444] text-xl font-medium">00</Text>
               <Text className="text-[#666] text-2xl font-medium">15</Text>
               <Text className="text-white text-4xl font-light">30</Text>
               <Text className="text-[#666] text-2xl font-medium">45</Text>
               <Text className="text-[#444] text-xl font-medium">00</Text>
            </View>

            {/* AM/PM */}
            <View className="flex-1 items-center justify-around h-[200px]">
               <Text className="text-[#444] text-xl font-medium"></Text>
               <Text className="text-[#666] text-2xl font-medium"></Text>
               <Text className="text-white text-3xl font-light">AM</Text>
               <Text className="text-[#666] text-2xl font-medium">PM</Text>
               <Text className="text-[#444] text-xl font-medium"></Text>
            </View>
         </View>
         {/* Fading Gradients */}
         <LinearGradient colors={['#1A1A1A', 'transparent']} className="absolute top-0 w-full h-1/4 z-20" />
         <LinearGradient colors={['transparent', '#1A1A1A']} className="absolute bottom-0 w-full h-1/4 z-20" />
      </View>

      <ScrollView className="flex-1 pt-6 px-4" showsVerticalScrollIndicator={false}>
         
         {/* Benefits Card */}
         <View className="bg-[#1A1C23] rounded-2xl p-5 mb-6 border border-[#2A2D3A] shadow-lg shadow-black relative overflow-hidden">
            {/* Glow effect mock */}
            <View className="absolute -top-10 -right-10 w-32 h-32 bg-[#3B82F6]/20 rounded-full blur-3xl" />

            <Text className="text-white text-lg font-bold mb-4">Scheduled Ride Benefits</Text>
            
            <View className="flex-row items-start mb-3">
               <View className="bg-[#22C55E] rounded-sm mr-3 mt-0.5 w-4 h-4 items-center justify-center">
                  <Feather name="check" size={12} color="white" />
               </View>
               <Text className="text-white font-medium flex-1 leading-5">Locked-in Fares: <Text className="text-gray-400 font-normal">Price will not change.</Text></Text>
            </View>

            <View className="flex-row items-start mb-3">
               <View className="bg-[#22C55E] rounded-sm mr-3 mt-0.5 w-4 h-4 items-center justify-center">
                  <Feather name="check" size={12} color="white" />
               </View>
               <Text className="text-white font-medium flex-1 leading-5">Guaranteed Availability: <Text className="text-gray-400 font-normal">Driver secured.</Text></Text>
            </View>

            <View className="flex-row items-start">
               <View className="bg-[#22C55E] rounded-sm mr-3 mt-0.5 w-4 h-4 items-center justify-center">
                  <Feather name="check" size={12} color="white" />
               </View>
               <Text className="text-white font-medium flex-1 leading-5">Peace of Mind: <Text className="text-gray-400 font-normal">Plan ahead with confidence.</Text></Text>
            </View>
         </View>

         {/* Toggles */}
         <View className="bg-[#1A1A1A] rounded-2xl mb-8 border border-[#2A2A2A]">
            <View className="flex-row justify-between items-center p-4 border-b border-[#2A2A2A]">
               <Text className="text-gray-200 text-base">Notify me when driver is assigned</Text>
               <Switch value={true} onValueChange={()=>{}} trackColor={{true: '#22C55E', false: '#444'}} />
            </View>
            <View className="flex-row justify-between items-center p-4">
               <Text className="text-gray-200 text-base">Recurring Trip</Text>
               <Switch value={false} onValueChange={()=>{}} trackColor={{true: '#22C55E', false: '#444'}} />
            </View>
         </View>

      </ScrollView>

      {/* Confirm Button */}
      <View className="px-4 pb-8 pt-4 bg-[#0F0F0F]">
         <TouchableOpacity className="w-full bg-[#3B82F6] py-4 rounded-full items-center shadow-lg shadow-blue-500/30">
            <Text className="text-white font-bold text-lg">Confirm Schedule</Text>
         </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
