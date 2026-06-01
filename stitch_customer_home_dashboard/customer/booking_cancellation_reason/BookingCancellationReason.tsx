import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BookingCancellationReason() {
  const [selectedReason, setSelectedReason] = useState<string | null>('Plan changed');

  const reasons = [
    'Plan changed',
    'Wait time too long',
    'Found a better option',
    'Booked by mistake',
    'Other'
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="dark-content" />

      <ScrollView className="flex-1 px-5 pt-8" showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <Text className="text-3xl font-extrabold text-black mb-2">Cancel Trip</Text>
        <Text className="text-gray-600 text-base mb-6 leading-6">
          Please tell us why you are canceling. This helps us improve your experience.
        </Text>

        {/* Trip Details Card */}
        <View className="mb-4">
          <Text className="text-black font-bold text-lg mb-3">Trip Details</Text>
          <View className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center shadow-sm shadow-gray-200">
            {/* Mock Map Image Thumbnail */}
            <View className="w-14 h-14 bg-green-100 rounded-xl mr-4 overflow-hidden relative justify-center items-center">
               <View className="absolute w-full h-full bg-[#E5F7ED]" />
               <View className="w-4 h-4 bg-blue-400 rounded-full absolute bottom-2 left-2" />
               <View className="w-4 h-4 bg-red-500 rounded-full absolute top-2 right-2" />
               <View className="w-full h-0.5 bg-gray-400 rotate-45 absolute" />
            </View>
            <View className="flex-1">
              <Text className="text-black text-base font-medium leading-5">
                NYC to PHL - Jul 15, 10:00 AM, Intercity Bus (Booking ID: #123456)
              </Text>
            </View>
          </View>
        </View>

        {/* Cancellation Fee Warning */}
        <View className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-start shadow-sm shadow-gray-200 mb-6">
          <Ionicons name="warning" size={24} color="#F59E0B" className="mr-3" />
          <View className="flex-1">
            <Text className="text-black font-bold text-base mb-1">Cancellation Fee: $5.00</Text>
            <Text className="text-gray-600 text-sm leading-5">
              Based on our policy for cancellations within 24 hours.
            </Text>
          </View>
        </View>

        {/* Select a Reason */}
        <Text className="text-black font-bold text-lg mb-3">Select a Reason</Text>
        
        <View className="mb-6">
          {reasons.map((reason, index) => (
            <TouchableOpacity 
              key={index} 
              className="flex-row items-center py-3"
              onPress={() => setSelectedReason(reason)}
            >
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${selectedReason === reason ? 'border-blue-500' : 'border-gray-300'}`}>
                {selectedReason === reason && (
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                )}
              </View>
              <Text className="text-black text-lg">{reason}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-gray-500 text-sm mb-8">
          By confirming, you accept the cancellation fee.
        </Text>
        
        {/* We add bottom padding to scrollview so buttons are visible if screen is small */}
        <View className="h-4" />
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-5 pb-8 pt-4 bg-white border-t border-gray-100">
        <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center mb-3 shadow-md shadow-blue-500/30">
          <Text className="text-white text-lg font-bold">Keep Booking</Text>
        </TouchableOpacity>

        <TouchableOpacity className="w-full bg-[#DC2626] py-4 rounded-xl items-center shadow-md shadow-red-500/30">
          <Text className="text-white text-lg font-bold">Confirm Cancellation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
