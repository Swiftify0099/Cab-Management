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

export default function SmartRouteTollPlanner() {
  return (
    <SafeAreaView className="flex-1 bg-[#111827]">
      <StatusBar barStyle="light-content" />

      {/* Map Background Mock */}
      <View className="absolute inset-0 z-0">
         <View className="w-full h-full bg-[#1E293B] relative overflow-hidden">
            <View className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0F172A] rounded-full opacity-50 blur-3xl" />
            <View className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0F172A] rounded-full opacity-50 blur-3xl" />
            
            {/* Route Line Mock */}
            <View className="absolute top-[35%] left-[30%] w-[40%] h-[40%] border-t-4 border-l-4 border-[#38BDF8] rounded-tl-[80px] transform rotate-45 opacity-80 shadow-md shadow-sky-500" />
            
            {/* Stops */}
            <View className="absolute top-[38%] left-[30%] items-center">
               <View className="w-4 h-4 bg-white rounded-full border-4 border-[#3B82F6] shadow-md shadow-black mb-1" />
            </View>
            <View className="absolute top-[41%] left-[38%] items-center">
               <View className="w-4 h-4 bg-white rounded-full border-4 border-[#3B82F6] shadow-md shadow-black mb-1" />
            </View>
            <View className="absolute top-[45%] left-[57%] items-center">
               <View className="w-4 h-4 bg-white rounded-full border-4 border-[#3B82F6] shadow-md shadow-black mb-1" />
            </View>
            
            <View className="absolute top-[70%] left-[71%] items-center">
               {/* Destination Glow */}
               <View className="absolute -inset-4 bg-red-500 rounded-full opacity-20 blur-xl" />
               <View className="w-4 h-4 bg-white rounded-full border-4 border-gray-600 shadow-md shadow-black mb-1" />
            </View>

            <Text className="absolute top-[37%] left-[12%] text-gray-300 font-medium text-sm drop-shadow-md">Mumbai</Text>
            <Text className="absolute top-[69%] left-[76%] text-gray-300 font-medium text-sm drop-shadow-md">Bangalore</Text>
         </View>
      </View>

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center z-10">
        <TouchableOpacity className="w-8">
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1 text-center">Route Planner</Text>
        <TouchableOpacity className="w-8 items-end">
           <Ionicons name="person-circle-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View className="px-6 mb-4 z-10">
         <View className="bg-white/10 rounded-full p-1.5 flex-row items-center border border-white/20 backdrop-blur-md">
            <View className="flex-1 py-2 items-center justify-center">
               <Text className="text-gray-400 font-medium">Fastest Route</Text>
            </View>
            <View className="flex-1 bg-[#3B82F6]/20 rounded-full py-2 items-center justify-center flex-row shadow-sm shadow-black/50">
               <View className="w-4 h-4 bg-white rounded-full mr-2 shadow-sm shadow-black/20" />
               <Text className="text-white font-medium">Most Profitable Route</Text>
            </View>
         </View>
      </View>

      <ScrollView className="flex-1 px-4 z-10" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
         
         {/* Summary Card */}
         <View className="bg-white/10 rounded-2xl p-5 mb-4 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/50">
            <Text className="text-gray-300 text-base mb-2">Total Trip: <Text className="text-white font-bold">1,050 km</Text></Text>
            <Text className="text-gray-300 text-base mb-2">Est. Time: <Text className="text-white font-bold">18 hrs 45 min</Text></Text>
            <Text className="text-gray-300 text-base mb-2">Toll Estimate: <Text className="text-white font-bold">₹4,200 (Live)</Text></Text>
            <Text className="text-gray-300 text-base">Profit Margin: <Text className="text-[#4ADE80] font-bold">+22%</Text></Text>
         </View>

         {/* Stops Cards */}
         <View className="bg-white/10 rounded-2xl p-5 mb-4 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/50">
            <Text className="text-white text-lg font-bold mb-2">Next Stop: Pune (Pick-up)</Text>
            <Text className="text-gray-300 text-base mb-1.5">Arrival: <Text className="text-white">11:30 AM</Text></Text>
            <Text className="text-gray-300 text-base mb-1.5">Cargo: <Text className="text-white">500 kg</Text></Text>
            <Text className="text-gray-300 text-base">Toll: <Text className="text-white">₹350 (Mumbai-Pune Expressway)</Text></Text>
         </View>

         <View className="bg-white/10 rounded-2xl p-5 mb-4 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/50">
            <Text className="text-white text-lg font-bold mb-2">Smart Fuel Stop</Text>
            <Text className="text-gray-300 text-base mb-1.5">Fuel at HPCL - Solapur, <Text className="text-white">₹96.50/L</Text></Text>
            <Text className="text-gray-300 text-base mb-1.5">Distance: <Text className="text-white">120 km</Text></Text>
            <Text className="text-gray-300 text-base">Est. Savings: <Text className="text-white">₹180</Text></Text>
         </View>

         <View className="bg-white/10 rounded-2xl p-5 mb-8 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/50">
            <Text className="text-white text-lg font-bold mb-2">Destination: Bangalore (Delivery)</Text>
            <Text className="text-gray-300 text-base mb-1.5">Arrival: <Text className="text-white">8:15 PM</Text></Text>
            <Text className="text-gray-300 text-base mb-6">Toll: <Text className="text-white">₹1,100</Text></Text>

            <TouchableOpacity className="w-full rounded-xl overflow-hidden shadow-lg shadow-blue-500/50">
               <LinearGradient colors={['#38BDF8', '#2563EB']} className="w-full py-4 items-center">
                  <Text className="text-white text-lg font-bold">Confirm & Start</Text>
               </LinearGradient>
            </TouchableOpacity>
         </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View className="bg-[#0F172A] border-t border-gray-800 flex-row justify-around py-3 pb-8 absolute bottom-0 w-full z-30">
        <TouchableOpacity className="items-center">
          <Ionicons name="home" size={26} color="#3B82F6" />
          <Text className="text-[#3B82F6] text-xs mt-1 font-semibold">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="truck-outline" size={28} color="#64748B" className="-mt-1" />
          <Text className="text-[#64748B] text-xs mt-0.5">Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Ionicons name="wallet-outline" size={26} color="#64748B" />
          <Text className="text-[#64748B] text-xs mt-1">Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Feather name="user" size={26} color="#64748B" />
          <Text className="text-[#64748B] text-xs mt-1">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
