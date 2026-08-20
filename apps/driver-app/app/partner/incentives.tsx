/**
 * Feature 18: Opportunities & Incentives Hub Screen
 * Dynamic campaigns, daily/weekly quests, shift earnings guarantees, and driver referrals.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { IncentivesAndPromotionsService } from '../../src/services/incentivesAndPromotionsService';
import { DriverPromotionsHubData } from '../../src/types/incentivesAndPromotions';
import {
  IncentiveQuestCard,
  GuaranteedEarningsCard,
  ReferralProgramCard,
  IncentivesDevSheet,
} from '../../src/components/incentives';

export default function IncentivesScreen() {
  const { theme, isDark } = useTheme();
  const [data, setData] = useState<DriverPromotionsHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [devSheetVisible, setDevSheetVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await IncentivesAndPromotionsService.getPromotionsHub();
      setData(res);
    } catch (e) {
      console.warn('[IncentivesScreen] Load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDevScenario = async (scenario: string) => {
    const res = await IncentivesAndPromotionsService.devSimulate(scenario);
    if (res?.hub) {
      setData(res.hub);
    } else {
      await loadData();
    }
  };

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? '#0B0E1F' : '#F8FAFC',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    devBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(234,179,8,0.15)' : '#FEF9C3',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(234,179,8,0.3)' : '#FEF08A',
    },
    devBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FDE047' : '#854D0E',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    heroBanner: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.35 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    heroTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    heroTagText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#F59E0B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroAmount: {
      fontSize: 26,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    tabsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0',
    },
    tabBtnActive: {
      backgroundColor: '#3B82F6',
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    tabTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 12,
      marginTop: 8,
    },
    emptyBox: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
      marginBottom: 16,
    },
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0F172A' : '#FFFFFF'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Opportunities & Incentives</Text>
          </View>

          <TouchableOpacity style={styles.devBtn} onPress={() => setDevSheetVisible(true)}>
            <MaterialCommunityIcons name="developer-board" size={14} color="#EAB308" />
            <Text style={styles.devBtnText}>Dev Mode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>
            Loading active campaigns & quests...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* 1. Hero Earning Opportunity Banner */}
          <View style={styles.heroBanner}>
            <View style={styles.heroTag}>
              <Feather name="zap" size={14} color="#F59E0B" />
              <Text style={styles.heroTagText}>Today's Bonus Opportunity</Text>
            </View>
            <Text style={styles.heroAmount}>
              ₹{(data?.potential_bonus_total || 2800).toFixed(0)}+ Extra
            </Text>
            <Text style={styles.heroSubtitle}>
              {data?.active_quests.length || 0} active quests available • Auto-credits to wallet on achievement
            </Text>
          </View>

          {/* 2. Quests Tab Switcher */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
              onPress={() => setActiveTab('ACTIVE')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
                Active Quests ({data?.active_quests.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'COMPLETED' && styles.tabBtnActive]}
              onPress={() => setActiveTab('COMPLETED')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
                Completed & Rewards ({data?.completed_quests.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'ACTIVE' ? (
            <>
              {/* Active Quests */}
              {data?.active_quests.map((q) => (
                <IncentiveQuestCard key={q.campaign_id} quest={q} />
              ))}

              {/* Shift Guaranteed Earnings Card */}
              {data?.guarantee_card && (
                <>
                  <Text style={styles.sectionTitle}>Shift Income Protection</Text>
                  <GuaranteedEarningsCard data={data.guarantee_card} />
                </>
              )}

              {/* Driver Referral Program */}
              {data?.referral_summary && (
                <>
                  <Text style={styles.sectionTitle}>Fleet Referral Program</Text>
                  <ReferralProgramCard summary={data.referral_summary} />
                </>
              )}
            </>
          ) : (
            <>
              {data?.completed_quests.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Feather name="award" size={32} color={isDark ? '#64748B' : '#94A3B8'} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A', marginTop: 8 }}>
                    No completed quests yet today
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', marginTop: 4 }}>
                    Complete trips in the Active Quests tab to unlock instant wallet bonus credits!
                  </Text>
                </View>
              ) : (
                data?.completed_quests.map((q) => (
                  <IncentiveQuestCard key={q.campaign_id} quest={q} />
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Developer Sandbox Sheet */}
      <IncentivesDevSheet
        visible={devSheetVisible}
        onClose={() => setDevSheetVisible(false)}
        onSelectScenario={handleDevScenario}
      />
    </View>
  );
}
