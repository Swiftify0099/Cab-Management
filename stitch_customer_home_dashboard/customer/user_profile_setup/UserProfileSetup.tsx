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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function UserProfileSetup() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Soft gradient background mock */}
      <LinearGradient 
        colors={['#E0F2FE', '#F8FAFC', '#F1F5F9']} 
        className="absolute inset-0 z-0"
      />

      <ScrollView className="flex-1 px-6 pt-4 z-10" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
         
         {/* Header area */}
         <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity>
               <Feather name="arrow-left" size={28} color="#334155" />
            </TouchableOpacity>
            <Text className="text-gray-500 text-base">Step 1 of 3</Text>
         </View>

         <Text className="text-[#0F172A] text-2xl font-bold text-center mb-6">User Profile Setup</Text>

         {/* Progress Bar */}
         <View className="flex-row justify-between space-x-2 mb-10 px-4">
            <View className="h-1.5 flex-1 bg-[#3B82F6] rounded-full" />
            <View className="h-1.5 flex-1 bg-white border border-gray-200 rounded-full" />
            <View className="h-1.5 flex-1 bg-white border border-gray-200 rounded-full" />
         </View>

         {/* Name & Photo Card */}
         <View className="bg-white/60 rounded-[32px] p-6 shadow-sm shadow-blue-100 border border-white/80 mb-4 backdrop-blur-xl">
            <View className="items-center mb-6">
               <View className="w-28 h-28 rounded-full border-2 border-gray-200 bg-[#F8FAFC] items-center justify-center shadow-sm shadow-gray-200 mb-4">
                  <View className="w-10 h-10 rounded-full border-2 border-[#64748B] items-center justify-center">
                     <Feather name="plus" size={24} color="#64748B" />
                  </View>
               </View>
               <Text className="text-[#0F172A] font-bold text-base">Add Profile Photo</Text>
            </View>

            <View className="bg-[#F8FAFC] rounded-2xl border border-gray-200 px-4 py-3.5 flex-row items-center shadow-sm shadow-gray-100">
               <Feather name="user" size={20} color="#64748B" className="mr-3" />
               <TextInput 
                  placeholder="Full Name"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-[#0F172A] text-base"
               />
            </View>
         </View>

         {/* Gender Card */}
         <View className="bg-white/60 rounded-3xl p-6 shadow-sm shadow-blue-100 border border-white/80 mb-4 backdrop-blur-xl">
            <Text className="text-[#0F172A] font-bold text-base mb-4">Gender</Text>
            <View className="flex-row justify-between">
               
               <TouchableOpacity className="flex-1 bg-[#F8FAFC] border border-gray-200 rounded-2xl py-3 items-center flex-row justify-center shadow-sm shadow-gray-100 mr-2">
                  <MaterialCommunityIcons name="human-male" size={20} color="#64748B" className="mr-2" />
                  <Text className="text-[#0F172A] text-base">Male</Text>
               </TouchableOpacity>

               <TouchableOpacity className="flex-1 bg-[#EFF6FF] border border-[#93C5FD] rounded-2xl py-3 items-center flex-row justify-center shadow-sm shadow-blue-200 mr-2 relative">
                  <MaterialCommunityIcons name="human-female" size={20} color="#0F172A" className="mr-2" />
                  <Text className="text-[#0F172A] text-base">Female</Text>
                  <View className="absolute top-2 right-2">
                     <Feather name="check" size={14} color="#3B82F6" />
                  </View>
               </TouchableOpacity>

               <TouchableOpacity className="flex-1 bg-[#F8FAFC] border border-gray-200 rounded-2xl py-3 items-center flex-row justify-center shadow-sm shadow-gray-100">
                  <MaterialCommunityIcons name="gender-male-female" size={20} color="#64748B" className="mr-2" />
                  <Text className="text-[#0F172A] text-base">Other</Text>
               </TouchableOpacity>

            </View>
         </View>

         {/* DOB Card */}
         <View className="bg-white/60 rounded-3xl p-6 shadow-sm shadow-blue-100 border border-white/80 mb-10 backdrop-blur-xl">
            <Text className="text-[#0F172A] font-bold text-base mb-4">Date of Birth</Text>
            <View className="bg-[#F8FAFC] rounded-2xl border border-gray-200 px-4 py-3.5 flex-row items-center shadow-sm shadow-gray-100">
               <Feather name="calendar" size={20} color="#64748B" className="mr-3" />
               <TextInput 
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-[#0F172A] text-base"
               />
            </View>
         </View>

         {/* Action Buttons */}
         <TouchableOpacity className="w-full bg-[#3B82F6] py-4 rounded-3xl items-center shadow-lg shadow-blue-500/30 mb-6">
            <Text className="text-white text-lg font-semibold">Complete Setup</Text>
         </TouchableOpacity>

         <TouchableOpacity className="w-full py-2 items-center">
            <Text className="text-gray-500 text-base font-medium">Skip for now</Text>
         </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
