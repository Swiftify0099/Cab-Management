/**
 * Partner Support Hub — stitch: partner_support_hub
 */
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

const FAQS = [
  { q: 'How do I update my vehicle details?', a: 'Go to Profile > Vehicle Verification to update your vehicle information.' },
  { q: 'How are settlements processed?', a: 'Earnings are settled every Monday to your registered bank account after TDS deduction.' },
  { q: 'What do I do if a passenger doesn\'t show up?', a: 'Mark the trip as "No Show" in the app after waiting 10 minutes. You\'ll receive a partial cancellation fee.' },
  { q: 'How can I report a passenger?', a: 'Use the "Report" button on the trip completion screen or contact support directly.' },
  { q: 'My rating dropped unfairly. What can I do?', a: 'Contact support and we will review the specific trip rating. Malicious ratings can be removed.' },
]

const QUICK_ACTIONS = [
  { label: 'Live Chat', icon: 'message-square', color: '#3B82F6', bg: '#EFF6FF' },
  { label: 'Call Support', icon: 'phone', color: '#10B981', bg: '#D1FAE5' },
  { label: 'Raise Ticket', icon: 'file-text', color: '#8B5CF6', bg: '#EDE9FE' },
  { label: 'Community', icon: 'users', color: '#F59E0B', bg: '#FEF9C3' },
]

export default function SupportHubScreen() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const filtered = FAQS.filter(f => f.q.toLowerCase().includes(search.toLowerCase()))

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="chevron-left" size={28} color="#0F172A" /></TouchableOpacity>
          <Text style={s.title}>Partner Support Hub</Text>
          <TouchableOpacity style={s.profileBtn}><Feather name="user" size={18} color="#0F172A" /></TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Live Chat Banner */}
        <View style={s.chatBanner}>
          <View style={s.chatBannerInner}>
            <View>
              <Text style={s.chatTitle}>Talk to a Support Agent</Text>
              <Text style={s.chatSub}>Avg wait time: 2 minutes</Text>
            </View>
            <TouchableOpacity style={s.chatBtn}>
              <Feather name="message-circle" size={16} color="#FFFFFF" />
              <Text style={s.chatBtnText}>Start Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity key={i} style={[s.quickCard, { backgroundColor: a.bg }]}>
              <View style={[s.quickIcon, { backgroundColor: a.color + '20' }]}>
                <Feather name={a.icon as any} size={22} color={a.color} />
              </View>
              <Text style={[s.quickLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search FAQs */}
        <View style={s.searchWrap}>
          <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search FAQs..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* FAQs */}
        <Text style={s.sectionTitle}>Frequently Asked Questions</Text>
        {filtered.map((faq, i) => (
          <TouchableOpacity key={i} style={s.faqCard} onPress={() => setExpanded(expanded === i ? null : i)}>
            <View style={s.faqQuestion}>
              <Text style={s.faqQ}>{faq.q}</Text>
              <Feather name={expanded === i ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
            </View>
            {expanded === i && <Text style={s.faqA}>{faq.a}</Text>}
          </TouchableOpacity>
        ))}

        <View style={s.ticketSection}>
          <Text style={s.ticketTitle}>Still need help?</Text>
          <TouchableOpacity style={s.ticketBtn}>
            <Feather name="plus-circle" size={18} color="#FFFFFF" />
            <Text style={s.ticketBtnText}>Raise a Support Ticket</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  title: { fontSize:18, fontWeight:'800', color:'#0F172A' },
  profileBtn: { width:36, height:36, borderRadius:18, borderWidth:2, borderColor:'#0F172A', alignItems:'center', justifyContent:'center' },
  chatBanner: { backgroundColor:'#FFFFFF', paddingHorizontal:16, paddingBottom:16 },
  chatBannerInner: { backgroundColor:'#1D4ED8', borderRadius:16, padding:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  chatTitle: { color:'#FFFFFF', fontSize:16, fontWeight:'800' },
  chatSub: { color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:3 },
  chatBtn: { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingHorizontal:14, paddingVertical:8, flexDirection:'row', alignItems:'center', gap:6 },
  chatBtnText: { color:'#FFFFFF', fontWeight:'700', fontSize:13 },
  quickGrid: { flexDirection:'row', flexWrap:'wrap', padding:16, gap:10 },
  quickCard: { width:'47.5%', borderRadius:18, padding:16, alignItems:'center', gap:8 },
  quickIcon: { width:44, height:44, borderRadius:14, alignItems:'center', justifyContent:'center' },
  quickLabel: { fontWeight:'700', fontSize:14 },
  searchWrap: { flexDirection:'row', alignItems:'center', backgroundColor:'#FFFFFF', borderRadius:14, marginHorizontal:16, paddingHorizontal:14, paddingVertical:12, marginBottom:12, borderWidth:1, borderColor:'#E2E8F0' },
  searchInput: { flex:1, fontSize:14, color:'#0F172A' },
  sectionTitle: { fontSize:17, fontWeight:'800', color:'#0F172A', marginHorizontal:16, marginBottom:10 },
  faqCard: { backgroundColor:'#FFFFFF', borderRadius:16, marginHorizontal:16, marginBottom:8, padding:16, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  faqQuestion: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  faqQ: { flex:1, color:'#0F172A', fontWeight:'700', fontSize:14, paddingRight:10 },
  faqA: { color:'#64748B', fontSize:13, lineHeight:20, marginTop:12, borderTopWidth:1, borderTopColor:'#F1F5F9', paddingTop:12 },
  ticketSection: { padding:16 },
  ticketTitle: { color:'#64748B', fontSize:14, marginBottom:12, textAlign:'center' },
  ticketBtn: { backgroundColor:'#7C3AED', borderRadius:16, paddingVertical:16, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10 },
  ticketBtnText: { color:'#FFFFFF', fontWeight:'800', fontSize:16 },
})
