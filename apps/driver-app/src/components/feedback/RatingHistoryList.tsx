import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DriverRatingHistoryItem } from '../../types/ratingAndFeedback';
import { useTheme } from '../../theme';

interface RatingHistoryListProps {
  history: DriverRatingHistoryItem[];
  onDisputePress: (item: DriverRatingHistoryItem) => void;
}

const formatDate = (isoString?: string): string => {
  if (!isoString) return 'Recently';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / 3600000);
    if (diffHours < 24) return 'Yesterday';
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recently';
  }
};

export const RatingHistoryList: React.FC<RatingHistoryListProps> = ({
  history,
  onDisputePress,
}) => {
  const { theme, isDark } = useTheme();

  const styles = StyleSheet.create({
    container: {
      gap: 12,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 4,
    },
    card: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.03,
      shadowRadius: 6,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    scoreText: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginLeft: 4,
    },
    dateText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    feedbackQuote: {
      fontSize: 14,
      fontStyle: 'italic',
      color: isDark ? '#E2E8F0' : '#334155',
      lineHeight: 20,
      marginBottom: 10,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    tagChip: {
      backgroundColor: isDark ? 'rgba(234,179,8,0.12)' : '#FEF9C3',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(234,179,8,0.25)' : '#FEF08A',
    },
    tagText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#FDE047' : '#A16207',
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    rideRefText: {
      fontSize: 11,
      color: isDark ? '#64748B' : '#94A3B8',
      flex: 1,
    },
    disputeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEE2E2',
    },
    disputeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#EF4444',
    },
    disputedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7',
    },
    disputedText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#D97706',
    },
    emptyContainer: {
      padding: 24,
      alignItems: 'center',
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    },
    emptyText: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 8,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Passenger Feedback</Text>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="message-square" size={32} color={isDark ? '#64748B' : '#94A3B8'} />
          <Text style={styles.emptyText}>No recent passenger reviews found.</Text>
        </View>
      ) : (
        history.map((item) => (
          <View key={item.rating_id} style={styles.card}>
            {/* Header: Stars + Relative Date */}
            <View style={styles.cardHeader}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= item.rating ? 'star' : 'star-outline'}
                    size={16}
                    color={s <= item.rating ? '#F59E0B' : isDark ? '#475569' : '#CBD5E1'}
                  />
                ))}
                <Text style={styles.scoreText}>{item.rating.toFixed(1)} ★</Text>
              </View>
              <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            </View>

            {/* Feedback text if available */}
            {item.feedback ? (
              <Text style={styles.feedbackQuote}>"{item.feedback}"</Text>
            ) : null}

            {/* Compliments / Tags Chips */}
            {item.compliments && item.compliments.length > 0 && (
              <View style={styles.tagsRow}>
                {item.compliments.map((tag, tIdx) => (
                  <View key={tIdx} style={styles.tagChip}>
                    <Text style={styles.tagText}>✨ {tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer: Redacted Ride Reference + Dispute Action */}
            <View style={styles.footerRow}>
              <Text style={styles.rideRefText} numberOfLines={1}>
                {item.ride_reference}
              </Text>

              {item.is_disputed ? (
                <View style={styles.disputedBadge}>
                  <Feather name="clock" size={11} color="#D97706" />
                  <Text style={styles.disputedText}>Under Review</Text>
                </View>
              ) : item.rating <= 3 ? (
                <TouchableOpacity
                  style={styles.disputeBtn}
                  onPress={() => onDisputePress(item)}
                  activeOpacity={0.8}
                >
                  <Feather name="flag" size={11} color="#EF4444" />
                  <Text style={styles.disputeText}>Dispute</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
};
