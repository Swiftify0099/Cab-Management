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
import { LinearGradient } from 'expo-linear-gradient';

export default function ScheduleFutureIntercityRide() {
  return (
    <SafeAreaView className="flex-1 bg-[#F0F7FF]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-blue-100 bg-white">
        <TouchableOpacity className="w-8">
          <Feather name="chevron-left" size={28} color="#1D4ED8" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center">Schedule Trip</Text>
        <TouchableOpacity className="w-12 items-end">
           <Text className="text-[#1D4ED8] font-bold text-base">Done</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="px-4 py-4 bg-white border-b border-blue-50">
         <View className="bg-[#E2E8F0] rounded-xl p-1 flex-row">
            <TouchableOpacity className="flex-1 bg-white py-2 rounded-lg items-center shadow-sm shadow-gray-300">
               <Text className="text-[#0F172A] font-bold">One-Way</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-2 rounded-lg items-center">
               <Text className="text-[#64748B] font-medium">Round-Trip</Text>
            </TouchableOpacity>
         </View>
      </View>

      <ScrollView className="flex-1 pt-6 px-4" showsVerticalScrollIndicator={false}>
         
         {/* Date and Time Picker Mock */}
         <View className="bg-white rounded-2xl mb-6 shadow-sm shadow-blue-100 p-2 border border-blue-50 relative overflow-hidden h-48 justify-center">
            
            {/* Selection Highlight */}
            <View className="absolute top-1/2 -mt-6 w-full px-2 flex-row justify-between z-0">
               <View className="h-12 bg-[#F1F5F9] rounded-xl w-[48%]" />
               <View className="h-12 bg-[#F1F5F9] rounded-xl w-[48%]" />
            </View>
            
            <View className="flex-row w-full justify-between items-center z-10 h-full">
               
               {/* Date Wheel */}
               <View className="flex-1 items-center justify-around h-full">
                  <Text className="text-[#CBD5E1] text-lg">Tue, Oct 22</Text>
                  <Text className="text-[#94A3B8] text-lg">Wed, Oct 23</Text>
                  <Text className="text-[#64748B] text-xl">Thu, Oct 24</Text>
                  <Text className="text-[#0F172A] text-2xl font-medium">Fri, Oct 25</Text>
                  <Text className="text-[#64748B] text-xl">Fri, Oct 25</Text>
                  <Text className="text-[#94A3B8] text-lg">Sat, Oct 27</Text>
                  <Text className="text-[#CBD5E1] text-lg">Mon, Oct 28</Text>
               </View>
               
               {/* Time Wheel */}
               <View className="flex-1 items-center justify-around h-full">
                  <Text className="text-[#CBD5E1] text-lg">8:00 AM</Text>
                  <Text className="text-[#94A3B8] text-lg">9:00 AM</Text>
                  <Text className="text-[#64748B] text-xl">9:00 AM</Text>
                  <Text className="text-[#0F172A] text-2xl font-medium">9:00 AM</Text>
                  <Text className="text-[#64748B] text-xl">9:00 AM</Text>
                  <Text className="text-[#94A3B8] text-lg">6:00 AM</Text>
                  <Text className="text-[#CBD5E1] text-lg">7:00 AM</Text>
               </View>
            </View>

            {/* Gradient Masks */}
            <LinearGradient colors={['white', 'transparent']} className="absolute top-0 w-full h-8 z-20" />
            <LinearGradient colors={['transparent', 'white']} className="absolute bottom-0 w-full h-8 z-20" />
         </View>
         
         <Text className="text-center text-[#475569] text-sm mb-6">Booking up to 30 days in advance.</Text>

         {/* Availability Heatmap */}
         <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm shadow-blue-100 border border-blue-50">
            <Text className="text-center text-[#0F172A] font-medium mb-4">Availability Heatmap</Text>
            <View className="flex-row justify-between items-center px-2">
               
               <View className="items-center">
                  <Text className="text-[#475569] mb-2 text-sm">Mon</Text>
                  <View className="w-3 h-3 rounded-full bg-[#22C55E]" />
               </View>
               <View className="items-center">
                  <Text className="text-[#475569] mb-2 text-sm">Tue</Text>
                  <View className="w-3 h-3 rounded-full bg-[#22C55E]" />
               </View>
               <View className="items-center">
                  <Text className="text-[#475569] mb-2 text-sm">Wed</Text>
                  <View className="w-3 h-3 rounded-full bg-[#FACC15]" />
               </View>
               <View className="items-center">
                  <Text className="text-[#475569] mb-2 text-sm">Thu</Text>
                  <View className="w-3 h-3 rounded-full bg-[#22C55E]" />
               </View>
               <View className="items-center bg-[#F1F5F9] rounded-xl p-2 -my-2 -mx-2 shadow-sm border border-gray-200">
                  <Text className="text-[#0F172A] font-bold mb-2 text-sm">Fri</Text>
                  <View className="w-3 h-3 rounded-full bg-[#EF4444]" />
               </View>
               <View className="items-center">
                  <Text className="text-[#475569] mb-2 text-sm">Sat</Text>
                  <View className="w-3 h-3 rounded-full bg-[#FACC15]" />
               </View>
               <View className="items-center">
                  <Text className="text-[#475569] mb-2 text-sm">Sun</Text>
                  <View className="w-3 h-3 rounded-full bg-[#EF4444]" />
               </View>

            </View>
         </View>

         {/* Trip Summary Card */}
         <View className="bg-white rounded-2xl p-5 mb-8 shadow-md shadow-blue-200/50 border border-blue-50 relative overflow-hidden">
            {/* Subtle background glow */}
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50" />

            <Text className="text-center text-[#0F172A] font-bold text-lg mb-6">Trip Summary</Text>
            
            <View className="flex-row items-stretch mb-6">
               <View className="items-center mr-4 mt-1">
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color="#94A3B8" />
                  <View className="w-0.5 flex-1 bg-gray-200 my-1 rounded" style={{borderStyle: 'dotted', borderWidth: 1, borderColor: '#CBD5E1'}} />
                  <MaterialCommunityIcons name="map-marker" size={20} color="#94A3B8" />
               </View>
               <View className="flex-1 justify-between py-1">
                  <View className="mb-4">
                     <Text className="text-[#64748B] text-xs">From:</Text>
                     <Text className="text-[#0F172A] text-base font-medium">New York City</Text>
                  </View>
                  <View>
                     <Text className="text-[#64748B] text-xs">To:</Text>
                     <Text className="text-[#0F172A] text-base font-medium">Philadelphia</Text>
                  </View>
               </View>
            </View>

            <View className="flex-row items-center border-t border-b border-gray-100 py-4 mb-4">
               <Feather name="calendar" size={18} color="#94A3B8" className="mr-3" />
               <Text className="text-[#0F172A] font-medium">Fri, Oct 25 at 9:00 AM</Text>
            </View>

            <View className="flex-row justify-between items-center py-2">
               <Text className="text-[#0F172A] text-base">Notify me 1 hour before</Text>
               <Switch value={true} onValueChange={()=>{}} trackColor={{true: '#4ADE80', false: '#E2E8F0'}} />
            </View>
         </View>

      </ScrollView>

      {/* Review Trip Button */}
      <View className="px-4 pb-8 pt-2 bg-transparent">
         <TouchableOpacity className="w-full bg-[#2563EB] py-4 rounded-xl items-center shadow-lg shadow-blue-500/30">
            <Text className="text-white font-bold text-lg tracking-wide">Review Trip</Text>
         </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
