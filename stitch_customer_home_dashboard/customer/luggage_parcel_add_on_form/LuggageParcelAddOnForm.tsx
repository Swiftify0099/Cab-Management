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

export default function LuggageParcelAddOnForm() {
  return (
    <SafeAreaView className="flex-1 bg-[#F0F9FF]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center">
        <TouchableOpacity className="mr-6">
          <Feather name="chevron-left" size={28} color="#3B82F6" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Luggage & Parcel Add-on</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        
        <Text className="text-black text-2xl font-bold mb-6">Select Items</Text>

        {/* Item Selection Grid */}
        <View className="flex-row justify-between mb-10">
           
           <TouchableOpacity className="w-[30%] bg-[#F0F9FF] rounded-2xl items-center py-6 border border-blue-300 shadow-sm shadow-blue-100">
              <MaterialCommunityIcons name="bag-personal-outline" size={48} color="#94A3B8" className="mb-4" />
              <Text className="text-black font-medium text-center text-sm leading-5">Small{'\n'}Bag</Text>
           </TouchableOpacity>

           <TouchableOpacity className="w-[30%] bg-[#E0F2FE] rounded-2xl items-center py-6 border-2 border-[#3B82F6] shadow-md shadow-blue-200">
              <MaterialCommunityIcons name="bag-suitcase-outline" size={48} color="#94A3B8" className="mb-4" />
              <Text className="text-black font-medium text-center text-sm leading-5">Large{'\n'}Suitcase</Text>
           </TouchableOpacity>

           <TouchableOpacity className="w-[30%] bg-white rounded-2xl items-center py-6 border border-gray-100 shadow-sm shadow-gray-200">
              <MaterialCommunityIcons name="package-variant-closed" size={48} color="#94A3B8" className="mb-4" />
              <Text className="text-black font-medium text-center text-sm leading-5">Custom{'\n'}Parcel</Text>
           </TouchableOpacity>

        </View>

        <Text className="text-black text-2xl font-bold mb-4">Additional Options</Text>

        {/* Fragile Toggle */}
        <View className="bg-white/80 rounded-3xl p-5 mb-10 shadow-sm shadow-gray-200 border border-white flex-row justify-between items-center backdrop-blur-md">
           <View className="flex-row items-center">
              <Text className="text-black text-lg mr-2">Fragile Item</Text>
              <Feather name="info" size={16} color="#9CA3AF" />
           </View>
           <Switch
              trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
              thumbColor={'#ffffff'}
              ios_backgroundColor="#E2E8F0"
              value={false}
              className="transform scale-110"
           />
        </View>

        <Text className="text-black text-2xl font-bold mb-4">Luggage Weight</Text>

        {/* Slider Mock Card */}
        <View className="bg-white/80 rounded-3xl p-6 mb-8 shadow-sm shadow-gray-200 border border-white backdrop-blur-md">
           <Text className="text-black text-center text-lg mb-4">12 kg</Text>
           
           {/* Custom Slider Track */}
           <View className="w-full h-2 bg-gray-200 rounded-full mb-2 flex-row relative">
              <View className="w-[24%] h-full bg-[#3B82F6] rounded-full" />
              {/* Slider Thumb */}
              <View className="w-6 h-6 bg-[#3B82F6] rounded-full border-4 border-white shadow-sm shadow-blue-500 absolute -top-2 left-[24%] -ml-3" />
           </View>
           
           <View className="flex-row justify-between mt-2">
              <Text className="text-gray-400 text-sm">0 kg</Text>
              <Text className="text-gray-400 text-sm">50 kg</Text>
           </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View className="bg-white/90 backdrop-blur-xl px-5 py-5 rounded-3xl mx-4 mb-8 shadow-lg shadow-gray-300 border border-white flex-row justify-between items-center z-20">
         <View>
            <Text className="text-black text-base">Total Price:</Text>
            <Text className="text-black text-3xl font-extrabold">$25.00</Text>
         </View>
         <TouchableOpacity className="bg-[#3B82F6] py-4 px-6 rounded-2xl shadow-sm shadow-blue-400">
            <Text className="text-white text-lg font-bold">Confirm Add-ons</Text>
         </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
