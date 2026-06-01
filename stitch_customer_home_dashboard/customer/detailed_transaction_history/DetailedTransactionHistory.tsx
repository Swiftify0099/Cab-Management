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

export default function DetailedTransactionHistory() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Transaction History</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons name="filter-variant" size={28} color="black" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="bg-white border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <TouchableOpacity className="px-6 py-4 border-b-2 border-[#1D4ED8]">
            <Text className="text-[#1D4ED8] font-bold text-base">All</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-6 py-4">
            <Text className="text-gray-500 font-medium text-base">Rides</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-6 py-4">
            <Text className="text-gray-500 font-medium text-base">Parcels</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-6 py-4">
            <Text className="text-gray-500 font-medium text-base">Hotels</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-6 py-4">
            <Text className="text-gray-500 font-medium text-base">Refunds</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Transaction 1 */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm shadow-gray-200">
          <Text className="text-gray-500 text-sm mb-3">Today, 10:45 AM</Text>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center mr-3">
                <Ionicons name="car" size={24} color="#3B82F6" />
              </View>
              <Text className="text-black text-lg font-medium">Intercity Ride to Boston</Text>
            </View>
            <View className="items-end">
              <Text className="text-[#DC2626] text-lg font-bold">- $120.50</Text>
              <Text className="text-gray-500 text-sm">Spent</Text>
            </View>
          </View>
        </View>

        {/* Transaction 2 */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm shadow-gray-200">
          <Text className="text-gray-500 text-sm mb-3">Yesterday, 4:30 PM</Text>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-green-50 rounded-full items-center justify-center mr-3">
                <Feather name="arrow-right" size={24} color="#10B981" />
              </View>
              <Text className="text-black text-lg font-medium">Wallet Top-up</Text>
            </View>
            <View className="items-end">
              <Text className="text-[#10B981] text-lg font-bold">+ $50.00</Text>
              <Text className="text-gray-500 text-sm">Added</Text>
            </View>
          </View>
        </View>

        {/* Transaction 3 */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm shadow-gray-200">
          <Text className="text-gray-500 text-sm mb-3">Nov 14, 2:15 PM</Text>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-purple-50 rounded-full items-center justify-center mr-3">
                <Feather name="box" size={24} color="#8B5CF6" />
              </View>
              <Text className="text-black text-lg font-medium">Parcel Delivery - Express</Text>
            </View>
            <View className="items-end">
              <Text className="text-[#DC2626] text-lg font-bold">- $35.20</Text>
              <Text className="text-gray-500 text-sm">Spent</Text>
            </View>
          </View>
        </View>

        {/* Transaction 4 */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm shadow-gray-200">
          <Text className="text-gray-500 text-sm mb-3">Nov 12, 9:00 AM</Text>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-orange-50 rounded-full items-center justify-center mr-3">
                <Ionicons name="bed" size={24} color="#F97316" />
              </View>
              <Text className="text-black text-lg font-medium">Hotel Booking - NYC</Text>
            </View>
            <View className="items-end">
              <Text className="text-[#DC2626] text-lg font-bold">- $245.00</Text>
              <Text className="text-gray-500 text-sm">Spent</Text>
            </View>
          </View>
        </View>

        {/* Transaction 5 */}
        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm shadow-gray-200">
          <Text className="text-gray-500 text-sm mb-3">Nov 10, 11:20 AM</Text>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Feather name="refresh-cw" size={24} color="#6B7280" />
              </View>
              <Text className="text-black text-lg font-medium leading-5 w-36">Refund - Cancelled Ride</Text>
            </View>
            <View className="items-end">
              <Text className="text-[#10B981] text-lg font-bold">+ $15.00</Text>
              <Text className="text-gray-500 text-sm">Added</Text>
            </View>
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Download Statement Button */}
      <View className="bg-white p-4 border-t border-gray-200">
        <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center shadow-sm shadow-blue-300">
          <Text className="text-white text-lg font-bold">Download Statement</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
