/**
 * Incentives & Quests Dashboard — stitch: incentives_quests_dashboard
 */
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'

const QUESTS = [
  { title: 'Complete 5 Trips Today',       reward: '₹250',  progress: 3, total: 5,  icon: 'car-multiple',   color: '#3B82F6' },
  { title: 'Earn ₹1000 This Week',          reward: '₹150',  progress: 620, total: 1000, icon: 'cash',        color: '#10B981' },
  { title: 'Maintain 4.8+ Rating',          reward: '₹100',  progress: 4.9, total: 4.8, icon: 'star',         color: '#EAB308' },
  { title: 'Complete 2 Parcel Deliveries',  reward: '₹75',   progress: 1, total: 2,  icon: 'package',        color: '#8B5CF6' },
  { title: 'Drive 200 km in a Day',         reward: '₹200',  progress: 149, total: 200, icon: 'map-marker-distance', color: '#06B6D4' },
]

const REWARDS = [
  { label: 'Weekend Bonus', amount: '₹500', expires: '2 days', badge: '🔥' },
  { label: 'Festival Special', amount: '₹1000', expires: '5 days', badge: '🎉' },
  { label: 'Loyalty Reward', amount: '₹200', expires: '30 days', badge: '⭐' },
]

export default function IncentivesScreen() {
  const [tab, setTab] = useState<'quests' | 'rewards'>('quests')
  const totalPoints = 2450

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <SafeAreaView edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#FFFFFF" /></TouchableOpacity>
          <Text style={s.title}>Incentives & Quests</Text>
          <View style={s.pointsBadge}><Text style={s.pointsText}>{totalPoints} pts</Text></View>
        </View>
      </SafeAreaView>

      {/* Points Banner */}
      <LinearGradient colors={['#EAB308','#F97316']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.banner}>
        <MaterialCommunityIcons name="crown" size={40} color="#FFFFFF" />
        <View style={{ marginLeft: 16 }}>
          <Text style={s.bannerLabel}>Total Points Earned</Text>
          <Text style={s.bannerPoints}>{totalPoints.toLocaleString()}</Text>
          <Text style={s.bannerSub}>Gold Partner Status 🥇</Text>
        </View>
        <View style={{ marginLeft: 'auto' }}>
          <TouchableOpacity style={s.redeemBtn}><Text style={s.redeemText}>Redeem</Text></TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['quests', 'rewards'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {tab === 'quests' ? (
          QUESTS.map((q, i) => {
            const pct = Math.min(q.progress / q.total, 1)
            const done = pct >= 1
            return (
              <View key={i} style={s.questCard}>
                <View style={[s.questIcon, { backgroundColor: q.color + '20' }]}>
                  <MaterialCommunityIcons name={q.icon as any} size={24} color={q.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.questTitleRow}>
                    <Text style={s.questTitle}>{q.title}</Text>
                    <Text style={[s.questReward, { color: q.color }]}>{q.reward}</Text>
                  </View>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${pct * 100}%`, backgroundColor: q.color }]} />
                  </View>
                  <Text style={s.progressLabel}>
                    {done ? '✅ Completed!' : `${q.progress} / ${q.total}`}
                  </Text>
                </View>
              </View>
            )
          })
        ) : (
          REWARDS.map((r, i) => (
            <TouchableOpacity key={i} style={s.rewardCard}>
              <Text style={s.rewardBadge}>{r.badge}</Text>
              <View style={{ flex: 1, marginHorizontal: 14 }}>
                <Text style={s.rewardLabel}>{r.label}</Text>
                <Text style={s.rewardExpiry}>Expires in {r.expires}</Text>
              </View>
              <View style={s.rewardAmount}>
                <Text style={s.rewardAmountText}>{r.amount}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, gap:12 },
  title: { flex:1, color:'#FFFFFF', fontSize:18, fontWeight:'800' },
  pointsBadge: { backgroundColor:'rgba(234,179,8,0.2)', borderRadius:20, paddingHorizontal:12, paddingVertical:4, borderWidth:1, borderColor:'#EAB308' },
  pointsText: { color:'#EAB308', fontSize:13, fontWeight:'700' },
  banner: { marginHorizontal:16, borderRadius:20, padding:20, flexDirection:'row', alignItems:'center', marginBottom:12 },
  bannerLabel: { color:'rgba(255,255,255,0.8)', fontSize:12 },
  bannerPoints: { color:'#FFFFFF', fontSize:32, fontWeight:'900' },
  bannerSub: { color:'rgba(255,255,255,0.8)', fontSize:12, marginTop:2 },
  redeemBtn: { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingHorizontal:14, paddingVertical:8 },
  redeemText: { color:'#FFFFFF', fontWeight:'700', fontSize:13 },
  tabs: { flexDirection:'row', marginHorizontal:16, marginBottom:4, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:14, padding:4 },
  tab: { flex:1, paddingVertical:10, alignItems:'center', borderRadius:10 },
  tabActive: { backgroundColor:'rgba(255,255,255,0.12)' },
  tabText: { color:'#6B7280', fontWeight:'600' },
  tabTextActive: { color:'#FFFFFF', fontWeight:'800' },
  questCard: { backgroundColor:'rgba(28,31,51,0.7)', borderRadius:18, padding:16, marginBottom:10, flexDirection:'row', alignItems:'center', gap:14, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  questIcon: { width:48, height:48, borderRadius:14, alignItems:'center', justifyContent:'center' },
  questTitleRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:8 },
  questTitle: { flex:1, color:'#FFFFFF', fontSize:14, fontWeight:'700' },
  questReward: { fontWeight:'800', fontSize:14 },
  progressTrack: { height:6, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:3, marginBottom:6 },
  progressFill: { height:'100%', borderRadius:3 },
  progressLabel: { color:'#9CA3AF', fontSize:11 },
  rewardCard: { backgroundColor:'rgba(28,31,51,0.7)', borderRadius:18, padding:18, marginBottom:10, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  rewardBadge: { fontSize:32 },
  rewardLabel: { color:'#FFFFFF', fontWeight:'700', fontSize:15 },
  rewardExpiry: { color:'#9CA3AF', fontSize:12, marginTop:2 },
  rewardAmount: { backgroundColor:'rgba(234,179,8,0.15)', borderRadius:16, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:'#EAB308' },
  rewardAmountText: { color:'#EAB308', fontWeight:'900', fontSize:16 },
})
