import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function BookingConfirmationOtp() {
  return (
    <SafeAreaView className="flex-1 bg-[#2C3E7C]">
      {/* Background Gradient Mock via classes and standard styling */}
      <View style={[StyleSheet.absoluteFillObject, styles.bgGradient]} />
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4">
        <TouchableOpacity>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Booking Confirmed</Text>
        <View style={{ width: 24 }} /> {/* Empty view for alignment */}
      </View>

      <View className="flex-1 items-center justify-center">
        {/* Glowing Success Checkmark Circle */}
        <View className="items-center justify-center relative mb-12">
          {/* Mock glow rings */}
          <View className="absolute w-64 h-64 rounded-full border border-white/10" />
          <View className="absolute w-52 h-52 rounded-full border border-white/20" />
          <View className="absolute w-40 h-40 rounded-full border-2 border-white/30" />
          
          <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center shadow-lg shadow-purple-500/50" style={styles.neonGlow}>
            <Feather name="check" size={48} color="white" />
          </View>
          
          {/* Sparkles Mock */}
          <View className="absolute top-4 left-10 w-1.5 h-1.5 bg-white rounded-full" />
          <View className="absolute bottom-8 right-12 w-2 h-2 bg-white rounded-full" />
          <View className="absolute top-1/2 left-2 w-2 h-2 bg-purple-300 rounded-full" />
        </View>

        {/* OTP & Details Card */}
        <View className="w-full px-5">
          <View className="bg-[#EAEAF5]/95 rounded-3xl p-6 border border-white/50 shadow-xl shadow-black/20" style={styles.glassCard}>
            
            <View className="items-center border-b border-gray-300 pb-6 mb-6">
              <Text className="text-gray-700 text-lg font-bold mb-2">Your Ride OTP</Text>
              <Text className="text-black text-6xl font-extrabold tracking-[0.25em]">4582</Text>
              <Text className="text-gray-600 text-sm mt-2">Show this to your driver to start the ride.</Text>
            </View>

            <View>
              {/* Trip Info Row 1 */}
              <View className="flex-row items-center mb-5">
                <Ionicons name="car-outline" size={24} color="black" className="mr-4" />
                <View>
                  <Text className="text-black text-lg font-semibold">SUV to Pune</Text>
                  <Text className="text-gray-600">Premium Ride</Text>
                </View>
              </View>

              {/* Trip Info Row 2 */}
              <View className="flex-row items-center mb-5">
                <Feather name="clock" size={24} color="black" className="mr-4" />
                <View>
                  <Text className="text-black text-lg font-semibold">Pickup: 10:30 AM</Text>
                  <Text className="text-gray-600">Today</Text>
                </View>
              </View>

              {/* Trip Info Row 3 */}
              <View className="flex-row items-center mb-6">
                <MaterialCommunityIcons name="account-tie" size={24} color="black" className="mr-4" />
                <View>
                  <Text className="text-black text-lg font-semibold">Driver: Vikram S.</Text>
                  <Text className="text-gray-600">4.9 <Ionicons name="star" size={12} color="black" /> Rating</Text>
                </View>
              </View>
            </View>

            {/* Share Button */}
            <TouchableOpacity className="w-full py-4 rounded-xl items-center relative overflow-hidden" style={styles.btnGradient}>
              <View className="absolute inset-0 bg-[#5E6BC4]" /> {/* Solid fallback */}
              <Text className="text-white text-lg font-bold z-10">Share Trip Details</Text>
            </TouchableOpacity>

          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bgGradient: {
    backgroundColor: '#384B91', // Fallback
    // For real gradient, we would use expo-linear-gradient
  },
  neonGlow: {
    shadowColor: '#C084FC', // Purple-400
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 10,
  },
  glassCard: {
    backgroundColor: 'rgba(240, 240, 250, 0.95)',
  },
  btnGradient: {
    backgroundColor: '#7280D6',
  }
});
