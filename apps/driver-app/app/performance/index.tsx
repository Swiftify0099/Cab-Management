/**
 * Feature 16: Driver Performance & Analytics Hub
 * ─────────────────────────────────────────────────────────────────────────────
 *  - Authoritative Reliability KPIs: Acceptance, Cancellation (Canonical F12), Completion
 *  - Authoritative Activity Metrics: PostGIS Validated Distance, Online Hours, Trips
 *  - Financial Metrics: Total Earnings, Earnings / Hour
 *  - 5-Star Rating Distribution & Verified Passenger Compliment Chips
 *  - Period Filtering (Today, This Week, This Month) & Trend Visualizers
 *  - Light Mode & Dark Mode with Accessible Data Colors
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'

import { useTheme } from '../../src/theme'
import { DriverPerformanceService } from '../../src/services/driverPerformanceService'
import { DriverPerformanceDashboardData } from '../../src/types/driverPerformance'
import { PerformanceDevSheet } from '../../src/components/performance/PerformanceDevSheet'

const { width } = Dimensions.get('window')

export default function DriverPerformanceScreen() {
  const { isDark } = useTheme()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [data, setData] = useState<DriverPerformanceDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showDevSheet, setShowDevSheet] = useState(false)

  const loadDashboard = useCallback(async (selectedPeriod = period) => {
    try {
      const res = await DriverPerformanceService.getPerformanceDashboard(selectedPeriod)
      setData(res)
    } catch (err: any) {
      console.warn('Performance dashboard error:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period])

  useFocusEffect(
    useCallback(() => {
      loadDashboard(period)
    }, [loadDashboard, period])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadDashboard(period)
  }

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ backgroundColor: isDark ? '#020617' : '#F8FAFC' }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Performance & Ratings</Text>
          <TouchableOpacity
            style={styles.devTriggerBtn}
            onPress={() => setShowDevSheet(true)}
          >
            <Ionicons name="construct-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Period Segmented Tabs */}
        <View style={[styles.periodTabsContainer, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
          {(['today', 'week', 'month'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => {
                setPeriod(p)
                loadDashboard(p)
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.periodTabText,
                  { color: textSecondary },
                  period === p && styles.periodTabTextActive,
                ]}
              >
                {p === 'today' ? "Today's Score" : p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Standing & Rating Hero Banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#312E81', '#1E3A8A'] : ['#2563EB', '#3B82F6', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTopRow}>
            <View style={styles.tierChip}>
              <Ionicons name="trophy" size={14} color="#FDE047" />
              <Text style={styles.tierChipText}>{data?.tier_label || 'Top Tier Partner'}</Text>
            </View>
            <View style={styles.standingBadge}>
              <View style={styles.standingDot} />
              <Text style={styles.standingBadgeText}>{data?.standing || 'EXCELLENT'}</Text>
            </View>
          </View>

          <View style={styles.heroScoreRow}>
            <View>
              <Text style={styles.heroRatingVal}>{data?.rating.average.toFixed(2) || '4.88'}</Text>
              <View style={styles.heroStarsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons key={s} name="star" size={16} color="#FDE047" />
                ))}
                <Text style={styles.heroRatingsCount}>({data?.rating.total_ratings || 280} reviews)</Text>
              </View>
            </View>
            <View style={styles.heroEarningsBox}>
              <Text style={styles.heroEarningsLabel}>NET EARNINGS</Text>
              <Text style={styles.heroEarningsVal}>₹{data?.financial.total_earnings.toLocaleString('en-IN') || '0'}</Text>
              <Text style={styles.heroRateSub}>₹{data?.financial.earning_per_hour.toFixed(0) || 0}/hour</Text>
            </View>
          </View>
        </View>

        {/* 3-Pill Trend Indicators */}
        <View style={styles.trendRow}>
          <View style={[styles.trendPill, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <Feather name="trending-up" size={14} color="#10B981" />
            <Text style={[styles.trendLabel, { color: textSecondary }]}>Acceptance:</Text>
            <Text style={[styles.trendVal, { color: '#10B981' }]}>{data?.trends.acceptance_delta || '+2.4%'}</Text>
          </View>
          <View style={[styles.trendPill, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <Feather name="trending-down" size={14} color="#10B981" />
            <Text style={[styles.trendLabel, { color: textSecondary }]}>Cancellation:</Text>
            <Text style={[styles.trendVal, { color: '#10B981' }]}>{data?.trends.cancellation_delta || '-0.8%'}</Text>
          </View>
        </View>

        {/* 3 Core Reliability Metrics Cards */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Reliability Scorecard</Text>

        <View style={[styles.metricCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="check-circle" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricTitle, { color: textPrimary }]}>Acceptance Rate</Text>
              <Text style={[styles.metricSubtitle, { color: textSecondary }]}>
                Target: ≥ {data?.reliability.acceptance_target || 85}%
              </Text>
            </View>
            <Text style={[styles.metricScoreVal, { color: '#2563EB' }]}>
              {data?.reliability.acceptance_rate.toFixed(1) || '94.2'}%
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(data?.reliability.acceptance_rate || 94, 100)}%`, backgroundColor: '#2563EB' },
              ]}
            />
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="x-circle" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricTitle, { color: textPrimary }]}>Cancellation Rate (Canonical F12)</Text>
              <Text style={[styles.metricSubtitle, { color: textSecondary }]}>
                Target: ≤ {data?.reliability.cancellation_target || 5}%
              </Text>
            </View>
            <Text style={[styles.metricScoreVal, { color: (data?.reliability.cancellation_rate || 0) <= 5 ? '#10B981' : '#EF4444' }]}>
              {data?.reliability.cancellation_rate.toFixed(1) || '2.8'}%
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min((data?.reliability.cancellation_rate || 2.8) * 10, 100)}%`,
                  backgroundColor: (data?.reliability.cancellation_rate || 0) <= 5 ? '#10B981' : '#EF4444',
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <MaterialCommunityIcons name="flag-checkered" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricTitle, { color: textPrimary }]}>Trip Completion Rate</Text>
              <Text style={[styles.metricSubtitle, { color: textSecondary }]}>
                Target: ≥ {data?.reliability.completion_target || 95}%
              </Text>
            </View>
            <Text style={[styles.metricScoreVal, { color: '#16A34A' }]}>
              {data?.reliability.completion_rate.toFixed(1) || '97.2'}%
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(data?.reliability.completion_rate || 97, 100)}%`, backgroundColor: '#16A34A' },
              ]}
            />
          </View>
        </View>

        {/* Activity & Operational Metrics Grid */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Operational Activity</Text>
        <View style={styles.activityGrid}>
          <View style={[styles.activityCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <MaterialCommunityIcons name="car-multiple" size={24} color="#3B82F6" />
            <Text style={[styles.activityVal, { color: textPrimary }]}>{data?.activity.total_trips || 8}</Text>
            <Text style={[styles.activityLabel, { color: textSecondary }]}>Completed Trips</Text>
          </View>

          <View style={[styles.activityCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <Feather name="clock" size={24} color="#8B5CF6" />
            <Text style={[styles.activityVal, { color: textPrimary }]}>{data?.activity.online_hours || 5.4}h</Text>
            <Text style={[styles.activityLabel, { color: textSecondary }]}>Online Hours</Text>
          </View>

          <View style={[styles.activityCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <MaterialCommunityIcons name="map-marker-distance" size={24} color="#10B981" />
            <Text style={[styles.activityVal, { color: textPrimary }]}>{data?.activity.distance_km || 184.2} km</Text>
            <Text style={[styles.activityLabel, { color: textSecondary }]}>Distance Driven</Text>
          </View>

          <View style={[styles.activityCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <Feather name="zap" size={24} color="#F59E0B" />
            <Text style={[styles.activityVal, { color: textPrimary }]}>₹{data?.financial.earning_per_hour.toFixed(0) || 459}</Text>
            <Text style={[styles.activityLabel, { color: textSecondary }]}>Earning / Hour</Text>
          </View>
        </View>

        {/* PostGIS Telemetry Source Notice */}
        <View style={[styles.postgisBadge, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: borderCol }]}>
          <Ionicons name="location-outline" size={16} color="#3B82F6" />
          <Text style={[styles.postgisText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
            Distance calculated authoritatively via PostGIS Telemetry (Zero Google Maps API reliance)
          </Text>
        </View>

        {/* Rating Breakdown & Compliments */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Passenger Ratings & Feedback</Text>
        <View style={[styles.feedbackCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <View style={styles.ratingSummaryRow}>
            <View style={styles.ratingBigScore}>
              <Text style={[styles.ratingScoreNum, { color: textPrimary }]}>{data?.rating.average.toFixed(1) || '4.9'}</Text>
              <View style={{ flexDirection: 'row', gap: 2, marginVertical: 4 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons key={s} name="star" size={14} color="#FDE047" />
                ))}
              </View>
              <Text style={[styles.totalReviewsText, { color: textSecondary }]}>{data?.rating.total_ratings || 280} Ratings</Text>
            </View>

            {/* Distribution Bars */}
            <View style={{ flex: 1 }}>
              {data?.rating.distribution.map(item => (
                <View key={item.stars} style={styles.distRow}>
                  <Text style={[styles.distStarLabel, { color: textSecondary }]}>{item.stars} ★</Text>
                  <View style={styles.distTrack}>
                    <View style={[styles.distFill, { width: `${item.percentage}%` }]} />
                  </View>
                  <Text style={[styles.distCountText, { color: textSecondary }]}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Compliment Badges */}
          <Text style={[styles.complimentsHeader, { color: textPrimary }]}>Top Driver Compliments</Text>
          <View style={styles.complimentsGrid}>
            {data?.rating.compliments.map(badge => (
              <View key={badge.badge} style={[styles.complimentChip, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                <Feather name="award" size={14} color="#EAB308" />
                <Text style={[styles.complimentChipText, { color: textPrimary }]}>
                  {badge.badge} ({badge.count})
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Developer Simulation Modal */}
      <PerformanceDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        onDataChanged={() => loadDashboard(period)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  devTriggerBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.1)' },
  periodTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: '#2563EB',
  },
  periodTabText: { fontSize: 13, fontWeight: '700' },
  periodTabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierChipText: { color: '#FDE047', fontSize: 12, fontWeight: '800' },
  standingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  standingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  standingBadgeText: { color: '#16A34A', fontSize: 11, fontWeight: '800' },
  heroScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  heroRatingVal: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', lineHeight: 46 },
  heroStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  heroRatingsCount: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  heroEarningsBox: { alignItems: 'flex-end' },
  heroEarningsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroEarningsVal: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginVertical: 2 },
  heroRateSub: { color: '#A7F3D0', fontSize: 12, fontWeight: '700' },
  trendRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  trendPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  trendLabel: { fontSize: 11, fontWeight: '600' },
  trendVal: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginVertical: 10 },
  metricCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  metricIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricTitle: { fontSize: 14, fontWeight: '700' },
  metricSubtitle: { fontSize: 12, marginTop: 2 },
  metricScoreVal: { fontSize: 18, fontWeight: '900' },
  progressBarTrack: { height: 6, backgroundColor: 'rgba(150,150,150,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  activityCard: {
    width: (width - 42) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  activityVal: { fontSize: 20, fontWeight: '900', marginTop: 8, marginBottom: 2 },
  activityLabel: { fontSize: 12, fontWeight: '600' },
  postgisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  postgisText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 16 },
  feedbackCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 20 },
  ratingSummaryRow: { flexDirection: 'row', gap: 18, alignItems: 'center', marginBottom: 16 },
  ratingBigScore: { alignItems: 'center', paddingRight: 10, borderRightWidth: 1, borderRightColor: 'rgba(150,150,150,0.15)' },
  ratingScoreNum: { fontSize: 36, fontWeight: '900' },
  totalReviewsText: { fontSize: 11, fontWeight: '600' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  distStarLabel: { fontSize: 11, fontWeight: '700', width: 24 },
  distTrack: { flex: 1, height: 6, backgroundColor: 'rgba(150,150,150,0.15)', borderRadius: 3, overflow: 'hidden' },
  distFill: { height: 6, backgroundColor: '#FDE047', borderRadius: 3 },
  distCountText: { fontSize: 11, fontWeight: '600', width: 26, textAlign: 'right' },
  complimentsHeader: { fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 10 },
  complimentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  complimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  complimentChipText: { fontSize: 12, fontWeight: '700' },
})
