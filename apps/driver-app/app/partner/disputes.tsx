/**
 * Partner Disputes & Complaints — stitch: partner_dispute_complaint_center
 * Driver Penalty System — stitch: driver_penalty_system_ui
 */
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

const DISPUTES = [
  { id: 'D-1024', title: 'Unfair cancellation charge', date: '28 May 2026', status: 'Under Review', color: '#F59E0B', bg: '#FEF9C3' },
  { id: 'D-1018', title: 'Rating dispute – passenger was rude', date: '22 May 2026', status: 'Resolved', color: '#10B981', bg: '#D1FAE5' },
  { id: 'D-1009', title: 'Wrong deduction from wallet', date: '14 May 2026', status: 'Resolved', color: '#10B981', bg: '#D1FAE5' },
]

const PENALTIES = [
  { label: 'Late Cancellation',  amount: -150, date: '27 May', reason: 'Cancelled within 5 min of pickup' },
  { label: 'Low Rating Penalty', amount: -100, date: '20 May', reason: 'Rating below 4.0 for 3 consecutive trips' },
]

export default function DisputesScreen() {
  const [tab, setTab] = useState<'disputes' | 'penalties'>('disputes')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', desc: '' })

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={26} color="#0F172A" /></TouchableOpacity>
          <Text style={s.title}>Disputes & Penalties</Text>
          <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Feather name="plus" size={20} color="#FFFFFF" /></TouchableOpacity>
        </View>
        <View style={s.tabs}>
          {(['disputes','penalties'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={()=>setTab(t)}>
              <Text style={[s.tabText, tab===t && s.tabTextActive]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {tab === 'disputes' ? (
          <>
            <View style={s.infoBanner}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={s.infoText}>Disputes are usually resolved within 3-5 business days</Text>
            </View>
            {DISPUTES.map((d, i) => (
              <View key={i} style={s.disputeCard}>
                <View style={s.disputeTop}>
                  <Text style={s.disputeId}>{d.id}</Text>
                  <View style={[s.statusPill, { backgroundColor: d.bg }]}>
                    <Text style={[s.statusText, { color: d.color }]}>{d.status}</Text>
                  </View>
                </View>
                <Text style={s.disputeTitle}>{d.title}</Text>
                <View style={s.disputeBottom}>
                  <Text style={s.disputeDate}>{d.date}</Text>
                  <TouchableOpacity><Text style={s.viewDetails}>View Details →</Text></TouchableOpacity>
                </View>
              </View>
            ))}
            {showForm && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>Raise New Dispute</Text>
                <TextInput style={s.formInput} placeholder="Issue Title" value={form.title} onChangeText={t => setForm(f => ({...f, title: t}))} placeholderTextColor="#94A3B8" />
                <TextInput style={[s.formInput, { height: 100, textAlignVertical: 'top' }]} placeholder="Describe your issue..." multiline value={form.desc} onChangeText={t => setForm(f => ({...f, desc: t}))} placeholderTextColor="#94A3B8" />
                <TouchableOpacity style={s.submitBtn} onPress={() => setShowForm(false)}>
                  <Text style={s.submitText}>Submit Dispute</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={[s.infoBanner, { borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' }]}>
              <MaterialCommunityIcons name="alert" size={20} color="#EF4444" />
              <Text style={[s.infoText, { color: '#DC2626' }]}>Total penalties this month: ₹{PENALTIES.reduce((a, p) => a + Math.abs(p.amount), 0)}</Text>
            </View>
            {PENALTIES.map((p, i) => (
              <View key={i} style={s.penaltyCard}>
                <View style={s.penaltyIcon}><MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.penaltyLabel}>{p.label}</Text>
                  <Text style={s.penaltyReason}>{p.reason}</Text>
                  <Text style={s.penaltyDate}>{p.date}</Text>
                </View>
                <Text style={s.penaltyAmount}>₹{p.amount}</Text>
              </View>
            ))}
            <View style={s.penaltyTip}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color="#EAB308" />
              <Text style={s.penaltyTipText}>Maintain 4.5+ rating and avoid late cancellations to avoid penalties</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14 },
  title: { fontSize:18, fontWeight:'800', color:'#0F172A' },
  addBtn: { width:36, height:36, borderRadius:18, backgroundColor:'#1D4ED8', alignItems:'center', justifyContent:'center' },
  tabs: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:'#E2E8F0' },
  tab: { flex:1, paddingVertical:12, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  tabActive: { borderBottomColor:'#1D4ED8' },
  tabText: { color:'#94A3B8', fontWeight:'600' },
  tabTextActive: { color:'#1D4ED8', fontWeight:'800' },
  infoBanner: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#EFF6FF', borderRadius:12, padding:14, marginBottom:14, borderWidth:1, borderColor:'#BFDBFE' },
  infoText: { flex:1, color:'#1D4ED8', fontSize:13, lineHeight:18 },
  disputeCard: { backgroundColor:'#FFFFFF', borderRadius:16, padding:16, marginBottom:10, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  disputeTop: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  disputeId: { color:'#94A3B8', fontSize:12, fontWeight:'700' },
  statusPill: { borderRadius:20, paddingHorizontal:10, paddingVertical:3 },
  statusText: { fontSize:11, fontWeight:'700' },
  disputeTitle: { color:'#0F172A', fontWeight:'700', fontSize:15, marginBottom:10 },
  disputeBottom: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  disputeDate: { color:'#94A3B8', fontSize:12 },
  viewDetails: { color:'#1D4ED8', fontSize:13, fontWeight:'700' },
  formCard: { backgroundColor:'#FFFFFF', borderRadius:18, padding:20, marginTop:8, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:8, elevation:2 },
  formTitle: { fontSize:18, fontWeight:'800', color:'#0F172A', marginBottom:14 },
  formInput: { backgroundColor:'#F8FAFC', borderRadius:12, padding:14, fontSize:14, color:'#0F172A', marginBottom:12, borderWidth:1, borderColor:'#E2E8F0' },
  submitBtn: { backgroundColor:'#1D4ED8', borderRadius:14, paddingVertical:14, alignItems:'center' },
  submitText: { color:'#FFFFFF', fontWeight:'800', fontSize:16 },
  penaltyCard: { backgroundColor:'#FFFFFF', borderRadius:16, padding:16, marginBottom:10, flexDirection:'row', alignItems:'center', gap:14 },
  penaltyIcon: { width:48, height:48, borderRadius:14, backgroundColor:'#FEE2E2', alignItems:'center', justifyContent:'center' },
  penaltyLabel: { color:'#0F172A', fontWeight:'700', fontSize:15 },
  penaltyReason: { color:'#6B7280', fontSize:12, marginTop:3 },
  penaltyDate: { color:'#94A3B8', fontSize:11, marginTop:2 },
  penaltyAmount: { color:'#EF4444', fontWeight:'900', fontSize:18 },
  penaltyTip: { flexDirection:'row', alignItems:'flex-start', gap:10, backgroundColor:'#FEFCE8', borderRadius:14, padding:14, borderWidth:1, borderColor:'#FEF9C3', marginTop:8 },
  penaltyTipText: { flex:1, color:'#92400E', fontSize:13, lineHeight:18 },
})
