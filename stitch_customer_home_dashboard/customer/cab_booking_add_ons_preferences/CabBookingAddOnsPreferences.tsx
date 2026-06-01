import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  ScrollView,
  Switch
} from 'react-native';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function CabBookingAddOnsPreferences() {
  const [isFamilyTrip, setIsFamilyTrip] = useState(true);
  const [isAddParcel, setIsAddParcel] = useState(false);
  const [isPetFriendly, setIsPetFriendly] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-[#E1F0FF]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-6">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-black">Add-ons & Preferences</Text>
        <TouchableOpacity>
          <Text className="text-[#3B82F6] font-semibold text-base">Close</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-center text-gray-700 text-base mb-6 px-8">
        Customize your intercity cab booking.
      </Text>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        
        {/* Add-on Card 1: Family Trip */}
        <View className="bg-white/80 rounded-3xl p-5 mb-4 border border-white shadow-sm shadow-blue-200 flex-row items-center">
          <View className="w-16 h-16 bg-gray-100 rounded-2xl justify-center items-center mr-4">
            <MaterialCommunityIcons name="bag-suitcase" size={32} color="#6B7280" />
            <View className="absolute bottom-1 right-1 bg-white rounded-full">
              <Ionicons name="add-circle" size={18} color="#6B7280" />
            </View>
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-black font-bold text-lg">Family Trip</Text>
              <Text className="text-black font-bold text-lg">+ ₹250</Text>
            </View>
            <View className="flex-row justify-between items-end">
               <Text className="text-gray-600 text-sm leading-4 pr-2 flex-1">
                 Extra luggage space and comfortable seating for groups.
               </Text>
               <Switch 
                 value={isFamilyTrip} 
                 onValueChange={setIsFamilyTrip} 
                 trackColor={{ false: '#D1D5DB', true: '#34D399' }}
                 thumbColor="#FFFFFF"
                 ios_backgroundColor="#D1D5DB"
               />
            </View>
          </View>
        </View>

        {/* Add-on Card 2: Add a Parcel */}
        <View className="bg-white/80 rounded-3xl p-5 mb-4 border border-white shadow-sm shadow-blue-200 flex-row items-center">
          <View className="w-16 h-16 bg-gray-100 rounded-2xl justify-center items-center mr-4">
            <FontAwesome5 name="box-open" size={24} color="#6B7280" />
            <View className="absolute bottom-2 right-2">
              <MaterialCommunityIcons name="handshake" size={16} color="#6B7280" />
            </View>
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-black font-bold text-lg">Add a Parcel</Text>
              <Text className="text-black font-bold text-lg">+ ₹150</Text>
            </View>
            <View className="flex-row justify-between items-end">
               <Text className="text-gray-600 text-sm leading-4 pr-2 flex-1">
                 Send a parcel to your destination with this ride.
               </Text>
               <Switch 
                 value={isAddParcel} 
                 onValueChange={setIsAddParcel} 
                 trackColor={{ false: '#D1D5DB', true: '#34D399' }}
                 thumbColor="#FFFFFF"
                 ios_backgroundColor="#D1D5DB"
               />
            </View>
          </View>
        </View>

        {/* Add-on Card 3: Pet Friendly */}
        <View className="bg-white/80 rounded-3xl p-5 mb-8 border border-white shadow-sm shadow-blue-200 flex-row items-center">
          <View className="w-16 h-16 bg-gray-100 rounded-2xl justify-center items-center mr-4">
            <Ionicons name="paw" size={32} color="#6B7280" />
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-black font-bold text-lg">Pet Friendly</Text>
              <Text className="text-black font-bold text-lg">+ ₹200</Text>
            </View>
            <View className="flex-row justify-between items-end">
               <Text className="text-gray-600 text-sm leading-4 pr-2 flex-1">
                 Travel with your furry friends (charges apply).
               </Text>
               <Switch 
                 value={isPetFriendly} 
                 onValueChange={setIsPetFriendly} 
                 trackColor={{ false: '#D1D5DB', true: '#34D399' }}
                 thumbColor="#FFFFFF"
                 ios_backgroundColor="#D1D5DB"
               />
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Bottom Sheet Summary */}
      <View className="bg-white rounded-t-[40px] pt-4 pb-8 px-6 shadow-2xl shadow-blue-900/20">
        <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-6" />
        
        <Text className="text-black text-xl font-bold mb-4">Trip Summary & Total</Text>

        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-600 text-base">Base Trip Fare:</Text>
          <Text className="text-black text-base font-semibold">₹1,200</Text>
        </View>

        <View className="flex-row justify-between mb-6">
          <Text className="text-gray-600 text-base">Selected Add-ons:</Text>
          <Text className="text-black text-base">Family Trip (+ ₹250)</Text>
        </View>

        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-black text-xl font-extrabold">Subtotal:</Text>
          <Text className="text-black text-xl font-extrabold">₹1,450</Text>
        </View>

        <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center shadow-md shadow-blue-500/30">
          <Text className="text-white text-lg font-bold">Review & Book - Total ₹1,450</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Need to import Ionicons if we use it inside the component. Adding it here for completeness since we used it.
import { Ionicons } from '@expo/vector-icons';
