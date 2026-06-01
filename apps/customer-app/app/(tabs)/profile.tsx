/**
 * Customer App — User Profile Setup
 * Pixel-perfect from stitch: user_profile_setup
 */
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../src/store/auth.store'
import { router } from 'expo-router'

const MENU_ITEMS = [
  { icon: 'credit-card', label: 'Payment Methods', color: '#2563EB' },
  { icon: 'home',        label: 'Saved Addresses',  color: '#059669' },
  { icon: 'gift',        label: 'Referrals & Rewards', color: '#7C3AED' },
  { icon: 'help-circle', label: 'Help & Support',   color: '#0891B2' },
  { icon: 'settings',    label: 'Settings',          color: '#64748B' },
]

type Gender = 'Male' | 'Female' | 'Other' | null

export default function ProfileTab() {
  const { user, logout } = useAuthStore()
  const [gender, setGender] = useState<Gender>(null)

  const handleLogout = async () => {
    await logout()
    router.replace('/auth/phone')
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Soft gradient background */}
      <LinearGradient
        colors={['#E0F2FE', '#F8FAFC', '#F1F5F9']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={26} color="#334155" />
            </TouchableOpacity>
            <Text style={styles.stepLabel}>Profile</Text>
          </View>

          <Text style={styles.pageTitle}>User Profile Setup</Text>

          {/* Progress Bar */}
          <View style={styles.progressRow}>
            <View style={[styles.progressBar, { backgroundColor: '#3B82F6' }]} />
            <View style={[styles.progressBar, { backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: '#E2E8F0' }]} />
            <View style={[styles.progressBar, { backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: '#E2E8F0' }]} />
          </View>

          {/* Photo + Name Card */}
          <View style={styles.glassCard}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <View style={styles.addPhotoCircle}>
                  <Feather name="plus" size={22} color="#64748B" />
                </View>
              </View>
              <Text style={styles.addPhotoLabel}>Add Profile Photo</Text>
            </View>

            {/* Phone/Name */}
            <View style={styles.nameInput}>
              <Feather name="user" size={18} color="#64748B" style={{ marginRight: 10 }} />
              <TextInput
                placeholder={user?.phone || 'Full Name'}
                placeholderTextColor="#94A3B8"
                style={styles.nameInputText}
              />
            </View>
          </View>

          {/* Gender Card */}
          <View style={styles.glassCard}>
            <Text style={styles.cardSectionTitle}>Gender</Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female', 'Other'] as Gender[]).map(g => (
                <TouchableOpacity
                  key={g!}
                  onPress={() => setGender(g)}
                  style={[
                    styles.genderBtn,
                    gender === g && styles.genderBtnActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={g === 'Male' ? 'human-male' : g === 'Female' ? 'human-female' : 'gender-male-female'}
                    size={18}
                    color={gender === g ? '#1D4ED8' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                  {gender === g && (
                    <Feather name="check" size={12} color="#3B82F6" style={{ position: 'absolute', top: 8, right: 8 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* DOB Card */}
          <View style={styles.glassCard}>
            <Text style={styles.cardSectionTitle}>Date of Birth</Text>
            <View style={styles.dobInput}>
              <Feather name="calendar" size={18} color="#64748B" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#94A3B8"
                style={styles.nameInputText}
              />
            </View>
          </View>

          {/* Menu Items */}
          {MENU_ITEMS.map(item => (
            <TouchableOpacity 
              key={item.label} 
              style={styles.menuItem}
              onPress={() => {
                if (item.label === 'Settings') {
                  router.push('/settings');
                }
              }}
            >
              <View style={[styles.menuIconBox, { backgroundColor: item.color + '15' }]}>
                <Feather name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}

          {/* Complete Setup Button */}
          <TouchableOpacity style={styles.completeBtn} activeOpacity={0.85}>
            <Text style={styles.completeBtnText}>Complete Setup</Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  stepLabel: { color: '#64748B', fontSize: 14 },

  pageTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 20 },

  progressRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 24 },
  progressBar: { flex: 1, height: 6, borderRadius: 4 },

  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 28, padding: 24,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#93C5FD', shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
  },

  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#94A3B8', shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  addPhotoCircle: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: '#64748B',
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoLabel: { color: '#0F172A', fontWeight: '700', fontSize: 15 },

  nameInput: {
    backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#94A3B8', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  nameInputText: { flex: 1, color: '#0F172A', fontSize: 15 },

  cardSectionTitle: { color: '#0F172A', fontWeight: '700', fontSize: 15, marginBottom: 14 },

  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: {
    flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#94A3B8', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
    position: 'relative',
  },
  genderBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD', shadowColor: '#3B82F6', shadowOpacity: 0.15 },
  genderText: { color: '#0F172A', fontSize: 13, fontWeight: '500' },
  genderTextActive: { color: '#1D4ED8' },

  dobInput: {
    backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#94A3B8', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },

  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 18, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#94A3B8', shadowOpacity: 0.08, shadowRadius: 6, elevation: 1,
  },
  menuIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },

  completeBtn: {
    backgroundColor: '#3B82F6', borderRadius: 28, paddingVertical: 17,
    alignItems: 'center', marginTop: 16, marginBottom: 10,
    shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  completeBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  logoutBtn: { alignItems: 'center', paddingVertical: 12 },
  logoutText: { color: '#64748B', fontSize: 15, fontWeight: '500' },
})
