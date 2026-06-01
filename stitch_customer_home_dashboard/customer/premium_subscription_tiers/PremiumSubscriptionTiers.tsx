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

export default function PremiumSubscriptionTiers() {
  return (
    <SafeAreaView className="flex-1 bg-[#121212]">
      <StatusBar barStyle="light-content" />

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <Text className="text-white text-3xl font-bold text-center mb-2 mt-4">Premium Subscription Tiers</Text>
        <Text className="text-gray-400 text-center text-base mb-8 px-4 leading-6">
           Elevate your intercity travel experience with exclusive benefits.
        </Text>

        {/* BASIC Tier */}
        <View className="bg-[#1E1E1E] rounded-2xl p-5 mb-6 border border-[#333333] shadow-md shadow-black">
           <View className="flex-row mb-4">
              <View className="items-center mr-4">
                 <MaterialCommunityIcons name="bus" size={40} color="#E0E0E0" />
                 <Text className="text-white font-bold text-lg mt-1">Free</Text>
                 <Text className="text-gray-400 text-xs">or</Text>
                 <Text className="text-gray-400 text-xs">$4.99/mo</Text>
              </View>
              <View className="flex-1 justify-center">
                 <Text className="text-white text-2xl font-bold mb-2 tracking-widest">BASIC</Text>
                 <View className="flex-row items-center mb-1">
                    <View className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                    <Text className="text-gray-300 text-xs flex-1">Standard Matching</Text>
                 </View>
                 <View className="flex-row items-center mb-1">
                    <View className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                    <Text className="text-gray-300 text-xs flex-1">Limited Discounts on Select Routes</Text>
                 </View>
                 <View className="flex-row items-center">
                    <View className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                    <Text className="text-gray-300 text-xs flex-1">Basic Customer Support</Text>
                 </View>
              </View>
           </View>
           <TouchableOpacity className="w-full py-3 rounded-lg border border-[#333] bg-[#2A2A2A] items-center">
              <Text className="text-gray-400 font-bold tracking-widest">CURRENT PLAN</Text>
           </TouchableOpacity>
        </View>

        {/* ELITE Tier (Glowing border) */}
        <View className="rounded-2xl mb-6 shadow-2xl shadow-gray-400/20 relative">
           {/* Glowing effect using a slightly larger view behind */}
           <View className="absolute -inset-0.5 bg-gray-300 rounded-2xl opacity-20 blur-sm" />
           <View className="bg-[#1E1E1E] rounded-2xl p-5 border border-gray-400/50">
              <View className="flex-row justify-between items-start mb-4">
                 <View className="relative">
                    <MaterialCommunityIcons name="bus" size={40} color="#E0E0E0" />
                    <View className="absolute -top-1 -right-2 bg-[#1E1E1E] rounded-full p-0.5">
                       <MaterialCommunityIcons name="star" size={20} color="#E0E0E0" />
                    </View>
                 </View>
                 <View className="flex-1 ml-4 flex-row justify-between items-center">
                    <Text className="text-white text-2xl font-bold tracking-widest">ELITE</Text>
                    <Text className="text-gray-300 font-medium">$19.99/mo</Text>
                 </View>
              </View>
              
              <View className="mb-6 px-2">
                 {[
                    'Zero Cancellation Fees',
                    'Priority Matching',
                    'Lounge Access at Bus Stops (5/month)',
                    '5% Off All Rides',
                    'Premium Customer Support'
                 ].map((benefit, i) => (
                    <View key={i} className="flex-row items-center mb-2">
                       <MaterialCommunityIcons name="check-circle" size={14} color="#9CA3AF" className="mr-2" />
                       <Text className="text-gray-300 text-sm ml-2">{benefit}</Text>
                    </View>
                 ))}
              </View>

              <TouchableOpacity className="w-full py-3 rounded-lg border border-gray-400 bg-[#2A2A2A] items-center">
                 <Text className="text-white font-bold tracking-widest">UPGRADE TO ELITE</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* ENTERPRISE Tier (Gold) */}
        <View className="rounded-2xl mb-8 shadow-2xl shadow-[#D4AF37]/20 relative">
           {/* Glowing effect */}
           <View className="absolute -inset-0.5 bg-[#D4AF37] rounded-2xl opacity-30 blur-sm" />
           <View className="bg-[#1E1E1E] rounded-2xl p-5 border border-[#D4AF37]/80">
              <View className="flex-row justify-between items-start mb-4">
                 <View className="relative">
                    <MaterialCommunityIcons name="bus" size={40} color="#D4AF37" />
                    {/* Fake wings/crown */}
                    <MaterialCommunityIcons name="crown" size={16} color="#D4AF37" className="absolute -top-3 left-3" />
                    <MaterialCommunityIcons name="feather" size={24} color="#D4AF37" className="absolute -right-4 top-1 transform rotate-45" />
                 </View>
                 <View className="flex-1 ml-6 flex-row justify-between items-center">
                    <Text className="text-[#D4AF37] text-2xl font-bold tracking-widest">ENTERPRISE</Text>
                    <Text className="text-[#D4AF37] font-medium">$49.99/mo</Text>
                 </View>
              </View>
              
              <View className="mb-6 px-2">
                 {[
                    'All Elite Benefits Included',
                    'Dedicated Account Manager',
                    'Concierge Service for Bookings',
                    'Unlimited Lounge Access',
                    '10% Off All Rides',
                    'Early Access to New Routes'
                 ].map((benefit, i) => (
                    <View key={i} className="flex-row items-center mb-2">
                       <MaterialCommunityIcons name="check-circle" size={14} color="#D4AF37" className="mr-2" />
                       <Text className="text-gray-300 text-sm ml-2">{benefit}</Text>
                    </View>
                 ))}
              </View>

              <TouchableOpacity className="w-full h-12 rounded-lg items-center justify-center overflow-hidden">
                 <LinearGradient colors={['#FDE047', '#D4AF37', '#A16207']} className="absolute inset-0" />
                 <Text className="text-black font-bold tracking-widest text-sm">SUBSCRIBE TO ENTERPRISE</Text>
              </TouchableOpacity>
           </View>
        </View>

        <Text className="text-center text-gray-500 text-xs mb-8">
           Terms and conditions apply. Plans auto-renew.
        </Text>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-[#121212] border-t border-[#333] flex-row justify-around py-3 pb-8 absolute bottom-0 w-full">
        <TouchableOpacity className="items-center">
          <Ionicons name="home" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="calendar" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-xs mt-1">Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="star-box-multiple" size={24} color="#D4AF37" />
          <Text className="text-[#D4AF37] text-xs mt-1 font-medium">Subscriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="wallet" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-xs mt-1">Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="person" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
