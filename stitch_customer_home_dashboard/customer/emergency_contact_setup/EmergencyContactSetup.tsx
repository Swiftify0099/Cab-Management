import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function EmergencyContactSetup() {
  const [sosAlert, setSosAlert] = useState(true);
  const [shareLocation, setShareLocation] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#E0F2FE]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Emergency Contact Setup</Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* Form Card */}
        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm shadow-blue-100 border border-white">
           
           <View className="mb-4">
              <Text className="text-black text-base mb-2">Name</Text>
              <View className="w-full border border-gray-300 rounded-lg bg-white h-12 justify-center px-4">
                 <TextInput 
                    placeholder="Enter full name"
                    placeholderTextColor="#9CA3AF"
                    className="text-black text-base flex-1"
                 />
              </View>
           </View>

           <View className="mb-4">
              <Text className="text-black text-base mb-2">Relation</Text>
              <View className="w-full border border-gray-300 rounded-lg bg-white h-12 justify-center px-4 flex-row items-center">
                 <Text className="text-gray-500 text-base flex-1">Select relation (e.g., Spouse, Parent)</Text>
                 <Feather name="chevron-down" size={20} color="#6B7280" />
              </View>
           </View>

           <View className="mb-6">
              <Text className="text-black text-base mb-2">Mobile Number</Text>
              <View className="w-full border border-gray-300 rounded-lg bg-white h-12 justify-center px-4">
                 <TextInput 
                    placeholder="Enter mobile number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    className="text-black text-base flex-1"
                 />
              </View>
           </View>

           <TouchableOpacity className="w-full bg-[#3B82F6] py-3.5 rounded-xl items-center shadow-sm shadow-blue-300">
              <Text className="text-white text-lg font-bold">Save Contact</Text>
           </TouchableOpacity>

        </View>

        {/* Safety Preferences Card */}
        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm shadow-blue-100 border border-white">
           <Text className="text-black text-xl font-bold mb-4">Safety Preferences</Text>
           
           <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                 <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="alarm-light" size={18} color="#EF4444" />
                 </View>
                 <Text className="text-black text-base">Instant SOS Alert</Text>
              </View>
              <Switch
                 trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                 thumbColor={'#ffffff'}
                 ios_backgroundColor="#D1D5DB"
                 onValueChange={setSosAlert}
                 value={sosAlert}
                 className="transform scale-90"
              />
           </View>

           <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                 <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="map-marker" size={18} color="#3B82F6" />
                 </View>
                 <Text className="text-black text-base">Always Share Live Location</Text>
              </View>
              <Switch
                 trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                 thumbColor={'#ffffff'}
                 ios_backgroundColor="#D1D5DB"
                 onValueChange={setShareLocation}
                 value={shareLocation}
                 className="transform scale-90"
              />
           </View>
        </View>

        <Text className="text-xl font-bold text-black mb-3">Added Contacts</Text>

        {/* Contact 1 */}
        <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm shadow-blue-100 border border-white flex-row justify-between items-start">
           <View>
              <Text className="text-black text-lg font-bold mb-0.5">Sarah Johnson</Text>
              <Text className="text-black text-base mb-2">Spouse</Text>
              <View className="bg-green-100 px-2 py-0.5 rounded-md self-start flex-row items-center">
                 <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                 <Text className="text-green-700 text-xs font-semibold ml-1">Verified</Text>
              </View>
           </View>
           <TouchableOpacity className="p-1">
              <Feather name="edit" size={20} color="#3B82F6" />
           </TouchableOpacity>
        </View>

        {/* Contact 2 */}
        <View className="bg-white rounded-2xl p-4 mb-8 shadow-sm shadow-blue-100 border border-white flex-row justify-between items-start">
           <View>
              <Text className="text-black text-lg font-bold mb-0.5">Michael Chen</Text>
              <Text className="text-black text-base mb-2">Brother</Text>
              <View className="bg-green-100 px-2 py-0.5 rounded-md self-start flex-row items-center">
                 <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                 <Text className="text-green-700 text-xs font-semibold ml-1">Verified</Text>
              </View>
           </View>
           <TouchableOpacity className="p-1">
              <Feather name="edit" size={20} color="#3B82F6" />
           </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
