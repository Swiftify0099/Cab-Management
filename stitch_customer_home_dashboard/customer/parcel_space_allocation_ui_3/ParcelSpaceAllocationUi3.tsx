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

export default function ParcelSpaceAllocationUi3() {
  return (
    <SafeAreaView className="flex-1 bg-[#0B1120]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-[#1E293B] bg-[#0B1120] z-10">
        <TouchableOpacity className="mr-4">
          <Feather name="chevron-left" size={28} color="#3B82F6" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1 text-center mr-8">10-Seater Space & Boot Manager</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Top Tabs Mock */}
        <View className="px-4 py-4">
           <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-[#1E293B] rounded-xl p-1 border border-[#334155] flex-row">
              {['5-Seater', '7-Seater', '10-Seater', '17-Seater', '19-Seater', '25-Seater', '50-Seater'].map((tab, idx) => (
                 <TouchableOpacity 
                    key={idx}
                    className={`px-3 py-2 rounded-lg items-center justify-center mr-1 ${tab === '10-Seater' ? 'bg-[#1E3A8A] border border-[#3B82F6]' : ''}`}
                 >
                    <Text className={`text-xs font-bold ${tab === '10-Seater' ? 'text-white' : 'text-gray-400'}`}>
                       {tab.split('-')[0]}-{'\n'}{tab.split('-')[1]}
                    </Text>
                 </TouchableOpacity>
              ))}
           </ScrollView>
        </View>

        {/* 3D Isometric Van Visualization Mock */}
        <View className="h-80 w-full relative mb-6 items-center justify-center overflow-hidden">
           {/* Background Grid Pattern Mock */}
           <View className="absolute inset-0 opacity-20">
              <LinearGradient colors={['#3B82F6', 'transparent']} className="w-px h-full absolute left-[10%]" />
              <LinearGradient colors={['#3B82F6', 'transparent']} className="w-px h-full absolute left-[30%]" />
              <LinearGradient colors={['#3B82F6', 'transparent']} className="w-px h-full absolute left-[50%]" />
              <LinearGradient colors={['#3B82F6', 'transparent']} className="w-px h-full absolute left-[70%]" />
              <LinearGradient colors={['#3B82F6', 'transparent']} className="w-px h-full absolute left-[90%]" />
              <LinearGradient colors={['transparent', '#3B82F6', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}} className="h-px w-full absolute top-[20%]" />
              <LinearGradient colors={['transparent', '#3B82F6', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}} className="h-px w-full absolute top-[50%]" />
              <LinearGradient colors={['transparent', '#3B82F6', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}} className="h-px w-full absolute top-[80%]" />
           </View>

           {/* Fake Van body */}
           <View className="w-64 h-32 bg-[#334155] rounded-[30px] border border-[#475569] shadow-lg shadow-black transform -rotate-12 skew-x-12 relative flex-row items-center justify-between pl-4 pr-2">
              
              {/* Fake front area */}
              <View className="flex-1 h-2/3 flex-row justify-around items-center">
                 <View className="w-6 h-6 rounded-full bg-[#22C55E]/20 border border-[#22C55E] items-center justify-center">
                    <Ionicons name="person" size={12} color="#22C55E" />
                 </View>
                 <View className="w-6 h-6 rounded-full bg-[#22C55E]/20 border border-[#22C55E] items-center justify-center">
                    <Ionicons name="person" size={12} color="#22C55E" />
                 </View>
              </View>

              {/* Fake middle seats */}
              <View className="flex-[1.5] h-2/3 flex-row flex-wrap items-center justify-around px-2">
                 {[1,2,3,4].map(i => (
                    <View key={i} className="w-6 h-6 bg-orange-500/20 rounded-full border border-orange-500 items-center justify-center m-1 shadow-md shadow-orange-500/50">
                       <Feather name="box" size={12} color="#F97316" />
                    </View>
                 ))}
              </View>

              {/* Fake back area (boot) glowing blue */}
              <View className="flex-[0.8] h-full bg-[#1E3A8A]/40 rounded-r-[30px] border-l-2 border-[#3B82F6]/50 items-center justify-center shadow-lg shadow-blue-500/50" />
           </View>

           {/* Boot Tooltip overlay */}
           <View className="absolute top-4 right-4 bg-[#1E293B]/90 border border-[#334155] rounded-xl p-3 w-48 shadow-xl shadow-black z-20">
              <Text className="text-white text-sm font-bold">Boot <Text className="font-normal text-gray-400 text-xs">(Available: 300kg)</Text></Text>
              <View className="flex-row items-center mt-1 mb-1">
                 <View className="w-0.5 h-3 bg-[#3B82F6] mr-2" />
                 <Text className="text-[#3B82F6] text-xs">Breakdown:</Text>
              </View>
              <Text className="text-gray-300 text-[10px] leading-4">2 Large Boxes (50kg each),{'\n'}4 Medium Boxes (25kg each),{'\n'}Loose Items (50kg)</Text>
           </View>
           
           {/* Line connecting tooltip to boot area */}
           <View className="absolute top-20 right-28 w-16 h-px bg-[#334155] transform rotate-45" />

        </View>

        {/* Balanced Load Indicator */}
        <View className="mx-4 mb-8 bg-[#1E293B]/80 rounded-xl p-4 border border-[#334155] shadow-sm shadow-black relative mt-4">
           {/* Floating Balance tag */}
           <View className="absolute -top-4 right-4 bg-[#22C55E] px-3 py-1 rounded-full z-10 border border-[#166534] shadow-md shadow-green-900/50">
              <Text className="text-white text-xs font-bold">Balanced: 85%</Text>
           </View>

           <Text className="text-white text-sm mb-3">Balanced Load <Text className="text-gray-400 text-xs">(Safety Check)</Text></Text>
           
           <View className="w-full h-3 bg-[#0F172A] rounded-full overflow-hidden flex-row border border-[#334155] mb-3">
              <View className="w-1/2 h-full bg-[#3B82F6]" />
              <View className="w-[35%] h-full bg-[#22C55E]" />
           </View>

           <Text className="text-gray-300 text-center text-sm font-medium">Rear: 300kg | Front: 150kg</Text>
        </View>

        {/* Pending Requests */}
        <View className="px-4 pb-4">
           <Text className="text-white text-xl font-bold mb-4">Pending Requests (2)</Text>
           
           {[
              { title: "New Parcel Request -", subtitle: "15kg, 40x40x30cm" },
              { title: "Medium Box -", subtitle: "25kg, 50x50x40cm" }
           ].map((item, idx) => (
              <View key={idx} className="bg-[#1E293B]/50 rounded-xl p-4 border border-[#334155] flex-row items-center justify-between mb-3 shadow-sm shadow-black">
                 <View className="flex-1">
                    <Text className="text-white text-base font-bold">{item.title}</Text>
                    <Text className="text-gray-400 text-xs">{item.subtitle}</Text>
                 </View>
                 <View className="flex-row">
                    <TouchableOpacity className="px-4 py-2 border border-[#475569] rounded-lg mr-2 bg-[#0F172A]/50">
                       <Text className="text-gray-400 font-medium text-sm">Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="px-4 py-2 bg-[#1E3A8A] border border-[#3B82F6] rounded-lg shadow-md shadow-blue-900/50">
                       <Text className="text-white font-medium text-sm">Allocate</Text>
                    </TouchableOpacity>
                 </View>
              </View>
           ))}
        </View>

      </ScrollView>

      {/* Confirm Button */}
      <View className="px-4 pb-6 pt-2 bg-[#0B1120]">
         <TouchableOpacity className="w-full h-14 bg-[#1E3A8A]/50 rounded-xl items-center justify-center border border-[#3B82F6] shadow-lg shadow-blue-500/20">
            <LinearGradient colors={['#2563EB', '#1D4ED8']} className="absolute inset-0 rounded-xl opacity-20" />
            <Text className="text-white text-lg font-bold">Confirm Allocation</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
