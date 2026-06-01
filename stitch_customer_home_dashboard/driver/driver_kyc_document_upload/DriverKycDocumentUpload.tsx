import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverKycDocumentUpload() {
  return (
    <SafeAreaView className="flex-1 bg-[#1A1B24]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-6">
        <TouchableOpacity className="mr-4">
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Driver KYC & Document Upload</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        
        {/* Step Indicator */}
        <Text className="text-gray-400 text-sm mb-3">
          Step 2 of 4: <Text className="text-white font-semibold">Document Verification</Text>
        </Text>
        <View className="flex-row mb-8">
          <View className="h-1.5 flex-1 bg-[#3B82F6] rounded-full mr-2" />
          <View className="h-1.5 flex-1 bg-[#8B5CF6] rounded-full mr-2 shadow-sm shadow-purple-500/50" />
          <View className="h-1.5 flex-1 bg-gray-600 rounded-full mr-2" />
          <View className="h-1.5 flex-1 bg-gray-600 rounded-full" />
        </View>

        <Text className="text-white text-2xl font-bold mb-4">Upload Your Documents</Text>

        {/* Aadhaar Card */}
        <View className="bg-white/10 rounded-2xl p-4 flex-row items-center mb-4 border border-white/5" style={styles.glassCard}>
          <View className="w-12 h-12 rounded-full bg-white/10 justify-center items-center mr-4 border border-white/10">
            <Ionicons name="finger-print" size={24} color="#9CA3AF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg mb-1">Aadhaar Card</Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              <Text className="text-yellow-500 text-xs font-semibold">Pending</Text>
            </View>
          </View>
          <TouchableOpacity className="bg-[#3B82F6] px-4 py-2 rounded-full flex-row items-center">
            <Feather name="upload" size={14} color="white" className="mr-1" />
            <Text className="text-white font-semibold">Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Driving License */}
        <View className="bg-white/10 rounded-2xl p-4 flex-row items-center mb-4 border border-white/5" style={styles.glassCard}>
          <View className="w-12 h-12 rounded-full bg-white/10 justify-center items-center mr-4 border border-white/10">
            <Ionicons name="car" size={24} color="#9CA3AF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg mb-1">Driving License</Text>
            <View className="flex-row items-center flex-wrap">
              <View className="bg-green-500/20 px-2 py-0.5 rounded flex-row items-center mr-2">
                <Ionicons name="checkmark-circle" size={12} color="#10B981" className="mr-1" />
                <Text className="text-[#10B981] text-xs font-bold">Uploaded</Text>
              </View>
              <Text className="text-gray-400 text-xs mt-1">Verified - DL12345678</Text>
            </View>
          </View>
          <TouchableOpacity className="bg-white/10 px-4 py-2 rounded-full border border-white/20">
            <Text className="text-white font-semibold">View</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle RC */}
        <View className="bg-white/10 rounded-2xl p-4 flex-row items-center mb-10 border border-white/5" style={styles.glassCard}>
          <View className="w-12 h-12 rounded-full bg-white/10 justify-center items-center mr-4 border border-white/10">
            <Ionicons name="document-text" size={24} color="#9CA3AF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg mb-1">Vehicle RC</Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              <Text className="text-yellow-500 text-xs font-semibold">Pending</Text>
            </View>
          </View>
          <TouchableOpacity className="bg-[#3B82F6] px-4 py-2 rounded-full flex-row items-center">
            <Feather name="upload" size={14} color="white" className="mr-1" />
            <Text className="text-white font-semibold">Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Live Selfie Verification */}
        <View className="items-center mt-6">
          <View className="w-16 h-16 rounded-full bg-[#1A1B24] border-4 border-[#3B82F6] justify-center items-center z-10 -mb-8">
            <MaterialCommunityIcons name="face-recognition" size={32} color="#9CA3AF" />
          </View>
          <TouchableOpacity className="w-[85%] bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] py-8 rounded-3xl items-center relative overflow-hidden" style={styles.gradientMock}>
            {/* Using solid color fallback for linear gradient */}
            <View className="absolute inset-0 bg-[#3B82F6] opacity-90" />
            <Text className="text-white text-xl font-bold mt-4 mb-1">Live Selfie Verification</Text>
            <Text className="text-white/80 text-sm">Tap to start</Text>
          </TouchableOpacity>
        </View>

        <View className="h-8" />
      </ScrollView>

      {/* Bottom Fixed Action */}
      <View className="px-5 pb-6 pt-4 bg-[#1A1B24] border-t border-white/5">
        <TouchableOpacity className="w-full py-4 rounded-full items-center mb-3 bg-[#8B5CF6]">
          <Text className="text-white text-lg font-bold">Submit for Approval</Text>
        </TouchableOpacity>
        <Text className="text-gray-500 text-xs text-center">
          Your data is securely processed. Intercity Mobility.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gradientMock: {
    backgroundColor: '#4F46E5', // Fallback
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  }
});
