import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { DriverReferralSummary } from '../../types/incentivesAndPromotions';

interface ReferralProgramCardProps {
  summary: DriverReferralSummary;
}

export const ReferralProgramCard: React.FC<ReferralProgramCardProps> = ({ summary }) => {
  const { theme, isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join our Driver Partner fleet with my referral code ${summary.referral_code} and earn premium weekly incentives! Download app: https://cabbooking.com/driver/join?ref=${summary.referral_code}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const styles = StyleSheet.create({
    card: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139,92,246,0.3)' : '#DDD6FE',
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
      backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : '#F5F3FF',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139,92,246,0.35)' : '#EDE9FE',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#8B5CF6',
    },
    rewardPill: {
      fontSize: 14,
      fontWeight: '900',
      color: '#8B5CF6',
    },
    title: {
      fontSize: 16,
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
    codeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(139,92,246,0.4)' : '#C4B5FD',
    },
    codeText: {
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 1.5,
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: copied ? '#10B981' : '#8B5CF6',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    copyBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    statCol: {
      alignItems: 'center',
      flex: 1,
    },
    statVal: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    statLabel: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#EDE9FE',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139,92,246,0.4)' : '#DDD6FE',
    },
    shareBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#8B5CF6',
    },
    invitedToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    },
    invitedToggleText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#C4B5FD' : '#6D28D9',
    },
    driverItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
    },
  });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Feather name="users" size={14} color="#8B5CF6" />
          <Text style={styles.badgeText}>Driver Referral Program</Text>
        </View>
        <Text style={styles.rewardPill}>₹{summary.reward_per_referral.toFixed(0)} / Referral</Text>
      </View>

      <Text style={styles.title}>Invite Fellow Drivers & Earn ₹1,000</Text>
      <Text style={styles.desc}>
        Share your unique referral code. You earn ₹1,000 bonus directly in your wallet once your invited driver completes {summary.required_rides} rides.
      </Text>

      {/* Referral Code Box */}
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>{summary.referral_code}</Text>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
          <Feather name={copied ? 'check' : 'copy'} size={13} color="#FFFFFF" />
          <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statVal}>{summary.invited_count}</Text>
          <Text style={styles.statLabel}>Invited</Text>
        </View>
        <View style={[styles.statCol, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
          <Text style={styles.statVal}>{summary.rewarded_count}</Text>
          <Text style={styles.statLabel}>Completed (25 Trips)</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: '#10B981' }]}>₹{summary.total_referral_earnings.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </View>
      </View>

      {/* Share CTA */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
        <Feather name="share-2" size={15} color="#8B5CF6" />
        <Text style={styles.shareBtnText}>Share Referral Link with Drivers</Text>
      </TouchableOpacity>

      {/* Expandable Invited Partners List */}
      {summary.invited_drivers.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.invitedToggle}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.8}
          >
            <Text style={styles.invitedToggleText}>
              View Invited Drivers ({summary.invited_drivers.length})
            </Text>
            <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#8B5CF6" />
          </TouchableOpacity>

          {expanded && (
            <View style={{ marginTop: 8 }}>
              {summary.invited_drivers.map((drv) => (
                <View key={drv.referral_id} style={styles.driverItem}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                      {drv.name} ({drv.phone_masked})
                    </Text>
                    <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B' }}>
                      Progress: {drv.completed_rides} / {drv.required_rides} Rides
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: drv.is_rewarded
                        ? (isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5')
                        : (isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7'),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: drv.is_rewarded ? '#10B981' : '#D97706',
                      }}
                    >
                      {drv.is_rewarded ? '₹1,000 Credited' : `${drv.required_rides - drv.completed_rides} trips left`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};
