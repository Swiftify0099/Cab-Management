/**
 * Partner Leaderboard & Community — stitch: partner_leaderboard_community
 */
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'

const TOP_DRIVERS = [
  { rank: 1, name: 'Suresh K.',    trips: 312, rating: 4.98, earnings: '₹68k', badge: '🥇', color: '#EAB308' },
  { rank: 2, name: 'Priya M.',     trips: 289, rating: 4.96, earnings: '₹61k', badge: '🥈', color: '#94A3B8' },
  { rank: 3, name: 'Arjun V.',     trips: 276, rating: 4.95, earnings: '₹58k', badge: '🥉', color: '#CD7F32' },
  { rank: 4, name: 'Rahul D.',     trips: 166, rating: 4.90, earnings: '₹36k', badge: '4', color: '#3B82F6', isMe: true },
  { rank: 5, name: 'Meena R.',     trips: 155, rating: 4.88, earnings: '₹33k', badge: '5', color: '#6B7280' },
  { rank: 6, name: 'Kiran T.',     trips: 148, rating: 4.87, earnings: '₹31k', badge: '6', color: '#6B7280' },
]

export default function LeaderboardScreen() {
  const me = TOP_DRIVERS.find(d => d.isMe)!

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <SafeAreaView edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#FFFFFF" /></TouchableOpacity>
          <Text style={s.title}>Leaderboard</Text>
          <TouchableOpacity style={s.filterBtn}><Feather name="filter" size={18} color="#FFFFFF" /></TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* My Rank Banner */}
        <LinearGradient colors={['#1E3A8A','#4F46E5','#7C3AED']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.myRankBanner}>
          <View style={s.myRankLeft}>
            <Text style={s.myRankLabel}>Your Rank</Text>
            <Text style={s.myRankNum}>#{me.rank}</Text>
            <Text style={s.myRankSub}>Top 10% this month</Text>
          </View>
          <View style={s.myRankStats}>
            <View><Text style={s.myStatLabel}>Trips</Text><Text style={s.myStatVal}>{me.trips}</Text></View>
            <View><Text style={s.myStatLabel}>Rating</Text><Text style={s.myStatVal}>{me.rating}</Text></View>
            <View><Text style={s.myStatLabel}>Earned</Text><Text style={s.myStatVal}>{me.earnings}</Text></View>
          </View>
        </LinearGradient>

        {/* Top 3 Podium */}
        <View style={s.podium}>
          {[TOP_DRIVERS[1], TOP_DRIVERS[0], TOP_DRIVERS[2]].map((d, i) => (
            <View key={d.rank} style={[s.podiumSlot, i === 1 && { marginBottom: -24, zIndex: 10 }]}>
              <Text style={s.podiumBadge}>{d.badge}</Text>
              <View style={[s.podiumAvatar, { borderColor: d.color }]}>
                <Text style={s.podiumInitials}>{d.name.charAt(0)}</Text>
              </View>
              <Text style={s.podiumName}>{d.name.split(' ')[0]}</Text>
              <Text style={s.podiumTrips}>{d.trips} trips</Text>
            </View>
          ))}
        </View>

        {/* Full List */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          {TOP_DRIVERS.map((d) => (
            <View key={d.rank} style={[s.driverRow, d.isMe && s.myRow]}>
              <Text style={[s.rankNum, { color: d.color }]}>{d.badge}</Text>
              <View style={[s.driverAvatar, { borderColor: d.color }]}>
                <Text style={s.driverInitials}>{d.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.driverName}>{d.name} {d.isMe ? '(You)' : ''}</Text>
                <Text style={s.driverTrips}>{d.trips} trips · ⭐ {d.rating}</Text>
              </View>
              <Text style={s.driverEarnings}>{d.earnings}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, gap:12 },
  title: { flex:1, color:'#FFFFFF', fontSize:18, fontWeight:'800' },
  filterBtn: { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center' },
  myRankBanner: { marginHorizontal:16, borderRadius:20, padding:20, flexDirection:'row', alignItems:'center', marginBottom:20 },
  myRankLeft: { flex:1 },
  myRankLabel: { color:'rgba(255,255,255,0.7)', fontSize:13 },
  myRankNum: { color:'#FFFFFF', fontSize:48, fontWeight:'900', lineHeight:52 },
  myRankSub: { color:'rgba(255,255,255,0.6)', fontSize:12 },
  myRankStats: { gap:16 },
  myStatLabel: { color:'rgba(255,255,255,0.7)', fontSize:11 },
  myStatVal: { color:'#FFFFFF', fontSize:16, fontWeight:'800' },
  podium: { flexDirection:'row', justifyContent:'center', alignItems:'flex-end', paddingHorizontal:32, marginBottom:8 },
  podiumSlot: { flex:1, alignItems:'center' },
  podiumBadge: { fontSize:28, marginBottom:6 },
  podiumAvatar: { width:56, height:56, borderRadius:28, backgroundColor:'rgba(255,255,255,0.1)', borderWidth:2, alignItems:'center', justifyContent:'center', marginBottom:6 },
  podiumInitials: { color:'#FFFFFF', fontSize:20, fontWeight:'900' },
  podiumName: { color:'#FFFFFF', fontWeight:'700', fontSize:13 },
  podiumTrips: { color:'#9CA3AF', fontSize:11 },
  driverRow: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'rgba(28,31,51,0.7)', borderRadius:16, padding:14, marginBottom:8, borderWidth:1, borderColor:'rgba(255,255,255,0.05)' },
  myRow: { borderColor:'#3B82F6', backgroundColor:'rgba(37,99,235,0.15)' },
  rankNum: { width:24, fontWeight:'900', fontSize:16, textAlign:'center' },
  driverAvatar: { width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.1)', borderWidth:1.5, alignItems:'center', justifyContent:'center' },
  driverInitials: { color:'#FFFFFF', fontWeight:'700' },
  driverName: { color:'#FFFFFF', fontWeight:'700', fontSize:14 },
  driverTrips: { color:'#9CA3AF', fontSize:12, marginTop:2 },
  driverEarnings: { color:'#34D399', fontWeight:'800', fontSize:14 },
})
