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

export default function AdvancedAppSettings() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <TouchableOpacity className="flex-row items-center">
          <Feather name="chevron-left" size={28} color="black" />
          <Text className="text-black text-lg ml-1">Back</Text>
        </TouchableOpacity>
      </View>
      <View className="px-5 mb-6">
         <Text className="text-3xl font-extrabold text-black">Advanced App Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        
        {/* Preferences Section */}
        <Text className="text-xl font-bold text-black mb-3">Preferences</Text>
        <View className="bg-white rounded-2xl mb-8 shadow-sm shadow-gray-200">
          
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Feather name="moon" size={24} color="black" className="mr-4" />
              <Text className="text-black text-lg">Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Feather name="bell" size={24} color="black" className="mr-4" />
              <Text className="text-black text-lg">Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row justify-between items-center p-4">
            <View className="flex-row items-center">
              <Feather name="map-pin" size={24} color="black" className="mr-4" />
              <Text className="text-black text-lg">Location Sharing</Text>
            </View>
            <Switch
              value={locationSharing}
              onValueChange={setLocationSharing}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Account & Data Section */}
        <Text className="text-xl font-bold text-black mb-3">Account & Data</Text>
        
        <Text className="text-black font-semibold text-base mb-2">Saved Addresses</Text>
        <View className="bg-white rounded-2xl mb-6 shadow-sm shadow-gray-200">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
            <Feather name="home" size={24} color="black" className="mr-4" />
            <View>
              <Text className="text-black text-lg">Home</Text>
              <Text className="text-gray-600 text-sm">123 Maple Dr, Cityville</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4">
            <Feather name="briefcase" size={24} color="black" className="mr-4" />
            <View>
              <Text className="text-black text-lg">Work</Text>
              <Text className="text-gray-600 text-sm">456 Oak Ln, Tech Park</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text className="text-black font-semibold text-base mb-2">Language Selection</Text>
        <TouchableOpacity className="bg-white rounded-2xl mb-10 p-4 flex-row items-center justify-between shadow-sm shadow-gray-200">
          <View className="flex-row items-center">
            <Feather name="globe" size={24} color="black" className="mr-4" />
            <Text className="text-black text-lg">English (US)</Text>
          </View>
          <Feather name="chevron-down" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Bottom Actions */}
        <View className="bg-white rounded-2xl mb-8 shadow-sm shadow-gray-200">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
            <Feather name="info" size={24} color="black" className="mr-4" />
            <Text className="text-black text-lg">About App</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4">
            <Feather name="power" size={24} color="#DC2626" className="mr-4" />
            <Text className="text-[#DC2626] text-lg">Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
