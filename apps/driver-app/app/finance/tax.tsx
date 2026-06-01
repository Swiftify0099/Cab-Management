/**
 * Tax & Settlement Dashboard — stitch: tax_settlement_dashboard
 */
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'

const SETTLEMENTS = [
  { period: 'May 2026', gross: 22480, tax: 2248, net: 20232, status: 'Processed' },
  { period: 'Apr 2026', gross: 18900, tax: 1890, net: 17010, status: 'Processed' },
  { period: 'Mar 2026', gross: 24100, tax: 2410, net: 21690, status: 'Processed' },
  { period: 'Feb 2026', gross: 16500, tax: 1650, net: 14850, status: 'Processed' },
]

export default function TaxSettlementScreen() {
  const [tab, setTab] = useState<'summary' | 'history'>('summary')
  const ytd = SETTLEMENTS.reduce((s, x) => ({ gross: s.gross + x.gross, tax: s.tax + x.tax, net: s.net + x.net }), { gross: 0, tax: 0, net: 0 })

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={26} color="#0F172A" /></TouchableOpacity>
          <Text style={s.title}>Tax & Settlement</Text>
          <TouchableOpacity><Ionicons name="person-circle" size={32} color="#0F172A" /></TouchableOpacity>
        </View>
        <View style={s.tabs}>
          {(['summary','history'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={()=>setTab(t)}>
              <Text style={[s.tabText, tab===t && s.tabTextActive]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
        {/* YTD Banner */}
        <LinearGradient colors={['#1E3A8A','#4F46E5']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.banner}>
          <Text style={s.bannerTitle}>FY 2025-26 Summary</Text>
          <View style={s.bannerGrid}>
            <View style={s.bannerItem}><Text style={s.bannerLabel}>Gross Earnings</Text><Text style={s.bannerVal}>₹{ytd.gross.toLocaleString('en-IN')}</Text></View>
            <View style={s.bannerItem}><Text style={s.bannerLabel}>TDS Deducted</Text><Text style={[s.bannerVal,{color:'#FCA5A5'}]}>-₹{ytd.tax.toLocaleString('en-IN')}</Text></View>
            <View style={s.bannerItem}><Text style={s.bannerLabel}>Net Payout</Text><Text style={[s.bannerVal,{color:'#6EE7B7'}]}>₹{ytd.net.toLocaleString('en-IN')}</Text></View>
          </View>
        </LinearGradient>

        {/* Tax Rate Info */}
        <View style={s.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#3B82F6" />
          <Text style={s.infoText}>TDS @ 10% deducted per settlement period as per IT Act Section 194C</Text>
        </View>

        {tab === 'summary' ? (
          <>
            {/* Monthly Breakdown */}
            <Text style={s.sectionTitle}>Monthly Breakdown</Text>
            {SETTLEMENTS.map((s2, i) => (
              <View key={i} style={s.settlementCard}>
                <View style={s.settlementRow}>
                  <Text style={s.settlementPeriod}>{s2.period}</Text>
                  <View style={s.processedBadge}><Text style={s.processedText}>{s2.status}</Text></View>
                </View>
                <View style={s.settlementGrid}>
                  <View><Text style={s.metaLabel}>Gross</Text><Text style={s.metaVal}>₹{s2.gross.toLocaleString('en-IN')}</Text></View>
                  <View><Text style={s.metaLabel}>TDS</Text><Text style={[s.metaVal,{color:'#EF4444'}]}>-₹{s2.tax.toLocaleString('en-IN')}</Text></View>
                  <View><Text style={s.metaLabel}>Net</Text><Text style={[s.metaVal,{color:'#10B981',fontWeight:'900'}]}>₹{s2.net.toLocaleString('en-IN')}</Text></View>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons name="file-download-outline" size={64} color="#CBD5E1" />
            <Text style={s.emptyTitle}>Download Tax Reports</Text>
            <Text style={s.emptyText}>Download Form 26AS or GST summaries for your filings</Text>
            <TouchableOpacity style={s.downloadBtn}><Feather name="download" size={18} color="#FFFFFF" /><Text style={s.downloadText}>Download Form 26AS</Text></TouchableOpacity>
            <TouchableOpacity style={[s.downloadBtn,{backgroundColor:'#6D28D9',marginTop:10}]}><Feather name="download" size={18} color="#FFFFFF" /><Text style={s.downloadText}>Download GST Summary</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14 },
  title: { fontSize:18, fontWeight:'800', color:'#0F172A' },
  tabs: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:'#E2E8F0' },
  tab: { flex:1, paddingVertical:12, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  tabActive: { borderBottomColor:'#1D4ED8' },
  tabText: { color:'#94A3B8', fontWeight:'600', fontSize:14 },
  tabTextActive: { color:'#1D4ED8', fontWeight:'800' },
  banner: { borderRadius:20, padding:20, marginBottom:14 },
  bannerTitle: { color:'rgba(255,255,255,0.7)', fontSize:13, marginBottom:14 },
  bannerGrid: { flexDirection:'row', justifyContent:'space-between' },
  bannerItem: { alignItems:'center' },
  bannerLabel: { color:'rgba(255,255,255,0.6)', fontSize:11, marginBottom:4 },
  bannerVal: { color:'#FFFFFF', fontSize:18, fontWeight:'900' },
  infoCard: { flexDirection:'row', alignItems:'flex-start', gap:10, backgroundColor:'#EFF6FF', borderRadius:12, padding:14, marginBottom:16, borderWidth:1, borderColor:'#BFDBFE' },
  infoText: { flex:1, color:'#1D4ED8', fontSize:13, lineHeight:18 },
  sectionTitle: { fontSize:18, fontWeight:'800', color:'#0F172A', marginBottom:10 },
  settlementCard: { backgroundColor:'#FFFFFF', borderRadius:16, padding:16, marginBottom:10, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  settlementRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  settlementPeriod: { fontSize:16, fontWeight:'700', color:'#0F172A' },
  processedBadge: { backgroundColor:'#D1FAE5', borderRadius:20, paddingHorizontal:10, paddingVertical:3 },
  processedText: { color:'#065F46', fontSize:11, fontWeight:'700' },
  settlementGrid: { flexDirection:'row', justifyContent:'space-between' },
  metaLabel: { color:'#94A3B8', fontSize:11, marginBottom:4 },
  metaVal: { color:'#0F172A', fontSize:15, fontWeight:'700' },
  emptyWrap: { alignItems:'center', paddingVertical:40 },
  emptyTitle: { fontSize:18, fontWeight:'800', color:'#0F172A', marginTop:16, marginBottom:8 },
  emptyText: { color:'#94A3B8', textAlign:'center', lineHeight:20, marginBottom:20 },
  downloadBtn: { backgroundColor:'#1D4ED8', borderRadius:14, paddingVertical:14, paddingHorizontal:24, flexDirection:'row', alignItems:'center', gap:10, width:'100%', justifyContent:'center' },
  downloadText: { color:'#FFFFFF', fontWeight:'700', fontSize:15 },
})
