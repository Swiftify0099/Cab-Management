import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaymentErrorRecovery() {
  return (
    <SafeAreaView className="flex-1 bg-[#E0E7FF]">
      <StatusBar barStyle="dark-content" />

      {/* Soft Background Gradient */}
      <LinearGradient 
         colors={['#E0E7FF', '#DBEAFE', '#F3E8FF', '#E0E7FF']} 
         className="absolute inset-0" 
         start={{x: 0, y: 0}}
         end={{x: 1, y: 1}}
      />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center z-10 justify-center relative border-b border-white/20">
        <TouchableOpacity className="absolute left-5">
          <Feather name="chevron-left" size={32} color="#1E293B" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold">Payment Error</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-12" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
        
        {/* 3D Graphic Mock (Credit Card + Error) */}
        <View className="w-64 h-64 items-center justify-center mb-6 relative">
           
           {/* Fake 3D Credit Card */}
           <View className="w-56 h-36 bg-[#A5B4FC] rounded-2xl transform -rotate-6 shadow-xl shadow-indigo-300 relative border border-white/60 overflow-hidden">
              <LinearGradient colors={['rgba(255,255,255,0.4)', 'transparent']} className="absolute inset-0" />
              <View className="w-10 h-8 bg-[#FBBF24] rounded-md absolute top-4 left-4 shadow-sm shadow-orange-200" />
              <View className="flex-row absolute top-16 left-4 opacity-70">
                 <View className="w-8 h-2 bg-white rounded-full mr-2" />
                 <View className="w-8 h-2 bg-white rounded-full mr-2" />
                 <View className="w-8 h-2 bg-white rounded-full mr-2" />
                 <View className="w-8 h-2 bg-white rounded-full" />
              </View>
              <View className="w-32 h-3 bg-[#6366F1] rounded-full absolute bottom-6 left-4 opacity-50" />
           </View>

           {/* Floating broken link icon */}
           <View className="absolute top-4 right-4 w-16 h-16 bg-white/40 border border-white/80 rounded-2xl items-center justify-center backdrop-blur-xl shadow-lg shadow-gray-200 transform rotate-12">
              <Feather name="link-2" size={32} color="#EF4444" />
              <View className="absolute w-10 h-1 bg-red-400 transform -rotate-45" />
           </View>

           {/* Giant 3D Red X Mark Mock */}
           <View className="absolute bottom-6 right-6 w-24 h-24 items-center justify-center shadow-2xl shadow-red-500/40">
              <LinearGradient colors={['#FCA5A5', '#EF4444']} className="w-6 h-20 rounded-full absolute transform rotate-45 shadow-sm shadow-red-900/20 border border-red-300" />
              <LinearGradient colors={['#FCA5A5', '#EF4444']} className="w-6 h-20 rounded-full absolute transform -rotate-45 shadow-sm shadow-red-900/20 border border-red-300" />
           </View>
        </View>

        {/* Error Text */}
        <Text className="text-[#0F172A] text-4xl font-extrabold mb-4 text-center tracking-tight">Payment Failed</Text>
        <Text className="text-[#334155] text-lg text-center leading-7 px-4 mb-8">
           Your bank declined the transaction. Please check your balance or try another method.
        </Text>

        {/* Action Buttons inside Glass Container */}
        <View className="w-full bg-white/30 border border-white/60 rounded-3xl p-6 backdrop-blur-xl shadow-lg shadow-indigo-200/50 mb-8">
           
           <TouchableOpacity className="w-full bg-white/70 py-4 rounded-xl items-center justify-center mb-4 border border-white shadow-sm shadow-gray-200">
              <Text className="text-[#0F172A] text-lg font-semibold">Retry with PhonePe</Text>
           </TouchableOpacity>

           <TouchableOpacity className="w-full bg-white/70 py-4 rounded-xl items-center justify-center mb-4 border border-white shadow-sm shadow-gray-200">
              <Text className="text-[#0F172A] text-lg font-semibold">Use Wallet Balance (₹450.00)</Text>
           </TouchableOpacity>

           <TouchableOpacity className="w-full bg-white/40 py-4 rounded-xl items-center justify-center border border-white/60 shadow-sm shadow-indigo-100">
              <Text className="text-[#0F172A] text-lg font-semibold">Change Payment Method</Text>
           </TouchableOpacity>
           
        </View>

      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white/80 border-t border-white flex-row justify-around py-3 pb-8 backdrop-blur-lg">
        <TouchableOpacity className="items-center">
          <Ionicons name="home" size={26} color="#1E3A8A" />
          <Text className="text-[#1E3A8A] text-xs mt-1 font-semibold">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="road-variant" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="wallet-outline" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
