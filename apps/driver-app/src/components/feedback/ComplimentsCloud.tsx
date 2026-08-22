import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ComplimentTagItem } from '../../types/ratingAndFeedback';
import { useTheme } from '../../theme';

interface ComplimentsCloudProps {
  compliments: ComplimentTagItem[];
}

const getComplimentIcon = (tag: string): { icon: string; color: string } => {
  const lower = tag.toLowerCase();
  if (lower.includes('clean')) return { icon: 'sparkles', color: '#3B82F6' };
  if (lower.includes('safe')) return { icon: 'shield-check', color: '#10B981' };
  if (lower.includes('professional') || lower.includes('polite')) return { icon: 'tie', color: '#8B5CF6' };
  if (lower.includes('smooth')) return { icon: 'car-side', color: '#06B6D4' };
  if (lower.includes('communication')) return { icon: 'message-text', color: '#EC4899' };
  if (lower.includes('punctual')) return { icon: 'clock-check', color: '#F59E0B' };
  if (lower.includes('helpful') || lower.includes('luggage')) return { icon: 'bag-personal', color: '#6366F1' };
  return { icon: 'star', color: '#EAB308' };
};

export const ComplimentsCloud: React.FC<ComplimentsCloudProps> = ({ compliments }) => {
  const { theme, isDark } = useTheme();

  const totalCount = compliments.reduce((sum, item) => sum + item.count, 0);

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
      alignItems: 'center',
      marginBottom: 14,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    totalBadge: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE',
    },
    totalText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1D4ED8',
    },
    chipsWrapper: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      gap: 6,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#334155',
    },
    countBadge: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    countText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    emptyText: {
      fontSize: 13,
      color: isDark ? '#64748B' : '#94A3B8',
      fontStyle: 'italic',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Top Compliments Received</Text>
        {totalCount > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>{totalCount} Total</Text>
          </View>
        )}
      </View>

      {compliments.length === 0 ? (
        <Text style={styles.emptyText}>Compliments from passengers will appear here after your rides.</Text>
      ) : (
        <View style={styles.chipsWrapper}>
          {compliments.map((item, index) => {
            const { icon, color } = getComplimentIcon(item.tag);
            return (
              <View key={index} style={styles.chip}>
                <MaterialCommunityIcons name={icon as any} size={16} color={color} />
                <Text style={styles.chipText}>{item.tag}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{item.count}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
