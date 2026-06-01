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

export default function FestivalOffersPromotions() {
  return (
    <SafeAreaView className="flex-1 bg-[#1A0B2E]">
      <StatusBar barStyle="light-content" />

      {/* Festive Background Mock */}
      <View className="absolute inset-0 overflow-hidden bg-[#1A0B2E]">
         {/* Top Gradient */}
         <View className="absolute top-0 w-full h-96 bg-[#4A148C] opacity-40 blur-3xl" />
         
         {/* Mocking Mandalas/Diyas with blurred circles */}
         <View className="absolute top-10 right-0 w-48 h-48 rounded-full bg-orange-500 opacity-20 blur-2xl" />
         <View className="absolute top-40 right-10 w-32 h-32 rounded-full bg-yellow-400 opacity-20 blur-xl" />
         <View className="absolute bottom-20 left-10 w-40 h-40 rounded-full bg-purple-600 opacity-30 blur-2xl" />
         
         {/* Lanterns Mock */}
         <View className="absolute -top-4 right-12 w-12 h-32 bg-[#F59E0B] rounded-b-xl opacity-30 blur-sm" />
         <View className="absolute top-4 right-2 w-8 h-24 bg-[#EF4444] rounded-b-xl opacity-30 blur-sm" />
         
         {/* Confetti mock */}
         <View className="absolute top-20 left-10 w-2 h-6 bg-yellow-400 transform rotate-45 rounded-full" />
         <View className="absolute top-32 left-32 w-2 h-4 bg-red-400 transform -rotate-12 rounded-full" />
         <View className="absolute top-12 left-1/2 w-3 h-3 bg-blue-400 rounded-full" />
         <View className="absolute top-48 left-8 w-2 h-6 bg-green-400 transform rotate-12 rounded-full" />
         <View className="absolute top-64 right-1/3 w-2 h-5 bg-pink-400 transform -rotate-45 rounded-full" />
      </View>

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between z-10">
        <TouchableOpacity className="w-10 h-10 rounded-full bg-white/10 items-center justify-center backdrop-blur-md">
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-white/10 items-center justify-center backdrop-blur-md">
          <Feather name="user" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 z-10" showsVerticalScrollIndicator={false}>
        
        {/* Main Title Section */}
        <View className="px-5 mb-8">
           <Text className="text-white text-[42px] font-extrabold leading-[48px] mb-4 shadow-sm shadow-black">
              Festival Offers{'\n'}& Promotions
           </Text>
           <Text className="text-gray-300 text-lg leading-6 pr-10">
              Celebrate with exclusive deals on intercity travel & parcels.
           </Text>
        </View>

        {/* Offers Grid */}
        <View className="px-4 flex-row flex-wrap justify-between pb-10">
           
           {/* Card 1 */}
           <View className="w-[48%] bg-white/10 rounded-3xl p-4 border border-white/20 mb-4 items-center overflow-hidden backdrop-blur-lg">
              <View className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
              
              <View className="w-full h-24 mb-3 items-center justify-center relative">
                 {/* Fake illustration */}
                 <MaterialCommunityIcons name="bus-double-decker" size={60} color="#FBBF24" />
                 <MaterialCommunityIcons name="train" size={40} color="#60A5FA" className="absolute bottom-2 right-4" />
              </View>

              <Text className="text-white text-lg font-bold text-center mb-4 leading-6">Flat 50% Off{'\n'}on Intercity</Text>
              
              <Text className="text-gray-300 text-sm mb-3">Ends in: 02d 14h 28m</Text>
              
              <TouchableOpacity className="w-full bg-[#0EA5E9] py-3 rounded-xl flex-row items-center justify-center">
                 <MaterialCommunityIcons name="cart-outline" size={20} color="white" className="mr-1" />
                 <Text className="text-white font-bold">Claim Offer</Text>
              </TouchableOpacity>
           </View>

           {/* Card 2 */}
           <View className="w-[48%] bg-white/10 rounded-3xl p-4 border border-white/20 mb-4 items-center overflow-hidden backdrop-blur-lg">
              <View className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
              
              <View className="w-full h-24 mb-3 items-center justify-center relative">
                 <MaterialCommunityIcons name="package-variant-closed" size={60} color="#FBBF24" />
                 {/* Wings mock */}
                 <Feather name="wind" size={30} color="#93C5FD" className="absolute top-2 -left-2" />
                 <Feather name="wind" size={30} color="#93C5FD" className="absolute top-2 -right-2 transform scale-x-[-1]" />
              </View>

              <Text className="text-white text-lg font-bold text-center mb-4 leading-6">Double Points{'\n'}on Parcels</Text>
              
              <Text className="text-gray-300 text-sm mb-3">Ends in: 01d 08h 15m</Text>
              
              <TouchableOpacity className="w-full bg-[#0EA5E9] py-3 rounded-xl flex-row items-center justify-center">
                 <MaterialCommunityIcons name="cart-outline" size={20} color="white" className="mr-1" />
                 <Text className="text-white font-bold">Claim Offer</Text>
              </TouchableOpacity>
           </View>

           {/* Card 3 */}
           <View className="w-[48%] bg-white/10 rounded-3xl p-4 border border-white/20 mb-4 items-center overflow-hidden backdrop-blur-lg">
              <View className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
              
              <View className="w-full h-24 mb-3 items-center justify-center">
                 <Ionicons name="car-sport" size={70} color="#A78BFA" />
              </View>

              <Text className="text-white text-lg font-bold text-center mb-4 leading-6">Free Luxury Upgrade{'\n'}on Select Routes</Text>
              
              <Text className="text-gray-300 text-sm mb-3">Ends in: 03d 21h 45m</Text>
              
              <TouchableOpacity className="w-full bg-[#0EA5E9] py-3 rounded-xl flex-row items-center justify-center">
                 <MaterialCommunityIcons name="cart-outline" size={20} color="white" className="mr-1" />
                 <Text className="text-white font-bold">Claim Offer</Text>
              </TouchableOpacity>
           </View>

           {/* Card 4 */}
           <View className="w-[48%] bg-white/10 rounded-3xl p-4 border border-white/20 mb-4 items-center overflow-hidden backdrop-blur-lg">
              <View className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
              
              <View className="w-full h-24 mb-3 items-center justify-center flex-row">
                 <Ionicons name="person" size={50} color="#FCA5A5" />
                 <Ionicons name="person" size={40} color="#93C5FD" className="-ml-4 mt-4" />
              </View>

              <Text className="text-white text-lg font-bold text-center mb-4 leading-6">Refer a Friend &{'\n'}Earn $20 Credit</Text>
              
              <Text className="text-gray-300 text-sm mb-3">Ends in: 05d 11h 30m</Text>
              
              <TouchableOpacity className="w-full bg-[#0EA5E9] py-3 rounded-xl items-center justify-center">
                 <Text className="text-white font-bold">Invite Now</Text>
              </TouchableOpacity>
           </View>

        </View>
      </ScrollView>

      {/* Bottom Navigation Mock */}
      <View className="bg-white flex-row justify-around py-3 pb-8 z-20">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center relative">
          <MaterialCommunityIcons name="brightness-percent" size={24} color="#0EA5E9" />
          <Text className="text-[#0EA5E9] text-xs mt-1 font-semibold">Offers</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="help-circle-outline" size={24} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-xs mt-1">Support</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
