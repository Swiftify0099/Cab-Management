import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function SubmitAFormalComplaint() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-gray-200 bg-white shadow-sm shadow-gray-100 relative z-20">
        <TouchableOpacity className="w-10">
          <Feather name="arrow-left" size={28} color="#334155" />
        </TouchableOpacity>
        <Text className="text-[#0F172A] text-xl font-bold flex-1 text-center pr-10">Submit a Formal Complaint</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Dropdown area mock */}
        <View className="relative z-10 mb-6">
           <View className="w-full bg-white rounded-xl border border-[#3B82F6] p-4 shadow-sm shadow-blue-100 flex-row items-center justify-between z-10 rounded-b-none">
              <View>
                 <Text className="text-[#3B82F6] text-xs font-semibold mb-1">Issue Category</Text>
                 <Text className="text-gray-500 text-base">Select an Issue</Text>
              </View>
              <Feather name="chevron-down" size={20} color="#94A3B8" />
           </View>
           
           {/* Dropdown Menu Mock */}
           <View className="w-full bg-white border border-gray-200 border-t-0 rounded-b-xl shadow-lg shadow-gray-300 absolute top-full left-0 right-0 z-20 overflow-hidden">
              <TouchableOpacity className="p-4 bg-[#F1F5F9]">
                 <Text className="text-[#0F172A] text-lg">Driver Behavior</Text>
              </TouchableOpacity>
              <TouchableOpacity className="p-4 border-b border-gray-100">
                 <Text className="text-[#0F172A] text-lg">Billing Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity className="p-4 border-b border-gray-100">
                 <Text className="text-[#0F172A] text-lg">Vehicle Condition</Text>
              </TouchableOpacity>
              <TouchableOpacity className="p-4 border-b border-gray-100">
                 <Text className="text-[#0F172A] text-lg">App Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity className="p-4">
                 <Text className="text-[#0F172A] text-lg">Other</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* This view pushes content down based on the absolute positioned dropdown above */}
        <View className="h-64" />

        {/* Details Textarea */}
        <Text className="text-[#0F172A] font-bold text-base mb-2 px-1">Details</Text>
        <View className="bg-white rounded-xl border border-gray-200 p-4 h-36 mb-6 shadow-sm shadow-gray-100">
           <TextInput 
              placeholder="Please provide as much detail as possible..."
              placeholderTextColor="#94A3B8"
              multiline
              className="flex-1 text-[#0F172A] text-base"
              style={{ textAlignVertical: 'top' }}
           />
        </View>

        {/* Photo/Video Upload */}
        <Text className="text-[#0F172A] font-bold text-base mb-2 px-1">Photo/Video Upload</Text>
        <TouchableOpacity className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm shadow-gray-100 flex-row items-center justify-between mb-10">
           <View className="flex-row items-center">
              <View className="w-10 h-10 bg-[#EFF6FF] rounded-lg items-center justify-center mr-3">
                 <Feather name="camera" size={20} color="#3B82F6" />
              </View>
              <Text className="text-[#64748B] text-base">Attach evidence (Optional)</Text>
           </View>
           <View className="w-10 h-10 bg-[#EFF6FF] rounded-lg items-center justify-center">
              <Feather name="plus" size={24} color="#3B82F6" />
           </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <TouchableOpacity className="w-full bg-[#1D4ED8] py-4 rounded-xl items-center shadow-lg shadow-blue-500/30 mb-6">
           <Text className="text-white text-lg font-semibold">Submit Complaint</Text>
        </TouchableOpacity>

        <TouchableOpacity className="w-full py-4 items-center">
           <Text className="text-[#1D4ED8] text-lg font-medium">View Previous Tickets</Text>
        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}
