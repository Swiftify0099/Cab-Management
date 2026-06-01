import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Image,
} from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function DriverFoundDetailsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#181A20]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="pt-2 pb-4 bg-[#181A20] z-20 shadow-md">
        <Text className="text-white text-xl font-bold text-center">Driver Found</Text>
      </View>

      <View className="flex-1 relative">
        {/* Mock Map Background Layer */}
        <View className="absolute inset-0 bg-[#0F172A] z-0 justify-center items-center">
          {/* Abstract map lines */}
          <View className="w-[120%] h-[1px] bg-blue-900/30 rotate-12 absolute top-1/4" />
          <View className="w-[1px] h-[120%] bg-blue-900/30 -rotate-12 absolute left-1/4" />
          <View className="w-[120%] h-[1px] bg-blue-900/30 absolute bottom-1/3" />
          
          {/* Route Line Mock */}
          <View className="absolute top-[20%] right-[20%] w-[50%] h-[30%] border-r-4 border-b-4 border-[#3B82F6] rounded-br-3xl shadow-lg shadow-blue-500/50" />
        </View>

        {/* Map Overlays */}
        <View className="absolute top-[15%] right-[15%] items-end z-10">
          <View className="bg-white/10 px-3 py-1.5 rounded-lg mb-2 border border-white/20" style={styles.glassLabel}>
             <Text className="text-white text-sm">Your Location</Text>
          </View>
          <View className="w-8 h-8 bg-green-500 rounded-full border-2 border-white items-center justify-center shadow-lg mr-4">
             <View className="w-2 h-2 bg-white rounded-full" />
          </View>
        </View>

        <View className="absolute top-[40%] left-[25%] items-center z-10">
          <View className="bg-white/10 px-3 py-1.5 rounded-lg mb-2 border border-white/20" style={styles.glassLabel}>
             <Text className="text-white text-sm">Arriving in 3 min</Text>
          </View>
          {/* Driver Car Puck with neon rings */}
          <View className="items-center justify-center relative">
            <View className="absolute w-20 h-20 rounded-full border border-blue-400/30" />
            <View className="absolute w-16 h-16 rounded-full border border-purple-400/50 bg-blue-500/10" />
            <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-xl">
               <Ionicons name="car" size={24} color="#3B82F6" />
            </View>
          </View>
        </View>

        {/* Bottom Sheet Modal */}
        <View className="absolute bottom-5 left-5 right-5 bg-white/10 rounded-[40px] p-6 border border-white/20 z-20" style={styles.glassEffect}>
          
          {/* Driver Info Header */}
          <View className="flex-row justify-between items-start mb-2">
            <View className="w-16 h-8" /> {/* Spacer for centering */}
            
            {/* Driver Photo */}
            <View className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-gray-300 relative z-30 -mt-16">
               <Ionicons name="person" size={80} color="gray" style={{ marginTop: 10 }} />
               {/* Replace with actual driver image `<Image source={{uri: '...'}} className="w-full h-full" />` */}
            </View>

            <View className="flex-row items-center w-16 justify-end">
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text className="text-white font-bold text-lg ml-1">4.9</Text>
            </View>
          </View>

          <Text className="text-white text-2xl font-bold text-center mb-1">Vikram S.</Text>
          <View className="flex-row justify-center items-center mb-8">
            <Ionicons name="car-outline" size={16} color="#9CA3AF" />
            <Text className="text-gray-300 text-sm ml-2">Premium Sedan - MH 12 AB 1234</Text>
          </View>

          {/* Action Buttons Row */}
          <View className="flex-row justify-between mb-4">
            <TouchableOpacity className="flex-1 bg-[#06B6D4] py-3.5 rounded-full items-center flex-row justify-center mr-2 shadow-lg shadow-cyan-500/30">
               <Ionicons name="call" size={20} color="white" />
               <Text className="text-white font-semibold text-lg ml-2">Call Driver</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-1 bg-[#8B5CF6] py-3.5 rounded-full items-center flex-row justify-center ml-2 shadow-lg shadow-purple-500/30">
               <Ionicons name="chatbubble-ellipses" size={20} color="white" />
               <Text className="text-white font-semibold text-lg ml-2">Message</Text>
            </TouchableOpacity>
          </View>

          {/* Share Button */}
          <TouchableOpacity className="w-full bg-white/10 py-4 rounded-full items-center flex-row justify-center border border-white/10">
             <Feather name="share-2" size={20} color="white" />
             <Text className="text-white font-medium text-lg ml-2">Share Trip Details</Text>
          </TouchableOpacity>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassLabel: {
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
  },
  glassEffect: {
    backgroundColor: 'rgba(25, 28, 35, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    // Note: React Native lacks true blur out-of-the-box on Android, 
    // but Expo provides BlurView if requested. Using alpha colors for visual similarity.
  }
});
