import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';

export default function DriverOtpVerification() {
  return (
    <SafeAreaView className="flex-1 bg-[#121621]">
      <StatusBar barStyle="light-content" />

      <View className="flex-1 px-6 pt-16 items-center justify-between">
        
        {/* Header Section */}
        <View className="items-center w-full">
          <Text className="text-white text-3xl font-extrabold mb-3 text-center tracking-tight">Driver OTP Verification</Text>
          <Text className="text-gray-400 text-lg text-center mb-12">Secure Driver Authentication</Text>

          {/* Security Badge */}
          <View className="mb-6 items-center">
            <MaterialIcons name="security" size={48} color="#3B82F6" className="mb-4" />
            <Text className="text-white text-xl font-bold mb-2">Enterprise-Grade Security</Text>
            <Text className="text-gray-400 text-sm text-center">Your session is encrypted for your protection.</Text>
          </View>

          {/* OTP Input Circles */}
          <View className="flex-row justify-between w-full px-4 mb-8 mt-4">
            {[1, 2, 3, 4].map((item) => (
              <View 
                key={item} 
                className="w-[18%] aspect-square rounded-full bg-[#1F2335] border-2 border-[#3B82F6] items-center justify-center shadow-lg"
                style={styles.neonGlow}
              >
                <View className="w-1.5 h-1.5 rounded-full bg-white mx-0.5 inline-block" />
                <View className="w-1.5 h-1.5 rounded-full bg-white mx-0.5 inline-block absolute left-1/2 -translate-x-3" />
                <View className="w-1.5 h-1.5 rounded-full bg-white mx-0.5 inline-block absolute right-1/2 translate-x-3" />
              </View>
            ))}
          </View>

          {/* Resend Timer */}
          <Text className="text-gray-400 text-sm">
            Resend OTP in <Text className="text-[#3B82F6] underline">00:29</Text>
          </Text>
        </View>

        {/* Verify Button */}
        <View className="w-full mb-8">
          <TouchableOpacity className="w-full bg-[#3B82F6] py-4 rounded-xl items-center shadow-lg shadow-blue-500/30">
            <Text className="text-white text-lg font-bold">Verify</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Keypad Area */}
      <View className="bg-[#D1D5DB] pb-8 pt-4 px-2">
        <View className="flex-row justify-between mb-2">
          <KeypadButton number="1" />
          <KeypadButton number="2" letters="ABC" />
          <KeypadButton number="3" letters="DEF" />
        </View>
        <View className="flex-row justify-between mb-2">
          <KeypadButton number="4" letters="GHI" />
          <KeypadButton number="5" letters="JKL" />
          <KeypadButton number="6" letters="MNO" />
        </View>
        <View className="flex-row justify-between mb-2">
          <KeypadButton number="7" letters="PQRS" />
          <KeypadButton number="8" letters="TUV" />
          <KeypadButton number="9" letters="WXYZ" />
        </View>
        <View className="flex-row justify-between mb-1">
          <View className="flex-1 mx-1" />
          <KeypadButton number="0" />
          <TouchableOpacity className="flex-1 bg-transparent rounded-lg mx-1 h-14 justify-center items-center">
            <Feather name="delete" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Custom Keypad Button Component
const KeypadButton = ({ number, letters }: { number: string, letters?: string }) => (
  <TouchableOpacity className="flex-1 bg-white rounded-lg mx-1 h-14 justify-center items-center shadow-sm shadow-gray-400">
    <Text className="text-black text-2xl font-normal leading-none mt-1">{number}</Text>
    {letters && <Text className="text-black text-[10px] font-bold mt-0.5 tracking-widest">{letters}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  neonGlow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  }
});
