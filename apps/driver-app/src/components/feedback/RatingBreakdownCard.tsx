import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DriverRatingSummary } from '../../types/ratingAndFeedback';
import { useTheme } from '../../theme';

interface RatingBreakdownCardProps {
  summary: DriverRatingSummary;
}

export const RatingBreakdownCard: React.FC<RatingBreakdownCardProps> = ({ summary }) => {
  const { theme, isDark } = useTheme();

  const isTrendUp = summary.rating_trend_direction === 'UP';
  const trendSign = summary.rating_trend >= 0 ? '+' : '';

  const styles = StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.04,
      shadowRadius: 10,
      elevation: 3,
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    scoreBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    scoreText: {
      fontSize: 34,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: -0.5,
    },
    starIcon: {
      color: '#F59E0B',
    },
    metaText: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    trendBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: isTrendUp
        ? isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5'
        : isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
      borderWidth: 1,
      borderColor: isTrendUp
        ? isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0'
        : isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
    },
    trendText: {
      fontSize: 12,
      fontWeight: '700',
      color: isTrendUp ? '#10B981' : '#F59E0B',
    },
    standingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.25)' : '#BFDBFE',
    },
    standingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    standingTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1D4ED8',
    },
    standingBadge: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#60A5FA' : '#2563EB',
    },
    barsContainer: {
      gap: 8,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    starLabel: {
      width: 32,
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#CBD5E1' : '#475569',
      textAlign: 'right',
    },
    track: {
      flex: 1,
      height: 9,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      borderRadius: 5,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: '#F59E0B',
      borderRadius: 5,
    },
    pctLabel: {
      width: 40,
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
      textAlign: 'right',
    },
    countLabel: {
      width: 36,
      fontSize: 11,
      color: isDark ? '#64748B' : '#94A3B8',
      textAlign: 'right',
    },
    alertBanner: {
      marginTop: 16,
      backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239,68,68,0.25)' : '#FECACA',
    },
    alertTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#EF4444',
    },
    alertBody: {
      fontSize: 12,
      color: isDark ? '#CBD5E1' : '#475569',
      lineHeight: 18,
    },
    tipsList: {
      marginTop: 8,
      gap: 4,
    },
    tipItem: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 16,
    },
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreText}>{summary.overall_rating.toFixed(2)}</Text>
            <Ionicons name="star" size={26} color="#F59E0B" />
          </View>
          <Text style={styles.metaText}>
            Based on {summary.total_ratings.toLocaleString()} ratings • {summary.five_star_pct}% 5★ Ratings
          </Text>
        </View>

        <View style={styles.trendBadge}>
          <Feather
            name={isTrendUp ? 'trending-up' : 'trending-down'}
            size={14}
            color={isTrendUp ? '#10B981' : '#F59E0B'}
          />
          <Text style={styles.trendText}>
            {trendSign}{summary.rating_trend.toFixed(2)} (30d)
          </Text>
        </View>
      </View>

      {/* Driver Standing Banner */}
      <View style={styles.standingRow}>
        <View style={styles.standingLeft}>
          <MaterialCommunityIcons name="shield-check" size={18} color={isDark ? '#60A5FA' : '#2563EB'} />
          <Text style={styles.standingTitle}>Standing: {summary.standing}</Text>
        </View>
        <Text style={styles.standingBadge}>{summary.standing_badge}</Text>
      </View>

      {/* 5-Star to 1-Star Progress Bars */}
      <View style={styles.barsContainer}>
        {summary.breakdown.map((item) => (
          <View key={item.star} style={styles.barRow}>
            <Text style={styles.starLabel}>{item.star} ★</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(item.percentage, 100)}%` }]} />
            </View>
            <Text style={styles.pctLabel}>{item.percentage}%</Text>
            <Text style={styles.countLabel}>({item.count})</Text>
          </View>
        ))}
      </View>

      {/* Low Rating Alert Banner */}
      {summary.is_low_rating_alert && (
        <View style={styles.alertBanner}>
          <View style={styles.alertTitleRow}>
            <Feather name="alert-triangle" size={16} color="#EF4444" />
            <Text style={styles.alertTitle}>Performance Alert</Text>
          </View>
          <Text style={styles.alertBody}>{summary.alert_message}</Text>
          {summary.improvement_tips && summary.improvement_tips.length > 0 && (
            <View style={styles.tipsList}>
              {summary.improvement_tips.map((tip, idx) => (
                <Text key={idx} style={styles.tipItem}>• {tip}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
