/**
 * Partner Penalties Screen
 * Placeholder — will be populated with real penalty data from API.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

export default function PenaltiesScreen() {
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.bg} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Penalty History</Text>
        </View>
        <View style={styles.body}>
          <Feather name="alert-octagon" size={48} color="#F97316" />
          <Text style={styles.heading}>No Penalties</Text>
          <Text style={styles.sub}>
            You have a clean record. Keep up the great work!
          </Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0F172A' },
  bg:      { ...StyleSheet.absoluteFill } as any,
  safe:    { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  title:   { color: '#F1F5F9', fontSize: 20, fontWeight: '800' },
  body:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  heading: { color: '#F1F5F9', fontSize: 22, fontWeight: '800' },
  sub:     { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 22 },
})
