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

export default function MultiParcelLoadingManager() {
  return (
    <SafeAreaView className="flex-1 bg-[#1E293B]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-700 bg-[#1E293B] z-20">
        <TouchableOpacity>
          <Feather name="chevron-left" size={32} color="#E2E8F0" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Parcel Loading</Text>
        <TouchableOpacity className="border border-gray-500 px-3 py-1.5 rounded-lg">
          <Text className="text-gray-300 font-medium">Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-[#1E293B]" showsVerticalScrollIndicator={false}>
        
        {/* Abstract Top Background */}
        <View className="absolute top-0 w-full h-72">
           <LinearGradient colors={['#0F172A', '#1E293B']} className="flex-1" />
        </View>

        {/* 3D Van Mock Section */}
        <View className="items-center pt-6 pb-6 z-10">
           <Text className="text-white text-lg font-medium mb-6">Optimal Weight Distribution</Text>
           
           {/* Mocking the 3D Van Graphic */}
           <View className="relative w-72 h-40 items-center justify-center">
              {/* Fake Van Shadow/Glow */}
              <View className="absolute bottom-0 w-64 h-16 bg-white/10 rounded-[100px] transform scale-y-50 blur-xl" />
              
              {/* Fake Van Body */}
              <View className="w-64 h-32 bg-white/10 border-2 border-white/20 rounded-3xl rounded-tr-[40px] rounded-tl-[10px] relative items-center justify-center shadow-lg shadow-white/5">
                 
                 {/* Wheels */}
                 <View className="absolute -bottom-3 left-10 w-8 h-8 rounded-full border-4 border-white/20 bg-gray-800" />
                 <View className="absolute -bottom-3 right-10 w-8 h-8 rounded-full border-4 border-white/20 bg-gray-800" />

                 {/* Load Distribution Blocks */}
                 <View className="absolute bottom-4 left-6 items-center">
                    <View className="w-12 h-10 bg-green-500/80 rounded-md border border-green-300 transform -skew-x-12" />
                    <View className="bg-white/20 px-1 rounded absolute top-1/2 mt-2">
                       <Text className="text-white text-[10px] font-bold">30%</Text>
                    </View>
                 </View>

                 <View className="absolute bottom-4 left-1/2 -ml-6 items-center">
                    <View className="w-12 h-10 bg-yellow-500/80 rounded-md border border-yellow-300 transform -skew-x-12" />
                    <View className="bg-white/20 px-1 rounded absolute top-1/2 mt-2">
                       <Text className="text-white text-[10px] font-bold">30%</Text>
                    </View>
                 </View>

                 <View className="absolute bottom-4 right-6 items-center">
                    <View className="w-16 h-14 bg-red-500/80 rounded-md border border-red-300 transform -skew-x-12" />
                    <View className="bg-white/20 px-1 rounded absolute -top-4">
                       <Text className="text-white text-[10px] font-bold">70%</Text>
                    </View>
                 </View>

              </View>
           </View>
        </View>

        <View className="px-4">
           
           {/* Parcel Card 1 */}
           <View className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-4 backdrop-blur-md">
              <View className="flex-row justify-between mb-2">
                 <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                       <Text className="text-white text-xl font-bold mr-2">Parcel #883201-A</Text>
                       <View className="bg-red-500/20 border border-red-500/50 px-2 py-0.5 rounded-md flex-row items-center">
                          <Feather name="alert-circle" size={10} color="#F87171" className="mr-1" />
                          <Text className="text-red-400 text-xs font-semibold">Fragile</Text>
                       </View>
                    </View>
                    <Text className="text-gray-400 text-base mb-4">Electronics</Text>
                 </View>
                 <View className="flex-row mt-1">
                    <TouchableOpacity className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-2">
                       <Feather name="phone" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                       <Ionicons name="chatbubble-outline" size={20} color="white" />
                    </TouchableOpacity>
                 </View>
              </View>

              <View className="mb-6">
                 <Text className="text-gray-400 text-base mb-1">Weight: <Text className="text-white">12.5 kg</Text></Text>
                 <Text className="text-gray-400 text-base mb-1">Volume: <Text className="text-white">0.4 m³</Text></Text>
                 <Text className="text-gray-400 text-base">Destination: <Text className="text-white">San Francisco</Text></Text>
              </View>

              <TouchableOpacity className="w-full bg-[#3B82F6] py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-blue-500/30">
                 <MaterialCommunityIcons name="barcode-scan" size={24} color="white" className="mr-2" />
                 <Text className="text-white text-lg font-bold">Scan to Load</Text>
              </TouchableOpacity>
           </View>

           {/* Parcel Card 2 */}
           <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 backdrop-blur-md">
              <View className="flex-row justify-between mb-4">
                 <View className="flex-1">
                    <Text className="text-white text-xl font-bold mb-4">Parcel #883202-B</Text>
                    <Text className="text-gray-400 text-base mb-1">Weight: <Text className="text-white">8.0 kg</Text></Text>
                    <Text className="text-gray-400 text-base mb-1">Volume: <Text className="text-white">0.2 m³</Text></Text>
                    <Text className="text-gray-400 text-base">Destination: <Text className="text-white">Oakland</Text></Text>
                 </View>
                 <View className="flex-row mt-1">
                    <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mr-2">
                       <Feather name="phone" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                       <Ionicons name="chatbubble-outline" size={20} color="white" />
                    </TouchableOpacity>
                 </View>
              </View>

              <View className="w-full bg-white/20 py-4 rounded-xl items-center flex-row justify-center border border-white/10">
                 <Feather name="check" size={24} color="#9CA3AF" className="mr-2" />
                 <Text className="text-gray-400 text-lg font-bold">Loaded</Text>
              </View>
           </View>

           {/* Parcel Card 3 (Partial) */}
           <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 backdrop-blur-md h-32 overflow-hidden">
              <View className="flex-row justify-between mb-4">
                 <View className="flex-1">
                    <Text className="text-white text-xl font-bold mb-4">Parcel #883203-C</Text>
                    <Text className="text-gray-400 text-base mb-1">Weight: <Text className="text-white">15.2 kg</Text></Text>
                 </View>
                 <View className="flex-row mt-1">
                    <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mr-2">
                       <Feather name="phone" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                       <Ionicons name="chatbubble-outline" size={20} color="white" />
                    </TouchableOpacity>
                 </View>
              </View>
           </View>

        </View>
      </ScrollView>

      {/* Floating Finish Button */}
      <View className="absolute bottom-0 w-full px-4 pb-8 pt-4 bg-[#1E293B]/90 backdrop-blur-md border-t border-gray-700 z-30">
         <TouchableOpacity className="w-full bg-white/10 py-4 rounded-xl items-center shadow-lg border border-white/5">
            <Text className="text-gray-400 text-lg font-bold">Finish Loading</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
