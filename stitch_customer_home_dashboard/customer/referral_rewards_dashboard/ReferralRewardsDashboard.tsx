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

export default function ReferralRewardsDashboard() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="light-content" />

      {/* Top Header Section with Gradient */}
      <View className="h-72 w-full relative border-b border-gray-200 shadow-sm shadow-gray-200">
         <LinearGradient 
            colors={['#0EA5E9', '#0284C7', '#0369A1']} 
            className="absolute inset-0"
            start={{x: 0, y: 0}} end={{x: 1, y: 1}}
         />
         
         <View className="px-6 pt-12 items-center z-10">
            <Text className="text-white text-3xl font-bold mb-2 text-center">Invite Friends & Earn</Text>
            <Text className="text-blue-100 text-base text-center">Share the journey. Get rewards.</Text>
         </View>

         {/* Mock Illustration Area */}
         <View className="absolute bottom-16 w-full items-center justify-center px-4">
            <View className="w-full h-32 bg-white/20 rounded-2xl flex-row items-center justify-center border border-white/30 backdrop-blur-md">
               <MaterialCommunityIcons name="city-variant-outline" size={60} color="#E0F2FE" className="absolute left-4 bottom-2 opacity-60" />
               <MaterialCommunityIcons name="train-car" size={40} color="#E0F2FE" className="absolute right-4 bottom-4 opacity-60" />
               <MaterialCommunityIcons name="account-group" size={80} color="#fff" />
               <View className="absolute -top-4 bg-[#FBBF24] p-2 rounded-full shadow-md shadow-orange-500/50">
                  <MaterialCommunityIcons name="gift" size={24} color="#78350F" />
               </View>
            </View>
         </View>

         {/* Curved separation mock */}
         <View className="absolute bottom-0 w-full h-8 bg-[#F8FAFC] rounded-t-[40px]" />
      </View>

      <ScrollView className="flex-1 -mt-10 px-4" showsVerticalScrollIndicator={false}>
         
         {/* Share Code Card */}
         <View className="bg-white rounded-2xl p-4 shadow-md shadow-gray-200 mb-8 border border-gray-100 flex-row items-center justify-between z-20">
            <Text className="text-[#0F172A] text-xl font-bold tracking-widest pl-2">MOBILITY-2024</Text>
            <TouchableOpacity className="bg-[#0284C7] flex-row items-center px-4 py-2 rounded-xl shadow-sm shadow-blue-500/30">
               <Text className="text-white font-semibold mr-2">Copy Code</Text>
               <Feather name="copy" size={16} color="white" />
            </TouchableOpacity>
         </View>

         {/* Rewards Points Section */}
         <Text className="text-[#0F172A] text-xl font-bold mb-4 px-1">Your Rewards Points</Text>
         <View className="bg-white rounded-2xl p-5 mb-8 shadow-sm shadow-gray-200 border border-gray-100">
            
            <View className="flex-row justify-between items-end mb-2">
               <View>
                  <Text className="text-gray-500 text-sm mb-1">Points</Text>
                  <Text className="text-[#0F172A] text-3xl font-black">2,500</Text>
               </View>
               <Text className="text-[#0F172A] font-bold text-lg mb-1">50%</Text>
            </View>

            <View className="flex-row justify-between items-center mb-4">
               <Text className="text-[#0F172A] font-bold">Points Earned</Text>
               <Text className="text-gray-500 text-xs">5,000 Points for Free Trip</Text>
            </View>

            {/* Progress Bar */}
            <View className="w-full h-4 bg-gray-200 rounded-full mb-6 overflow-hidden">
               <View className="h-full w-1/2 bg-[#10B981] rounded-full" />
            </View>

            <TouchableOpacity className="w-full bg-[#0369A1] py-3.5 rounded-xl items-center justify-center shadow-md shadow-blue-900/20">
               <Text className="text-white font-bold text-lg">Redeem Rewards</Text>
            </TouchableOpacity>
         </View>

         {/* Recent Referrals */}
         <Text className="text-[#0F172A] text-xl font-bold mb-4 px-1">Recent Referrals</Text>
         <View className="bg-white rounded-2xl p-2 mb-8 shadow-sm shadow-gray-200 border border-gray-100">
            
            <TouchableOpacity className="flex-row items-center p-3 border-b border-gray-100">
               <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-4">
                  <MaterialCommunityIcons name="clock-outline" size={24} color="#F59E0B" />
               </View>
               <View className="flex-1">
                  <Text className="text-[#0F172A] text-base font-bold">Alex M. <Text className="text-[#F59E0B]">- Pending</Text></Text>
                  <Text className="text-gray-500 text-xs">(Joined Oct 15)</Text>
               </View>
               <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center p-3 border-b border-gray-100">
               <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                  <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
               </View>
               <View className="flex-1">
                  <Text className="text-[#0F172A] text-base font-bold">Sarah K. <Text className="text-[#10B981]">- Completed</Text></Text>
                  <Text className="text-gray-500 text-xs">(First Trip Oct 12)</Text>
               </View>
               <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center p-3">
               <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4">
                  <MaterialCommunityIcons name="email-outline" size={24} color="#64748B" />
               </View>
               <View className="flex-1">
                  <Text className="text-[#0F172A] text-base font-bold">David L. <Text className="text-[#64748B]">- Pending</Text></Text>
                  <Text className="text-gray-500 text-xs">(Invite Sent Oct 10)</Text>
               </View>
               <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>

         </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="bus" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="people" size={26} color="#0284C7" />
          <Text className="text-[#0284C7] text-xs mt-1 font-semibold">Referrals</Text>
          <View className="absolute -bottom-3 w-8 h-1 bg-[#0284C7] rounded-t-md" />
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={26} color="#94A3B8" />
          <Text className="text-[#94A3B8] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
