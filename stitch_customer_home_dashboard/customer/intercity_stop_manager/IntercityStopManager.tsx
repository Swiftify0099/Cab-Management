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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function IntercityStopManager() {
  const [fuelStop, setFuelStop] = useState(false);
  const [foodBreak, setFoodBreak] = useState(true);
  const [washroomStop, setWashroomStop] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-[#E5E7EB] px-5 pt-4 pb-4">
        <View className="flex-row items-center justify-between mb-1">
           <TouchableOpacity>
             <Feather name="arrow-left" size={24} color="black" />
           </TouchableOpacity>
           <Text className="text-black text-xl font-bold">Intercity Stop Manager</Text>
           <View className="w-6" />
        </View>
        <Text className="text-gray-500 text-center text-sm">San Francisco</Text>
      </View>

      <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
        
        {/* Active Trip Banner */}
        <View className="px-5 pt-4 pb-2">
           <View className="flex-row items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm shadow-gray-100">
              <Text className="text-black text-base">Active Trip: BLR - MUM (#45A9B)</Text>
              <View className="bg-green-100 px-2 py-1 rounded-md flex-row items-center">
                 <View className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
                 <Text className="text-green-700 text-xs font-medium">In Progress</Text>
              </View>
           </View>
        </View>

        {/* Passenger Notification Banner */}
        <View className="px-5 mb-4">
           <View className="bg-[#1D4ED8] py-3 rounded-xl items-center shadow-sm shadow-blue-200">
              <Text className="text-white text-base">Passenger Notification: <Text className="font-bold">Enabled</Text></Text>
           </View>
        </View>

        {/* Mock Map View */}
        <View className="px-5 mb-6">
           <View className="w-full h-48 bg-[#BAE6FD] rounded-2xl overflow-hidden relative border border-blue-200 items-center justify-center">
              {/* Fake roads and water */}
              <View className="absolute top-0 right-0 w-32 h-full bg-[#7DD3FC]" />
              <View className="absolute bottom-10 left-0 w-full h-2 bg-white transform -rotate-12" />
              <View className="absolute top-10 left-10 w-full h-2 bg-white transform rotate-12" />
              
              {/* Fake route line */}
              <View className="w-48 h-12 border-b-4 border-l-4 border-[#1D4ED8] rounded-bl-3xl absolute top-16 left-16" />
              
              {/* Pointers */}
              <View className="absolute top-12 right-24 bg-white p-1.5 rounded-full shadow-md">
                 <View className="w-4 h-4 bg-[#1D4ED8] rounded-full" />
              </View>
              <View className="absolute bottom-16 left-12 w-8 h-8 bg-white rounded-full items-center justify-center shadow-md">
                 <Ionicons name="navigate" size={18} color="#1D4ED8" className="ml-0.5 mt-0.5" />
              </View>

              {/* Stop Markers */}
              <View className="absolute top-20 right-20 bg-white px-2 py-1 rounded-lg shadow-md border border-gray-100 flex-row items-center">
                 <View className="w-6 h-6 bg-[#1D4ED8] rounded-full items-center justify-center mr-1">
                    <MaterialCommunityIcons name="gas-station" size={14} color="white" />
                 </View>
                 <View>
                    <View className="flex-row items-center">
                       <Text className="text-xs text-black mr-1">Verified</Text>
                       <MaterialCommunityIcons name="check-circle" size={10} color="#22C55E" />
                    </View>
                    <Text className="text-[10px] text-gray-500">30 min</Text>
                 </View>
              </View>

              <Text className="absolute bottom-2 left-2 text-[#4285F4] font-bold text-lg tracking-tighter">Google</Text>
           </View>
        </View>

        <View className="px-5">
           <Text className="text-black text-xl font-bold mb-4">Route Stop Management</Text>

           {/* Fuel Stop */}
           <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-sm shadow-gray-100 flex-row justify-between items-center">
              <View className="flex-row items-center">
                 <View className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mr-4">
                    <MaterialCommunityIcons name="gas-station" size={24} color="black" />
                 </View>
                 <Text className="text-black text-lg">Fuel Stop</Text>
              </View>
              <View className="items-end">
                 <Switch
                    trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
                    thumbColor={'#ffffff'}
                    ios_backgroundColor="#D1D5DB"
                    onValueChange={setFuelStop}
                    value={fuelStop}
                 />
                 <Text className="text-gray-500 text-xs mt-1">Not Marked</Text>
              </View>
           </View>

           {/* Food Break */}
           <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-sm shadow-gray-100 flex-row justify-between items-center">
              <View className="flex-row items-center">
                 <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mr-4">
                    <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="black" />
                 </View>
                 <Text className="text-black text-lg">Food Break</Text>
              </View>
              <View className="items-end">
                 <Switch
                    trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
                    thumbColor={'#ffffff'}
                    ios_backgroundColor="#D1D5DB"
                    onValueChange={setFoodBreak}
                    value={foodBreak}
                 />
                 <Text className="text-green-600 text-xs mt-1 font-medium">Marked - Approx. 30 min</Text>
              </View>
           </View>

           {/* Washroom Stop */}
           <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200 shadow-sm shadow-gray-100 flex-row justify-between items-center">
              <View className="flex-row items-center">
                 <View className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mr-4">
                    <MaterialCommunityIcons name="human-male-female" size={28} color="black" />
                 </View>
                 <Text className="text-black text-lg">Washroom Stop</Text>
              </View>
              <View className="items-end">
                 <Switch
                    trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
                    thumbColor={'#ffffff'}
                    ios_backgroundColor="#D1D5DB"
                    onValueChange={setWashroomStop}
                    value={washroomStop}
                 />
                 <Text className="text-gray-500 text-xs mt-1">Not Marked</Text>
              </View>
           </View>

           <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center mb-8 shadow-sm shadow-blue-300">
              <Text className="text-white text-lg font-bold">Confirm Selected Stops</Text>
           </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="car-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center border-t-2 border-[#1D4ED8] pt-1 -mt-3">
          <Ionicons name="list" size={24} color="#1D4ED8" className="mt-1" />
          <Text className="text-[#1D4ED8] text-xs mt-1 font-semibold">Stops</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="map" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Map</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
