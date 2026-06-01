import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  StyleSheet,
  StatusBar
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function CustomerHomeDashboard() {
  return (
    <SafeAreaView className="flex-1 bg-[#0A0D1A]">
      <StatusBar barStyle="light-content" />
      
      {/* Map Background Area (Mocked with gradient/color for now) */}
      <View className="absolute top-0 left-0 right-0 h-[60%] bg-[#0f1429] z-0">
        {/* Placeholder for actual map integration */}
        {/* In a real app, use react-native-maps here */}
        
        {/* Mock Map Route Lines */}
        <View className="absolute top-[30%] left-[20%] w-32 h-1 bg-cyan-400/50 rotate-45 rounded-full" />
        <View className="absolute top-[45%] left-[40%] w-40 h-1 bg-purple-500/50 -rotate-12 rounded-full" />
      </View>

      <View className="flex-1 z-10 flex flex-col justify-between">
        
        {/* Top Search Bar */}
        <View className="mx-5 mt-2 flex-row items-center bg-white/10 rounded-2xl px-4 py-3 border border-white/10" style={styles.glassEffect}>
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Where to? Search destinations"
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-white font-medium text-base"
          />
        </View>

        {/* Floating Services Card */}
        <View className="mx-5 mb-6 bg-[#21243D]/80 rounded-3xl px-6 py-6 border border-white/10 flex-row justify-between items-center" style={styles.glassEffect}>
          
          <TouchableOpacity className="items-center">
            <View className="w-14 h-14 rounded-full bg-blue-500 justify-center items-center mb-2 shadow-lg shadow-blue-500/50">
              <Ionicons name="car-outline" size={28} color="white" />
            </View>
            <Text className="text-white text-xs font-medium">Intercity Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center">
            <View className="w-14 h-14 rounded-full bg-indigo-500 justify-center items-center mb-2 shadow-lg shadow-indigo-500/50">
              <Feather name="package" size={28} color="white" />
            </View>
            <Text className="text-white text-xs font-medium">Send Parcel</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center">
            <View className="w-14 h-14 rounded-full bg-cyan-500 justify-center items-center mb-2 shadow-lg shadow-cyan-500/50">
              <FontAwesome5 name="building" size={24} color="white" />
            </View>
            <Text className="text-white text-xs font-medium">Book Hotel</Text>
          </TouchableOpacity>

          {/* Swipe indicator pill at the bottom of the card */}
          <View className="absolute bottom-2 left-1/2 -ml-4 w-8 h-1 bg-white/30 rounded-full" />
        </View>
      </View>

      {/* Bottom Sheet - Recommended for You */}
      <View className="bg-[#121526] rounded-t-[40px] pt-8 pb-24 px-5 z-20 border-t border-white/5">
        <View className="absolute top-3 left-1/2 -ml-6 w-12 h-1.5 bg-white/20 rounded-full" />
        
        <Text className="text-white text-xl font-bold mb-5">Recommended for You</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
          
          {/* Recommendation Card 1 */}
          <View className="bg-[#1C1F33] border border-white/10 rounded-3xl p-5 mr-4 w-64 shadow-lg shadow-black/40">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mr-3 border border-white/5">
                <Ionicons name="car-outline" size={20} color="#9CA3AF" />
              </View>
              <View>
                <Text className="text-white font-semibold text-lg">Mumbai to</Text>
                <Text className="text-white font-semibold text-lg">Pune</Text>
              </View>
            </View>
            <Text className="text-white font-bold text-xl mb-4">
              ₹850 <Text className="text-gray-400 text-sm font-normal">(AI-Predicted)</Text>
            </Text>
            <TouchableOpacity className="bg-white/10 py-3 rounded-2xl items-center border border-white/5">
              <Text className="text-white font-semibold">Book Now</Text>
            </TouchableOpacity>
          </View>

          {/* Recommendation Card 2 */}
          <View className="bg-[#1C1F33] border border-white/10 rounded-3xl p-5 mr-4 w-64 shadow-lg shadow-black/40">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mr-3 border border-white/5">
                <Ionicons name="car-outline" size={20} color="#9CA3AF" />
              </View>
              <View>
                <Text className="text-white font-semibold text-lg">Bangalore to</Text>
                <Text className="text-white font-semibold text-lg">Chennai</Text>
              </View>
            </View>
            <Text className="text-white font-bold text-xl mb-4">
              ₹1200 <Text className="text-gray-400 text-sm font-normal">(AI-Predicted)</Text>
            </Text>
            <TouchableOpacity className="bg-white/10 py-3 rounded-2xl items-center border border-white/5">
              <Text className="text-white font-semibold">Book Now</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>

      {/* Bottom Navigation Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#0A0D1A]/95 pt-4 pb-8 px-6 flex-row justify-between items-center border-t border-white/10 z-30" style={styles.glassEffect}>
        <View className="absolute top-0 left-[8%] w-16 h-0.5 bg-blue-500 shadow-lg shadow-blue-500" />
        
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="home-variant" size={28} color="#3B82F6" />
          <Text className="text-blue-500 text-xs font-medium mt-1">Home</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
          <Text className="text-gray-400 text-xs font-medium mt-1">Trips</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="tag-outline" size={24} color="#9CA3AF" />
          <Text className="text-gray-400 text-xs font-medium mt-1">Offers</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Ionicons name="person-outline" size={24} color="#9CA3AF" />
          <Text className="text-gray-400 text-xs font-medium mt-1">Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Feather name="more-horizontal" size={24} color="#9CA3AF" />
          <Text className="text-gray-400 text-xs font-medium mt-1">More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassEffect: {
    // Basic glassmorphism fallback for platforms where blur isn't fully supported via Tailwind
    backgroundColor: 'rgba(33, 36, 61, 0.65)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  }
});
