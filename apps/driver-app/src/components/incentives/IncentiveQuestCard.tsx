import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { IncentiveQuest } from '../../types/incentivesAndPromotions';

interface IncentiveQuestCardProps {
  quest: IncentiveQuest;
}

export const IncentiveQuestCard: React.FC<IncentiveQuestCardProps> = ({ quest }) => {
  const { theme, isDark } = useTheme();

  const getBadgeMeta = () => {
    switch (quest.campaign_type) {
      case 'DAILY_TARGET':
        return { icon: 'calendar', label: 'Daily Quest', color: '#3B82F6' };
      case 'ZONE_INCENTIVE':
        return { icon: 'map-pin', label: quest.zone_name || 'Special Zone', color: '#F59E0B' };
      case 'PEAK_HOUR':
        return { icon: 'zap', label: 'Peak Hour', color: '#EC4899' };
      case 'WEEKLY_TARGET':
        return { icon: 'award', label: 'Weekly Quest', color: '#8B5CF6' };
      default:
        return { icon: 'gift', label: 'Promotion', color: '#10B981' };
    }
  };

  const meta = getBadgeMeta();
  const isDone = quest.is_completed || quest.status === 'EARNED';
  const remaining = Math.max(quest.target_count - quest.current_progress, 0);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDone
        ? (isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0')
        : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: meta.color,
    },
    rewardPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDone
        ? (isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5')
        : (isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7'),
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDone
        ? (isDark ? 'rgba(16,185,129,0.4)' : '#6EE7B7')
        : (isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A'),
    },
    rewardText: {
      fontSize: 13,
      fontWeight: '800',
      color: isDone ? '#10B981' : '#D97706',
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
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#334155',
    },
    progressPct: {
      fontSize: 12,
      fontWeight: '800',
      color: isDone ? '#10B981' : '#3B82F6',
    },
    track: {
      height: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 12,
    },
    fill: {
      height: '100%',
      backgroundColor: isDone ? '#10B981' : '#3B82F6',
      borderRadius: 4,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timeText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    completedText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
    },
  });

  return (
    <View style={styles.card}>
      {/* Top Badge & Reward Pill */}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Feather name={meta.icon as any} size={12} color={meta.color} />
          <Text style={styles.badgeText}>{meta.label}</Text>
        </View>

        <View style={styles.rewardPill}>
          <Feather name={isDone ? 'check-circle' : 'plus-circle'} size={13} color={isDone ? '#10B981' : '#D97706'} />
          <Text style={styles.rewardText}>
            {isDone ? 'Earned ₹' : '+₹'}
            {quest.reward_amount.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Title & Description */}
      <Text style={styles.title}>{quest.title}</Text>
      <Text style={styles.desc}>{quest.description}</Text>

      {/* Progress Bar */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          {isDone
            ? `Goal Achieved (${quest.target_count}/${quest.target_count} Completed)`
            : `Progress: ${quest.current_progress} / ${quest.target_count} Completed (${remaining} remaining)`}
        </Text>
        <Text style={styles.progressPct}>{quest.percentage}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${quest.percentage}%` }]} />
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <View style={styles.timeRow}>
          <Feather name="clock" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
          <Text style={styles.timeText}>{quest.time_remaining_str}</Text>
        </View>

        {isDone ? (
          <View style={styles.completedBadge}>
            <Feather name="check" size={12} color="#10B981" />
            <Text style={styles.completedText}>Settled to Wallet</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '500' }}>
            Auto-credits on completion
          </Text>
        )}
      </View>
    </View>
  );
};
