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

export default function ParcelSpaceAllocationUi6() {
  return (
    <SafeAreaView className="flex-1 bg-[#050A14]">
      <StatusBar barStyle="light-content" />

      {/* Horizontal Fleet Switcher Header */}
      <View className="px-4 pt-4 pb-4 bg-[#050A14] border-b border-[#1E293B] z-20">
         <Text className="text-gray-500 text-xs mb-2 ml-1">Fleet Model Switcher</Text>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <TouchableOpacity className="px-4 py-2 border border-[#334155] rounded-xl mr-3 bg-[#0F172A]">
               <Text className="text-gray-300 font-medium text-sm">5-Seater Sedan</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-2 border border-[#334155] rounded-xl mr-3 bg-[#0F172A]">
               <Text className="text-gray-300 font-medium text-sm">15-Seater Van</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-2 border border-[#3B82F6] rounded-xl bg-[#1E3A8A]/40 flex-row items-center shadow-md shadow-blue-900/30">
               <Text className="text-white font-bold text-sm mr-2">50-Seater Luxury Bus</Text>
               <Feather name="chevron-down" size={16} color="#60A5FA" />
            </TouchableOpacity>
         </ScrollView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Top-Down Bus Layout Horizontal */}
        <View className="h-48 w-full relative mb-4 items-center justify-center mt-4">
           {/* Grid Pattern */}
           <View className="absolute inset-0 opacity-10">
              {[...Array(15)].map((_, i) => (
                 <View key={`v-${i}`} className="w-px h-full bg-[#3B82F6] absolute" style={{left: `${(i+1)*6.6}%`}} />
              ))}
              {[...Array(5)].map((_, i) => (
                 <View key={`h-${i}`} className="h-px w-full bg-[#3B82F6] absolute" style={{top: `${(i+1)*16.6}%`}} />
              ))}
           </View>

           {/* Bus Outline (Horizontal) */}
           <View className="w-[90%] h-32 bg-[#111827]/80 rounded-[30px] border-2 border-[#334155] shadow-2xl shadow-black relative overflow-hidden flex-row">
              {/* Cab */}
              <View className="h-full w-20 border-r border-[#1E293B] justify-center items-end pr-2">
                 <View className="w-6 h-6 rounded-md bg-[#334155] border border-[#475569] mb-2 items-center justify-center"><Ionicons name="person" size={12} color="#9CA3AF"/></View>
                 <View className="w-6 h-6 rounded-md bg-[#334155] border border-[#475569] items-center justify-center"><Ionicons name="person" size={12} color="#D97706"/></View>
              </View>

              {/* Passenger rows (dense grid) */}
              <View className="flex-1 p-2 flex-col justify-between">
                 {/* Top Row */}
                 <View className="flex-row justify-between w-full h-8 mb-1">
                    {[1,3,6,17,18,19,20,26,36,37,46].map((n, i) => (
                       <View key={i} className="w-6 h-6 rounded bg-[#1E293B] border border-[#475569] items-center justify-center"><Text className="text-[8px] text-gray-400">{n}</Text></View>
                    ))}
                 </View>
                 {/* Second Row */}
                 <View className="flex-row justify-between w-full h-8 mb-1">
                    {[2,4,7,18,21,20,25,27,38,38,47].map((n, i) => (
                       <View key={i} className="w-6 h-6 rounded bg-[#1E293B] border border-[#475569] items-center justify-center"><Text className="text-[8px] text-gray-400">{n}</Text></View>
                    ))}
                 </View>
                 {/* Aisle gap is here natively from space-between */}
                 <View className="flex-row justify-between w-full h-8 mb-1 mt-1">
                    {[3,5,9,13,22,23,25,30,43,43,49].map((n, i) => (
                       <View key={i} className="w-6 h-6 rounded bg-[#1E293B] border border-[#475569] items-center justify-center"><Text className="text-[8px] text-gray-400">{n}</Text></View>
                    ))}
                 </View>
                 {/* Bottom Row */}
                 <View className="flex-row justify-between w-[90%] h-8">
                    {[4,6,10,14,23,24,36,31,46,46,50].map((n, i) => (
                       <View key={i} className={`w-6 h-6 rounded bg-[#1E293B] border border-[#475569] items-center justify-center ${n===50 ? 'bg-[#334155]/50 border-orange-500/50' : ''}`}><Text className="text-[8px] text-gray-400">{n}</Text></View>
                    ))}
                 </View>
              </View>
           </View>

           {/* Tooltips Overlaid below */}
           <View className="absolute bottom-[-10] left-4 bg-[#1E293B]/90 border border-[#475569] rounded-xl p-3 shadow-lg shadow-black z-30">
              <Text className="text-white text-xs font-bold mb-1">Under-carriage Cargo{'\n'}<Text className="font-normal text-gray-400" style={{fontSize: 10}}>(Available: 3000kg)</Text></Text>
              <View className="flex-row items-center mt-1 mb-1">
                 <View className="w-0.5 h-3 bg-[#3B82F6] mr-2" />
                 <Text className="text-[#3B82F6] text-[10px]">Breakdown:</Text>
              </View>
              <Text className="text-gray-300 text-[10px] leading-3">1 Large Crates{'\n'}2 Pallets{'\n'}3 Suitcases</Text>
           </View>

           <View className="absolute bottom-2 right-4 bg-[#1E293B]/90 border border-[#475569] rounded-xl p-3 shadow-lg shadow-black z-30">
              <Text className="text-white text-xs font-bold mb-1">Cabin Overhead Bins{'\n'}<Text className="font-normal text-gray-400" style={{fontSize: 10}}>(Available: 500kg)</Text></Text>
              <View className="flex-row items-center mt-1 mb-1">
                 <View className="w-0.5 h-3 bg-[#3B82F6] mr-2" />
                 <Text className="text-[#3B82F6] text-[10px]">Breakdown:</Text>
              </View>
              <Text className="text-gray-300 text-[10px] leading-3">Small Bags</Text>
           </View>
        </View>

        {/* Stability Control Card with Chart Mock */}
        <View className="mx-4 mt-8 mb-4 bg-[#111827] rounded-xl border border-[#334155] p-4 shadow-xl shadow-black relative overflow-hidden">
           <Text className="text-white text-sm font-bold mb-4">Stability Control <Text className="text-gray-400 font-normal">(Safety Check)</Text></Text>
           
           {/* Chart abstract art mock */}
           <View className="w-full h-24 items-center justify-center relative mb-4">
              {/* Fake soundwave background */}
              <View className="absolute inset-0 flex-row items-center justify-between opacity-30">
                 {[...Array(40)].map((_, i) => (
                    <View key={i} className="w-1 bg-[#3B82F6] rounded-full" style={{height: Math.random() * 40 + 10}} />
                 ))}
              </View>
              
              {/* Side profile bus silhouette */}
              <View className="w-48 h-14 bg-transparent border border-[#3B82F6]/50 rounded-lg relative overflow-hidden flex-row items-center justify-center backdrop-blur-sm">
                 {/* Fake blocks inside */}
                 <View className="w-8 h-8 bg-white/10 absolute bottom-1 left-4 border border-white/20" />
                 <View className="w-12 h-6 bg-white/10 absolute bottom-1 left-14 border border-white/20" />
                 {/* Center of gravity marker */}
                 <View className="absolute z-20 items-center justify-center" style={{top: '40%', left: '50%'}}>
                    <View className="w-4 h-4 rounded-full border-2 border-black bg-[#22C55E]" />
                 </View>
                 {/* Balance curve */}
                 <View className="absolute w-[120%] h-[150%] border-t-2 border-[#22C55E] rounded-[100%] opacity-80" style={{top: '30%', left: '-10%', transform: [{scaleY: 0.3}]}} />
                 <View className="absolute inset-0 bg-green-500/10" style={{clipPath: 'polygon(0 50%, 100% 30%, 100% 100%, 0% 100%)'}} />
              </View>

              {/* Axis arrows */}
              <View className="absolute w-px h-full bg-orange-500/80 left-1/2 top-0" />
              <View className="absolute h-px w-10 bg-green-500/80 left-1/2 top-1/2 -ml-5" />
           </View>

           <Text className="text-center text-gray-300 text-xs">
              Stable: <Text className="text-[#22C55E] font-bold">95%</Text> | Center of Gravity: <Text className="text-[#22C55E] font-bold">Low & Balanced</Text>
           </Text>
        </View>

        {/* Vehicle Stats Footer block */}
        <View className="mx-4 mb-6 bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 flex-row justify-between shadow-sm shadow-black">
           <View className="flex-[1.5] pr-2 border-r border-[#334155]">
              <Text className="text-gray-500 text-[10px] mb-1">Vehicle:</Text>
              <Text className="text-gray-300 text-xs leading-4 font-medium">50-Seater Luxury Bus{'\n'}(BL01 9999)</Text>
           </View>
           <View className="flex-1 px-3 border-r border-[#334155] justify-center">
              <Text className="text-gray-500 text-[10px] mb-1">Total Capacity</Text>
              <Text className="text-white text-sm font-bold">5000kg</Text>
           </View>
           <View className="flex-1 pl-3 justify-center">
              <Text className="text-gray-500 text-[10px] mb-1">Remaining Capacity</Text>
              <Text className="text-white text-sm font-bold">30%</Text>
           </View>
        </View>

        {/* Pending Requests */}
        <View className="px-4 pb-4">
           <Text className="text-white text-xl font-bold mb-4 shadow-sm shadow-black">Pending Requests (5)</Text>
           
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
      <View className="px-4 pb-6 pt-2 bg-[#050A14]">
         <TouchableOpacity className="w-full h-14 bg-[#1E3A8A]/80 rounded-xl items-center justify-center border border-[#3B82F6]/50 shadow-lg shadow-blue-900/50">
            <LinearGradient colors={['transparent', 'rgba(37, 99, 235, 0.2)']} className="absolute inset-0 rounded-xl" />
            <Text className="text-white text-lg font-bold">Confirm Allocation</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
