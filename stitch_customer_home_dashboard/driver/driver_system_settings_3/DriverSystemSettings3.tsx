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
import { Feather, Ionicons } from '@expo/vector-icons';

export default function DriverSystemSettings3() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-6 flex-row items-center bg-white border-b border-gray-100 shadow-sm shadow-gray-100">
        <TouchableOpacity className="w-10">
          <Feather name="chevron-left" size={32} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center pr-10">Driver Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
         
         {/* PREFERENCES Section */}
         <Text className="text-gray-500 text-sm font-medium tracking-wider mb-2 ml-2">PREFERENCES</Text>
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 overflow-hidden mb-6 border border-gray-100">
            
            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
               <View className="flex-row items-center">
                  <Ionicons name="volume-high" size={24} color="#0F172A" className="mr-4 w-6 text-center" />
                  <Text className="text-[#0F172A] text-lg">Voice Navigation</Text>
               </View>
               <Switch 
                  value={true} 
                  trackColor={{ false: "#E2E8F0", true: "#4ADE80" }}
                  thumbColor="white"
               />
            </View>

            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
               <View className="flex-row items-center">
                  <Ionicons name="flash" size={24} color="#0F172A" className="mr-4 w-6 text-center" />
                  <Text className="text-[#0F172A] text-lg">Auto-Accept Requests</Text>
               </View>
               <Switch 
                  value={true} 
                  trackColor={{ false: "#E2E8F0", true: "#4ADE80" }}
                  thumbColor="white"
               />
            </View>

            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
               <View className="flex-row items-center">
                  <Ionicons name="moon" size={24} color="#0F172A" className="mr-4 w-6 text-center" />
                  <Text className="text-[#0F172A] text-lg">Night Mode</Text>
               </View>
               <Switch 
                  value={false} 
                  trackColor={{ false: "#E2E8F0", true: "#4ADE80" }}
                  thumbColor="white"
               />
            </View>

            <View className="p-4 flex-row items-center justify-between">
               <View className="flex-row items-center">
                  <Ionicons name="notifications" size={24} color="#0F172A" className="mr-4 w-6 text-center" />
                  <Text className="text-[#0F172A] text-lg">Push Notifications</Text>
               </View>
               <Switch 
                  value={true} 
                  trackColor={{ false: "#E2E8F0", true: "#4ADE80" }}
                  thumbColor="white"
               />
            </View>

         </View>

         {/* APP SETTINGS Section */}
         <Text className="text-gray-500 text-sm font-medium tracking-wider mb-2 ml-2">APP SETTINGS</Text>
         <View className="bg-white rounded-2xl shadow-sm shadow-gray-200 overflow-hidden mb-8 border border-gray-100">
            <TouchableOpacity className="p-4 flex-row items-center justify-between">
               <View className="flex-row items-center">
                  <Ionicons name="globe-outline" size={24} color="#0F172A" className="mr-4 w-6 text-center" />
                  <Text className="text-[#0F172A] text-lg">Language</Text>
               </View>
               <View className="flex-row items-center">
                  <Text className="text-gray-500 text-lg mr-2">English (US)</Text>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
               </View>
            </TouchableOpacity>
         </View>

         {/* Check for Updates Button */}
         <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Feather name="download" size={20} color="white" className="mr-2" />
            <Text className="text-white text-lg font-semibold">Check for Updates</Text>
         </TouchableOpacity>

         <Text className="text-center text-gray-600 text-sm">Version 2.4.1 (Build 305)</Text>

      </ScrollView>
    </SafeAreaView>
  );
}
