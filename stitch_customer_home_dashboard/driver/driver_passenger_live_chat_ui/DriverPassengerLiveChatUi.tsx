import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverPassengerLiveChatUi() {
  return (
    <SafeAreaView className="flex-1 bg-[#1A1A1A]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-4 border-b border-white/10 bg-[#1A1A1A]">
        <View className="flex-row items-center">
          <TouchableOpacity className="mr-4">
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Sarah (Passenger)</Text>
        </View>
        <TouchableOpacity className="items-center">
          <Ionicons name="call" size={24} color="#10B981" />
          <Text className="text-[#10B981] text-xs mt-1">Call</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          
          {/* Incoming Message Block */}
          <Text className="text-gray-500 text-xs text-center mb-4">10:15 AM</Text>
          
          <View className="mb-1 flex-row">
            <View className="bg-[#404040] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
              <Text className="text-white text-lg leading-6">
                Hi, I'm waiting near the main entrance.
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 text-xs text-left mb-6 ml-1">10:15 AM</Text>

          {/* Outgoing Message Block */}
          <Text className="text-gray-500 text-xs text-center mb-4">10:16 AM</Text>
          
          <View className="mb-1 flex-row justify-end">
            <View className="bg-[#3B82F6] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] shadow-sm shadow-blue-500/20">
              <Text className="text-white text-lg leading-6">
                Got it, I'm almost there. Just turning onto the street.
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 text-xs text-right mb-4 mr-1">10:16 AM</Text>

        </ScrollView>

        {/* Input Area */}
        <View className="bg-[#1A1A1A] pb-8 pt-2">
          
          {/* Quick Replies Horizontal Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4" contentContainerStyle={{ paddingRight: 32 }}>
            <TouchableOpacity className="bg-[#3B82F6] px-5 py-2.5 rounded-full mr-3 shadow-sm shadow-blue-500/20">
              <Text className="text-white font-medium text-base">I am outside</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-[#3B82F6] px-5 py-2.5 rounded-full mr-3 shadow-sm shadow-blue-500/20">
              <Text className="text-white font-medium text-base">Traffic is heavy</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-[#3B82F6] px-5 py-2.5 rounded-full shadow-sm shadow-blue-500/20">
              <Text className="text-white font-medium text-base">I have arrived</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Text Input Row */}
          <View className="flex-row items-center px-4">
            <TouchableOpacity className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mr-3">
               <MaterialCommunityIcons name="microphone" size={22} color="white" />
            </TouchableOpacity>
            
            <View className="flex-1 bg-white/10 rounded-full flex-row items-center px-4 py-2 mr-3 border border-white/20">
              <TextInput 
                placeholder="Type a message..." 
                placeholderTextColor="#9CA3AF"
                className="flex-1 text-white text-base py-1.5"
              />
            </View>

            <TouchableOpacity className="w-12 h-12 bg-white/10 rounded-full items-center justify-center border border-white/5">
              {/* Send icon (paper plane) using Feather or Ionicons */}
               <Ionicons name="send" size={20} color="#4B5563" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
          
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
