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

export default function ParcelSpaceAllocationUi1() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Space Allocation</Text>
        <TouchableOpacity>
          <Text className="text-[#1D4ED8] font-medium text-base">Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Capacity Overview Card */}
        <View className="bg-white mx-5 rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100 z-10 relative mt-2">
           <Text className="text-black text-center font-bold text-lg mb-3">Vehicle Cargo Capacity</Text>
           
           <View className="w-full h-10 bg-gray-200 rounded-lg overflow-hidden flex-row mb-4 relative items-center justify-center border border-gray-300">
              <View className="absolute left-0 top-0 h-full w-[45%] bg-[#1D4ED8]" />
              <Text className="text-white text-sm font-bold z-10 w-[45%] text-center pl-2">Remaining Capacity: </Text>
              <Text className="text-black text-sm font-bold z-10 ml-2">45% <Text className="font-medium text-gray-700">(65kg / 145kg)</Text></Text>
           </View>

           <View className="flex-row justify-around">
              <View className="flex-row items-center">
                 <MaterialCommunityIcons name="weight" size={16} color="#1D4ED8" className="mr-1" />
                 <Text className="text-gray-700 text-xs font-medium">Left: 25kg</Text>
              </View>
              <View className="flex-row items-center">
                 <MaterialCommunityIcons name="weight" size={16} color="#9CA3AF" className="mr-1" />
                 <Text className="text-gray-700 text-xs font-medium">Center: 30kg</Text>
              </View>
              <View className="flex-row items-center">
                 <MaterialCommunityIcons name="weight" size={16} color="#9CA3AF" className="mr-1" />
                 <Text className="text-gray-700 text-xs font-medium">Right: 10kg</Text>
              </View>
           </View>
        </View>

        {/* Car Diagram Mock */}
        <View className="items-center px-4 mb-6 relative">
           
           {/* Fake Car Outline */}
           <View className="w-[90%] h-[400px] bg-gray-200 rounded-[60px] border-4 border-gray-300 relative items-center pt-8 overflow-hidden">
              
              {/* Windshield */}
              <View className="w-3/4 h-16 bg-gray-300 rounded-t-3xl mb-4" />

              {/* Front Seats area (blurred/ignored) */}
              <View className="flex-row justify-between w-3/4 mb-4 opacity-50">
                 <View className="w-[45%] h-12 bg-gray-400 rounded-xl" />
                 <View className="w-[45%] h-12 bg-gray-400 rounded-xl" />
              </View>

              <Text className="text-gray-700 font-bold mb-2">Rear Seats</Text>

              {/* Rear Seats Row */}
              <View className="flex-row justify-between w-5/6 mb-4">
                 <View className="w-[48%] h-20 bg-[#22C55E] rounded-2xl items-center justify-center shadow-sm shadow-green-600">
                    <View className="w-6 h-6 bg-white rounded-full items-center justify-center mb-1">
                       <Feather name="check" size={14} color="#22C55E" />
                    </View>
                    <Text className="text-white text-xs font-bold">Available (15kg)</Text>
                 </View>

                 <View className="w-[48%] h-20 bg-[#FBBF24] rounded-2xl items-center justify-center shadow-sm shadow-yellow-600 border border-yellow-500">
                    <Feather name="package" size={20} color="black" className="mb-1" />
                    <Text className="text-black text-[10px] font-bold text-center leading-3">Incoming:{'\n'}Order #5678{'\n'}(Tap to Allocate)</Text>
                 </View>
              </View>

              {/* Rear Trunk Area */}
              <View className="w-5/6 h-36 bg-gray-300 rounded-2xl p-2 justify-between">
                 <View className="flex-row justify-between mb-2">
                    <View className="w-[31%] h-[100%] bg-[#22C55E] rounded-xl items-center justify-center">
                       <View className="w-5 h-5 bg-white rounded-full items-center justify-center mb-1">
                          <Feather name="check" size={12} color="#22C55E" />
                       </View>
                       <Text className="text-white text-[9px] font-bold text-center">Available{'\n'}(10kg)</Text>
                    </View>
                    <View className="w-[31%] h-[100%] bg-[#3B82F6] rounded-xl items-center justify-center">
                       <Feather name="box" size={16} color="white" className="mb-1" />
                       <Text className="text-white text-[9px] font-bold text-center">Allocated:{'\n'}Order #1234</Text>
                    </View>
                    <View className="w-[31%] h-[100%] bg-[#3B82F6] rounded-xl items-center justify-center">
                       <Feather name="box" size={16} color="white" className="mb-1" />
                       <Text className="text-white text-[9px] font-bold text-center">Allocated:{'\n'}Order #1234</Text>
                    </View>
                 </View>
                 <View className="flex-row justify-between">
                    <View className="w-[31%] h-[100%] bg-[#22C55E] rounded-xl items-center justify-center">
                       <View className="w-5 h-5 bg-white rounded-full items-center justify-center mb-1">
                          <Feather name="check" size={12} color="#22C55E" />
                       </View>
                       <Text className="text-white text-[9px] font-bold text-center">Available{'\n'}(10kg)</Text>
                    </View>
                    <View className="w-[31%] h-[100%] bg-[#3B82F6] rounded-xl items-center justify-center">
                       <Feather name="box" size={16} color="white" className="mb-1" />
                       <Text className="text-white text-[9px] font-bold text-center">Allocated:{'\n'}Order #1234</Text>
                    </View>
                    <View className="w-[31%] h-[100%] bg-[#3B82F6] rounded-xl items-center justify-center">
                       <Feather name="box" size={16} color="white" className="mb-1" />
                       <Text className="text-white text-[9px] font-bold text-center">Allocated:{'\n'}Order #1234</Text>
                    </View>
                 </View>
              </View>
              <Text className="text-gray-700 font-bold mt-2">Rear Trunk</Text>

              {/* Fake Tail lights */}
              <View className="absolute bottom-2 left-2 w-8 h-4 bg-red-500 rounded-full transform rotate-45" />
              <View className="absolute bottom-2 right-2 w-8 h-4 bg-red-500 rounded-full transform -rotate-45" />
           </View>

        </View>

        {/* Incoming Parcel Requests List */}
        <View className="px-5 mb-8">
           <Text className="text-black text-xl font-bold mb-4">Incoming Parcel Requests (1)</Text>
           
           <View className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center justify-between">
              <View>
                 <Text className="text-black text-lg font-bold mb-1">Order #5678 <Text className="font-normal">- Small Electronics (5kg)</Text></Text>
                 <View className="bg-blue-50 px-2 py-1 rounded self-start border border-blue-100">
                    <Text className="text-[#1D4ED8] text-xs font-semibold">Tap to Allocate</Text>
                 </View>
              </View>
           </View>
        </View>

      </ScrollView>

      {/* Footer Button */}
      <View className="px-5 pb-6 pt-2 bg-white">
         <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center justify-center shadow-sm shadow-blue-500/50">
            <Text className="text-white text-lg font-bold">Confirm Allocation</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
