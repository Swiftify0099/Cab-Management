import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileSetupGenderDob() {
  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6] justify-center items-center">
      <StatusBar barStyle="dark-content" />

      {/* Modal / Screen Card */}
      <View className="bg-[#18181B] w-[90%] h-[90%] rounded-[40px] pt-8 px-6 pb-10 shadow-2xl shadow-black relative overflow-hidden flex-col">
         
         {/* Header */}
         <View className="flex-row items-center justify-between mb-8">
            <TouchableOpacity>
               <Feather name="chevron-left" size={28} color="#A1A1AA" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-semibold mr-6">Profile Setup</Text>
            <View />
         </View>

         {/* Titles */}
         <Text className="text-white text-4xl font-bold mb-3 leading-[44px]">Tell us about yourself</Text>
         <Text className="text-gray-400 text-lg mb-8 leading-6 pr-4">
            Select your gender and date of birth to personalize your experience.
         </Text>

         {/* Gender Section */}
         <Text className="text-white text-lg font-bold mb-4">Gender</Text>
         <View className="flex-row flex-wrap justify-between mb-8">
            <TouchableOpacity className="w-[48%] py-4 rounded-2xl border border-[#2563EB] bg-[#2563EB]/10 items-center justify-center mb-4">
               <Text className="text-[#3B82F6] font-medium text-base">Male</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-[48%] py-4 rounded-2xl border border-[#3F3F46] bg-[#27272A] items-center justify-center mb-4">
               <Text className="text-[#71717A] font-medium text-base">Female</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-[48%] py-4 rounded-2xl border border-[#3F3F46] bg-[#27272A] items-center justify-center">
               <Text className="text-[#3B82F6] font-medium text-base">Other</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-[48%] py-4 rounded-2xl border border-[#3F3F46] bg-[#27272A] items-center justify-center">
               <Text className="text-[#3B82F6] font-medium text-base">Prefer not to say</Text>
            </TouchableOpacity>
         </View>

         {/* DOB Section */}
         <Text className="text-white text-lg font-bold mb-4">Date of Birth</Text>
         
         {/* Mock Wheel Picker Container */}
         <View className="bg-[#27272A] rounded-[30px] p-4 flex-1 mb-6 relative overflow-hidden items-center justify-center border border-[#3F3F46]">
            
            <View className="absolute top-0 w-full h-1/3 bg-[#27272A]/80 z-10" />
            <View className="absolute bottom-0 w-full h-1/3 bg-[#27272A]/80 z-10" />

            <View className="w-[110%] h-12 bg-[#3F3F46]/50 absolute z-0" />

            <View className="flex-row justify-around w-full px-4 items-center h-full pt-10">
               <View className="items-center flex-1 h-48 justify-around">
                  <Text className="text-[#52525B] text-lg">25</Text>
                  <Text className="text-[#71717A] text-xl">26</Text>
                  <Text className="text-[#A1A1AA] text-2xl">29</Text>
                  <Text className="text-white text-3xl font-medium z-20">12</Text>
                  <Text className="text-[#A1A1AA] text-2xl">1</Text>
                  <Text className="text-[#71717A] text-xl">2</Text>
                  <Text className="text-[#52525B] text-lg">3</Text>
               </View>
               <View className="items-center flex-1.5 h-48 justify-around">
                  <Text className="text-[#52525B] text-lg">January</Text>
                  <Text className="text-[#71717A] text-xl">April</Text>
                  <Text className="text-[#A1A1AA] text-2xl">May</Text>
                  <Text className="text-white text-3xl font-medium z-20">Month</Text>
                  <Text className="text-[#A1A1AA] text-2xl">September</Text>
                  <Text className="text-[#71717A] text-xl">October</Text>
                  <Text className="text-[#52525B] text-lg">November</Text>
               </View>
               <View className="items-center flex-1 h-48 justify-around">
                  <Text className="text-[#52525B] text-lg">2017</Text>
                  <Text className="text-[#71717A] text-xl">2018</Text>
                  <Text className="text-[#A1A1AA] text-2xl">2019</Text>
                  <Text className="text-white text-3xl font-medium z-20">2020</Text>
                  <Text className="text-[#A1A1AA] text-2xl">2021</Text>
                  <Text className="text-[#71717A] text-xl">2022</Text>
                  <Text className="text-[#52525B] text-lg">2023</Text>
               </View>
            </View>
         </View>

         {/* Privacy notice */}
         <View className="flex-row items-center px-2 mb-6">
            <Feather name="lock" size={16} color="#71717A" className="mr-3" />
            <Text className="text-[#A1A1AA] text-xs flex-1 leading-4">
               Your privacy is our priority. We will not share this information. <Text className="text-[#3B82F6]">Privacy Promise.</Text>
            </Text>
         </View>

         {/* Continue Button */}
         <TouchableOpacity className="w-full bg-[#2563EB] py-4 rounded-full items-center justify-center shadow-lg shadow-blue-500/30">
            <Text className="text-white text-lg font-bold">Continue</Text>
         </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
