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

export default function ScheduledTripsCalendar() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row justify-end border-b-0">
        <TouchableOpacity>
           <Text className="text-[#2563EB] font-bold text-base">Set Availability</Text>
        </TouchableOpacity>
      </View>
      <View className="px-4 pb-6 border-b border-gray-100">
         <Text className="text-[#0F172A] text-4xl font-black tracking-tight mt-2">Scheduled Trips</Text>
      </View>

      {/* Horizontal Calendar */}
      <View className="py-6 px-2 border-b border-gray-100 mb-2">
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            
            <View className="items-center px-4">
               <Text className="text-gray-400 text-xs font-semibold mb-2">SUN</Text>
               <Text className="text-[#0F172A] text-xl font-bold">15</Text>
            </View>
            <View className="items-center px-4">
               <Text className="text-gray-400 text-xs font-semibold mb-2">MON</Text>
               <Text className="text-[#0F172A] text-xl font-bold">16</Text>
            </View>
            
            {/* Active Day */}
            <View className="items-center px-4 relative">
               <View className="absolute inset-0 bg-[#3B82F6] rounded-full scale-[1.5] shadow-lg shadow-blue-500/50 overflow-hidden">
                  <LinearGradient colors={['#3B82F6', '#8B5CF6']} className="absolute inset-0" />
               </View>
               <Text className="text-white text-xs font-semibold mb-2 relative z-10">TUE</Text>
               <Text className="text-white text-xl font-bold relative z-10">17</Text>
            </View>
            
            <View className="items-center px-4 ml-2">
               <Text className="text-gray-400 text-xs font-semibold mb-2">WED</Text>
               <Text className="text-[#0F172A] text-xl font-bold">18</Text>
            </View>
            <View className="items-center px-4">
               <Text className="text-gray-400 text-xs font-semibold mb-2">THU</Text>
               <Text className="text-[#0F172A] text-xl font-bold">19</Text>
            </View>
            <View className="items-center px-4">
               <Text className="text-gray-400 text-xs font-semibold mb-2">FRI</Text>
               <Text className="text-[#0F172A] text-xl font-bold">20</Text>
            </View>
            <View className="items-center px-4">
               <Text className="text-gray-400 text-xs font-semibold mb-2">SAT</Text>
               <Text className="text-[#0F172A] text-xl font-bold">21</Text>
            </View>
            
         </ScrollView>
      </View>

      {/* Upcoming Bookings Sheet Container */}
      <View className="flex-1 bg-[#F8FAFC] rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] px-5 pt-8 pb-0">
         <Text className="text-[#0F172A] text-xl font-bold mb-6 pl-1">Upcoming Bookings</Text>

         <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            
            {/* Trip Card 1 */}
            <View className="bg-white rounded-3xl mb-5 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
               {/* Gradient Header */}
               <LinearGradient colors={['#3B82F6', '#8B5CF6']} start={{x:0, y:0}} end={{x:1, y:0}} className="p-4 py-5">
                  <Text className="text-white text-xl font-bold mb-3">8:00 AM - 9:15 AM</Text>
                  <View className="flex-row items-center">
                     <View className="flex-row items-center mr-4">
                        <Feather name="clock" size={16} color="white" className="mr-2" />
                        <Text className="text-white font-medium">75 min</Text>
                     </View>
                     <View className="flex-row items-center">
                        <Ionicons name="people" size={18} color="white" className="mr-2" />
                        <Text className="text-white font-medium">2 Passengers</Text>
                     </View>
                  </View>
               </LinearGradient>
               
               <View className="p-5">
                  <Text className="text-[#0F172A] text-base mb-6">Pickup: 123 Main St, City Center</Text>
                  <TouchableOpacity className="self-end">
                     <Text className="text-[#2563EB] font-semibold text-base">View Details</Text>
                  </TouchableOpacity>
               </View>
            </View>

            {/* Trip Card 2 */}
            <View className="bg-white rounded-3xl mb-5 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
               {/* Gradient Header */}
               <LinearGradient colors={['#0EA5E9', '#6366F1']} start={{x:0, y:0}} end={{x:1, y:0}} className="p-4 py-5">
                  <Text className="text-white text-xl font-bold mb-3">11:30 AM - 12:45 PM</Text>
                  <View className="flex-row items-center">
                     <View className="flex-row items-center mr-4">
                        <Feather name="clock" size={16} color="white" className="mr-2" />
                        <Text className="text-white font-medium">75 min</Text>
                     </View>
                     <View className="flex-row items-center">
                        <Ionicons name="people" size={18} color="white" className="mr-2" />
                        <Text className="text-white font-medium">3 Passengers</Text>
                     </View>
                  </View>
               </LinearGradient>
               
               <View className="p-5 pb-6">
                  <Text className="text-[#0F172A] text-base">Pickup: 456 Oak Ave, Suburbia</Text>
               </View>
            </View>

            {/* Trip Card 3 */}
            <View className="bg-white rounded-3xl mb-5 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden">
               {/* Light Header */}
               <View className="p-4 py-5 bg-white border-b border-gray-100">
                  <Text className="text-[#0F172A] text-xl font-bold mb-3">4:00 PM - 5:30 PM</Text>
                  <View className="flex-row items-center">
                     <View className="flex-row items-center mr-4">
                        <Feather name="clock" size={16} color="#475569" className="mr-2" />
                        <Text className="text-[#475569] font-medium">90 min</Text>
                     </View>
                     <View className="flex-row items-center">
                        <Ionicons name="person" size={16} color="#475569" className="mr-2" />
                        <Text className="text-[#475569] font-medium">1 Passenger</Text>
                     </View>
                  </View>
               </View>
               
               <View className="p-5 pb-6">
                  <Text className="text-[#0F172A] text-base">Pickup: 789 Pine Ln, Airport</Text>
               </View>
            </View>

         </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3 pb-8 absolute bottom-0 w-full z-20">
        <TouchableOpacity className="items-center">
          <Ionicons name="home-outline" size={26} color="#94A3B8" />
          <Text className="text-gray-400 text-xs mt-1">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <LinearGradient colors={['#3B82F6', '#8B5CF6']} className="w-8 h-8 rounded-lg items-center justify-center -mt-1 shadow-sm shadow-blue-500/50" start={{x:0, y:0}} end={{x:1, y:1}}>
             <Ionicons name="calendar" size={20} color="white" />
          </LinearGradient>
          <Text className="text-[#2563EB] text-xs mt-1 font-bold">Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="currency-usd-circle-outline" size={28} color="#94A3B8" className="-mt-1" />
          <Text className="text-gray-400 text-xs mt-1">Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={26} color="#94A3B8" />
          <Text className="text-gray-400 text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
