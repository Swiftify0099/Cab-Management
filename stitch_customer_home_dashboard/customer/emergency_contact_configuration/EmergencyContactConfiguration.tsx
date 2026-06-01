import React, { useState } from 'react';
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

export default function EmergencyContactConfiguration() {
  const [autoShare, setAutoShare] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Emergency Contacts</Text>
        <TouchableOpacity>
          <Text className="text-[#3B82F6] text-lg font-medium">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Auto-share Card */}
        <View className="bg-white rounded-2xl p-5 mb-8 shadow-sm shadow-gray-200 border border-gray-100">
           <View className="flex-row justify-between items-center mb-3">
              <Text className="text-black text-lg font-bold">Auto-share Live Trip</Text>
              <View className="flex-row items-center">
                 <Text className="text-gray-600 mr-2 text-sm">On</Text>
                 <Switch
                    trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
                    thumbColor={'#ffffff'}
                    ios_backgroundColor="#D1D5DB"
                    onValueChange={setAutoShare}
                    value={autoShare}
                    className="transform scale-90"
                 />
              </View>
           </View>
           <Text className="text-black text-base leading-5">
              Automatically share your trip details and location with selected contacts during every intercity journey.
           </Text>
        </View>

        <Text className="text-xl font-bold text-black mb-4">Trusted Contacts</Text>

        {/* Contact 1 */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <View className="w-14 h-14 bg-gray-300 rounded-full mr-4 border-2 border-white shadow-sm overflow-hidden items-center justify-center">
              <Ionicons name="person" size={32} color="gray" style={{marginTop: 8}}/>
           </View>
           
           <View className="flex-1">
              <View className="flex-row items-center mb-1">
                 <Text className="text-black text-lg font-bold mr-2">Alex Johnson</Text>
                 <View className="bg-blue-100 px-2 py-0.5 rounded-md flex-row items-center">
                    <MaterialCommunityIcons name="check-decagram" size={12} color="#3B82F6" />
                    <Text className="text-[#3B82F6] text-xs font-semibold ml-1">Verified</Text>
                 </View>
              </View>
              <Text className="text-black text-base">+1 555-0122</Text>
           </View>
           
           <TouchableOpacity className="p-2">
              <Feather name="more-horizontal" size={24} color="#9CA3AF" />
           </TouchableOpacity>
        </View>

        {/* Contact 2 */}
        <View className="bg-white rounded-2xl p-4 mb-8 shadow-sm shadow-gray-200 border border-gray-100 flex-row items-center">
           <View className="w-14 h-14 bg-gray-300 rounded-full mr-4 border-2 border-white shadow-sm overflow-hidden items-center justify-center">
              <Ionicons name="person" size={32} color="gray" style={{marginTop: 8}}/>
           </View>
           
           <View className="flex-1">
              <View className="flex-row items-center mb-1">
                 <Text className="text-black text-lg font-bold mr-2">Maria Rodriguez</Text>
                 <View className="bg-blue-100 px-2 py-0.5 rounded-md flex-row items-center">
                    <MaterialCommunityIcons name="check-decagram" size={12} color="#3B82F6" />
                    <Text className="text-[#3B82F6] text-xs font-semibold ml-1">Verified</Text>
                 </View>
              </View>
              <Text className="text-black text-base">+1 555-0198</Text>
           </View>
           
           <TouchableOpacity className="p-2">
              <Feather name="more-horizontal" size={24} color="#9CA3AF" />
           </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Add New Contact Button */}
      <View className="px-5 pb-8 pt-4">
        <TouchableOpacity className="w-full bg-[#3B82F6] py-4 rounded-xl items-center flex-row justify-center shadow-sm shadow-blue-300">
          <Feather name="plus" size={24} color="white" className="mr-2" />
          <Text className="text-white text-lg font-bold">Add New Contact</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
