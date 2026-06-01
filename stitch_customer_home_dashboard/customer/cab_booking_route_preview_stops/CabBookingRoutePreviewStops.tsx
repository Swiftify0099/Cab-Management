import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CabBookingRoutePreviewStops() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4 border-b border-gray-200 z-10 bg-white">
        <TouchableOpacity>
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black mr-6">Route Preview & Stops</Text>
      </View>

      {/* Map Area */}
      <View className="flex-1 bg-[#1A1A1A] relative">
        {/* Mock Map Background Layer */}
        <View className="absolute inset-0 overflow-hidden opacity-50">
           {/* Abstract grid/roads representing a dark map */}
           <View className="w-full h-full border border-gray-800" style={{ transform: [{ scale: 2 }, { rotate: '15deg'}]}}>
             <View className="w-full h-[1px] bg-gray-700 my-10" />
             <View className="w-[1px] h-full bg-gray-700 mx-20 absolute" />
             <View className="w-full h-[1px] bg-gray-700 my-32" />
           </View>
        </View>

        {/* Route Line Mock */}
        <View className="absolute top-[20%] left-[20%] w-[60%] h-[50%] border-l-4 border-t-4 border-[#3B82F6] rounded-tl-[60px] opacity-80 shadow-lg shadow-blue-500" style={{ transform: [{ rotate: '20deg'}] }} />

        {/* Origin Pin */}
        <View className="absolute top-[18%] left-[15%]">
           <Text className="text-white font-bold text-lg mb-1 drop-shadow-md">San Francisco</Text>
           <View className="w-3 h-3 bg-white rounded-full border-4 border-[#3B82F6]" />
        </View>

        {/* Stop 1 */}
        <View className="absolute top-[45%] left-[45%] items-center flex-row">
           <View className="w-12 h-12 bg-[#1E293B] rounded-full border-2 border-[#3B82F6] items-center justify-center z-10 shadow-lg shadow-black">
              <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#3B82F6" />
           </View>
           <View className="ml-3">
             <Text className="text-white font-medium text-sm">Verified Food Stop</Text>
             <Text className="text-gray-300 text-xs">- Harris Ranch</Text>
           </View>
        </View>

        {/* Stop 2 */}
        <View className="absolute top-[58%] left-[55%] items-center flex-row-reverse">
           <View className="w-12 h-12 bg-[#1E293B] rounded-full border-2 border-[#3B82F6] items-center justify-center z-10 shadow-lg shadow-black">
              <MaterialCommunityIcons name="gas-station" size={24} color="#3B82F6" />
           </View>
           <View className="mr-3 items-end">
             <Text className="text-white font-medium text-sm">Verified Fuel</Text>
             <Text className="text-gray-300 text-xs">- Tejon Pass</Text>
           </View>
        </View>

        {/* Destination Pin */}
        <View className="absolute bottom-[25%] right-[15%] items-end">
           <View className="w-3 h-3 bg-white rounded-full border-4 border-[#3B82F6] mb-1" />
           <Text className="text-white font-bold text-lg drop-shadow-md">Los Angeles</Text>
        </View>

        {/* Bottom Sheet Card */}
        <View className="absolute bottom-6 left-5 right-5 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] rounded-3xl p-6 border border-gray-600 shadow-2xl shadow-black/80" style={styles.glassEffect}>
          <Text className="text-gray-300 text-lg text-center mb-1">Total Distance: 382 miles</Text>
          <Text className="text-white text-3xl font-extrabold text-center mb-6">Est. Travel Time: 5h 45m</Text>
          
          <TouchableOpacity className="w-full bg-[#3B82F6] py-4 rounded-xl items-center">
            <Text className="text-white text-lg font-bold">View Detailed Itinerary</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassEffect: {
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }
});
