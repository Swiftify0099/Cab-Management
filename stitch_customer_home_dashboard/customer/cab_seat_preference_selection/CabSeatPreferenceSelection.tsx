import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CabSeatPreferenceSelection() {
  const [quietRide, setQuietRide] = useState(true);
  const [tempControl, setTempControl] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4 bg-white shadow-sm shadow-gray-200">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="#003366" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-black">Seat Selection</Text>
        <Text className="text-gray-500 text-sm">Step 2 of 4</Text>
      </View>

      {/* Progress Bar (in Header visually) */}
      <View className="bg-white px-5 pb-4 border-b border-gray-100 flex-row justify-between">
        <View className="h-1 flex-1 bg-[#2563EB] rounded-full mr-2" />
        <View className="h-1 flex-1 bg-[#2563EB] rounded-full mr-2" />
        <View className="h-1 flex-1 bg-[#E5E7EB] rounded-full mr-2" />
        <View className="h-1 flex-1 bg-[#E5E7EB] rounded-full" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Car Diagram Section */}
        <View className="items-center py-8 relative">
          
          {/* Mock Car Outline */}
          <View className="w-64 h-96 bg-white border-4 border-[#E2E8F0] rounded-t-[100px] rounded-b-[40px] shadow-lg shadow-gray-300 relative overflow-hidden">
             
             {/* Front windshield area mock */}
             <View className="absolute top-16 w-full h-10 bg-[#334155] opacity-20" />
             
             {/* Dashboard / Steering wheel mock */}
             <View className="absolute top-24 left-8 w-8 h-8 rounded-full border-2 border-gray-400 opacity-50" />
             <View className="absolute top-24 left-1/2 -ml-3 w-6 h-12 bg-gray-400 opacity-20" />

             {/* Driver Seat */}
             <View className="absolute top-32 left-6 w-14 h-16 bg-[#94A3B8] rounded-xl border-b-4 border-gray-400" />
             
             {/* Front Passenger Seat (Selected) */}
             <View className="absolute top-32 right-6 w-14 h-16 bg-[#2563EB] rounded-xl border-b-4 border-blue-800 shadow-[0_0_15px_rgba(37,99,235,0.8)]" />

             {/* Middle Row Seats */}
             <View className="absolute top-52 left-6 w-14 h-16 bg-[#94A3B8] rounded-xl border-b-4 border-gray-400" />
             <View className="absolute top-52 left-[86px] w-12 h-16 bg-[#94A3B8] rounded-xl border-b-4 border-gray-400" />
             <View className="absolute top-52 right-6 w-14 h-16 bg-[#94A3B8] rounded-xl border-b-4 border-gray-400" />

             {/* Back Row Seats */}
             <View className="absolute top-[280px] left-10 w-16 h-16 bg-[#94A3B8] rounded-xl border-b-4 border-gray-400" />
             <View className="absolute top-[280px] right-10 w-16 h-16 bg-[#94A3B8] rounded-xl border-b-4 border-gray-400" />

             {/* Rear windshield mock */}
             <View className="absolute bottom-4 w-full h-8 bg-[#334155] opacity-20 rounded-b-3xl" />
          </View>

          {/* Overlays / Tooltips */}

          {/* Extra Legroom Tooltip */}
          <View className="absolute top-28 right-8 bg-white rounded-xl py-2 px-3 flex-row items-center shadow-md shadow-gray-400 z-10">
             <Text className="text-[#2563EB] font-bold text-lg mr-2">+$8</Text>
             <Text className="text-gray-700 text-xs font-medium leading-3">Extra{'\n'}Legroom</Text>
             <MaterialCommunityIcons name="crown" size={20} color="#F59E0B" className="absolute -top-2 -right-2 transform rotate-12" />
             {/* Tooltip triangle */}
             <View className="absolute -bottom-2 left-6 w-4 h-4 bg-white transform rotate-45" />
          </View>

          {/* Window Seat Labels */}
          {/* Middle Left */}
          <View className="absolute top-[210px] left-4 bg-white rounded-lg py-1 px-2 items-center flex-row shadow-sm shadow-gray-300">
             <View className="items-end mr-2">
               <Text className="text-gray-700 text-xs font-bold">Window</Text>
               <Text className="text-gray-700 text-xs font-bold">Seat</Text>
               <View className="bg-[#F59E0B] px-1.5 rounded-full mt-0.5"><Text className="text-white text-[10px] font-bold">+$3</Text></View>
             </View>
             <MaterialCommunityIcons name="car-door" size={16} color="#6B7280" />
          </View>
          
          {/* Middle Right */}
          <View className="absolute top-[210px] right-4 bg-white rounded-lg py-1 px-2 items-center flex-row-reverse shadow-sm shadow-gray-300">
             <View className="items-start ml-2">
               <Text className="text-gray-700 text-xs font-bold">Window</Text>
               <Text className="text-gray-700 text-xs font-bold">Seat</Text>
               <View className="bg-[#F59E0B] px-1.5 rounded-full mt-0.5"><Text className="text-white text-[10px] font-bold">+$3</Text></View>
             </View>
             <MaterialCommunityIcons name="car-door" size={16} color="#6B7280" />
          </View>

          {/* Back Left */}
          <View className="absolute top-[290px] left-4 bg-white rounded-lg py-1 px-2 items-center flex-row shadow-sm shadow-gray-300">
             <View className="items-end mr-2">
               <Text className="text-gray-700 text-xs font-bold">Window</Text>
               <Text className="text-gray-700 text-xs font-bold">Seat</Text>
               <View className="bg-[#F59E0B] px-1.5 rounded-full mt-0.5"><Text className="text-white text-[10px] font-bold">+$3</Text></View>
             </View>
             <MaterialCommunityIcons name="car-door" size={16} color="#6B7280" />
          </View>

          {/* Back Right */}
          <View className="absolute top-[290px] right-4 bg-white rounded-lg py-1 px-2 items-center flex-row-reverse shadow-sm shadow-gray-300">
             <View className="items-start ml-2">
               <Text className="text-gray-700 text-xs font-bold">Window</Text>
               <Text className="text-gray-700 text-xs font-bold">Seat</Text>
               <View className="bg-[#F59E0B] px-1.5 rounded-full mt-0.5"><Text className="text-white text-[10px] font-bold">+$3</Text></View>
             </View>
             <MaterialCommunityIcons name="car-door" size={16} color="#6B7280" />
          </View>

        </View>

        {/* Preferences Section */}
        <View className="px-5 mb-8">
          <Text className="text-2xl font-bold text-black mb-4">Preferences</Text>
          
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-lg font-semibold text-black">Quiet Ride</Text>
              <Text className="text-gray-500 text-sm mt-1">Driver will keep music off & limit chatting.</Text>
            </View>
            <Switch
              value={quietRide}
              onValueChange={setQuietRide}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
            />
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-lg font-semibold text-black">Temperature Control</Text>
              <Text className="text-gray-500 text-sm mt-1">Set preference for AC before ride starts.</Text>
            </View>
            <Switch
              value={tempControl}
              onValueChange={setTempControl}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
            />
          </View>
        </View>
        
        {/* Padding for bottom sheet overlap */}
        <View className="h-32" />

      </ScrollView>

      {/* Bottom Summary Action */}
      <View className="absolute bottom-0 w-full bg-[#1E50B3] rounded-t-3xl p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] pt-5 pb-8">
        
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text className="text-blue-200 text-sm mb-1">Selected Seat:</Text>
            <Text className="text-white text-xl font-bold">Front Seat</Text>
          </View>
          <View className="items-end">
            <Text className="text-blue-200 text-sm mb-1">Total Fare:</Text>
            <Text className="text-white text-xl font-bold">$180</Text>
          </View>
        </View>

        <TouchableOpacity className="w-full bg-white py-4 rounded-xl items-center shadow-lg shadow-white/20">
          <Text className="text-[#10B981] text-lg font-bold">Confirm Selection</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
