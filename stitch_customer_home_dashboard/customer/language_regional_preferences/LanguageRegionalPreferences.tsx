import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LanguageRegionalPreferences() {
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');

  const languages = [
    'English (US)',
    'Hindi',
    'Spanish',
    'French',
    'German',
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-200 bg-[#F9FAFB]">
        <TouchableOpacity className="flex-row items-center">
          <Feather name="chevron-left" size={32} color="#1D4ED8" />
          <Text className="text-[#1D4ED8] text-lg font-medium ml-1">Account</Text>
        </TouchableOpacity>
        <Text className="text-black text-lg font-bold">Language & Region</Text>
        <TouchableOpacity>
          <Text className="text-[#1D4ED8] text-lg font-medium">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
        
        {/* Language Section */}
        <View className="bg-[#F9FAFB] px-5 py-4 flex-row items-center">
           <Feather name="globe" size={20} color="#1D4ED8" className="mr-2" />
           <Text className="text-gray-500 text-sm tracking-widest font-medium">LANGUAGE</Text>
        </View>

        <View className="border-t border-b border-gray-200">
           {languages.map((lang, index) => (
              <TouchableOpacity 
                 key={lang}
                 onPress={() => setSelectedLanguage(lang)}
                 className={`flex-row justify-between items-center bg-white px-5 py-4 ${index !== languages.length - 1 ? 'border-b border-gray-200' : ''}`}
              >
                 <Text className="text-black text-lg">{lang}</Text>
                 {selectedLanguage === lang ? (
                    <View className="w-6 h-6 rounded-full bg-[#1D4ED8] items-center justify-center">
                       <Feather name="check" size={16} color="white" />
                    </View>
                 ) : (
                    <View className="w-6 h-6 rounded-full border border-gray-400" />
                 )}
              </TouchableOpacity>
           ))}
        </View>

        {/* Region & Currency Section */}
        <View className="bg-[#F9FAFB] px-5 py-6 flex-row items-center">
           <Feather name="map-pin" size={20} color="#1D4ED8" className="mr-2" />
           <Text className="text-gray-500 text-sm tracking-widest font-medium">REGION & CURRENCY</Text>
        </View>

        <View className="border-t border-b border-gray-200 bg-white">
           <TouchableOpacity className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200">
              <Text className="text-black text-lg">Currency</Text>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
           </TouchableOpacity>
           
           <TouchableOpacity className="flex-row justify-between items-center px-5 py-4">
              <Text className="text-black text-lg">Region</Text>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
           </TouchableOpacity>
        </View>

        <View className="px-5 py-4 bg-[#F9FAFB]">
           <Text className="text-gray-600 text-base leading-5">
              These settings will update your experience across the app.
           </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
