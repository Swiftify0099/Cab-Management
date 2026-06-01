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

export default function NonStopTripConfiguration() {
  return (
    <SafeAreaView className="flex-1 bg-[#E0E7FF]">
      <StatusBar barStyle="dark-content" />
      
      {/* Background Gradient */}
      <LinearGradient 
         colors={['#E0E7FF', '#C7D2FE', '#E9D5FF']} 
         className="absolute inset-0" 
      />

      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between z-10">
        <TouchableOpacity>
          <Feather name="chevron-left" size={32} color="#3B82F6" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Trip Configuration</Text>
        <TouchableOpacity>
          <Text className="text-[#3B82F6] font-bold text-lg">Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* Main Card */}
        <View className="bg-white/40 rounded-[32px] p-6 mb-8 border border-white/60 shadow-sm shadow-indigo-200">
           
           <View className="flex-row items-center justify-between mb-4">
              <View className="w-16 h-16 rounded-full border-2 border-[#6366F1] items-center justify-center opacity-80 bg-indigo-50/50">
                 <Feather name="clock" size={32} color="#6366F1" />
                 {/* Fake checkmark for the clock */}
                 <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <Feather name="check-circle" size={20} color="#6366F1" />
                 </View>
              </View>

              {/* Fake Toggle Button */}
              <TouchableOpacity className="flex-1 ml-4 h-20 rounded-full overflow-hidden relative shadow-md shadow-teal-500/30">
                 <LinearGradient 
                    colors={['#2DD4BF', '#0D9488']} 
                    start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                    className="flex-1 items-center justify-center flex-row pr-12 pl-4"
                 >
                    <Text className="text-white text-lg font-bold leading-5">Declare{'\n'}Non-Stop Trip</Text>
                 </LinearGradient>
                 {/* Toggle Circle */}
                 <View className="absolute right-1 top-1 w-18 h-18 rounded-full bg-white/30 backdrop-blur-md border border-white/50 w-[72px] h-[72px]" />
              </TouchableOpacity>
           </View>

           <Text className="text-gray-700 text-base mb-8 px-2 leading-5">
              Premium service. Direct intercity route for faster delivery.
           </Text>

           {/* Time Saved Box */}
           <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm shadow-gray-200 border border-gray-100">
              <View className="flex-row justify-between items-start mb-2">
                 <Text className="text-black text-base font-medium">Estimated Time Saved:</Text>
                 <Feather name="clock" size={20} color="#9CA3AF" />
              </View>
              <Text className="text-black text-[40px] font-extrabold tracking-tight">45 mins</Text>
           </View>

           {/* Communicate Button */}
           <TouchableOpacity className="w-full h-14 bg-[#3B82F6] rounded-xl flex-row items-center justify-center shadow-md shadow-blue-500/30">
              <MaterialCommunityIcons name="message-text-outline" size={24} color="white" className="mr-2" />
              <Text className="text-white text-lg font-bold">Communicate to Passengers</Text>
           </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Footer Area */}
      <View className="px-5 pb-6 pt-4 bg-transparent z-10">
         <TouchableOpacity className="w-full h-16 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/40 mb-6">
            <LinearGradient 
               colors={['#3B82F6', '#60A5FA']} 
               start={{x: 0, y: 0}} end={{x: 1, y: 0}}
               className="flex-1 items-center justify-center"
            >
               <Text className="text-white text-lg font-bold">Confirm Route & Proceed</Text>
            </LinearGradient>
         </TouchableOpacity>
      </View>

      {/* Bottom Navigation Mock */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-4 pb-8 z-20">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={28} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="car" size={28} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={28} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
