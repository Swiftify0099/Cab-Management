import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function DriverProfileSettings() {
  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-6 bg-[#F9FAFB]">
        <Text className="text-3xl font-extrabold text-black">Driver Profile & Settings</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Profile Info Block */}
        <View className="bg-white px-5 py-6 mb-2 rounded-b-3xl shadow-sm shadow-blue-100 border-b border-gray-100 flex-row justify-between items-center z-10 relative">
          
          <View className="flex-row items-center">
            {/* Avatar Mock */}
            <View className="w-20 h-20 rounded-full bg-gray-300 mr-4 border-2 border-white shadow-sm overflow-hidden items-center justify-center">
               <Ionicons name="person" size={50} color="gray" style={{ marginTop: 10 }} />
            </View>
            <View>
              <Text className="text-black text-2xl font-bold mb-1">David Chen</Text>
              <Text className="text-gray-500 text-sm">5 Years of Service</Text>
            </View>
          </View>

          {/* Elite Partner Badge */}
          <View className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex-row items-center shadow-sm shadow-blue-200/50">
            <MaterialCommunityIcons name="star-circle" size={18} color="#2563EB" className="mr-1" />
            <Text className="text-[#2563EB] text-sm font-semibold">Elite Partner</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="bg-white">
          <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="person-circle" size={28} color="black" className="mr-4" />
              <Text className="text-black text-lg">Personal Info</Text>
            </View>
            <Feather name="chevron-down" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="car" size={28} color="black" className="mr-4" />
              <Text className="text-black text-lg">Vehicle Details</Text>
            </View>
            <Feather name="chevron-down" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="folder" size={28} color="black" className="mr-4" />
              <Text className="text-black text-lg">Document Vault</Text>
            </View>
            <Feather name="chevron-down" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="settings" size={28} color="black" className="mr-4" />
              <Text className="text-black text-lg">App Settings</Text>
            </View>
            <Feather name="chevron-down" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="help-circle" size={28} color="black" className="mr-4" />
              <Text className="text-black text-lg">Help & Support</Text>
            </View>
            <Feather name="chevron-down" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {/* Fill rest of screen visually */}
        <View className="h-32 bg-white" />

      </ScrollView>

      {/* Log Out Button */}
      <View className="px-5 pb-8 pt-4 bg-white">
        <TouchableOpacity className="w-full bg-[#DC2626] py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-red-500/20">
          <Feather name="power" size={20} color="white" />
          <Text className="text-white text-lg font-bold ml-2">Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
