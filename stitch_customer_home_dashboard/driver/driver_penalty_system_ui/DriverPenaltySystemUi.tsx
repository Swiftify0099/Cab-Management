import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverPenaltySystemUi() {
  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4 bg-white border-b border-gray-100">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-black">Penalty & Fine Management</Text>
        <TouchableOpacity className="items-center">
          <Feather name="more-horizontal" size={24} color="#2563EB" />
          <Text className="text-[#2563EB] text-[10px] mt-0.5 font-medium">Options</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        
        {/* Top Summary Card */}
        <View className="bg-[#F3F4F6] rounded-2xl p-5 mt-5 mb-6 border border-gray-200">
          <View className="flex-row items-center mb-2">
            <Text className="text-black text-lg mr-2">Current Month Penalties:</Text>
            <Text className="text-[#DC2626] text-lg font-bold">$75.00</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-black text-lg mr-2">Affected Monthly Payout:</Text>
            <Text className="text-[#DC2626] text-lg font-bold">-$75.00</Text>
          </View>
        </View>

        {/* Recent Penalties Section */}
        <View className="flex-row items-center mb-4 px-1">
          <Text className="text-2xl font-bold text-black mr-2">Recent Penalties</Text>
          <Ionicons name="filter" size={20} color="#3B82F6" />
        </View>

        <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden mb-8">
          
          {/* Penalty Item 1 */}
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-black text-lg font-bold">Late Arrival</Text>
              <Text className="text-[#DC2626] text-lg font-bold">-$15.00</Text>
            </View>
            <Text className="text-gray-800 text-base">Oct 25, 2023</Text>
            <Text className="text-gray-800 text-base mb-4">Trip #1043 - 15 min late</Text>
            
            <View className="flex-row justify-between items-center mt-2">
              <TouchableOpacity className="border border-[#3B82F6] px-4 py-2 rounded-full flex-row items-center">
                <MaterialCommunityIcons name="file-document-edit-outline" size={16} color="#3B82F6" className="mr-1" />
                <Text className="text-[#3B82F6] font-semibold">Dispute Penalty</Text>
              </TouchableOpacity>
              <Text className="text-black">Status: <Text className="text-[#F59E0B] font-semibold">Pending Review</Text></Text>
            </View>
          </View>

          {/* Penalty Item 2 */}
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-black text-lg font-bold">Customer Complaint</Text>
              <Text className="text-[#DC2626] text-lg font-bold">-$50.00</Text>
            </View>
            <Text className="text-gray-800 text-base">Oct 22, 2023</Text>
            <Text className="text-gray-800 text-base mb-4">Trip #1021 - Unprofessional conduct</Text>
            
            <View className="flex-row justify-between items-center mt-2">
              <TouchableOpacity className="border border-[#3B82F6] px-4 py-2 rounded-full flex-row items-center">
                <MaterialCommunityIcons name="file-document-edit-outline" size={16} color="#3B82F6" className="mr-1" />
                <Text className="text-[#3B82F6] font-semibold">Dispute Penalty</Text>
              </TouchableOpacity>
              <Text className="text-black">Status: <Text className="text-[#DC2626] font-semibold">Finalized</Text></Text>
            </View>
          </View>

          {/* Penalty Item 3 */}
          <View className="p-4">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-black text-lg font-bold">System Error</Text>
              <Text className="text-[#DC2626] text-lg font-bold">-$10.00</Text>
            </View>
            <Text className="text-gray-800 text-base">Oct 18, 2023</Text>
            <Text className="text-gray-800 text-base mb-4">Trip #1005 - GPS issue</Text>
            
            <View className="flex-row justify-between items-center mt-2">
              <TouchableOpacity className="border border-[#3B82F6] px-4 py-2 rounded-full flex-row items-center">
                <MaterialCommunityIcons name="file-document-edit-outline" size={16} color="#3B82F6" className="mr-1" />
                <Text className="text-[#3B82F6] font-semibold">Dispute Penalty</Text>
              </TouchableOpacity>
              <Text className="text-black">Status: <Text className="text-[#10B981] font-semibold">Resolved</Text></Text>
            </View>
          </View>

        </View>

        {/* How Penalties Affect Payout Section */}
        <Text className="text-xl font-bold text-black mb-4 px-1">How Penalties Affect Payout</Text>
        <View className="px-1 mb-8">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-700 text-base">Base Earnings:</Text>
            <Text className="text-black text-base">$2,450.00</Text>
          </View>
          <View className="flex-row justify-between mb-4 border-b border-gray-200 pb-4">
            <Text className="text-gray-700 text-base">Total Deductions:</Text>
            <Text className="text-black text-base">-$75.00</Text>
          </View>
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-black font-bold text-lg">Estimated Net Payout:</Text>
            <Text className="text-black font-bold text-lg">$2,375.00</Text>
          </View>
        </View>
        
        {/* Padding for Bottom Nav */}
        <View className="h-10" />
      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-2 pb-6">
        <TouchableOpacity className="items-center py-2 px-4">
          <Feather name="home" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center py-2 px-4">
          <Feather name="dollar-sign" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center py-2 px-4 border-t-2 border-[#3B82F6] -mt-[2px]">
          <MaterialCommunityIcons name="receipt" size={24} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-xs mt-1 font-medium">Penalties</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center py-2 px-4">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
