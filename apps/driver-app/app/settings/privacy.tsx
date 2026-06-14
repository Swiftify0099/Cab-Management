/**
 * Settings — Privacy & Security Screen
 */
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const PRIVACY_ITEMS = [
  { icon: 'lock',       label: 'Change PIN',             sub: 'Update your app security PIN' },
  { icon: 'eye-off',    label: 'Data Privacy',           sub: 'Control what data we collect' },
  { icon: 'download',   label: 'Download My Data',       sub: 'Export your account information' },
  { icon: 'trash-2',    label: 'Delete Account',         sub: 'Permanently remove your account', danger: true },
]

export default function PrivacySettingsScreen() {
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.bg} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Privacy &amp; Security</Text>
        </View>

        <View style={styles.card}>
          {PRIVACY_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, i < PRIVACY_ITEMS.length - 1 && styles.rowBorder]}
              onPress={() => Alert.alert(item.label, 'Coming soon.')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, item.danger && styles.iconCircleDanger]}>
                <Feather name={item.icon as any} size={18} color={item.danger ? '#EF4444' : '#3B82F6'} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, item.danger && { color: '#EF4444' }]}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#475569" />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#0F172A' },
  bg:              { ...StyleSheet.absoluteFillObject } as any,
  safe:            { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  title:           { color: '#F1F5F9', fontSize: 20, fontWeight: '800' },
  card:            { marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  row:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  rowBorder:       { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconCircle:      { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center' },
  iconCircleDanger:{ backgroundColor: 'rgba(239,68,68,0.12)' },
  rowText:         { flex: 1 },
  rowLabel:        { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  rowSub:          { color: '#64748B', fontSize: 12, marginTop: 2 },
})
