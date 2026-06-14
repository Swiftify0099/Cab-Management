/**
 * Settings — Notifications Screen
 * Allows drivers to configure push notification preferences.
 */
import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const NOTIF_SETTINGS = [
  { key: 'rideRequests',  icon: 'truck',         label: 'Ride Requests',       sub: 'New trip request alerts',        default: true },
  { key: 'tripUpdates',   icon: 'navigation',    label: 'Trip Updates',        sub: 'Status changes and confirmations', default: true },
  { key: 'payments',      icon: 'credit-card',   label: 'Payment Alerts',      sub: 'Earnings and wallet updates',    default: true },
  { key: 'promotions',    icon: 'gift',          label: 'Promotions',          sub: 'Bonus offers and incentives',    default: false },
  { key: 'appUpdates',    icon: 'refresh-cw',    label: 'App Updates',         sub: 'New features and important info', default: false },
]

export default function NotificationsSettingsScreen() {
  const [settings, setSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_SETTINGS.map(s => [s.key, s.default]))
  )

  const toggle = (key: string) =>
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.bg} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>

        <View style={styles.card}>
          {NOTIF_SETTINGS.map((item, i) => (
            <View
              key={item.key}
              style={[styles.row, i < NOTIF_SETTINGS.length - 1 && styles.rowBorder]}
            >
              <View style={styles.iconCircle}>
                <Feather name={item.icon as any} size={18} color="#3B82F6" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: '#334155', true: 'rgba(59,130,246,0.5)' }}
                thumbColor={settings[item.key] ? '#3B82F6' : '#94A3B8'}
              />
            </View>
          ))}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0F172A' },
  bg:         { ...StyleSheet.absoluteFillObject } as any,
  safe:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  title:      { color: '#F1F5F9', fontSize: 20, fontWeight: '800' },
  card:       { marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  rowBorder:  { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconCircle: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center' },
  rowText:    { flex: 1 },
  rowLabel:   { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  rowSub:     { color: '#64748B', fontSize: 12, marginTop: 2 },
})
