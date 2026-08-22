import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { ExpectedDemandHour } from '../../types/demandAndHeatmap';

interface ExpectedDemandTimelineProps {
  timeline: ExpectedDemandHour[];
}

export const ExpectedDemandTimeline: React.FC<ExpectedDemandTimelineProps> = ({ timeline }) => {
  const { theme, isDark } = useTheme();

  const getSurgeColor = (surge: number) => {
    if (surge >= 2.0) return '#EF4444';
    if (surge >= 1.5) return '#F59E0B';
    return '#10B981';
  };

  const styles = StyleSheet.create({
    card: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
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
      marginBottom: 14,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    timelineRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 120,
      paddingTop: 16,
      paddingBottom: 4,
    },
    barCol: {
      alignItems: 'center',
      flex: 1,
    },
    barTrack: {
      height: 70,
      width: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      borderRadius: 10,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      marginBottom: 6,
    },
    barFill: {
      width: '100%',
      borderRadius: 10,
    },
    surgeText: {
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 3,
    },
    hourText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
    },
    legendText: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="trending-up" size={16} color="#3B82F6" />
          <Text style={styles.title}>Expected Demand (Next 6 Hours)</Text>
        </View>
        <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>
          Historical Forecast
        </Text>
      </View>

      {/* Hourly Bar Chart */}
      <View style={styles.timelineRow}>
        {timeline.map((item, idx) => {
          const color = getSurgeColor(item.expected_surge_multiplier);
          const heightPct = Math.min(Math.round((item.expected_surge_multiplier / 2.5) * 100), 100);

          return (
            <View key={idx} style={styles.barCol}>
              <Text style={[styles.surgeText, { color }]}>{item.expected_surge_multiplier.toFixed(1)}x</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${heightPct}%`, backgroundColor: color }]} />
              </View>
              <Text style={styles.hourText}>{item.hour_label}</Text>
            </View>
          );
        })}
      </View>

      {/* Footer Info */}
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>🟢 Normal (&lt;1.4x)</Text>
        <Text style={styles.legendText}>🟠 High (1.5x - 1.9x)</Text>
        <Text style={styles.legendText}>🔴 Critical (2.0x+)</Text>
      </View>
    </View>
  );
};
