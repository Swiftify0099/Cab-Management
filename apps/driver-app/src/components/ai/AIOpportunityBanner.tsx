import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { DriverAIInsights } from '../../types/aiSmartDriver';

interface AIOpportunityBannerProps {
  insights: DriverAIInsights | null;
  onPressViewZones: () => void;
  onPressDevSim?: () => void;
}

export const AIOpportunityBanner: React.FC<AIOpportunityBannerProps> = ({
  insights,
  onPressViewZones,
  onPressDevSim,
}) => {
  const { theme, isDark } = useTheme();

  if (!insights) return null;

  const topZone = insights.top_recommended_zone;
  const isSurge = insights.demand_status === 'SURGE' || (topZone && topZone.surge_multiplier > 1.2);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
          borderColor: isDark ? 'rgba(99, 102, 241, 0.28)' : '#E2E8F0',
          shadowColor: '#4338CA',
        },
      ]}
    >
      {/* Header Pill & Earnings Target */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.aiPill, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF' }]}>
            <MaterialCommunityIcons name="robot-outline" size={14} color="#6366F1" style={{ marginRight: 4 }} />
            <Text style={[styles.aiPillText, { color: isDark ? '#818CF8' : '#4338CA' }]}>AI ASSISTANT</Text>
          </View>

          {isSurge && (
            <View style={[styles.surgePill, { backgroundColor: isDark ? '#3B1219' : '#FEF2F2' }]}>
              <Feather name="trending-up" size={12} color="#EF4444" style={{ marginRight: 3 }} />
              <Text style={styles.surgePillText}>HIGH DEMAND</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={onPressDevSim} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <View style={[styles.earningPill, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
            <Text style={[styles.earningPillText, { color: isDark ? '#34D399' : '#047857' }]}>
              ~₹{insights.predicted_hourly_earning}/hr Est.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Insight Message */}
      <View style={styles.bodySection}>
        {topZone ? (
          <View>
            <Text style={[styles.titleText, { color: theme.colors.text }]}>
              🔥 {topZone.zone_name} is surging ({topZone.surge_multiplier}x)
            </Text>
            <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>
              ~{topZone.distance_km} km away • {topZone.estimated_eta_mins} mins drive • {topZone.reason}
            </Text>
          </View>
        ) : (
          <Text style={[styles.titleText, { color: theme.colors.text }]}>
            ⚡ Steady ride opportunities across the city today.
          </Text>
        )}
      </View>

      {/* Footer Action */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={[
            styles.viewZonesBtn,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
          ]}
          onPress={onPressViewZones}
          activeOpacity={0.8}
        >
          <Feather name="map-pin" size={14} color="#6366F1" style={{ marginRight: 6 }} />
          <Text style={[styles.viewZonesText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
            View Top Opportunity Zones ({insights.nearby_opportunity_zones?.length || 0})
          </Text>
          <Feather name="chevron-right" size={14} color="#6366F1" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  surgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  surgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  earningPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  earningPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodySection: {
    marginBottom: 10,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 2,
  },
  subText: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewZonesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  viewZonesText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
