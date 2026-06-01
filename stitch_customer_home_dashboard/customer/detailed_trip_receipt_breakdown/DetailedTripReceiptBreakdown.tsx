import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';

export default function DetailedTripReceiptBreakdown() {
  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      <StatusBar barStyle="dark-content" />

      <ScrollView className="flex-1 px-5 pt-12" showsVerticalScrollIndicator={false}>
        
        <Text className="text-black text-3xl font-extrabold text-center mb-8 leading-10">
          Detailed Trip Receipt{'\n'}Breakdown
        </Text>

        <Text className="text-black text-6xl font-black text-center mb-12">
          $124.50
        </Text>

        {/* Breakdown Card */}
        <View className="bg-white rounded-2xl shadow-sm shadow-gray-200">
          
          <View className="flex-row justify-between p-5 border-b border-gray-100">
            <Text className="text-black text-lg">Base Fare</Text>
            <Text className="text-black text-lg font-medium">$50.00</Text>
          </View>
          
          <View className="flex-row justify-between p-5 border-b border-gray-100">
            <Text className="text-black text-lg">Distance Premium</Text>
            <Text className="text-black text-lg font-medium">$35.00</Text>
          </View>
          
          <View className="flex-row justify-between p-5 border-b border-gray-100">
            <Text className="text-black text-lg">Platform Fee</Text>
            <Text className="text-black text-lg font-medium">$15.00</Text>
          </View>
          
          <View className="flex-row justify-between p-5 border-b border-gray-100">
            <Text className="text-black text-lg">Insurance Coverage</Text>
            <Text className="text-black text-lg font-medium">$10.00</Text>
          </View>
          
          <View className="flex-row justify-between p-5">
            <Text className="text-black text-lg">Tolls & Taxes</Text>
            <Text className="text-black text-lg font-medium">$14.50</Text>
          </View>

        </View>

      </ScrollView>

      {/* Action Buttons */}
      <View className="px-5 py-6 flex-row justify-between">
        <TouchableOpacity className="flex-1 bg-white py-4 rounded-xl items-center mr-2 shadow-sm shadow-gray-200">
          <Text className="text-black text-lg font-bold">Download PDF</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="flex-1 bg-white py-4 rounded-xl items-center ml-2 shadow-sm shadow-gray-200">
          <Text className="text-black text-lg font-bold">Email Receipt</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
