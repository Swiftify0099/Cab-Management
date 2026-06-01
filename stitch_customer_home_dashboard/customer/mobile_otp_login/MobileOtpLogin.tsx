import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function MobileOtpLogin() {
  return (
    <SafeAreaView className="flex-1 bg-[#0F172A]">
      <StatusBar barStyle="light-content" />

      {/* Abstract Background Blurs */}
      <View className="absolute inset-0">
         <View className="absolute top-1/4 left-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl opacity-50" />
         <View className="absolute bottom-1/4 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl opacity-50" />
      </View>

      <View className="flex-1 px-6 pt-16 z-10 items-center">
         
         {/* Logo */}
         <View className="flex-row items-center mb-16">
            <View className="flex-row items-end">
               <Text className="text-white text-5xl font-extrabold tracking-tighter">i</Text>
               <Text className="text-blue-500 text-5xl font-extrabold tracking-tighter -ml-1">M</Text>
            </View>
            <View className="ml-3 mt-1">
               <Text className="text-white text-xl font-bold leading-5">Intercity</Text>
               <Text className="text-white text-xl font-bold leading-5">Mobility</Text>
            </View>
         </View>

         {/* Title */}
         <Text className="text-white text-[32px] font-bold text-center leading-[38px] mb-12">
            Welcome Back!{'\n'}Log in to continue{'\n'}your journey.
         </Text>

         {/* Input Field */}
         <View className="w-full bg-white/10 border border-white/20 rounded-2xl h-16 flex-row items-center px-5 mb-6 backdrop-blur-md">
            <Feather name="phone" size={24} color="#94A3B8" className="mr-3" />
            <View className="w-px h-6 bg-gray-500 mr-3" />
            <TextInput 
               placeholder="Enter Mobile Number"
               placeholderTextColor="#94A3B8"
               keyboardType="phone-pad"
               className="flex-1 text-white text-lg"
            />
         </View>

         {/* Get OTP Button */}
         <TouchableOpacity className="w-full mb-12 shadow-lg shadow-purple-500/30">
            <LinearGradient
               colors={['#0EA5E9', '#A855F7']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 0 }}
               className="w-full h-16 rounded-full items-center justify-center"
            >
               <Text className="text-white text-xl font-bold">Get OTP</Text>
            </LinearGradient>
         </TouchableOpacity>

         {/* Social Media Login */}
         <Text className="text-gray-400 text-base mb-6">Or continue with social media</Text>

         <View className="flex-row w-full justify-center mb-auto">
            {/* Apple */}
            <TouchableOpacity className="w-16 h-16 rounded-full bg-white items-center justify-center mx-3 shadow-md shadow-black/50">
               <FontAwesome5 name="apple" size={32} color="black" className="-mt-1" />
            </TouchableOpacity>
            
            {/* Google Mock */}
            <TouchableOpacity className="w-16 h-16 rounded-full bg-white items-center justify-center mx-3 shadow-md shadow-black/50">
               <View className="flex-row flex-wrap w-8 h-8 relative items-center justify-center">
                 {/* A simple G using icons or text since we don't have the image */}
                 <Text className="text-3xl font-bold text-blue-500">G</Text>
               </View>
            </TouchableOpacity>
            
            {/* Facebook */}
            <TouchableOpacity className="w-16 h-16 rounded-full bg-[#1877F2] items-center justify-center mx-3 shadow-md shadow-black/50 border-2 border-white">
               <FontAwesome5 name="facebook-f" size={28} color="white" className="mt-1 ml-1" />
            </TouchableOpacity>
         </View>

         {/* Footer */}
         <Text className="text-gray-400 text-center text-sm mb-6 leading-5 px-4">
            By continuing, you agree to our <Text className="text-white font-medium">Terms and Privacy Policy</Text>.
         </Text>

      </View>
    </SafeAreaView>
  );
}
