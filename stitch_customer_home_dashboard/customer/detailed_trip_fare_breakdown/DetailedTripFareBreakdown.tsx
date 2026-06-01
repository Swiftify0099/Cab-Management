import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DetailedTripFareBreakdown() {
  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 flex-row items-center justify-between shadow-sm shadow-gray-100 z-10 relative">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="#1E3A8A" />
        </TouchableOpacity>
        <Text className="text-[#1E3A8A] text-xl font-bold">Trip Breakdown</Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* Trip Meta info */}
        <Text className="text-black text-lg mb-6 px-1 leading-7">
          Trip ID: #40928 | San Francisco - Los Angeles | Oct 26, 2023
        </Text>

        {/* Breakdown Card */}
        <View className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200 border border-gray-100">
          
          <Text className="text-black text-2xl font-bold mb-8">Commission & Tax Breakdown</Text>
          
          {/* Gross Fare */}
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <View className="flex-row items-center mb-1">
                <Text className="text-black text-xl mr-2">Gross Fare</Text>
                <Feather name="info" size={16} color="#9CA3AF" />
              </View>
              <Text className="text-gray-500 text-sm">(Total collected from passenger)</Text>
            </View>
            <Text className="text-black text-2xl font-extrabold">$1,250.00</Text>
          </View>

          <View className="h-[1px] w-full bg-gray-200 mb-6" />

          {/* Platform Commission */}
          <View className="flex-row justify-between items-start mb-6">
            <View className="w-2/3">
              <View className="flex-row items-center mb-1">
                <Text className="text-black text-xl mr-2 leading-7">Platform Commission (SaaS Fee)</Text>
                <Feather name="info" size={16} color="#9CA3AF" />
              </View>
            </View>
            <View className="items-end">
              <Text className="text-[#DC2626] text-2xl font-extrabold">-$187.50</Text>
              <Text className="text-gray-500 text-sm">(15%)</Text>
            </View>
          </View>

          <View className="h-[1px] w-full bg-gray-100 mb-6 border border-dashed border-gray-300" />

          {/* Tax Deducted */}
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <View className="flex-row items-center mb-1">
                <Text className="text-black text-xl mr-2">Tax Deducted (TDS)</Text>
                <Feather name="info" size={16} color="#9CA3AF" />
              </View>
            </View>
            <View className="items-end">
              <Text className="text-[#DC2626] text-2xl font-extrabold">-$25.00</Text>
              <Text className="text-gray-500 text-sm">(2%)</Text>
            </View>
          </View>

          <View className="h-[1px] w-full bg-gray-100 mb-6 border border-dashed border-gray-300" />

          {/* Toll Reimbursement */}
          <View className="flex-row justify-between items-start mb-8">
            <View>
              <View className="flex-row items-center mb-1">
                <Text className="text-black text-xl mr-2">Toll Reimbursement</Text>
                <Feather name="info" size={16} color="#9CA3AF" />
              </View>
            </View>
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="toll" size={24} color="#10B981" className="mr-1" />
              <Text className="text-[#10B981] text-2xl font-bold">+$45.00</Text>
            </View>
          </View>

          <View className="h-1 w-full bg-gray-200 mb-6" />

          {/* Net Payout */}
          <View className="flex-row justify-between items-start">
            <View>
              <View className="flex-row items-center mb-1">
                <Text className="text-black text-2xl font-extrabold mr-2">Net Payout</Text>
                <Feather name="info" size={16} color="#9CA3AF" />
              </View>
              <Text className="text-gray-500 text-sm">(Amount transferred to bank)</Text>
            </View>
            <Text className="text-[#10B981] text-3xl font-extrabold">$1,082.50</Text>
          </View>

        </View>

        <View className="h-10" />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View className="bg-[#F9FAFB] px-5 py-4 pb-8">
        <TouchableOpacity className="w-full bg-[#3B82F6] py-4 rounded-full items-center shadow-sm shadow-blue-400">
          <Text className="text-white text-lg font-bold">Help with this Fare</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
