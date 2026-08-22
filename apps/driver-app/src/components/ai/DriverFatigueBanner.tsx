import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { DriverFatigueSummary } from '../../types/aiSmartDriver';

interface DriverFatigueBannerProps {
  fatigue: DriverFatigueSummary | null;
  onAcknowledgeBreak: () => void;
}

export const DriverFatigueBanner: React.FC<DriverFatigueBannerProps> = ({
  fatigue,
  onAcknowledgeBreak,
}) => {
  const { isDark } = useTheme();

  if (!fatigue || !fatigue.needs_break) return null;

  const isMandatory = fatigue.advisory_level === 'MANDATORY_REST';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? (isMandatory ? '#3B1219' : '#332005') : (isMandatory ? '#FEF2F2' : '#FFFBEB'),
          borderColor: isMandatory ? '#EF4444' : '#F59E0B',
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name={isMandatory ? 'alert-octagon' : 'coffee-outline'}
            size={18}
            color={isMandatory ? '#EF4444' : '#F59E0B'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.title,
              { color: isDark ? (isMandatory ? '#FCA5A5' : '#FDE68A') : (isMandatory ? '#991B1B' : '#92400E') },
            ]}
          >
            {isMandatory ? 'Rest Break Required' : 'Driver Safety Advisory'}
          </Text>
        </View>

        <View
          style={[
            styles.hoursPill,
            { backgroundColor: isMandatory ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)' },
          ]}
        >
          <Text
            style={[
              styles.hoursText,
              { color: isMandatory ? '#EF4444' : '#F59E0B' },
            ]}
          >
            {fatigue.continuous_driving_hours}h Online
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.message,
          { color: isDark ? '#E2E8F0' : (isMandatory ? '#7F1D1D' : '#78350F') },
        ]}
      >
        {fatigue.advisory_message}
      </Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.breakBtn,
            { backgroundColor: isMandatory ? '#EF4444' : '#F59E0B' },
          ]}
          onPress={onAcknowledgeBreak}
          activeOpacity={0.8}
        >
          <Feather name="coffee" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.breakBtnText}>Acknowledge & Take Break</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hoursPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hoursText: {
    fontSize: 11,
    fontWeight: '700',
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  breakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  breakBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
