/**
 * Fuel Expense Tracker — stitch: fuel_expense_tracker
 */
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'

const FUEL_LOG = [
  { date: 'Today 9:00 AM',   liters: 20, price: 107.5, cost: 2150, station: 'HP Petrol Pump, Pune' },
  { date: 'Yesterday 2:00 PM', liters: 15, price: 107.2, cost: 1608, station: 'BPCL, Mumbai' },
  { date: '29 May 10:00 AM', liters: 18, price: 107.8, cost: 1940, station: 'Indian Oil, Nashik' },
  { date: '27 May 6:00 PM',  liters: 25, price: 107.3, cost: 2682, station: 'HP Petrol Pump, Pune' },
]

export default function FuelTrackerScreen() {
  const [activeMonth, setActiveMonth] = useState('May 2026')
  const totalCost = FUEL_LOG.reduce((s, f) => s + f.cost, 0)
  const totalLiters = FUEL_LOG.reduce((s, f) => s + f.liters, 0)

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={26} color="#0F172A" /></TouchableOpacity>
          <Text style={s.title}>Fuel Expense Tracker</Text>
          <TouchableOpacity style={s.addBtn}><Feather name="plus" size={20} color="#FFFFFF" /></TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Summary Banner */}
        <LinearGradient colors={['#1D4ED8','#7C3AED']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.banner}>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.bannerLabel}>Total This Month</Text>
            <Text style={s.bannerAmount}>₹{totalCost.toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.divider} />
          <View style={{ alignItems: 'center' }}>
            <Text style={s.bannerLabel}>Total Liters</Text>
            <Text style={s.bannerAmount}>{totalLiters}L</Text>
          </View>
          <View style={s.divider} />
          <View style={{ alignItems: 'center' }}>
            <Text style={s.bannerLabel}>Avg Price</Text>
            <Text style={s.bannerAmount}>₹{(totalCost / totalLiters).toFixed(1)}</Text>
          </View>
        </LinearGradient>

        {/* Fuel Level Bar */}
        <View style={s.fuelCard}>
          <View style={s.fuelCardTop}>
            <MaterialCommunityIcons name="gas-station" size={22} color="#3B82F6" />
            <Text style={s.fuelCardTitle}>Current Tank Level</Text>
            <Text style={s.fuelPct}>75%</Text>
          </View>
          <View style={s.fuelTrack}>
            <LinearGradient colors={['#3B82F6','#06B6D4']} start={{x:0,y:0}} end={{x:1,y:0}} style={[s.fuelFill, {width:'75%'}]} />
          </View>
          <Text style={s.fuelSub}>Approx. 37.5L remaining · Range ~280 km</Text>
        </View>

        {/* Log */}
        <Text style={s.sectionTitle}>Fuel Log</Text>
        {FUEL_LOG.map((f, i) => (
          <View key={i} style={s.logCard}>
            <View style={s.logIcon}>
              <MaterialCommunityIcons name="gas-station" size={22} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.logStation}>{f.station}</Text>
              <Text style={s.logDate}>{f.date}</Text>
              <Text style={s.logMeta}>{f.liters}L @ ₹{f.price}/L</Text>
            </View>
            <Text style={s.logCost}>₹{f.cost.toLocaleString('en-IN')}</Text>
          </View>
        ))}

        {/* Add Entry */}
        <TouchableOpacity style={s.addEntryBtn}>
          <Feather name="plus-circle" size={20} color="#FFFFFF" />
          <Text style={s.addEntryText}>Add Fuel Entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, gap:12, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  title: { flex:1, fontSize:18, fontWeight:'800', color:'#0F172A' },
  addBtn: { width:36, height:36, borderRadius:18, backgroundColor:'#1D4ED8', alignItems:'center', justifyContent:'center' },
  banner: { borderRadius:20, padding:20, flexDirection:'row', justifyContent:'space-evenly', marginBottom:16 },
  bannerLabel: { color:'rgba(255,255,255,0.7)', fontSize:12, marginBottom:4 },
  bannerAmount: { color:'#FFFFFF', fontSize:24, fontWeight:'900' },
  divider: { width:1, backgroundColor:'rgba(255,255,255,0.2)' },
  fuelCard: { backgroundColor:'#FFFFFF', borderRadius:20, padding:18, marginBottom:20, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:8, elevation:2 },
  fuelCardTop: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:14 },
  fuelCardTitle: { flex:1, fontSize:16, fontWeight:'700', color:'#0F172A' },
  fuelPct: { fontSize:18, fontWeight:'900', color:'#3B82F6' },
  fuelTrack: { height:12, backgroundColor:'#F1F5F9', borderRadius:6, overflow:'hidden', marginBottom:10 },
  fuelFill: { height:'100%', borderRadius:6 },
  fuelSub: { color:'#94A3B8', fontSize:12 },
  sectionTitle: { fontSize:18, fontWeight:'800', color:'#0F172A', marginBottom:12 },
  logCard: { backgroundColor:'#FFFFFF', borderRadius:16, padding:16, marginBottom:10, flexDirection:'row', alignItems:'center', gap:14, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  logIcon: { width:46, height:46, borderRadius:14, backgroundColor:'#EFF6FF', alignItems:'center', justifyContent:'center' },
  logStation: { fontSize:14, fontWeight:'700', color:'#0F172A' },
  logDate: { fontSize:12, color:'#94A3B8', marginTop:2 },
  logMeta: { fontSize:12, color:'#6B7280', marginTop:2 },
  logCost: { fontSize:16, fontWeight:'800', color:'#1D4ED8' },
  addEntryBtn: { backgroundColor:'#1D4ED8', borderRadius:16, paddingVertical:16, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, marginTop:8 },
  addEntryText: { color:'#FFFFFF', fontWeight:'800', fontSize:16 },
})
