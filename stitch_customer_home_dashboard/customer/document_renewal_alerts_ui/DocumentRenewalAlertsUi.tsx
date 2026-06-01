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

export default function DocumentRenewalAlertsUi() {
  return (
    <SafeAreaView className="flex-1 bg-[#1E293B]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center z-10">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-6">Document Renewal Alerts</Text>
      </View>

      {/* Abstract Background */}
      <View className="absolute inset-0 z-0">
         <View className="absolute top-20 right-0 w-64 h-64 bg-teal-800/30 rounded-full blur-3xl" />
         <View className="absolute bottom-20 left-0 w-64 h-64 bg-emerald-800/30 rounded-full blur-3xl" />
      </View>

      <ScrollView className="flex-1 px-4 z-10" showsVerticalScrollIndicator={false}>
        
        {/* Expired Document */}
        <View className="mb-5 rounded-2xl bg-[#334155]/80 border-2 border-red-500 overflow-hidden relative shadow-lg shadow-red-500/50">
           {/* Red Glow */}
           <View className="absolute inset-0 bg-red-500/10" />
           
           <View className="p-5">
              <View className="flex-row items-center mb-3">
                 <View className="w-10 h-10 rounded-lg bg-red-500/20 items-center justify-center border border-red-500/50 mr-3">
                    <MaterialCommunityIcons name="shield-car" size={24} color="#EF4444" />
                 </View>
                 <Text className="text-white text-xl font-bold">Vehicle Insurance</Text>
              </View>
              
              <Text className="text-gray-300 text-base mb-4">
                 Status: <Text className="text-red-400 font-bold">EXPIRED</Text> on Oct 15, 2023
              </Text>
              
              <TouchableOpacity className="bg-[#EF4444] py-3 rounded-xl flex-row items-center justify-center">
                 <Text className="text-white font-bold text-lg mr-2">Renew Now</Text>
                 <Feather name="arrow-right" size={20} color="white" />
              </TouchableOpacity>
           </View>
        </View>

        {/* Expiring Soon Document */}
        <View className="mb-5 rounded-2xl bg-[#334155]/80 border-2 border-yellow-400 overflow-hidden relative shadow-lg shadow-yellow-500/30">
           {/* Yellow Glow */}
           <View className="absolute inset-0 bg-yellow-400/10" />
           
           <View className="p-5">
              <View className="flex-row items-center mb-3">
                 <View className="w-10 h-10 rounded-lg bg-yellow-400/20 items-center justify-center border border-yellow-400/50 mr-3">
                    <MaterialCommunityIcons name="certificate-outline" size={24} color="#FBBF24" />
                 </View>
                 <Text className="text-white text-xl font-bold">Intercity Permit</Text>
              </View>
              
              <Text className="text-gray-300 text-base mb-4">
                 Status: Expires in 21 days (Nov 12, 2023)
              </Text>
              
              <TouchableOpacity className="bg-[#FACC15] py-3 rounded-xl flex-row items-center justify-center">
                 <Text className="text-black font-bold text-lg mr-2">Renew Now</Text>
                 <Feather name="arrow-right" size={20} color="black" />
              </TouchableOpacity>
           </View>
        </View>

        {/* Valid Document 1 */}
        <View className="mb-5 rounded-2xl bg-[#334155]/80 border-2 border-green-500 overflow-hidden relative shadow-lg shadow-green-500/20">
           {/* Green Glow */}
           <View className="absolute inset-0 bg-green-500/10" />
           
           <View className="p-5">
              <View className="flex-row items-center mb-3">
                 <View className="w-10 h-10 rounded-lg bg-green-500/20 items-center justify-center border border-green-500/50 mr-3">
                    <MaterialCommunityIcons name="card-account-details-outline" size={24} color="#22C55E" />
                 </View>
                 <Text className="text-white text-xl font-bold">Driver's License</Text>
              </View>
              
              <Text className="text-gray-300 text-base mb-4">
                 Status: Valid until Mar 10, 2025
              </Text>
              
              <TouchableOpacity className="bg-[#10B981] py-3 rounded-xl flex-row items-center justify-center">
                 <Text className="text-white font-bold text-lg mr-2">Renew Now</Text>
                 <Feather name="arrow-right" size={20} color="white" />
              </TouchableOpacity>
           </View>
        </View>

        {/* Valid Document 2 */}
        <View className="mb-8 rounded-2xl bg-[#334155]/80 border-2 border-green-500 overflow-hidden relative shadow-lg shadow-green-500/20">
           {/* Green Glow */}
           <View className="absolute inset-0 bg-green-500/10" />
           
           <View className="p-5">
              <View className="flex-row items-center mb-3">
                 <View className="w-10 h-10 rounded-lg bg-green-500/20 items-center justify-center border border-green-500/50 mr-3">
                    <MaterialCommunityIcons name="check-decagram-outline" size={24} color="#22C55E" />
                 </View>
                 <Text className="text-white text-xl font-bold">Pollution Certificate</Text>
              </View>
              
              <Text className="text-gray-300 text-base mb-4">
                 Valid until Dec 31, 2023
              </Text>
              
              <TouchableOpacity className="bg-[#10B981] py-3 rounded-xl flex-row items-center justify-center opacity-50">
                 <Text className="text-white font-bold text-lg mr-2">Renew Now</Text>
                 <Feather name="arrow-right" size={20} color="white" />
              </TouchableOpacity>
           </View>
        </View>

      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8 z-10">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="car-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center relative">
          <View className="absolute -top-1 -right-2 bg-[#3B82F6] w-5 h-5 rounded-full items-center justify-center z-10">
             <Text className="text-white text-[10px] font-bold">2</Text>
          </View>
          <MaterialCommunityIcons name="file-document" size={24} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-xs mt-1 font-semibold">Docs</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
