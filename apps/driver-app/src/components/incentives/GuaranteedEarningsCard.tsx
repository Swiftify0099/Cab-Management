import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { GuaranteedEarningsData } from '../../types/incentivesAndPromotions';

interface GuaranteedEarningsCardProps {
  data: GuaranteedEarningsData;
}

export const GuaranteedEarningsCard: React.FC<GuaranteedEarningsCardProps> = ({ data }) => {
  const { theme, isDark } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : '#EFF6FF',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.35)' : '#DBEAFE',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#3B82F6',
    },
    guaranteeAmt: {
      fontSize: 18,
      fontWeight: '900',
      color: '#3B82F6',
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 4,
    },
    desc: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 17,
      marginBottom: 14,
    },
    statsBox: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    statVal: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    topupRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    },
    topupLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#10B981',
    },
    topupVal: {
      fontSize: 14,
      fontWeight: '900',
      color: '#10B981',
    },
    track: {
      height: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 10,
    },
    fill: {
      height: '100%',
      backgroundColor: '#3B82F6',
      borderRadius: 4,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerText: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Feather name="shield" size={14} color="#3B82F6" />
          <Text style={styles.badgeText}>Earnings Guarantee</Text>
        </View>
        <Text style={styles.guaranteeAmt}>₹{data.guaranteed_amount.toFixed(0)}</Text>
      </View>

      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.desc}>{data.description}</Text>

      {/* Progress Track */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155' }}>
          Shift Trips: {data.current_progress} / {data.target_count} Completed
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#3B82F6' }}>{data.percentage}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${data.percentage}%` }]} />
      </View>

      {/* Financial Comparison Box */}
      <View style={styles.statsBox}>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Current Net Fare (6 Trips):</Text>
          <Text style={styles.statVal}>₹{data.current_actual_earnings.toFixed(2)}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Guaranteed Shift Floor:</Text>
          <Text style={styles.statVal}>₹{data.guaranteed_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.topupRow}>
          <Text style={styles.topupLabel}>Potential Top-Up Difference:</Text>
          <Text style={styles.topupVal}>+₹{data.potential_topup.toFixed(2)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="clock" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
          <Text style={styles.footerText}>{data.time_remaining_str}</Text>
        </View>
        <Text style={styles.footerText}>
          {data.is_completed ? '✅ Top-up credited' : 'Credits upon completing 8th trip'}
        </Text>
      </View>
    </View>
  );
};
