import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // Optional: Use this if available, otherwise fallback to View styling

export default function DriverPerformanceDashboard() {
  const [isOnline, setIsOnline] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#090C15]">
      <StatusBar barStyle="light-content" />

      <ScrollView className="flex-1 px-5 pt-4 pb-24" showsVerticalScrollIndicator={false}>
        
        {/* Top Header Row */}
        <View className="flex-row justify-between mb-6">
          
          {/* Go Online/Offline Toggle Button */}
          <TouchableOpacity 
            onPress={() => setIsOnline(!isOnline)}
            className="w-[45%] h-28 rounded-3xl p-4 justify-between"
          >
            {/* NativeWind doesn't perfectly handle complex gradients, using standard styling fallback if LinearGradient is unavailable. 
                Assuming LinearGradient is used in standard Expo projects */}
            <View 
              style={[
                StyleSheet.absoluteFillObject, 
                { borderRadius: 24, backgroundColor: isOnline ? '#3B82F6' : '#4B5563' }
              ]} 
              className={isOnline ? 'bg-gradient-to-br from-cyan-400 to-purple-600' : ''} // Tailwind hint
            />
            
            <View className="w-full flex-row justify-end">
              <View className={`w-14 h-8 rounded-full justify-center p-1 ${isOnline ? 'bg-white/30 items-end' : 'bg-black/30 items-start'}`}>
                <View className="w-6 h-6 rounded-full bg-white shadow-sm shadow-black/50" />
              </View>
            </View>
            <Text className="text-white text-lg font-bold">
              {isOnline ? 'Go Online' : 'Offline'}
            </Text>
          </TouchableOpacity>

          {/* Daily Earnings Card */}
          <View className="w-[52%] h-28 rounded-3xl bg-white/10 border border-white/5 p-4 justify-between" style={styles.glassEffect}>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-300 text-sm">Daily Earnings</Text>
              <Feather name="trending-up" size={16} color="#34D399" />
            </View>
            <Text className="text-white text-3xl font-bold">$184.50</Text>
            <View className="flex-row justify-between items-end">
              <Text className="text-gray-400 text-xs">Today's total</Text>
              {/* Mock Line Chart */}
              <View className="w-16 h-4">
                <View className="w-full h-0.5 bg-[#34D399]" style={{transform: [{rotate: '-10deg'}]}} />
              </View>
            </View>
          </View>
        </View>

        {/* Active Request Card (Neon Glow Border) */}
        <View className="mb-6 rounded-[28px] bg-[#121526] p-[2px]">
          {/* Mocking the neon border gradient */}
          <View style={[StyleSheet.absoluteFillObject, { borderRadius: 28, backgroundColor: '#8B5CF6' }]} className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 opacity-50" />
          
          <View className="bg-[#121526] rounded-[26px] p-4 flex-row" style={styles.glassEffect}>
            {/* Mini Map Area */}
            <View className="w-[40%] h-32 bg-[#1C1F33] rounded-2xl overflow-hidden border border-white/5 relative justify-center items-center">
              {/* Mocking route line */}
              <View className="absolute w-2 h-2 rounded-full bg-cyan-400 top-4 right-4" />
              <View className="absolute w-2 h-2 rounded-full bg-blue-500 bottom-4 left-4" />
              <View className="w-1 h-20 bg-blue-500/50 rotate-45" />
            </View>

            {/* Request Details */}
            <View className="ml-4 flex-1 justify-between py-1">
              <Text className="text-white text-base font-bold">Active Request</Text>
              
              <View>
                <Text className="text-gray-400 text-xs mb-1">
                  Pickup: <Text className="text-white font-semibold text-sm">2.3 mi</Text>
                </Text>
                <Text className="text-gray-400 text-xs mb-1">
                  Est. Payout: <Text className="text-white font-semibold text-sm">$22.00</Text>
                </Text>
                <Text className="text-gray-400 text-xs">
                  Passenger: <Text className="text-white font-semibold text-sm">Sarah L.</Text>
                </Text>
              </View>

              <TouchableOpacity className="bg-white/10 py-2.5 rounded-xl items-center border border-white/10 mt-2">
                <Text className="text-white font-semibold text-sm">Accept Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2x2 Stats Grid */}
        <View className="flex-row flex-wrap justify-between">
          
          {/* Rating */}
          <View className="w-[48%] h-32 bg-white/10 border border-white/5 rounded-3xl p-4 mb-4 justify-between" style={styles.glassEffect}>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-300 text-sm">Rating</Text>
              <Ionicons name="star" size={20} color="#9CA3AF" />
            </View>
            <Text className="text-white text-4xl font-bold tracking-tight">4.9</Text>
            <Text className="text-gray-400 text-xs">Based on 150 rides</Text>
          </View>

          {/* Trips Today */}
          <View className="w-[48%] h-32 bg-white/10 border border-white/5 rounded-3xl p-4 mb-4 justify-between" style={styles.glassEffect}>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-300 text-sm">Trips Today</Text>
              <Ionicons name="car-outline" size={20} color="#9CA3AF" />
            </View>
            <Text className="text-white text-4xl font-bold tracking-tight">12</Text>
            <Text className="text-gray-400 text-xs">3 more for bonus</Text>
          </View>

          {/* Estimate */}
          <View className="w-[48%] h-32 bg-white/10 border border-white/5 rounded-3xl p-4 mb-4 justify-between" style={styles.glassEffect}>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-300 text-sm">Estimate</Text>
              <MaterialCommunityIcons name="currency-usd-circle-outline" size={20} color="#9CA3AF" />
            </View>
            <Text className="text-white text-4xl font-bold tracking-tight">150</Text>
            <Text className="text-gray-400 text-xs">Approx. 280 mi</Text>
          </View>

          {/* Fuel Estimate */}
          <View className="w-[48%] h-32 bg-white/10 border border-white/5 rounded-3xl p-4 mb-4 justify-between" style={styles.glassEffect}>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-300 text-sm">Fuel Estimate</Text>
              <FontAwesome5 name="gas-pump" size={18} color="#9CA3AF" />
            </View>
            <Text className="text-white text-4xl font-bold tracking-tight">75%</Text>
            <Text className="text-gray-400 text-xs">Approx. 280 mi</Text>
          </View>

        </View>

      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#090C15]/95 pt-4 pb-8 px-6 flex-row justify-between items-center border-t border-white/10 z-30" style={styles.glassEffect}>
        <View className="absolute top-0 left-[6%] w-16 h-0.5 bg-blue-500 shadow-lg shadow-blue-500" />
        
        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="view-dashboard" size={26} color="#3B82F6" />
          <Text className="text-blue-500 text-[10px] font-medium mt-1">Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Feather name="list" size={24} color="#9CA3AF" />
          <Text className="text-gray-400 text-[10px] font-medium mt-1">Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Feather name="map" size={24} color="#9CA3AF" />
          <Text className="text-gray-400 text-[10px] font-medium mt-1">Map</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <MaterialCommunityIcons name="currency-usd-circle-outline" size={24} color="#9CA3AF" />
          <Text className="text-gray-400 text-[10px] font-medium mt-1">Earnings</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Feather name="user" size={24} color="#9CA3AF" />
          <Text className="text-gray-400 text-[10px] font-medium mt-1">Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassEffect: {
    backgroundColor: 'rgba(28, 31, 51, 0.65)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  }
});
