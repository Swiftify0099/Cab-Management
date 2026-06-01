import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverDocumentUploadCenter() {
  return (
    <SafeAreaView className="flex-1 bg-[#1A1C29]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 mb-6">
        <TouchableOpacity className="w-10 h-10 bg-white/10 rounded-xl justify-center items-center mr-4">
          <Feather name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Aadhaar & License Upload</Text>
      </View>

      {/* Progress Bar */}
      <View className="flex-row px-5 mb-8 justify-between">
        <View className="h-1.5 flex-1 bg-[#3B82F6] rounded-full mr-2" />
        <View className="h-1.5 flex-1 bg-[#3B82F6] rounded-full mr-2" />
        <View className="h-1.5 flex-1 bg-[#3B82F6] opacity-30 rounded-full mr-2" />
        <View className="h-1.5 flex-1 bg-white/20 rounded-full" />
      </View>

      <View className="flex-1 px-5">
        
        {/* Aadhaar Card Upload Section */}
        <View className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-2 relative" style={styles.glassEffect}>
          {/* Success Checkmark */}
          <View className="absolute top-4 right-4 w-6 h-6 bg-green-500 rounded-full justify-center items-center">
             <Feather name="check" size={14} color="white" />
          </View>

          <Text className="text-white text-lg font-bold text-center mb-6">Aadhaar Card Upload</Text>
          
          <View className="items-center mb-4">
            <View className="w-24 h-24 border-2 border-dashed border-gray-400 rounded-2xl justify-center items-center bg-white/5">
               <MaterialCommunityIcons name="camera" size={40} color="#60A5FA" />
            </View>
          </View>
          
          <Text className="text-gray-300 text-center text-sm">Upload Front & Back</Text>
        </View>
        <Text className="text-gray-400 text-xs text-center mb-8">Ensure no glare on ID</Text>


        {/* Driver License Upload Section */}
        <View className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-2 relative" style={styles.glassEffect}>
          {/* Warning Icon */}
          <View className="absolute top-4 right-4 w-6 h-6 bg-yellow-500 rounded-full justify-center items-center">
             <Text className="text-white font-bold text-xs">!</Text>
          </View>

          <Text className="text-white text-lg font-bold text-center mb-6">Driver License Upload</Text>
          
          <View className="items-center mb-4">
            <View className="w-24 h-24 border-2 border-dashed border-gray-400 rounded-2xl justify-center items-center bg-white/5">
               <MaterialCommunityIcons name="camera" size={40} color="#60A5FA" />
            </View>
          </View>
          
          <Text className="text-gray-300 text-center text-sm">Upload Front & Back</Text>
        </View>
        <Text className="text-gray-400 text-xs text-center mb-8">Please use good lighting</Text>

      </View>

      {/* Bottom Button */}
      <View className="px-5 pb-8 pt-4">
        {/* Glow effect container */}
        <View className="relative">
          <View className="absolute -inset-1 bg-blue-500/50 rounded-2xl blur-lg" />
          <TouchableOpacity className="w-full bg-[#1A1C29] border border-[#3B82F6] py-4 rounded-2xl items-center relative z-10" style={styles.glowBorder}>
             {/* Gradient mock inside the button for depth */}
             <View className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-2xl" />
             <Text className="text-white text-lg font-bold z-20">Proceed to Selfie Verification</Text>
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  glowBorder: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  }
});
