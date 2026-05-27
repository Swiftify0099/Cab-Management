import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { driverApi } from '../../api/client'

export default function EarningsScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<'today' | 'weekly' | 'monthly'>('weekly')
  
  const [earnings, setEarnings] = useState({
    total_revenue: 14500,
    commission_deducted: 1450,
    net_earnings: 13050,
    completed_trips: 18,
    online_hours: 42
  })

  const [history, setHistory] = useState([
    { id: '1', date: '2026-10-15', amount: 3500, trips: 5, status: 'settled' },
    { id: '2', date: '2026-10-14', amount: 2800, trips: 4, status: 'settled' },
    { id: '3', date: '2026-10-13', amount: 4100, trips: 6, status: 'settled' },
    { id: '4', date: '2026-10-12', amount: 2650, trips: 3, status: 'settled' },
  ])

  const loadData = async () => {
    // Stub implementation to show UI design
    // In production, call: driverApi.get(`/api/v1/drivers/me/earnings?period=${period}`)
    setTimeout(() => {
      setLoading(false)
      setRefreshing(false)
    }, 1000)
  }

  useEffect(() => {
    loadData()
  }, [period])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <Text className="text-xl font-bold text-slate-900">Earnings</Text>
        <TouchableOpacity className="bg-slate-100 p-2 rounded-full">
          <Ionicons name="help-circle-outline" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-5">
          {/* Period Selector */}
          <View className="flex-row bg-slate-100 rounded-xl p-1 mb-6">
            {(['today', 'weekly', 'monthly'] as const).map(p => (
              <TouchableOpacity
                key={p}
                className={`flex-1 py-2 rounded-lg items-center ${period === p ? 'bg-white shadow-sm' : ''}`}
                onPress={() => setPeriod(p)}
              >
                <Text className={`font-semibold capitalize ${period === p ? 'text-slate-900' : 'text-slate-500'}`}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Main Card */}
          <View className="bg-emerald-600 rounded-3xl p-6 shadow-sm mb-6">
            <Text className="text-emerald-100 font-semibold mb-1">Net Earnings</Text>
            <Text className="text-white text-4xl font-black mb-4">₹{earnings.net_earnings.toLocaleString()}</Text>
            
            <View className="h-px bg-emerald-500/50 mb-4" />
            
            <View className="flex-row justify-between">
              <View>
                <Text className="text-emerald-100 text-xs mb-1">Total Revenue</Text>
                <Text className="text-white font-bold">₹{earnings.total_revenue.toLocaleString()}</Text>
              </View>
              <View>
                <Text className="text-emerald-100 text-xs mb-1">Platform Fee (-10%)</Text>
                <Text className="text-white font-bold text-right">-₹{earnings.commission_deducted.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View className="flex-row gap-4 mb-8">
            <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <Ionicons name="car-outline" size={24} color="#3b82f6" className="mb-2" />
              <Text className="text-2xl font-black text-slate-900">{earnings.completed_trips}</Text>
              <Text className="text-xs text-slate-400 font-medium mt-1">Completed Trips</Text>
            </View>
            <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <Ionicons name="time-outline" size={24} color="#f59e0b" className="mb-2" />
              <Text className="text-2xl font-black text-slate-900">{earnings.online_hours}h</Text>
              <Text className="text-xs text-slate-400 font-medium mt-1">Online Hours</Text>
            </View>
          </View>

          {/* Settlement History */}
          <View className="mb-4 flex-row justify-between items-center">
            <Text className="text-lg font-bold text-slate-900">Settlement History</Text>
            <TouchableOpacity>
              <Text className="text-blue-600 font-semibold text-sm">View All</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-10">
            {history.map((item, index) => (
              <View key={item.id} className={`p-4 flex-row justify-between items-center ${index !== history.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                    <Ionicons name="checkmark-done" size={18} color="#10b981" />
                  </View>
                  <View>
                    <Text className="font-bold text-slate-900">{new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                    <Text className="text-xs text-slate-400 mt-0.5">{item.trips} trips</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-black text-slate-900">₹{item.amount.toLocaleString()}</Text>
                  <Text className="text-xs text-emerald-600 font-semibold mt-0.5 capitalize">{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
