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
import { LinearGradient } from 'expo-linear-gradient';

export default function ParcelSpaceAllocationUi2() {
  return (
    <SafeAreaView className="flex-1 bg-[#111827]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center bg-[#1F2937] border-b border-gray-800">
        <TouchableOpacity className="flex-row items-center">
          <Feather name="chevron-left" size={28} color="#60A5FA" />
          <Text className="text-[#60A5FA] text-lg font-medium ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1 text-center mr-16">Space Allocation</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Info Card */}
        <View className="bg-[#1F2937] rounded-xl p-4 mb-6 border border-gray-700 shadow-sm shadow-gray-900">
           <Text className="text-white text-base mb-1 font-bold">Vehicle: <Text className="font-normal text-gray-300">7-Seater MUV (CD56 7890)</Text></Text>
           <Text className="text-white text-base mb-1 font-bold">Total Capacity: <Text className="font-normal text-gray-300">800kg</Text></Text>
           <Text className="text-white text-base mb-1 font-bold">Remaining Capacity: <Text className="font-normal text-gray-300">65%</Text></Text>
           <Text className="text-white text-base font-bold">Rooftop Carrier: <Text className="font-normal text-gray-300">Active (Available: 50kg)</Text></Text>
        </View>

        {/* Top-Down Car Mock */}
        <View className="items-center justify-center mb-8 relative h-64">
           {/* Tooltip Tags (Mocked with absolute positioning) */}
           <View className="absolute top-0 left-0 bg-green-900/40 border border-green-500 rounded-lg p-2 w-28 z-20">
              <Text className="text-white text-xs font-bold">Row 3:</Text>
              <Text className="text-gray-300 text-xs">Folded for Parcels: 90kg</Text>
              {/* Connector line mock */}
              <View className="absolute -bottom-4 right-4 w-px h-4 bg-green-500" />
           </View>

           <View className="absolute top-0 right-1/4 bg-green-900/40 border border-green-500 rounded-lg p-2 w-24 z-20">
              <Text className="text-white text-xs font-bold">Row 3 Right Passenger:</Text>
              <Text className="text-gray-300 text-xs">Available</Text>
           </View>

           <View className="absolute top-0 right-0 bg-green-900/40 border border-green-500 rounded-lg p-2 w-28 z-20">
              <Text className="text-white text-xs font-bold">Middle Row Right Passenger:</Text>
              <Text className="text-gray-300 text-xs">Available</Text>
           </View>

           {/* Fake Car */}
           <View className="w-full h-40 bg-[#374151] rounded-[60px] border-4 border-gray-600 mt-12 relative overflow-hidden flex-row">
              
              {/* Rear Section */}
              <View className="flex-[2] h-full border-r border-gray-500 flex-row items-center justify-around pl-4">
                 <View className="w-12 h-12 bg-orange-500 rounded-md items-center justify-center shadow-lg transform rotate-12">
                    <Feather name="box" size={24} color="white" />
                 </View>
                 <View>
                    <View className="w-8 h-8 bg-orange-400 rounded-md items-center justify-center mb-2 border border-orange-200">
                       <Feather name="plus" size={16} color="white" />
                    </View>
                    <View className="w-8 h-8 bg-orange-400 rounded-md items-center justify-center border border-orange-200">
                       <Feather name="plus" size={16} color="white" />
                    </View>
                 </View>
              </View>

              {/* Middle Section */}
              <View className="flex-[1.5] h-full border-r border-gray-500 items-center justify-center">
                 <View className="flex-row">
                    <View className="w-8 h-12 bg-gray-800 rounded-md mr-2" />
                    <View className="w-8 h-12 bg-gray-800 rounded-md items-center justify-center">
                       <View className="w-6 h-6 bg-orange-500 rounded-md items-center justify-center shadow-lg">
                          <Feather name="box" size={14} color="white" />
                       </View>
                    </View>
                 </View>
                 <View className="w-6 h-6 rounded-full bg-gray-600 border border-gray-400 items-center justify-center mt-2">
                    <Feather name="plus" size={14} color="white" />
                 </View>
              </View>

              {/* Front Section */}
              <View className="flex-[1.5] h-full items-center justify-center">
                 <View className="w-8 h-12 bg-gray-800 rounded-md mb-2 opacity-50" />
                 <View className="w-8 h-12 bg-gray-800 rounded-md opacity-50" />
              </View>

           </View>

           {/* Bottom Tooltips */}
           <View className="absolute bottom-0 left-0 bg-green-900/40 border border-green-500 rounded-lg p-2 w-28 z-20">
              <Text className="text-white text-xs font-bold">Middle Row Left:</Text>
              <Text className="text-gray-300 text-xs">Booked: 40kg</Text>
           </View>
           
           <View className="absolute bottom-0 left-1/3 bg-green-900/40 border border-green-500 rounded-lg p-2 w-32 z-20">
              <Text className="text-white text-xs font-bold">Middle Row Center:</Text>
              <Text className="text-gray-300 text-xs">Available: 50kg</Text>
           </View>

           <View className="absolute bottom-0 right-0 bg-green-900/40 border border-green-500 rounded-lg p-2 w-28 z-20">
              <Text className="text-white text-xs font-bold">Front Passenger:</Text>
              <Text className="text-gray-300 text-xs">Available: 30kg</Text>
           </View>
        </View>

        {/* Balanced Load Slider */}
        <View className="bg-[#1F2937] rounded-xl p-4 mb-6 shadow-sm shadow-gray-900 border border-gray-700">
           <Text className="text-white text-center text-lg font-bold mb-4">Balanced Load: 90%</Text>
           
           <View className="h-2 bg-gray-600 rounded-full mb-4 flex-row relative">
              <View className="w-[85%] h-full bg-[#3B82F6] rounded-full" />
              <View className="w-6 h-6 bg-white rounded-full absolute -top-2 left-[85%] -ml-3 shadow-md border-2 border-[#1E3A8A]" />
           </View>

           <Text className="text-gray-400 text-center text-sm font-medium">Rear: 350kg | Front: 100kg</Text>
        </View>

        {/* Pending Requests */}
        <Text className="text-white text-xl font-bold mb-4">Pending Requests (2)</Text>
        
        <View className="flex-row justify-between mb-4">
           {/* Request Card 1 */}
           <View className="w-[48%] bg-[#1F2937] border border-gray-700 rounded-xl p-3">
              <Text className="text-white text-sm font-bold mb-1" numberOfLines={1}>New Parcel Request - 15kg</Text>
              <Text className="text-gray-400 text-xs leading-4">Passenger: - - 15kg</Text>
              <Text className="text-gray-400 text-xs leading-4 mb-3">Configuration: Rear: 30kg</Text>
              <TouchableOpacity className="w-full py-2 border border-gray-500 rounded-lg items-center bg-gray-800">
                 <Text className="text-gray-300 font-medium text-sm">Decline</Text>
              </TouchableOpacity>
           </View>

           {/* Request Card 2 */}
           <View className="w-[48%] bg-[#1F2937] border border-gray-700 rounded-xl p-3">
              <Text className="text-white text-sm font-bold mb-1" numberOfLines={1}>Medium Box - 25kg</Text>
              <Text className="text-gray-400 text-xs leading-4">Passenger: - - 40kg</Text>
              <Text className="text-gray-400 text-xs leading-4 mb-3">Configuration: Shecken</Text>
              <TouchableOpacity className="w-full py-2 bg-[#1F2937] border border-gray-500 rounded-lg items-center">
                 <Text className="text-gray-300 font-medium text-sm">Allocate</Text>
              </TouchableOpacity>
           </View>
        </View>

      </ScrollView>

      {/* Footer Button */}
      <View className="px-4 pb-8 pt-2 bg-[#111827]">
         <TouchableOpacity className="w-full bg-[#1E3A8A] py-4 rounded-xl items-center justify-center shadow-md shadow-blue-900">
            <Text className="text-[#60A5FA] text-lg font-bold">Confirm Allocation</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
