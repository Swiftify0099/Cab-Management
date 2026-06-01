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

export default function RefundStatusTracker() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-gray-200 bg-white shadow-sm shadow-gray-100 z-10">
        <TouchableOpacity className="mr-4">
          <Feather name="chevron-left" size={28} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center mr-4">Refund Status</Text>
        <TouchableOpacity>
           <Text className="text-[#2563EB] font-medium">Help</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="px-4 py-4 bg-white border-b border-gray-200">
         <View className="bg-gray-100 rounded-xl p-1 flex-row">
            <TouchableOpacity className="flex-1 bg-white py-2 rounded-lg items-center shadow-sm shadow-gray-300">
               <Text className="text-[#2563EB] font-bold">Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-2 rounded-lg items-center">
               <Text className="text-gray-500 font-medium">Completed</Text>
            </TouchableOpacity>
         </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* Pending Refund Card */}
        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm shadow-gray-200 border border-gray-100">
           
           <View className="flex-row justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <View className="flex-row">
                 <MaterialCommunityIcons name="bed-outline" size={24} color="#64748B" className="mr-3" />
                 <View>
                    <Text className="text-[#0F172A] text-base font-bold mb-1">Trip to Boston - Oct 26</Text>
                    <View className="bg-[#2563EB] self-start px-2 py-0.5 rounded-md">
                       <Text className="text-white text-xs font-bold">In Progress</Text>
                    </View>
                 </View>
              </View>
              <Text className="text-[#2563EB] text-xl font-bold">$45.00</Text>
           </View>

           {/* Timeline */}
           <View className="px-2">
              
              <View className="flex-row relative mb-6">
                 <View className="items-center mr-4 z-10">
                    <View className="w-6 h-6 rounded-full bg-[#2563EB] items-center justify-center">
                       <Feather name="check" size={14} color="white" />
                    </View>
                    <View className="w-0.5 h-full bg-[#2563EB] absolute top-6" />
                 </View>
                 <View className="flex-1 pb-2">
                    <Text className="text-[#0F172A] text-base font-bold">Refund Initiated</Text>
                    <Text className="text-gray-500 text-sm">Oct 26, 10:30 AM</Text>
                 </View>
              </View>

              <View className="flex-row relative mb-6">
                 <View className="items-center mr-4 z-10">
                    <View className="w-6 h-6 rounded-full bg-[#2563EB] items-center justify-center">
                       <Feather name="check" size={14} color="white" />
                    </View>
                    <View className="w-0.5 h-full bg-gray-300 absolute top-6" />
                 </View>
                 <View className="flex-1 pb-2">
                    <Text className="text-[#0F172A] text-base font-bold">Processed by Bank</Text>
                    <Text className="text-gray-500 text-sm">Oct 27, 2:15 PM</Text>
                 </View>
              </View>

              <View className="flex-row relative">
                 <View className="items-center mr-4 z-10">
                    <View className="w-6 h-6 rounded-full bg-white border-4 border-gray-400 items-center justify-center" />
                 </View>
                 <View className="flex-1">
                    <Text className="text-gray-400 text-base font-bold">Credited to Wallet</Text>
                    <Text className="text-gray-400 text-sm">Estimated Oct 28</Text>
                 </View>
              </View>

           </View>
        </View>

        {/* Completed Refund Card */}
        <View className="bg-white rounded-2xl p-5 mb-8 shadow-sm shadow-gray-200 border border-gray-100">
           
           <View className="flex-row justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <View className="flex-row">
                 <MaterialCommunityIcons name="bed-outline" size={24} color="#64748B" className="mr-3" />
                 <View>
                    <Text className="text-[#0F172A] text-base font-bold mb-1">Trip to New York - Oct 15</Text>
                    <View className="bg-[#10B981] self-start px-2 py-0.5 rounded-md">
                       <Text className="text-white text-xs font-bold">Completed</Text>
                    </View>
                 </View>
              </View>
              <Text className="text-[#10B981] text-xl font-bold">$120.00</Text>
           </View>

           {/* Timeline */}
           <View className="px-2">
              
              <View className="flex-row relative mb-6">
                 <View className="items-center mr-4 z-10">
                    <View className="w-6 h-6 rounded-full bg-[#10B981] items-center justify-center">
                       <Feather name="check" size={14} color="white" />
                    </View>
                    <View className="w-0.5 h-full bg-[#10B981] absolute top-6" />
                 </View>
                 <View className="flex-1 pb-2">
                    <Text className="text-[#0F172A] text-base font-bold">Refund Initiated</Text>
                    <Text className="text-[#0F172A] text-sm">Oct 15, 4:00 PM</Text>
                 </View>
              </View>

              <View className="flex-row relative mb-6">
                 <View className="items-center mr-4 z-10">
                    <View className="w-6 h-6 rounded-full bg-[#10B981] items-center justify-center">
                       <Feather name="check" size={14} color="white" />
                    </View>
                    <View className="w-0.5 h-full bg-[#10B981] absolute top-6" />
                 </View>
                 <View className="flex-1 pb-2">
                    <Text className="text-[#0F172A] text-base font-bold">Processed by Bank</Text>
                    <Text className="text-[#0F172A] text-sm">Oct 16, 9:00 AM</Text>
                 </View>
              </View>

              <View className="flex-row relative">
                 <View className="items-center mr-4 z-10">
                    <View className="w-6 h-6 rounded-full bg-[#10B981] items-center justify-center">
                       <Feather name="check" size={14} color="white" />
                    </View>
                 </View>
                 <View className="flex-1">
                    <Text className="text-[#0F172A] text-base font-bold">Credited to Wallet</Text>
                    <Text className="text-[#0F172A] text-sm">Oct 16, 11:45 AM</Text>
                 </View>
              </View>

           </View>
        </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#64748B" />
          <Text className="text-gray-500 text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="wallet" size={24} color="#2563EB" />
          <Text className="text-[#2563EB] text-xs mt-1 font-semibold">Wallet</Text>
          <View className="absolute -bottom-3 w-8 h-1 bg-[#2563EB] rounded-t-md" />
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="bag-suitcase-outline" size={24} color="#64748B" />
          <Text className="text-gray-500 text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#64748B" />
          <Text className="text-gray-500 text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
