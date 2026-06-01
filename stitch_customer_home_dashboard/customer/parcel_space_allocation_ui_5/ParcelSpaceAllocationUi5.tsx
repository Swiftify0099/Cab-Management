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

export default function ParcelSpaceAllocationUi5() {
  return (
    <SafeAreaView className="flex-1 bg-[#0A0F1C]">
      <StatusBar barStyle="light-content" />

      {/* Header Tabs */}
      <View className="pt-2 pb-4 flex-row items-center border-b border-[#1E293B] bg-[#0A0F1C] z-20 shadow-md shadow-black">
        <TouchableOpacity className="ml-4 mr-2">
          <Feather name="chevron-left" size={28} color="#3B82F6" />
        </TouchableOpacity>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerStyle={{alignItems: 'center', paddingRight: 20}}>
           {['5', '7', '10', '17', '19', '25', '50'].map((num, idx) => (
              <View key={idx} className={`mr-4 px-3 py-1.5 rounded-xl ${num === '25' ? 'bg-[#1E293B] border border-[#334155]' : ''}`}>
                 <Text className={`text-lg font-medium ${num === '25' ? 'text-white' : 'text-gray-400'}`}>{num}</Text>
              </View>
           ))}
           <Text className="text-[#3B82F6] text-lg font-bold ml-4">Confirm</Text>
        </ScrollView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Vehicle Info Box */}
        <View className="mx-4 mt-6 mb-6 bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex-row justify-between shadow-lg shadow-black">
           <View className="flex-1 pr-2 border-r border-[#334155]">
              <Text className="text-gray-400 text-xs mb-1">Vehicle:</Text>
              <Text className="text-gray-300 text-xs font-medium">25-Seater Mid-size Coach (CD56 7890)</Text>
           </View>
           <View className="px-4 border-r border-[#334155] justify-center">
              <Text className="text-gray-400 text-xs mb-1">Total Capacity</Text>
              <Text className="text-white text-sm font-bold">3500kg</Text>
           </View>
           <View className="pl-4 justify-center">
              <Text className="text-gray-400 text-xs mb-1">Remaining Capacity</Text>
              <Text className="text-white text-sm font-bold">45%</Text>
           </View>
        </View>

        {/* Top-Down Bus Layout */}
        <View className="h-[500px] w-full relative mb-4 items-center overflow-visible">
           
           {/* Grid Pattern */}
           <View className="absolute inset-0 opacity-10">
              {[...Array(8)].map((_, i) => (
                 <View key={`v-${i}`} className="w-px h-full bg-[#3B82F6] absolute" style={{left: `${(i+1)*12.5}%`}} />
              ))}
              {[...Array(12)].map((_, i) => (
                 <View key={`h-${i}`} className="h-px w-full bg-[#3B82F6] absolute" style={{top: `${(i+1)*8.3}%`}} />
              ))}
           </View>

           {/* Floating Tags */}
           <View className="absolute left-2 top-1/2 -mt-10 bg-[#1E293B]/80 border border-[#334155] rounded-xl p-2 z-20 backdrop-blur-md">
              <Text className="text-gray-300 text-xs text-center leading-4">Under-carriage{'\n'}Storage Left</Text>
           </View>
           <View className="absolute right-2 top-1/2 -mt-10 bg-[#1E293B]/80 border border-[#334155] rounded-xl p-2 z-20 backdrop-blur-md">
              <Text className="text-gray-300 text-xs text-center leading-4">Under-carriage{'\n'}Storage Right</Text>
           </View>

           {/* Top Tooltip */}
           <View className="absolute top-12 right-6 bg-[#1E3A8A]/30 border border-[#3B82F6]/50 rounded-xl p-3 w-56 shadow-xl shadow-blue-900/50 z-30 backdrop-blur-xl">
              <Text className="text-white text-sm font-bold">Rear Boot Zone{'\n'}<Text className="font-normal text-gray-300 text-xs">(Available: 1200kg)</Text></Text>
              <View className="flex-row items-center mt-2 mb-1">
                 <View className="w-0.5 h-3 bg-[#60A5FA] mr-2" />
                 <Text className="text-[#60A5FA] text-xs">Breakdown:</Text>
              </View>
              <Text className="text-gray-200 text-xs leading-4">
                 4 Large Boxes (200kg),{'\n'}8 Medium Boxes (100kg each),{'\n'}Loose Items (200kg)
              </Text>
           </View>

           {/* Bus Outline */}
           <View className="w-64 h-full bg-[#111827]/90 rounded-t-[50px] border-4 border-b-0 border-[#334155] relative overflow-hidden z-10 shadow-2xl shadow-black">
              
              {/* Giant Rear Boot area */}
              <View className="w-full h-40 bg-[#1E3A8A]/40 border-b-2 border-[#3B82F6]/50 shadow-inner rounded-b-xl mb-4" />

              {/* Rows of seats (2x2 layout) */}
              <View className="flex-1 px-4 flex-row flex-wrap justify-between content-start">
                 {[...Array(16)].map((_, idx) => (
                    <View key={idx} className={`w-[22%] aspect-square rounded-xl bg-[#1E293B] border border-[#475569] mb-3 items-center justify-center shadow-md shadow-black relative overflow-hidden ${idx % 4 === 1 ? 'mr-[10%]' : ''}`}>
                       {idx === 4 || idx === 6 || idx === 8 ? (
                          <Feather name="plus" size={14} color="#9CA3AF" />
                       ) : (
                          <Text className="text-gray-400 text-xs font-medium">{idx + 1}</Text>
                       )}
                    </View>
                 ))}
              </View>

              {/* Gradient fade at bottom to simulate it continues off screen */}
              <LinearGradient colors={['transparent', '#0A0F1C']} className="absolute bottom-0 w-full h-12" />
           </View>
           
           {/* Slider Overlay on top of Bus bottom */}
           <View className="absolute bottom-4 left-1/2 -ml-[45%] w-[90%] bg-[#1E293B]/95 rounded-xl p-3 border border-[#334155] shadow-2xl shadow-black z-30 backdrop-blur-xl">
              <View className="absolute -top-3 right-4 bg-[#22C55E] px-3 py-0.5 rounded-full z-10 border border-[#166534]">
                 <Text className="text-white text-xs font-bold">Balanced: 85%</Text>
              </View>
              <Text className="text-gray-300 text-xs mb-2">Weight Distribution <Text className="text-gray-500" style={{fontSize: 10}}>(Safety Check)</Text></Text>
              
              <View className="w-full h-2 bg-[#0F172A] rounded-full mb-2 flex-row relative">
                 <View className="w-[85%] h-full bg-[#3B82F6] rounded-full" />
                 <View className="w-4 h-4 rounded-full bg-gray-400 absolute -top-1 left-[85%] border-2 border-[#1E293B]" />
              </View>

              <Text className="text-gray-400 text-center text-[10px]">Rear: 1200kg | Front: 500kg | Under: 1300kg</Text>
           </View>

        </View>

        {/* Pending Requests Box */}
        <View className="px-4 pb-4 mt-6">
           <Text className="text-white text-xl font-bold mb-4 shadow-sm shadow-black">Pending Requests (2)</Text>
           
           {[
              { title: "New Parcel Request -", subtitle: "15kg, 40x40x30cm" },
              { title: "Medium Box -", subtitle: "25kg, 50x50x40cm" }
           ].map((item, idx) => (
              <View key={idx} className="bg-[#111827] rounded-xl p-4 border border-[#1E293B] flex-row items-center justify-between mb-3 shadow-md shadow-black">
                 <View className="flex-1">
                    <Text className="text-white text-sm font-bold">{item.title}</Text>
                    <Text className="text-gray-400 text-xs">{item.subtitle}</Text>
                 </View>
                 <View className="flex-row">
                    <TouchableOpacity className="px-4 py-2 border border-[#334155] rounded-lg mr-2 bg-[#1E293B]/50">
                       <Text className="text-gray-400 font-medium text-sm">Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="px-4 py-2 bg-[#1E3A8A] border border-[#3B82F6]/50 rounded-lg shadow-sm shadow-blue-500/20">
                       <Text className="text-[#60A5FA] font-medium text-sm">Allocate</Text>
                    </TouchableOpacity>
                 </View>
              </View>
           ))}
        </View>

      </ScrollView>

      {/* Confirm Button */}
      <View className="px-4 pb-6 pt-2 bg-[#0A0F1C]">
         <TouchableOpacity className="w-full h-14 bg-[#1E3A8A]/80 rounded-xl items-center justify-center border border-[#3B82F6]/50 shadow-lg shadow-blue-900/50">
            <LinearGradient colors={['transparent', 'rgba(37, 99, 235, 0.2)']} className="absolute inset-0 rounded-xl" />
            <Text className="text-white text-lg font-bold">Confirm Allocation</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
