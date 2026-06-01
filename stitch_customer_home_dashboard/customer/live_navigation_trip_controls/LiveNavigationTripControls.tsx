import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Switch,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LiveNavigationTripControls() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [routeOpt, setRouteOpt] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#1E3A8A]">
      <StatusBar barStyle="light-content" />

      {/* Top Banner Navigation */}
      <View className="bg-[#1E3A8A] px-5 py-4 flex-row items-center border-b border-blue-800 pb-6 z-20">
         <MaterialCommunityIcons name="arrow-u-right-top" size={48} color="white" className="mr-4" />
         <View>
            <Text className="text-white text-3xl font-bold mb-1">Turn Right on I-95 N</Text>
            <View className="flex-row items-end">
               <Text className="text-white text-xl font-bold mr-1">2.4</Text>
               <Text className="text-blue-200 text-base mb-0.5">mi</Text>
            </View>
         </View>
      </View>

      {/* Map Background (Mock) */}
      <View className="flex-1 bg-[#0F172A] relative overflow-hidden">
         {/* Fake map grid and roads */}
         <View className="absolute top-10 left-10 w-[800px] h-1 bg-[#1E293B] transform rotate-12" />
         <View className="absolute top-40 left-0 w-[800px] h-1 bg-[#1E293B]" />
         <View className="absolute top-0 left-20 w-1 h-[800px] bg-[#1E293B]" />
         
         {/* Highways */}
         <View className="absolute top-[-100px] left-1/4 w-4 h-[1000px] bg-[#EA580C] transform rotate-[30deg] opacity-70" />
         <View className="absolute top-[-50px] right-1/4 w-4 h-[1000px] bg-[#EA580C] transform rotate-[45deg] opacity-70" />
         
         {/* Main blue route line */}
         <View className="absolute top-1/4 left-1/4 w-6 h-[800px] bg-[#3B82F6] transform rotate-[35deg] rounded-full z-10 border-2 border-blue-400" />
         
         {/* Water mock */}
         <View className="absolute bottom-0 right-0 w-64 h-96 bg-[#020617] rounded-tl-[100px]" />

         {/* Close Button */}
         <TouchableOpacity className="absolute top-6 left-5 flex-row items-center z-30">
            <Feather name="x" size={24} color="#94A3B8" />
            <Text className="text-[#94A3B8] text-lg ml-2">Close</Text>
         </TouchableOpacity>

         {/* Current Location Marker */}
         <View className="absolute top-1/2 left-1/2 transform -translate-x-6 -translate-y-6 z-20">
            <View className="absolute -inset-8 bg-blue-500/20 rounded-full border border-blue-500/30" />
            <View className="w-12 h-12 bg-[#3B82F6] rounded-full items-center justify-center border-4 border-white">
               <Ionicons name="navigate" size={24} color="white" className="ml-1 -mt-1 transform -rotate-45" />
            </View>
         </View>

         {/* Floating Right Controls */}
         <View className="absolute right-5 bottom-8 z-30 items-end">
            
            <TouchableOpacity className="bg-[#1E293B]/90 px-4 py-3 rounded-full mb-4 flex-row items-center border border-gray-700">
               <Text className="text-white text-base mr-3">Recenter</Text>
               <MaterialCommunityIcons name="target" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View className="bg-[#1E293B]/90 px-4 py-2.5 rounded-full mb-4 flex-row items-center border border-gray-700">
               <Text className="text-white text-base mr-3">Sound</Text>
               <Switch
                  trackColor={{ false: '#475569', true: '#ffffff' }}
                  thumbColor={soundEnabled ? '#3B82F6' : '#94A3B8'}
                  ios_backgroundColor="#475569"
                  onValueChange={setSoundEnabled}
                  value={soundEnabled}
                  className="transform scale-90"
               />
            </View>

            <View className="bg-[#1E293B]/90 px-4 py-2 rounded-full flex-row items-center border border-gray-700">
               <View className="mr-3">
                  <Text className="text-white text-base">Route Optimization</Text>
                  <Text className="text-gray-400 text-xs">Optimized Route</Text>
               </View>
               <Switch
                  trackColor={{ false: '#475569', true: '#3B82F6' }}
                  thumbColor={'#ffffff'}
                  ios_backgroundColor="#475569"
                  onValueChange={setRouteOpt}
                  value={routeOpt}
                  className="transform scale-90"
               />
            </View>

         </View>
      </View>

      {/* Bottom Sheet Modal */}
      <View className="bg-[#334155] rounded-t-3xl pt-2 px-5 pb-8 z-40">
         <View className="w-12 h-1.5 bg-gray-500 rounded-full self-center mb-6" />
         
         <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
               <View className="w-12 h-12 bg-gray-400 rounded-full mr-3 overflow-hidden border border-gray-500 items-center justify-center">
                  <Ionicons name="person" size={30} color="#E2E8F0" style={{marginTop:8}}/>
               </View>
               <Text className="text-white text-xl font-medium">Passenger: Sarah Jenkins</Text>
            </View>
            <TouchableOpacity className="w-12 h-12 bg-[#475569] rounded-full items-center justify-center">
               <Ionicons name="call" size={24} color="white" />
            </TouchableOpacity>
         </View>

         <Text className="text-gray-400 text-sm mb-6">
            Trip ID: #TRIP-8492, ETA 4:30 PM • 124 miles remaining
         </Text>

         <View className="h-px bg-gray-600 w-full mb-6" />

         <View className="flex-row justify-between">
            <TouchableOpacity className="flex-1 bg-[#EF4444] py-4 rounded-full mr-2 flex-row items-center justify-center shadow-lg">
               <MaterialCommunityIcons name="alarm-light-outline" size={24} color="white" className="mr-2" />
               <Text className="text-white text-lg font-bold">Emergency SOS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-1 bg-[#FBBF24] py-4 rounded-full ml-2 flex-row items-center justify-center shadow-lg">
               <MaterialCommunityIcons name="coffee" size={24} color="black" className="mr-2" />
               <Text className="text-black text-lg font-bold">Start Break</Text>
            </TouchableOpacity>
         </View>
      </View>
    </SafeAreaView>
  );
}
