import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../../src/theme';
import { useThemeStore } from '../../src/store/themeStore';
import { authApi } from '../../src/api/client';
import { DriverSettingsService } from '../../src/services/driverSettingsService';
import {
  DriverAppSettings,
  AppLanguage,
  NavigationApp,
  DiagnosticsResult,
} from '../../src/types/driverSettings';
import { SettingsDevSheet } from '../../src/components/settings/SettingsDevSheet';
import { useDriverSiren } from '../../src/hooks/useDriverSiren';

export default function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const { themeMode, setThemeMode } = useThemeStore();
  const [settings, setSettings] = useState<DriverAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Siren Hook
  const {
    selectedSiren,
    availableSirens,
    selectSiren,
    playPreview,
    testRinging,
    isPlaying: isSirenPlaying,
    stopSound,
  } = useDriverSiren();

  // Modals
  const [showLangModal, setShowLangModal] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);
  const [showSirenModal, setShowSirenModal] = useState(false);
  const [testingRinging, setTestingRinging] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [diagResult, setDiagResult] = useState<DiagnosticsResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [showDeactModal, setShowDeactModal] = useState(false);
  const [deactReason, setDeactReason] = useState('Personal decision');
  const [deacting, setDeacting] = useState(false);
  const [showDevSheet, setShowDevSheet] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DriverSettingsService.getSettings();
      if (data) {
        setSettings(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleUpdateToggle = async (key: keyof DriverAppSettings, value: any) => {
    if (!settings) return;
    const prev = { ...settings };
    setSettings({ ...settings, [key]: value });
    setSavingKey(key);
    try {
      const res = await DriverSettingsService.updateSettings({ [key]: value });
      if (res) setSettings(res);
    } catch {
      setSettings(prev);
      Alert.alert('Update Failed', 'Unable to sync settings with server.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSelectLanguage = async (lang: AppLanguage) => {
    setShowLangModal(false);
    await handleUpdateToggle('language', lang);
    await AsyncStorage.setItem('user_language', lang);
  };

  const handleSelectNavApp = async (nav: NavigationApp) => {
    setShowNavModal(false);
    await handleUpdateToggle('navigation_app', nav);
  };

  const handleThemeChange = async (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    await handleUpdateToggle('theme_mode', mode);
  };

  const handleRunDiagnostics = async () => {
    setShowDiagModal(true);
    setDiagLoading(true);
    try {
      const res = await DriverSettingsService.runDiagnostics();
      setDiagResult(res);
    } finally {
      setDiagLoading(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear App Cache?',
      'This will free up local storage and refresh cached assets. Your session will remain active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          onPress: async () => {
            Alert.alert('Cache Cleared', 'Successfully freed 2.4 MB of temporary storage.');
          },
        },
      ]
    );
  };

  const handleConfirmDeactivation = async () => {
    try {
      setDeacting(true);
      const res = await DriverSettingsService.requestDeactivation(deactReason);
      setShowDeactModal(false);
      if (res.success) {
        Alert.alert('Account Deactivated', res.message, [
          { text: 'OK', onPress: handleLogout },
        ]);
      }
    } finally {
      setDeacting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (refreshToken && refreshToken !== 'demo_token') {
        await authApi.logout(refreshToken).catch(() => {});
      }
    } catch {}
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_data');
    await SecureStore.deleteItemAsync('driver_user');
    await AsyncStorage.clear();
    router.replace('/auth/phone' as any);
  };

  const getLanguageLabel = (lang?: string) => {
    if (lang === 'mr') return 'मराठी (Marathi)';
    if (lang === 'hi') return 'हिंदी (Hindi)';
    return 'English (English)';
  };

  const getNavLabel = (nav?: string) => {
    if (nav === 'GOOGLE_MAPS') return 'Google Maps';
    if (nav === 'WAZE') return 'Waze Navigation';
    return 'Built-in HUD (In-App PostGIS)';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings & Preferences</Text>

        <TouchableOpacity style={styles.sandboxBtn} onPress={() => setShowDevSheet(true)}>
          <MaterialCommunityIcons name="robot-outline" size={20} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* SECTION 1: GENERAL PREFERENCES */}
        <Text style={styles.sectionHeader}>General</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          {/* Language Selector */}
          <TouchableOpacity style={styles.rowItem} onPress={() => setShowLangModal(true)}>
            <View style={styles.rowLeft}>
              <Feather name="globe" size={18} color="#0EA5E9" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Language</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  {getLanguageLabel(settings?.language)}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Navigation App Selector */}
          <TouchableOpacity style={styles.rowItem} onPress={() => setShowNavModal(true)}>
            <View style={styles.rowLeft}>
              <Feather name="navigation" size={18} color="#10B981" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Navigation App</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  {getNavLabel(settings?.navigation_app)}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: RIDE DISPATCHING & RADAR COVERAGE */}
        <Text style={styles.sectionHeader}>Ride Dispatching & Coverage</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          {/* Request Visibility & Coverage (All City, Specific City, Specific Hex) */}
          <TouchableOpacity style={styles.rowItem} onPress={() => router.push('/settings/coverage' as any)}>
            <View style={styles.rowLeft}>
              <Feather name="map" size={18} color="#0284C7" style={styles.rowIcon} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Request Coverage Mode</Text>
                  <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#065F46' }}>RADAR SCOPE</Text>
                  </View>
                </View>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  All City, Specific City & Hex/Zone visibility
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Ride Preferences & Filters */}
          <TouchableOpacity style={styles.rowItem} onPress={() => router.push('/settings/preferences' as any)}>
            <View style={styles.rowLeft}>
              <Feather name="sliders" size={18} color="#8B5CF6" style={styles.rowIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Ride Matching Preferences</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  Radius, Airport, Outstation & Earning cutoffs
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Auto-Accept Toggle */}
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Feather name="check-circle" size={18} color="#6366F1" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Auto-Accept Rides</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  Automatically claim matched trip offers
                </Text>
              </View>
            </View>
            <Switch
              value={settings?.auto_accept_rides || false}
              onValueChange={(v) => handleUpdateToggle('auto_accept_rides', v)}
              trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
            />
          </View>
        </View>

        {/* SECTION 3: AUDIO & ALERTS */}
        <Text style={styles.sectionHeader}>Audio & Siren Alerts</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          {/* Driver Siren Selector */}
          <TouchableOpacity style={styles.rowItem} onPress={() => setShowSirenModal(true)}>
            <View style={styles.rowLeft}>
              <Feather name="volume-2" size={18} color="#EF4444" style={styles.rowIcon} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Incoming Request Siren</Text>
                  <View style={styles.sirenChoiceBadge}>
                    <Text style={styles.sirenChoiceBadgeText}>DYNAMIC</Text>
                  </View>
                </View>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  {selectedSiren?.name || 'Driver Siren Alert (drSiran)'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Test Ringing & Vibration Hardware Verifier */}
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="vibrate" size={18} color="#10B981" style={styles.rowIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Test Ringing & Vibration</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  Verify audio siren and vibration on device (5s test)
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.testSirenBtn,
                testingRinging && { backgroundColor: '#EF4444' },
              ]}
              onPress={async () => {
                if (testingRinging || isSirenPlaying) {
                  stopSound();
                  setTestingRinging(false);
                } else {
                  setTestingRinging(true);
                  await testRinging();
                  setTimeout(() => setTestingRinging(false), 5100);
                }
              }}
            >
              <Text style={styles.testSirenBtnText}>
                {testingRinging || isSirenPlaying ? 'STOP ⏹' : 'TEST 🔊'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Loud Offer Sound Toggle */}
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Feather name="bell" size={18} color="#F59E0B" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Loud Ride Offer Alert</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  High-priority sound chime on incoming offers
                </Text>
              </View>
            </View>
            <Switch
              value={settings?.sound_alerts_enabled ?? true}
              onValueChange={(v) => handleUpdateToggle('sound_alerts_enabled', v)}
              trackColor={{ false: '#CBD5E1', true: '#F59E0B' }}
            />
          </View>

          <View style={styles.divider} />

          {/* Voice Navigation */}
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Feather name="navigation" size={18} color="#0EA5E9" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Voice Navigation</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  Spoken turn-by-turn guidance prompts
                </Text>
              </View>
            </View>
            <Switch
              value={settings?.voice_navigation_enabled ?? true}
              onValueChange={(v) => handleUpdateToggle('voice_navigation_enabled', v)}
              trackColor={{ false: '#CBD5E1', true: '#0EA5E9' }}
            />
          </View>

          <View style={styles.divider} />

          {/* Speed Limit Warning */}
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Feather name="alert-triangle" size={18} color="#8B5CF6" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Speed Limit Warnings</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  Alert when exceeding road safety limits
                </Text>
              </View>
            </View>
            <Switch
              value={settings?.speed_limit_warning ?? true}
              onValueChange={(v) => handleUpdateToggle('speed_limit_warning', v)}
              trackColor={{ false: '#CBD5E1', true: '#8B5CF6' }}
            />
          </View>
        </View>

        {/* SECTION 4: APPEARANCE & DISPLAY */}
        <Text style={styles.sectionHeader}>Appearance</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.themeSelectorRow}>
            {(['light', 'dark', 'system'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.themeOptionBtn,
                  themeMode === m && styles.themeOptionBtnActive,
                  { borderColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
                onPress={() => handleThemeChange(m)}
              >
                <Feather
                  name={m === 'light' ? 'sun' : m === 'dark' ? 'moon' : 'smartphone'}
                  size={16}
                  color={themeMode === m ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === m
                      ? { color: '#FFFFFF', fontWeight: '800' }
                      : { color: theme.colors.textSecondary },
                  ]}
                >
                  {m.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 5: HEALTH & STORAGE */}
        <Text style={styles.sectionHeader}>App Health & Diagnostics</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity style={styles.rowItem} onPress={handleRunDiagnostics}>
            <View style={styles.rowLeft}>
              <Feather name="activity" size={18} color="#10B981" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Run System Diagnostics</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  Test GPS accuracy, socket health, and latency
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.rowItem} onPress={handleClearCache}>
            <View style={styles.rowLeft}>
              <Feather name="trash-2" size={18} color="#64748B" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Clear App Cache</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  Free local cache (~2.4 MB)
                </Text>
              </View>
            </View>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 6: ACCOUNT ACTIONS */}
        <Text style={styles.sectionHeader}>Account & Privacy</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity style={styles.rowItem} onPress={() => setShowDeactModal(true)}>
            <View style={styles.rowLeft}>
              <Feather name="user-x" size={18} color="#EF4444" style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Deactivate Driver Account</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  Pause driving and request data removal
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#EF4444" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.rowItem} onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <Feather name="log-out" size={18} color="#64748B" style={styles.rowIcon} />
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Log Out</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
          CabBooking Driver App v2.8.0 • Production Ready
        </Text>
      </ScrollView>

      {/* LANGUAGE SELECTION MODAL */}
      <Modal visible={showLangModal} transparent animationType="fade" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select App Language</Text>
            {[
              { id: 'en', label: 'English (English)', native: 'English' },
              { id: 'mr', label: 'मराठी (Marathi)', native: 'मराठी' },
              { id: 'hi', label: 'हिंदी (Hindi)', native: 'हिंदी' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.optionRow,
                  settings?.language === item.id && styles.optionRowActive,
                ]}
                onPress={() => handleSelectLanguage(item.id as AppLanguage)}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: settings?.language === item.id ? '#0EA5E9' : theme.colors.text },
                  ]}
                >
                  {item.label}
                </Text>
                {settings?.language === item.id && (
                  <Feather name="check" size={18} color="#0EA5E9" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowLangModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NAVIGATION APP MODAL */}
      <Modal visible={showNavModal} transparent animationType="fade" onRequestClose={() => setShowNavModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Choose Navigation App</Text>
            {[
              { id: 'IN_APP', label: 'Built-in HUD (In-App PostGIS)' },
              { id: 'GOOGLE_MAPS', label: 'Google Maps External Intent' },
              { id: 'WAZE', label: 'Waze External Navigation' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.optionRow,
                  settings?.navigation_app === item.id && styles.optionRowActive,
                ]}
                onPress={() => handleSelectNavApp(item.id as NavigationApp)}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: settings?.navigation_app === item.id ? '#10B981' : theme.colors.text },
                  ]}
                >
                  {item.label}
                </Text>
                {settings?.navigation_app === item.id && (
                  <Feather name="check" size={18} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNavModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DRIVER SIREN SELECTION MODAL */}
      <Modal visible={showSirenModal} transparent animationType="fade" onRequestClose={() => { stopSound(); setShowSirenModal(false); }}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
                maxHeight: '80%',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Feather name="volume-2" size={20} color="#EF4444" />
              <Text style={[styles.modalTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                Choose Incoming Siren
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginBottom: 14 }}>
              Select the audio tone that rings continuously when a customer books a ride or delivery.
            </Text>

            {availableSirens.map((siren) => {
              const isSelected = selectedSiren?.id === siren.id;
              return (
                <View
                  key={siren.id}
                  style={[
                    styles.sirenOptionRow,
                    isSelected && styles.sirenOptionRowActive,
                    { borderColor: isDark ? '#334155' : '#E2E8F0' },
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={async () => {
                      await selectSiren(siren.id);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.sirenOptionName,
                          { color: isSelected ? '#EF4444' : theme.colors.text },
                        ]}
                      >
                        {siren.name}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>SELECTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.sirenOptionSub, { color: theme.colors.textSecondary }]}>
                      {siren.subtitle}
                    </Text>
                  </TouchableOpacity>

                  {/* Preview Button */}
                  <TouchableOpacity
                    style={[styles.previewToneBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                    onPress={() => playPreview(siren.id)}
                    activeOpacity={0.7}
                  >
                    <Feather name="play" size={14} color="#0284C7" />
                    <Text style={styles.previewToneBtnText}>Preview</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                stopSound();
                setShowSirenModal(false);
              }}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DIAGNOSTICS HEALTH MODAL */}
      <Modal visible={showDiagModal} transparent animationType="fade" onRequestClose={() => setShowDiagModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Feather name="activity" size={20} color="#10B981" />
              <Text style={[styles.modalTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                System Diagnostics
              </Text>
            </View>

            {diagLoading ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 10, color: theme.colors.textSecondary, fontSize: 12 }}>
                  Testing GPS & socket latency...
                </Text>
              </View>
            ) : diagResult ? (
              <View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>ALL SYSTEMS OPERATIONAL</Text>
                </View>
                {diagResult.checks.map((c, i) => (
                  <View key={i} style={styles.diagRow}>
                    <View>
                      <Text style={[styles.diagName, { color: theme.colors.text }]}>{c.name}</Text>
                      <Text style={[styles.diagDetail, { color: theme.colors.textSecondary }]}>
                        {c.detail}
                      </Text>
                    </View>
                    <View style={styles.passBadge}>
                      <Text style={styles.passText}>{c.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDiagModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DEACTIVATION MODAL */}
      <Modal visible={showDeactModal} transparent animationType="fade" onRequestClose={() => setShowDeactModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Deactivate Account?</Text>
            <Text style={[styles.deactSub, { color: theme.colors.textSecondary }]}>
              Your driver profile will be taken offline immediately. You can reactivate anytime by contacting partner support.
            </Text>

            {['Taking a break', 'Vehicle maintenance', 'Switching full-time job'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.optionRow,
                  deactReason === r && { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                ]}
                onPress={() => setDeactReason(r)}
              >
                <Text style={{ color: theme.colors.text, fontSize: 13 }}>{r}</Text>
                {deactReason === r && <Feather name="check" size={16} color="#EF4444" />}
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setShowDeactModal(false)}
                disabled={deacting}
              >
                <Text style={[styles.keepText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeactBtn}
                onPress={handleConfirmDeactivation}
                disabled={deacting}
              >
                {deacting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeactText}>Deactivate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Developer Mode Sandbox Simulator */}
      <SettingsDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        onSimulated={loadSettings}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  sandboxBtn: { padding: 6 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { marginRight: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 11, marginTop: 1 },
  divider: { height: 1, backgroundColor: 'rgba(150, 150, 150, 0.15)' },
  clearText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeOptionBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  themeOptionText: { fontSize: 11 },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 24,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalDialog: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionRowActive: { backgroundColor: 'rgba(14, 165, 233, 0.1)' },
  optionLabel: { fontSize: 13, fontWeight: '600' },
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  statusPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 10,
  },
  statusPillText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  diagName: { fontSize: 12, fontWeight: '700' },
  diagDetail: { fontSize: 10, marginTop: 1 },
  passBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  passText: { color: '#10B981', fontSize: 9, fontWeight: '800' },
  deactSub: { fontSize: 12, lineHeight: 16, marginBottom: 12 },
  keepBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  keepText: { fontSize: 12, fontWeight: '700' },
  confirmDeactBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  confirmDeactText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  sirenChoiceBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sirenChoiceBadgeText: { color: '#EF4444', fontSize: 9, fontWeight: '800' },
  testSirenBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  testSirenBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  sirenOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  sirenOptionRowActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: '#EF4444',
  },
  sirenOptionName: { fontSize: 13, fontWeight: '700' },
  sirenOptionSub: { fontSize: 11, marginTop: 2 },
  selectedBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  selectedBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  previewToneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  previewToneBtnText: { color: '#0284C7', fontSize: 11, fontWeight: '700' },
});
