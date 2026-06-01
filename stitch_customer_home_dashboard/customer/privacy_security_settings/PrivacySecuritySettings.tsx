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

export default function PrivacySecuritySettings() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-gray-200 bg-white">
        <TouchableOpacity className="mr-4">
          <Feather name="chevron-left" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1">Privacy & Security Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* Security Audit Card */}
        <View className="bg-white rounded-2xl p-5 mb-8 shadow-sm shadow-gray-200 border border-gray-100">
           <View className="flex-row items-center mb-4">
              <Feather name="shield" size={24} color="#2563EB" className="mr-2" />
              <Text className="text-xl font-bold text-[#0F172A] ml-2 mr-2">Security Audit</Text>
              <MaterialCommunityIcons name="check-circle" size={20} color="#22C55E" />
           </View>
           <Text className="text-[#334155] text-sm mb-4">Your Account is Secure. Last 3 Logins:</Text>
           
           <View className="mb-2 flex-row items-start">
              <Feather name="smartphone" size={16} color="#64748B" className="mr-3 mt-0.5" />
              <Text className="text-[#334155] text-sm flex-1 leading-5 ml-2">iPhone 14 Pro, San Francisco, CA • Today, 10:05 AM</Text>
           </View>
           <View className="mb-2 flex-row items-start">
              <Feather name="compass" size={16} color="#64748B" className="mr-3 mt-0.5" />
              <Text className="text-[#334155] text-sm flex-1 leading-5 ml-2">Safari, New York, NY • Yesterday, 4:30 PM</Text>
           </View>
           <View className="mb-5 flex-row items-start">
              <Feather name="monitor" size={16} color="#64748B" className="mr-3 mt-0.5" />
              <Text className="text-[#334155] text-sm flex-1 leading-5 ml-2">MacBook Air, Seattle, WA • Mar 15, 8:15 AM</Text>
           </View>

           <TouchableOpacity className="w-full py-3 bg-[#F1F5F9] rounded-xl flex-row items-center justify-center">
              <Text className="text-[#0F172A] font-semibold mr-1">View All Activity</Text>
              <Feather name="chevron-right" size={18} color="#0F172A" />
           </TouchableOpacity>
        </View>

        {/* Authentication Section */}
        <Text className="text-[#64748B] text-xs font-semibold tracking-wider mb-2 ml-1">AUTHENTICATION</Text>
        
        <View className="mb-6">
           <View className="bg-white rounded-2xl border border-gray-100 flex-row items-center justify-between p-4 mb-1 shadow-sm shadow-gray-100">
              <View className="flex-row items-center flex-1">
                 <Feather name="key" size={20} color="#2563EB" className="mr-3" />
                 <Text className="text-[#0F172A] text-base ml-2">Two-Factor Authentication</Text>
              </View>
              <Switch value={true} onValueChange={()=>{}} trackColor={{ true: '#22C55E', false: '#CBD5E1' }} />
           </View>
           <Text className="text-[#475569] text-sm ml-1 px-1 mb-4 leading-5">Extra security at sign-in. Enabled for +1 415-555-1234.</Text>

           <View className="bg-white rounded-2xl border border-gray-100 flex-row items-center justify-between p-4 mb-1 shadow-sm shadow-gray-100">
              <View className="flex-row items-center flex-1">
                 <Ionicons name="finger-print" size={20} color="#2563EB" className="mr-3" />
                 <Text className="text-[#0F172A] text-base ml-2">Manage Biometric Login</Text>
              </View>
              <Switch value={true} onValueChange={()=>{}} trackColor={{ true: '#22C55E', false: '#CBD5E1' }} />
           </View>
           <Text className="text-[#475569] text-sm ml-1 px-1 leading-5">Use Face ID or Touch ID for quick access.</Text>
        </View>

        {/* Privacy Section */}
        <Text className="text-[#64748B] text-xs font-semibold tracking-wider mb-2 ml-1 mt-2">PRIVACY</Text>
        <View className="mb-6">
           <TouchableOpacity className="bg-white rounded-2xl border border-gray-100 flex-row items-center justify-between p-4 mb-1 shadow-sm shadow-gray-100">
              <View className="flex-row items-center flex-1">
                 <Feather name="eye" size={20} color="#2563EB" className="mr-3" />
                 <Text className="text-[#0F172A] text-base ml-2">Profile Visibility</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
           </TouchableOpacity>
           <Text className="text-[#475569] text-sm ml-1 px-1 leading-5">Control who can see your profile information and ride history.</Text>
        </View>

        {/* Data & Permissions Section */}
        <Text className="text-[#64748B] text-xs font-semibold tracking-wider mb-2 ml-1 mt-2">DATA & PERMISSIONS</Text>
        <View className="mb-10">
           <TouchableOpacity className="bg-white rounded-2xl border border-gray-100 flex-row items-center justify-between p-4 mb-1 shadow-sm shadow-gray-100">
              <View className="flex-row items-center flex-1">
                 <MaterialCommunityIcons name="database-outline" size={22} color="#2563EB" className="mr-3" />
                 <Text className="text-[#0F172A] text-base ml-2">Manage Data & Permissions</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
           </TouchableOpacity>
           <Text className="text-[#475569] text-sm ml-1 px-1 leading-5 mb-8">Review and control what data you share with the platform.</Text>
        </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="car-outline" size={24} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="wallet-outline" size={24} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="settings-outline" size={24} color="#2563EB" />
          <Text className="text-[#2563EB] text-xs mt-1 font-semibold">Settings</Text>
          <View className="absolute -bottom-3 w-8 h-1 bg-[#2563EB] rounded-t-md" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
