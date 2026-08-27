import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { NotificationService } from '../../src/services/notificationService';
import { NotificationPreferences } from '../../src/types/notifications';
import BatteryOptimizationModal from '../../src/components/common/BatteryOptimizationModal';

export default function NotificationSettingsScreen() {
  const { theme, isDark } = useTheme();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBatteryModal, setShowBatteryModal] = useState(false);

  const loadPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await NotificationService.getPreferences();
      setPreferences(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    try {
      setSaving(true);
      await NotificationService.updatePreferences({ [key]: value });
    } finally {
      setSaving(false);
    }
  };

  const prefSections = [
    {
      title: 'Operational Alerts',
      items: [
        {
          key: 'trip_alerts' as const,
          label: 'Trip Dispatches & Updates',
          desc: 'Ride requests, passenger arrival, cancellations and route modifications.',
          icon: 'navigation',
          color: '#3B82F6',
          isMandatory: true,
        },
        {
          key: 'safety_alerts' as const,
          label: 'Safety & Emergency Alerts',
          desc: 'Route deviations, extreme weather warnings, and SOS notifications.',
          icon: 'shield',
          color: '#EF4444',
          isMandatory: true,
        },
      ],
    },
    {
      title: 'Financial Alerts',
      items: [
        {
          key: 'earnings_alerts' as const,
          label: 'Trip Fares & Surge Bonuses',
          desc: 'Completed trip fare receipts, tips, surge adjustments, and quest rewards.',
          icon: 'dollar-sign',
          color: '#10B981',
          isMandatory: false,
        },
        {
          key: 'payout_alerts' as const,
          label: 'Instant Payouts & Settlements',
          desc: 'Withdrawal confirmations, weekly settlement summaries, and bank updates.',
          icon: 'briefcase',
          color: '#8B5CF6',
          isMandatory: false,
        },
      ],
    },
    {
      title: 'Promotions & Offers',
      items: [
        {
          key: 'promotions_alerts' as const,
          label: 'Quests, Challenges & Referrals',
          desc: 'Active weekly quests, bonus opportunity reminders, and referral credits.',
          icon: 'award',
          color: '#F59E0B',
          isMandatory: false,
        },
      ],
    },
    {
      title: 'Device Siren & Sound Settings',
      items: [
        {
          key: 'sound_enabled' as const,
          label: 'Incoming Request Siren (Loud)',
          desc: 'Play dynamic driver siren sound when customer makes request.',
          icon: 'volume-2',
          color: '#EF4444',
          isMandatory: false,
        },
        {
          key: 'vibration_enabled' as const,
          label: 'Continuous Ringing Vibration',
          desc: 'Vibrate device repeatedly on incoming customer bookings.',
          icon: 'smartphone',
          color: '#6366F1',
          isMandatory: false,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notification Preferences</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading || !preferences ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Battery & Background Execution Whitelist Card */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Background Execution & Battery</Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                  borderColor: isDark ? '#1E293B' : '#E2E8F0',
                  padding: 14,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconWrap, { backgroundColor: '#10B98120', width: 40, height: 40, borderRadius: 20 }]}>
                  <MaterialCommunityIcons name="battery-charging-high" size={22} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.itemLabel, { color: theme.colors.text, fontSize: 14 }]}>
                    Unrestricted Battery (No Sleep)
                  </Text>
                  <Text style={[styles.itemDesc, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                    Ensure you receive incoming rides even while using Google Maps or when screen is locked.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  marginTop: 12,
                }}
                onPress={() => setShowBatteryModal(true)}
              >
                <Feather name="settings" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Configure Battery Unrestricted Mode
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {prefSections.map((sec, si) => (
            <View key={si} style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>{sec.title}</Text>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                    borderColor: isDark ? '#1E293B' : '#E2E8F0',
                  },
                ]}
              >
                {sec.items.map((item, ii) => (
                  <View
                    key={item.key}
                    style={[
                      styles.itemRow,
                      ii < sec.items.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                      },
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${item.color}20` }]}>
                      <Feather name={item.icon as any} size={18} color={item.color} />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.itemLabel, { color: theme.colors.text }]}>
                          {item.label}
                        </Text>
                        {item.isMandatory && (
                          <View style={styles.mandatoryBadge}>
                            <Text style={styles.mandatoryText}>REQUIRED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.itemDesc, { color: theme.colors.textSecondary }]}>
                        {item.desc}
                      </Text>
                    </View>

                    <Switch
                      value={preferences[item.key]}
                      onValueChange={(val) => handleToggle(item.key, val)}
                      disabled={item.isMandatory}
                      trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#6366F1' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <BatteryOptimizationModal
        visible={showBatteryModal}
        onDismiss={() => setShowBatteryModal(false)}
        onConfigured={() => setShowBatteryModal(false)}
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
  headerTitle: { fontSize: 16, fontWeight: '800' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  sectionWrap: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { fontSize: 13, fontWeight: '700' },
  itemDesc: { fontSize: 11, lineHeight: 15, marginTop: 2 },
  mandatoryBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mandatoryText: { color: '#EF4444', fontSize: 8, fontWeight: '800' },
});
