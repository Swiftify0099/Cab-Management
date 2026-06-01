import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function FuelExpenseTracker() {
  return (
    <SafeAreaView className="flex-1 bg-[#0A0E17]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4 bg-[#0A0E17]">
        <TouchableOpacity className="flex-row items-center">
          <Feather name="chevron-left" size={28} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-lg font-medium ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Expense Logger</Text>
        <View className="w-16" /> {/* Placeholder for balance */}
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Net Profit Summary Card */}
        <View className="bg-[#151B2B] rounded-2xl p-5 mb-8 border border-white/5">
          <Text className="text-white text-base mb-1">Today's Net Profit</Text>
          <Text className="text-[#10B981] text-5xl font-extrabold tracking-tight mb-2">$125.50</Text>
          <Text className="text-gray-400 text-sm mb-4">Earnings: $185.50 | Expenses: $60.00</Text>

          {/* Progress / Ratio Bar */}
          <View className="h-2 w-full bg-[#1E293B] rounded-full flex-row overflow-hidden">
             {/* Profit portion */}
             <View className="h-full bg-[#10B981] rounded-full" style={{ width: '65%' }} />
             {/* Expense portion (implicit by remaining dark space) */}
          </View>
        </View>

        {/* Expense Inputs Section */}
        <Text className="text-white text-2xl font-bold mb-5">Add Expenses</Text>

        {/* Input 1: Fuel Cost */}
        <View className="mb-4">
          <Text className="text-white text-base font-bold mb-2">Fuel Cost ($)</Text>
          <View className="bg-[#151B2B] rounded-xl border border-white/10 px-4 py-4">
            <TextInput 
              value="$45.00"
              className="text-gray-400 text-lg"
              placeholderTextColor="#4B5563"
              editable={false} // Read-only for visual mock
            />
          </View>
        </View>

        {/* Input 2: Toll Fees */}
        <View className="mb-4">
          <Text className="text-white text-base font-bold mb-2">Toll Fees ($)</Text>
          <View className="bg-[#151B2B] rounded-xl border border-white/10 px-4 py-4">
            <TextInput 
              value="$15.00"
              className="text-gray-400 text-lg"
              placeholderTextColor="#4B5563"
              editable={false}
            />
          </View>
        </View>

        {/* Input 3: Maintenance Cost */}
        <View className="mb-6">
          <Text className="text-white text-base font-bold mb-2">Maintenance Cost ($)</Text>
          <View className="bg-[#151B2B] rounded-xl border border-white/10 px-4 py-4">
            <TextInput 
              value="$0.00"
              className="text-gray-400 text-lg"
              placeholderTextColor="#4B5563"
              editable={false}
            />
          </View>
        </View>

        {/* Scan Receipt Button */}
        <TouchableOpacity className="bg-[#1E293B] rounded-2xl p-5 flex-row items-center border border-white/5 shadow-sm shadow-blue-900 mb-8">
          <View className="mr-4">
             <Ionicons name="camera" size={32} color="#3B82F6" />
          </View>
          <View>
            <Text className="text-white text-lg font-bold">Scan Receipt</Text>
            <Text className="text-gray-400 text-sm">Tap to capture and attach a photo.</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* Save Button Fixed Bottom */}
      <View className="px-5 pb-8 pt-4 bg-[#0A0E17]">
        <TouchableOpacity className="w-full bg-[#3B82F6] py-4 rounded-xl items-center shadow-lg shadow-blue-500/20">
          <Text className="text-white text-lg font-bold">Save Expense Log</Text>
        </TouchableOpacity>
        
        {/* Home indicator mock line for iOS */}
        <View className="w-32 h-1 bg-white rounded-full self-center mt-6" />
      </View>
    </SafeAreaView>
  );
}
