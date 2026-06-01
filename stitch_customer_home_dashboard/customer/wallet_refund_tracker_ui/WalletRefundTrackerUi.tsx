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

export default function WalletRefundTrackerUi() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center bg-white shadow-sm shadow-gray-100 border-b border-gray-100 z-10 relative">
        <TouchableOpacity className="w-10">
          <Feather name="chevron-left" size={32} color="#1D4ED8" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center">Wallet & Refunds</Text>
        <TouchableOpacity className="w-10 items-end">
           <Feather name="filter" size={24} color="#1D4ED8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
         
         {/* Wallet Balance Card */}
         <View className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200 border border-gray-100 mb-6 mt-2">
            <Text className="text-[#0F172A] text-lg font-bold mb-1">Wallet Balance</Text>
            <Text className="text-[#0F172A] text-5xl font-extrabold mb-3">$185.40</Text>
            <View className="bg-[#F1F5F9] self-start px-3 py-1.5 rounded-lg border border-gray-200">
               <Text className="text-[#334155] font-medium text-sm">Available for booking</Text>
            </View>
         </View>

         <Text className="text-[#0F172A] text-xl font-bold mb-4">Refund Status</Text>

         {/* Refund List Card */}
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
            
            {/* Refund Item 1 */}
            <View className="p-5 border-b border-gray-100">
               <Text className="text-gray-500 text-sm mb-1">Oct 26, 2023</Text>
               <View className="flex-row justify-between mb-6">
                  <Text className="text-[#0F172A] text-lg font-medium">Trip to San Francisco - Cancelled</Text>
                  <Text className="text-[#16A34A] text-lg font-bold">+$45.00</Text>
               </View>

               {/* Status Timeline */}
               <View className="flex-row justify-between items-center px-4 relative">
                  {/* Progress Line */}
                  <View className="absolute left-[10%] right-[10%] top-[12px] h-[3px] bg-[#16A34A] z-0" />
                  
                  <View className="items-center z-10 w-20">
                     <View className="w-6 h-6 rounded-full bg-[#16A34A] items-center justify-center mb-2">
                        <Feather name="check" size={14} color="white" />
                     </View>
                     <Text className="text-[#0F172A] text-sm">Initiated</Text>
                  </View>
                  <View className="items-center z-10 w-24">
                     <View className="w-6 h-6 rounded-full bg-[#16A34A] items-center justify-center mb-2 border-2 border-white">
                        <Feather name="check" size={14} color="white" />
                     </View>
                     <Text className="text-[#0F172A] text-sm text-center leading-4">Bank{'\n'}Processing</Text>
                  </View>
                  <View className="items-center z-10 w-20">
                     <View className="w-6 h-6 rounded-full bg-[#16A34A] mb-2 border-2 border-white shadow-sm shadow-black/20" />
                     <Text className="text-[#0F172A] text-sm text-center leading-4">Credited{'\n'}to Wallet</Text>
                  </View>
               </View>
            </View>

            {/* Refund Item 2 */}
            <View className="p-5 border-b border-gray-100">
               <Text className="text-gray-500 text-sm mb-1">Oct 24, 2023</Text>
               <View className="flex-row justify-between mb-6">
                  <Text className="text-[#0F172A] text-lg font-medium">Trip to Los Angeles - Cancelled</Text>
                  <Text className="text-[#0F172A] text-lg font-bold">$120.50</Text>
               </View>

               {/* Status Timeline */}
               <View className="flex-row justify-between items-center px-4 relative">
                  {/* Progress Line */}
                  <View className="absolute left-[10%] right-[50%] top-[12px] h-[3px] bg-[#16A34A] z-0" />
                  <View className="absolute left-[50%] right-[10%] top-[12px] h-[3px] bg-[#E2E8F0] z-0" />
                  
                  <View className="items-center z-10 w-20">
                     <View className="w-6 h-6 rounded-full bg-[#16A34A] items-center justify-center mb-2">
                        <Feather name="check" size={14} color="white" />
                     </View>
                     <Text className="text-[#0F172A] text-sm">Initiated</Text>
                  </View>
                  <View className="items-center z-10 w-24">
                     <View className="relative items-center justify-center mb-2">
                        <View className="absolute -inset-2 rounded-full border-2 border-[#F59E0B] opacity-30" />
                        <View className="absolute -inset-1 rounded-full border-2 border-[#F59E0B] opacity-60" />
                        <View className="w-6 h-6 rounded-full bg-[#F59E0B] items-center justify-center border-2 border-white shadow-sm shadow-orange-500">
                           <Feather name="clock" size={12} color="white" />
                        </View>
                     </View>
                     <Text className="text-[#0F172A] text-sm text-center leading-4">Bank{'\n'}Processing</Text>
                  </View>
                  <View className="items-center z-10 w-20">
                     <View className="w-6 h-6 rounded-full bg-[#CBD5E1] mb-2 border-2 border-white" />
                     <Text className="text-gray-400 text-sm text-center leading-4">Credited{'\n'}to Wallet</Text>
                  </View>
               </View>
            </View>

            {/* Refund Item 3 */}
            <View className="p-5">
               <Text className="text-gray-500 text-sm mb-1">Oct 23, 2023</Text>
               <View className="flex-row justify-between mb-6">
                  <Text className="text-[#0F172A] text-lg font-medium">Trip to Las Vegas - Cancelled</Text>
                  <Text className="text-[#0F172A] text-lg font-bold">$85.20</Text>
               </View>

               {/* Status Timeline */}
               <View className="flex-row justify-between items-center px-4 relative">
                  {/* Progress Line */}
                  <View className="absolute left-[10%] right-[10%] top-[12px] h-[3px] bg-[#E2E8F0] z-0" />
                  
                  <View className="items-center z-10 w-20">
                     <View className="relative items-center justify-center mb-2">
                        <View className="absolute -inset-2 rounded-full border-2 border-[#F97316] opacity-30" />
                        <View className="absolute -inset-1 rounded-full border-2 border-[#F97316] opacity-60" />
                        <View className="w-6 h-6 rounded-full bg-[#F97316] items-center justify-center border-2 border-white shadow-sm shadow-orange-500" />
                     </View>
                     <Text className="text-[#0F172A] text-sm text-center leading-4">Refund{'\n'}Initiated</Text>
                  </View>
                  <View className="items-center z-10 w-24">
                     <View className="w-6 h-6 rounded-full bg-[#CBD5E1] mb-2 border-2 border-white" />
                     <Text className="text-gray-400 text-sm text-center leading-4">Bank{'\n'}Processing</Text>
                  </View>
                  <View className="items-center z-10 w-20">
                     <View className="w-6 h-6 rounded-full bg-[#CBD5E1] mb-2 border-2 border-white" />
                     <Text className="text-gray-400 text-sm text-center leading-4">Credited{'\n'}to Wallet</Text>
                  </View>
               </View>
            </View>

         </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8 absolute bottom-0 w-full z-20">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={26} color="#64748B" />
          <Text className="text-[#64748B] text-xs mt-1 font-semibold">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="car-multiple" size={28} color="#64748B" className="-mt-1" />
          <Text className="text-[#64748B] text-xs mt-0.5">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="wallet" size={26} color="#1D4ED8" />
          <Text className="text-[#1D4ED8] text-xs mt-1 font-semibold">Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={26} color="#64748B" />
          <Text className="text-[#64748B] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
