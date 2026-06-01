import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DriverSearchMatchingAnimation() {
  return (
    <SafeAreaView className="flex-1 bg-[#0F172A]">
      <StatusBar barStyle="light-content" />

      {/* Map Background Layer */}
      <View className="absolute inset-0 z-0 opacity-20">
        <View className="w-full h-full border border-gray-700" style={{ transform: [{ scale: 1.5 }, { rotate: '15deg'}]}}>
           <View className="w-[1px] h-full bg-gray-500 ml-20 absolute" />
           <View className="w-full h-[1px] bg-gray-500 mt-32 absolute" />
           <View className="w-[1px] h-full bg-gray-500 ml-60 absolute" />
           <View className="w-full h-[1px] bg-gray-500 mt-80 absolute" />
           <View className="w-[1px] h-full bg-gray-500 ml-40 absolute transform rotate-45" />
        </View>
      </View>

      {/* Radar Animation Area */}
      <View className="flex-1 justify-center items-center relative z-10">
        
        {/* Glow Rings representing radar pulses */}
        <View className="absolute w-80 h-80 rounded-full border border-purple-500/30 items-center justify-center">
          <View className="absolute w-64 h-64 rounded-full border border-purple-400/50" />
          <View className="absolute w-48 h-48 rounded-full border border-purple-300/70 shadow-lg shadow-purple-500/50" style={styles.glow} />
          
          <View className="absolute w-full h-full rounded-full" style={styles.radarSweep} />
        </View>

        {/* Circling Cars (Mocked as static positions but styled for motion) */}
        {/* Car 1 - Top */}
        <View className="absolute top-1/4" style={{ transform: [{ translateX: -20 }, { rotate: '-10deg' }]}}>
           <View className="w-16 h-1 bg-cyan-400/50 rounded-full absolute -right-12 top-2 blur-[2px]" />
           <View className="w-10 h-5 bg-blue-600 rounded-md items-center justify-center border border-blue-400 shadow-md shadow-cyan-400/50">
             <View className="w-6 h-3 bg-blue-900 rounded-sm" />
           </View>
        </View>

        {/* Car 2 - Right */}
        <View className="absolute right-6 top-1/2" style={{ transform: [{ translateY: -20 }, { rotate: '80deg' }]}}>
           <View className="w-20 h-1.5 bg-cyan-400/40 rounded-full absolute -right-16 top-2 blur-[2px]" />
           <View className="w-10 h-5 bg-blue-600 rounded-md items-center justify-center border border-blue-400 shadow-md shadow-cyan-400/50">
             <View className="w-6 h-3 bg-blue-900 rounded-sm" />
           </View>
        </View>

        {/* Car 3 - Bottom */}
        <View className="absolute bottom-1/4 left-1/3" style={{ transform: [{ rotate: '170deg' }]}}>
           <View className="w-24 h-1.5 bg-cyan-400/50 rounded-full absolute -right-20 top-2 blur-[2px]" />
           <View className="w-10 h-5 bg-blue-600 rounded-md items-center justify-center border border-blue-400 shadow-md shadow-cyan-400/50">
             <View className="w-6 h-3 bg-blue-900 rounded-sm" />
           </View>
        </View>

        {/* Main Text Content */}
        <View className="absolute z-20 items-center px-8 w-full">
          <Text className="text-white text-[28px] font-bold text-center leading-[34px] mb-4">
            Finding the best intercity partner for you...
          </Text>
          <Text className="text-white/90 text-sm text-center leading-5 px-6">
            Safety check: All drivers on this route are background-verified.
          </Text>
        </View>

      </View>

      {/* Bottom Floating Card */}
      <View className="px-5 pb-8 pt-4 absolute bottom-0 w-full z-20">
        <View className="bg-white/10 rounded-[30px] p-6 border border-white/20 shadow-2xl shadow-black overflow-hidden relative" style={styles.glassEffect}>
          
          <View className="flex-row items-center mb-4 relative z-10">
            <View className="w-16 h-16 rounded-full border border-gray-400 items-center justify-center mr-4 bg-white/5">
               <Ionicons name="car" size={32} color="#D1D5DB" />
            </View>
            <View>
              <Text className="text-white text-xl font-bold mb-1">Premium Sedan</Text>
              <Text className="text-gray-400 text-sm">Estimated Fare: $45 - $55</Text>
            </View>
          </View>

          {/* Scanning Line Animation Mock */}
          <View className="w-full h-1 bg-[#1E3A8A] rounded-full overflow-hidden relative z-10 mt-2">
            <View className="w-1/3 h-full bg-cyan-400 rounded-full absolute left-1/2 shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={styles.scanLine} />
          </View>
          <View className="w-full flex-row justify-center mt-1 opacity-50 relative z-10">
             <View className="w-1 h-1 bg-cyan-200 rounded-full mx-1 shadow-md shadow-cyan-300" />
             <View className="w-1.5 h-1.5 bg-cyan-200 rounded-full mx-1 shadow-md shadow-cyan-300 -translate-y-1" />
             <View className="w-1 h-1 bg-cyan-200 rounded-full mx-1 shadow-md shadow-cyan-300" />
             <View className="w-2 h-2 bg-cyan-200 rounded-full mx-1 shadow-md shadow-cyan-300 -translate-y-0.5" />
          </View>

        </View>
      </View>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: '#A855F7', // Purple-500
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 20,
  },
  glassEffect: {
    backgroundColor: 'rgba(30, 35, 50, 0.7)',
  },
  radarSweep: {
    // A visual mock of a radar sweep effect using borders
    borderLeftWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(168, 85, 247, 0.05)',
    transform: [{ rotate: '45deg' }]
  },
  scanLine: {
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  }
});
