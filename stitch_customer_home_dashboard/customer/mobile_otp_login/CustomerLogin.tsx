import React from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

export default function LoginScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0a0e17]">
      <StatusBar barStyle="light-content" />

      {/* Ambient Background Glow Effects */}
      <View className="absolute top-[25%] left-[-10%] w-[80%] h-[40%] bg-[#00d2ff] opacity-10 rounded-full blur-3xl" />
      <View className="absolute top-[35%] right-[-10%] w-[80%] h-[40%] bg-[#9b00ff] opacity-10 rounded-full blur-3xl" />

      <View className="flex-1 px-6 pt-12 pb-8 justify-between">
        
        {/* Top Section: Logo & Welcome Text */}
        <View className="items-center mt-6">
          {/* Logo Placeholder (Replace with your actual Image/SVG) */}
          <View className="flex-row items-center mb-8">
            <Text className="text-white text-2xl font-bold tracking-widest">
              <Text className="text-[#00d2ff]">i</Text>M <Text className="text-white text-xl">Intercity{'\n'}Mobility</Text>
            </Text>
          </View>

          <Text className="text-white text-[32px] leading-[42px] font-bold text-center tracking-tight">
            Welcome Back!{'\n'}Log in to continue{'\n'}your journey.
          </Text>
        </View>

        {/* Middle Section: Input & Primary Button */}
        <View className="w-full mt-10">
          {/* Phone Input Field (Glassmorphism effect) */}
          <View className="flex-row items-center bg-[#ffffff10] border border-[#ffffff20] rounded-[20px] px-5 py-4 mb-6">
            <Feather name="phone" size={20} color="#8e8e93" />
            <TextInput
              placeholder="Enter Mobile Number"
              placeholderTextColor="#8e8e93"
              className="flex-1 text-white ml-3 text-base font-medium"
              keyboardType="phone-pad"
              selectionColor="#00d2ff"
            />
          </View>

          {/* Gradient 'Get OTP' Button */}
          <TouchableOpacity activeOpacity={0.8} className="w-full">
            <LinearGradient
              colors={['#00d2ff', '#9b00ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-full py-[18px] items-center justify-center shadow-lg shadow-purple-500/30"
            >
              <Text className="text-white font-bold text-[17px]">Get OTP</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Bottom Section: Social Logins */}
        <View className="items-center mt-12 mb-auto">
          <Text className="text-[#8e8e93] text-[15px] mb-6">
            Or continue with social media
          </Text>
          
          <View className="flex-row items-center justify-center gap-6">
            {/* Apple Login */}
            <TouchableOpacity className="w-14 h-14 bg-white rounded-full items-center justify-center">
              <FontAwesome5 name="apple" size={26} color="black" />
            </TouchableOpacity>

            {/* Google Login */}
            <TouchableOpacity className="w-14 h-14 bg-white rounded-full items-center justify-center shadow-sm">
              <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} 
                className="w-7 h-7" 
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Facebook Login */}
            <TouchableOpacity className="w-14 h-14 bg-[#1877F2] rounded-full items-center justify-center">
              <FontAwesome5 name="facebook-f" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer: Terms & Privacy Policy */}
        <View className="items-center justify-end mt-4">
          <Text className="text-[#8e8e93] text-[13px] text-center px-4 leading-5">
            By continuing, you agree to our{' '}
            <Text className="text-white font-semibold">Terms</Text> and{' '}
            <Text className="text-white font-semibold">Privacy Policy</Text>.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}