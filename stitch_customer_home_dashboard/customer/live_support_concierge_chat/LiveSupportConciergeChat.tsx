import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LiveSupportConciergeChat() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center justify-between bg-white border-b border-gray-200">
        <TouchableOpacity>
          <Feather name="chevron-left" size={28} color="#475569" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Live Support</Text>
        <TouchableOpacity>
          <Text className="text-gray-500 text-base font-medium">End Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Pre-defined Issues */}
      <View className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm shadow-gray-100 z-10">
         <Text className="text-black text-base mb-3">Pre-defined Issues</Text>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full mr-2 border border-gray-300">
               <Text className="text-black text-base">Driver late</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full mr-2 border border-gray-300">
               <Text className="text-black text-base">Fare dispute</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full mr-2 border border-gray-300">
               <Text className="text-black text-base">Route change</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full mr-2 border border-gray-300">
               <Text className="text-black text-base">Lost item</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-full mr-4 border border-gray-300">
               <Text className="text-black text-base">Payment issue</Text>
            </TouchableOpacity>
         </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        <Text className="text-gray-500 text-sm ml-12 mb-1">Sarah W.</Text>
        
        {/* Agent Message 1 */}
        <View className="flex-row mb-2">
           <View className="w-10 h-10 rounded-full bg-gray-300 mr-2 border border-gray-200 overflow-hidden items-center justify-center">
              <Ionicons name="person" size={24} color="gray" style={{marginTop: 6}} />
           </View>
           <View className="bg-[#CBD5E1] p-4 rounded-2xl rounded-tl-sm max-w-[80%] shadow-sm shadow-gray-200">
              <Text className="text-black text-base leading-6">
                 Hello, Alex. How can I assist you with your recent intercity trip today? Are you experiencing an issue with your driver or fare?
              </Text>
           </View>
        </View>

        {/* Agent Message 2 */}
        <View className="flex-row mb-6">
           <View className="w-10 h-10 rounded-full bg-gray-300 mr-2 border border-gray-200 overflow-hidden items-center justify-center">
              {/* Mock face if possible, else generic person */}
              <Ionicons name="person" size={24} color="gray" style={{marginTop: 6}} />
           </View>
           <View className="bg-[#CBD5E1] p-4 rounded-2xl rounded-tl-sm max-w-[80%] shadow-sm shadow-gray-200">
              <Text className="text-black text-base leading-6">
                 Please feel free to select a topic above or type your concern.
              </Text>
           </View>
        </View>

        {/* User Message 1 */}
        <View className="flex-row justify-end mb-2">
           <View className="bg-[#BAE6FD] p-4 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm shadow-blue-100">
              <Text className="text-black text-base leading-6">
                 Hi Sarah, my driver seems to be running about 20 minutes late. I'm at the pickup point.
              </Text>
           </View>
        </View>

        {/* User Attachment */}
        <View className="flex-row justify-end mb-6">
           <View className="bg-[#BAE6FD] p-3 rounded-2xl rounded-tr-sm max-w-[70%] shadow-sm shadow-blue-100 flex-row items-center border border-blue-200">
              <MaterialCommunityIcons name="paperclip" size={24} color="#64748B" className="mr-3" />
              <View className="mr-3 flex-1">
                 <Text className="text-black font-bold text-sm">Attachment:</Text>
                 <Text className="text-black text-sm" numberOfLines={1}>pickup_location.jpg</Text>
              </View>
              <View className="w-12 h-12 bg-gray-400 rounded-lg overflow-hidden border border-gray-300 items-center justify-center">
                 <Ionicons name="image" size={20} color="white" />
              </View>
           </View>
        </View>

      </ScrollView>

      {/* Input Area */}
      <View className="bg-white px-4 py-3 border-t border-gray-200 flex-row items-center pb-8">
         <TouchableOpacity className="mr-4">
            <Feather name="camera" size={28} color="#94A3B8" />
         </TouchableOpacity>
         <TouchableOpacity className="mr-4">
            <Feather name="file" size={28} color="#94A3B8" />
         </TouchableOpacity>
         
         <View className="flex-1 bg-white border border-gray-300 rounded-full h-12 flex-row items-center px-4 shadow-sm shadow-gray-100">
            <TextInput 
               placeholder="Type a message..."
               placeholderTextColor="#9CA3AF"
               className="flex-1 text-base text-black"
            />
         </View>
         
         <TouchableOpacity className="ml-4 w-12 h-12 items-center justify-center">
            <Ionicons name="send" size={28} color="#3B82F6" />
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
