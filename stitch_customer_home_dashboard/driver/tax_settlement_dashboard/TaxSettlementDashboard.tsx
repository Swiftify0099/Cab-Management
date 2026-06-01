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

export default function TaxSettlementDashboard() {
  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center">
        <TouchableOpacity className="w-10">
          <Feather name="arrow-left" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center">Tax & Settlement</Text>
        <TouchableOpacity className="w-10 items-end">
           <Ionicons name="person-circle" size={32} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200 mb-4">
         <TouchableOpacity className="flex-1 items-center pb-3 border-b-2 border-[#1D4ED8]">
            <Text className="text-[#1D4ED8] font-medium text-base">Yearly</Text>
         </TouchableOpacity>
         <TouchableOpacity className="flex-1 items-center pb-3 border-b-2 border-transparent">
            <Text className="text-gray-500 font-medium text-base">Monthly</Text>
         </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
         
         <Text className="text-[#0F172A] text-xl font-bold mb-4">FY 2023-2024</Text>

         {/* Grid Cards */}
         <View className="flex-row flex-wrap justify-between mb-6">
            
            {/* Card 1 */}
            <View className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100">
               <Text className="text-gray-600 text-sm mb-1">TDS Deducted</Text>
               <Text className="text-[#0F172A] text-2xl font-bold mb-1 tracking-tight">₹12,450.00</Text>
               <Text className="text-gray-500 text-xs">1% on Earnings</Text>
            </View>

            {/* Card 2 */}
            <View className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100">
               <Text className="text-gray-600 text-sm mb-1">GST Collected <Text className="text-xs text-gray-400">(if applicable)</Text></Text>
               <Text className="text-[#0F172A] text-2xl font-bold mb-1 tracking-tight">₹4,200.00</Text>
               <Text className="text-gray-500 text-xs">Including Cess</Text>
            </View>

            {/* Card 3 */}
            <View className="w-[48%] bg-white rounded-2xl p-4 shadow-sm shadow-gray-200 border border-gray-100">
               <Text className="text-gray-600 text-sm mb-1">GST Collected</Text>
               <Text className="text-[#0F172A] text-2xl font-bold mb-1 tracking-tight">₹4,000.00</Text>
               <Text className="text-gray-500 text-xs">After Earnings</Text>
            </View>

            {/* Card 4 */}
            <View className="w-[48%] bg-white rounded-2xl p-4 shadow-sm shadow-gray-200 border border-gray-100">
               <Text className="text-gray-600 text-sm mb-1">Net Take-home</Text>
               <Text className="text-[#0F172A] text-2xl font-bold mb-1 tracking-tight">₹4,58,900.00</Text>
               <Text className="text-gray-500 text-xs leading-4 mt-1">After ₹56,100 Platform Fees</Text>
            </View>

         </View>

         <Text className="text-[#0F172A] text-xl font-bold mb-4">Monthly Breakdown</Text>

         {/* Table Mock */}
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden mb-6">
            
            {/* Table Header */}
            <View className="flex-row items-center px-4 py-3 bg-[#F8FAFC] border-b border-gray-200">
               <Text className="flex-1 font-semibold text-[#0F172A] text-sm">Month</Text>
               <Text className="flex-1 font-semibold text-[#0F172A] text-sm">Status</Text>
               <Text className="flex-[1.2] font-semibold text-[#0F172A] text-sm">Net Earnings</Text>
               <Text className="flex-[1.2] font-semibold text-[#0F172A] text-sm text-center">Action</Text>
            </View>

            {/* Row 1 */}
            <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
               <Text className="flex-1 text-[#0F172A] text-base">Oct 2023</Text>
               <View className="flex-1 flex-row items-center">
                  <View className="w-5 h-5 bg-[#22C55E] rounded-full items-center justify-center mr-1.5">
                     <Feather name="check" size={12} color="white" />
                  </View>
                  <Text className="text-[#0F172A] text-sm">Settled</Text>
               </View>
               <Text className="flex-[1.2] text-[#0F172A] text-sm">₹42,500.00</Text>
               <TouchableOpacity className="flex-[1.2] bg-[#3B82F6] rounded-md py-2 px-2 flex-row items-center justify-center">
                  <Feather name="download" size={14} color="white" className="mr-1" />
                  <Text className="text-white text-xs text-center leading-3">Download{'\n'}Invoice</Text>
               </TouchableOpacity>
            </View>

            {/* Row 2 */}
            <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
               <Text className="flex-1 text-[#0F172A] text-base">Sep 2023</Text>
               <View className="flex-1 flex-row items-center">
                  <View className="w-5 h-5 bg-[#22C55E] rounded-full items-center justify-center mr-1.5">
                     <Feather name="check" size={12} color="white" />
                  </View>
                  <Text className="text-[#0F172A] text-sm">Settled</Text>
               </View>
               <Text className="flex-[1.2] text-[#0F172A] text-sm">₹40,150.00</Text>
               <TouchableOpacity className="flex-[1.2] bg-[#3B82F6] rounded-md py-2 px-2 flex-row items-center justify-center">
                  <Feather name="download" size={14} color="white" className="mr-1" />
                  <Text className="text-white text-xs text-center leading-3">Download{'\n'}Invoice</Text>
               </TouchableOpacity>
            </View>

            {/* Row 3 */}
            <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
               <Text className="flex-1 text-[#0F172A] text-base">Aug 2023</Text>
               <View className="flex-1 flex-row items-center">
                  <View className="w-5 h-5 bg-[#22C55E] rounded-full items-center justify-center mr-1.5">
                     <Feather name="check" size={12} color="white" />
                  </View>
                  <Text className="text-[#0F172A] text-sm">Settled</Text>
               </View>
               <Text className="flex-[1.2] text-[#0F172A] text-sm">₹38,900.00</Text>
               <TouchableOpacity className="flex-[1.2] bg-[#3B82F6] rounded-md py-2 px-2 flex-row items-center justify-center">
                  <Feather name="download" size={14} color="white" className="mr-1" />
                  <Text className="text-white text-xs text-center leading-3">Download{'\n'}Invoice</Text>
               </TouchableOpacity>
            </View>

            {/* Row 4 */}
            <View className="flex-row items-center px-4 py-4">
               <Text className="flex-1 text-[#0F172A] text-base">Jul 2023</Text>
               <View className="flex-1 flex-row items-center">
                  <View className="w-5 h-5 bg-[#22C55E] rounded-full items-center justify-center mr-1.5">
                     <Feather name="check" size={12} color="white" />
                  </View>
                  <Text className="text-[#0F172A] text-sm">Settled</Text>
               </View>
               <Text className="flex-[1.2] text-[#0F172A] text-sm">₹41,200.00</Text>
               <TouchableOpacity className="flex-[1.2] bg-[#3B82F6] rounded-md py-2 px-2 flex-row items-center justify-center">
                  <Feather name="download" size={14} color="white" className="mr-1" />
                  <Text className="text-white text-xs text-center leading-3">Download{'\n'}Invoice</Text>
               </TouchableOpacity>
            </View>

         </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-2 pb-8 absolute bottom-0 w-full z-20">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="car-multiple" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="currency-usd" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center relative">
          <View className="absolute -top-3 w-12 h-1 bg-[#3B82F6] rounded-full" />
          <MaterialCommunityIcons name="file-document-outline" size={26} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-xs mt-1 font-semibold">Tax & Settlement</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="more-horizontal" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
