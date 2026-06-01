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

export default function ParcelSpaceAllocationUi4() {
  return (
    <SafeAreaView className="flex-1 bg-[#090E17]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-[#1E293B] z-10">
        <TouchableOpacity className="mr-3">
          <Feather name="chevron-left" size={28} color="#3B82F6" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">19-Seater Fleet Space Manager</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Glassmorphic Tabs Mock */}
        <View className="px-4 py-4">
           <View className="bg-[#1E293B]/60 border border-[#334155] rounded-xl p-2 relative shadow-md shadow-black">
              <Text className="text-gray-400 text-xs mb-2 ml-2">Glassmorphic Model:</Text>
              <View className="flex-row justify-between items-center px-2">
                 <Text className="text-gray-400 text-sm font-medium">5</Text>
                 <Text className="text-gray-400 text-sm font-medium">10</Text>
                 <View className="bg-[#1E3A8A]/80 border border-[#3B82F6] rounded-lg px-4 py-1.5 shadow-md shadow-blue-500/30">
                    <Text className="text-white text-sm font-bold">19-Seater</Text>
                 </View>
                 <Text className="text-gray-400 text-sm font-medium">30</Text>
                 <Text className="text-gray-400 text-sm font-medium">50 Seats</Text>
              </View>
           </View>
        </View>

        {/* Top-Down Van View */}
        <View className="h-[480px] w-full relative mb-4 items-center justify-center overflow-hidden">
           
           {/* Grid Pattern */}
           <View className="absolute inset-0 opacity-10">
              {[...Array(10)].map((_, i) => (
                 <View key={`v-${i}`} className="w-px h-full bg-[#3B82F6] absolute" style={{left: `${(i+1)*10}%`}} />
              ))}
              {[...Array(10)].map((_, i) => (
                 <View key={`h-${i}`} className="h-px w-full bg-[#3B82F6] absolute" style={{top: `${(i+1)*10}%`}} />
              ))}
           </View>

           {/* Tooltip Floating */}
           <View className="absolute top-4 right-4 bg-[#1E293B]/95 border border-[#475569] rounded-xl p-3 w-52 shadow-xl shadow-black z-30 backdrop-blur-sm">
              <Text className="text-white text-sm font-bold">External Cargo / Boot Space{'\n'}<Text className="font-normal text-gray-400 text-xs">(Available: 150kg)</Text></Text>
              <View className="flex-row items-center mt-2 mb-1">
                 <View className="w-0.5 h-3 bg-[#3B82F6] mr-2" />
                 <Text className="text-[#3B82F6] text-xs">Breakdown:</Text>
              </View>
              <Text className="text-gray-300 text-[11px] leading-4">
                 Total: 1200kg | Booked: 850kg | Remaining: 350kg{'\n'}Details: 5 Large Crates, 12 Medium Boxes
              </Text>
           </View>

           {/* Vehicle Outline */}
           <View className="w-64 h-[420px] bg-[#1E293B]/80 rounded-[40px] border-4 border-[#334155] relative overflow-hidden pt-4 z-10 shadow-2xl shadow-black">
              
              {/* Boot Area top (cargo) */}
              <View className="w-full h-32 bg-[#1E3A8A]/30 border-b-2 border-[#3B82F6]/50 shadow-inner" />

              {/* Seat Rows Mocking */}
              <View className="flex-1 px-4 py-4 justify-between flex-row flex-wrap items-center">
                 {/* Generate some fake seats */}
                 {[...Array(12)].map((_, idx) => (
                    <View key={idx} className="w-[28%] aspect-square rounded-xl bg-[#334155] border border-[#475569] mb-4 items-center justify-center shadow-md shadow-black relative overflow-hidden">
                       
                       {/* Simulate occupied or allocated seats randomly */}
                       {idx === 1 || idx === 3 || idx === 7 || idx === 10 || idx === 11 ? (
                          <>
                             <LinearGradient colors={['#1E3A8A', '#2563EB']} className="absolute inset-0 opacity-40" />
                             <Text className="text-white text-xs font-bold relative z-10">
                                {idx === 1 ? 'R6' : idx === 3 ? 'DF' : idx === 7 ? 'MR' : idx === 10 ? 'SH' : 'JA'}
                             </Text>
                          </>
                       ) : idx === 0 ? (
                          <Text className="text-gray-400 text-xs">AA</Text>
                       ) : (
                          <Feather name="plus" size={14} color="#9CA3AF" />
                       )}
                    </View>
                 ))}
              </View>

           </View>
        </View>

        {/* Bottom Control Section */}
        <View className="px-4 mb-6">
           
           {/* Weight Distribution Slider */}
           <View className="bg-[#1E293B] rounded-xl p-4 border border-[#334155] shadow-lg shadow-black relative mb-6">
              
              <View className="absolute -top-3 right-4 bg-[#22C55E] px-3 py-1 rounded-full z-10 border border-[#166534]">
                 <Text className="text-white text-xs font-bold">Balanced: 85%</Text>
              </View>

              <Text className="text-gray-300 text-sm mb-3">Weight Distribution <Text className="text-gray-500 text-xs">(Safety Check)</Text></Text>
              
              <View className="w-full h-2 bg-[#0F172A] rounded-full mb-3 flex-row overflow-visible">
                 <View className="w-[85%] h-full bg-[#3B82F6] rounded-full" />
                 <View className="w-4 h-4 rounded-full bg-white absolute -top-1 left-[85%] border-2 border-[#1E3A8A] shadow-md shadow-black" />
              </View>

              <Text className="text-gray-400 text-center text-xs">Cabin: 950kg | Rear Cargo: 850kg | Front: 150kg</Text>
           </View>

           {/* Carriage Agreement */}
           <View className="flex-row items-start mb-6 px-1">
              <View className="flex-1 mr-4">
                 <Text className="text-white text-lg font-bold mb-1">Carriage Capacity Agreement</Text>
                 <Text className="text-gray-500 text-xs leading-4">
                    Carriage Capacity Agreement may intent aim to legal unsrids to conitions of carriaert moving performs the <Text className="text-[#3B82F6] underline">otvariamships and bestets</Text>.
                 </Text>
              </View>
              <View className="w-6 h-6 rounded border border-[#3B82F6] bg-[#1E3A8A] items-center justify-center mt-1">
                 <Feather name="check" size={16} color="white" />
              </View>
           </View>

           {/* Pending Requests simple header */}
           <Text className="text-white text-xl font-bold mb-4">Pending Requests (2)</Text>
        </View>

      </ScrollView>

      {/* Confirm Button */}
      <View className="px-4 pb-6 pt-2 bg-[#090E17]">
         <TouchableOpacity className="w-full h-14 bg-[#1E3A8A] rounded-xl items-center justify-center shadow-lg shadow-blue-500/30">
            <Text className="text-white text-lg font-bold">Confirm Allocation</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
