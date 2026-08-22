/**
 * Feature 17: Rating & Feedback Screen
 * Complete production-grade driver ratings dashboard, breakdown, compliments, and review history.
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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../src/theme';
import { RatingAndFeedbackService } from '../src/services/ratingAndFeedbackService';
import { DriverRatingSummary, DriverRatingHistoryItem } from '../src/types/ratingAndFeedback';
import {
  RatingBreakdownCard,
  ComplimentsCloud,
  RatingHistoryList,
  DisputeRatingModal,
  RatingDevSheet,
} from '../src/components/feedback';

export default function RatingsScreen() {
  const { theme, isDark } = useTheme();
  const [summary, setSummary] = useState<DriverRatingSummary | null>(null);
  const [history, setHistory] = useState<DriverRatingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [selectedDisputeItem, setSelectedDisputeItem] = useState<DriverRatingHistoryItem | null>(null);
  const [devSheetVisible, setDevSheetVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sumData, histData] = await Promise.all([
        RatingAndFeedbackService.getRatingSummary(),
        RatingAndFeedbackService.getRatingHistory(20, 0),
      ]);
      setSummary(sumData);
      setHistory(histData);
    } catch (e) {
      console.warn('[RatingsScreen] Load error:', e);
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

  const handleDisputeSubmit = async (ratingId: string, reason: string): Promise<boolean> => {
    const res = await RatingAndFeedbackService.disputeRating(ratingId, reason);
    if (res.success) {
      setHistory((prev) =>
        prev.map((item) =>
          item.rating_id === ratingId ? { ...item, is_disputed: true, status: 'DISPUTED' } : item
        )
      );
      return true;
    }
    return false;
  };

  const handleDevScenario = async (scenario: string) => {
    const res = await RatingAndFeedbackService.devSimulate(scenario);
    if (res?.summary) {
      setSummary(res.summary);
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
    centerLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
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
            <Text style={styles.headerTitle}>Rating & Feedback</Text>
          </View>

          <TouchableOpacity style={styles.devBtn} onPress={() => setDevSheetVisible(true)}>
            <MaterialCommunityIcons name="developer-board" size={14} color="#EAB308" />
            <Text style={styles.devBtnText}>Dev Mode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>
            Loading rating analytics...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* 1. Rating Summary & Star Breakdown */}
          {summary && <RatingBreakdownCard summary={summary} />}

          {/* 2. Top Compliments Received */}
          {summary && <ComplimentsCloud compliments={summary.top_compliments} />}

          {/* 3. Paginated Review History */}
          <RatingHistoryList
            history={history}
            onDisputePress={(item) => setSelectedDisputeItem(item)}
          />
        </ScrollView>
      )}

      {/* Dispute Modal */}
      <DisputeRatingModal
        visible={selectedDisputeItem !== null}
        item={selectedDisputeItem}
        onClose={() => setSelectedDisputeItem(null)}
        onSubmitDispute={handleDisputeSubmit}
      />

      {/* Developer Sandbox Sheet */}
      <RatingDevSheet
        visible={devSheetVisible}
        onClose={() => setDevSheetVisible(false)}
        onSelectScenario={handleDevScenario}
      />
    </View>
  );
}
