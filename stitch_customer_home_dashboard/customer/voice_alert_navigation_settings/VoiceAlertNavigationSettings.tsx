import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function VoiceAlertNavigationSettings() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-6 flex-row items-center">
        <TouchableOpacity className="w-10">
          <Feather name="chevron-left" size={32} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center pr-10">Voice Navigation & Alerts</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
         
         {/* GENERAL AUDIO Section */}
         <Text className="text-gray-500 text-sm font-medium tracking-wider mb-2 ml-2">GENERAL AUDIO</Text>
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 overflow-hidden mb-6">
            <View className="p-4 border-b border-gray-100 flex-row items-center">
               <Ionicons name="volume-high" size={24} color="#0F172A" className="mr-3" />
               <Text className="text-[#0F172A] text-lg flex-1">Volume</Text>
            </View>
            <View className="p-4 flex-row items-center justify-between border-b border-gray-100">
               <Ionicons name="volume-mute" size={20} color="#94A3B8" />
               {/* Mock Slider */}
               <View className="flex-1 h-1 bg-gray-200 mx-3 rounded-full relative">
                  <View className="absolute top-0 bottom-0 left-0 w-[75%] bg-[#3B82F6] rounded-full" />
                  <View className="absolute top-[-8px] left-[73%] w-5 h-5 bg-white rounded-full border border-gray-300 shadow-sm shadow-gray-400" />
               </View>
               <Text className="text-gray-500 text-base">75%</Text>
            </View>
            <TouchableOpacity className="bg-[#1D4ED8] py-4 items-center w-full">
               <Text className="text-white text-lg font-medium">Test Sound</Text>
            </TouchableOpacity>
         </View>

         {/* INCOMING RIDES Section */}
         <Text className="text-gray-500 text-sm font-medium tracking-wider mb-2 ml-2">INCOMING RIDES</Text>
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 overflow-hidden mb-2">
            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
               <Text className="text-[#0F172A] text-lg">Voice Alerts</Text>
               <Switch 
                  value={true} 
                  trackColor={{ false: "#E2E8F0", true: "#3B82F6" }}
                  thumbColor="white"
               />
            </View>
            <TouchableOpacity className="p-4 flex-row items-center justify-between">
               <Text className="text-[#0F172A] text-lg">Voice Option</Text>
               <View className="flex-row items-center">
                  <Text className="text-[#0F172A] text-lg mr-2">Male 1</Text>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
               </View>
            </TouchableOpacity>
         </View>
         <Text className="text-[#0F172A] text-sm mb-6 ml-2">Receive audible notifications for new ride requests.</Text>

         {/* FATIGUE WARNINGS Section */}
         <Text className="text-gray-500 text-sm font-medium tracking-wider mb-2 ml-2">FATIGUE WARNINGS</Text>
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 overflow-hidden mb-2">
            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
               <Text className="text-[#0F172A] text-lg">Voice Alerts</Text>
               <Switch 
                  value={true} 
                  trackColor={{ false: "#E2E8F0", true: "#3B82F6" }}
                  thumbColor="white"
               />
            </View>
            <TouchableOpacity className="p-4 flex-row items-center justify-between">
               <Text className="text-[#0F172A] text-lg">Voice Option</Text>
               <View className="flex-row items-center">
                  <Text className="text-[#0F172A] text-lg mr-2">Female 2</Text>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
               </View>
            </TouchableOpacity>
         </View>
         <Text className="text-[#0F172A] text-sm mb-6 ml-2">Get safety prompts when driving for extended periods.</Text>

         {/* NAVIGATION DIRECTIONS Section */}
         <Text className="text-gray-500 text-sm font-medium tracking-wider mb-2 ml-2">NAVIGATION DIRECTIONS</Text>
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 overflow-hidden mb-2">
            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
               <Text className="text-[#0F172A] text-lg">Voice Guidance</Text>
               <Switch 
                  value={true} 
                  trackColor={{ false: "#E2E8F0", true: "#3B82F6" }}
                  thumbColor="white"
               />
            </View>
            <TouchableOpacity className="p-4 flex-row items-center justify-between">
               <Text className="text-[#0F172A] text-lg">Voice Option</Text>
               <View className="flex-row items-center">
                  <Text className="text-[#0F172A] text-lg mr-2">System Default</Text>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
               </View>
            </TouchableOpacity>
         </View>
         <Text className="text-[#0F172A] text-sm mb-6 ml-2">Hear turn-by-turn instructions during active routes.</Text>

         {/* ABOUT Section */}
         <Text className="text-gray-500 text-sm font-medium tracking-wider mb-2 ml-2">ABOUT</Text>
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 overflow-hidden mb-6">
            <View className="p-4 flex-row items-center justify-between">
               <Text className="text-[#0F172A] text-lg">Sound Pack Version</Text>
               <Text className="text-[#0F172A] text-lg">v2.4.1 (Latest)</Text>
            </View>
         </View>

      </ScrollView>
    </SafeAreaView>
  );
}
