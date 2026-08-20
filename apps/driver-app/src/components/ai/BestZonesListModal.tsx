import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { OpportunityZone } from '../../types/aiSmartDriver';

interface BestZonesListModalProps {
  visible: boolean;
  onClose: () => void;
  zones: OpportunityZone[];
  onSelectZone?: (zone: OpportunityZone) => void;
}

export const BestZonesListModal: React.FC<BestZonesListModalProps> = ({
  visible,
  onClose,
  zones,
  onSelectZone,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.modalContainer}>
          <View
            style={[
              styles.contentCard,
              {
                backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <View style={styles.titleRow}>
                  <MaterialCommunityIcons name="radar" size={20} color="#6366F1" style={{ marginRight: 6 }} />
                  <Text style={[styles.title, { color: theme.colors.text }]}>High Opportunity Zones</Text>
                </View>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  Ranked by live demand, surge rate, and distance
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Zones List */}
            <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
              {zones.map((zone, idx) => (
                <View
                  key={zone.zone_id || idx}
                  style={[
                    styles.zoneCard,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: idx === 0 ? '#6366F1' : isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.zoneHeader}>
                    <View style={styles.zoneRankRow}>
                      <View
                        style={[
                          styles.rankBadge,
                          { backgroundColor: idx === 0 ? '#6366F1' : isDark ? '#475569' : '#CBD5E1' },
                        ]}
                      >
                        <Text style={styles.rankText}>#{idx + 1}</Text>
                      </View>
                      <Text style={[styles.zoneName, { color: theme.colors.text }]}>{zone.zone_name}</Text>
                    </View>

                    <View style={styles.surgeBadge}>
                      <Text style={styles.surgeText}>{zone.surge_multiplier}x Surge</Text>
                    </View>
                  </View>

                  <Text style={[styles.zoneReason, { color: theme.colors.textSecondary }]}>
                    {zone.reason}
                  </Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Feather name="navigation" size={13} color={theme.colors.textSecondary} />
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {zone.distance_km} km ({zone.estimated_eta_mins}m)
                      </Text>
                    </View>

                    <View style={styles.statItem}>
                      <Feather name="dollar-sign" size={13} color="#10B981" />
                      <Text style={[styles.statValue, { color: '#10B981', fontWeight: '700' }]}>
                        ~₹{zone.expected_hourly_earning}/hr
                      </Text>
                    </View>

                    <View style={styles.statItem}>
                      <Feather name="activity" size={13} color="#F59E0B" />
                      <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                        {zone.forecast_30m} in 30m
                      </Text>
                    </View>
                  </View>

                  {onSelectZone && (
                    <TouchableOpacity
                      style={styles.navigateBtn}
                      onPress={() => {
                        onSelectZone(zone);
                        onClose();
                      }}
                    >
                      <Feather name="send" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.navigateBtnText}>Drive Towards Zone</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <View style={styles.disclaimerBox}>
                <Feather name="info" size={13} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.disclaimerText, { color: theme.colors.textSecondary }]}>
                  Zone suggestions are AI forecasts based on recent patterns. Road conditions may vary.
                </Text>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '85%',
  },
  contentCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  scrollList: {
    maxHeight: 480,
  },
  zoneCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  zoneRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '700',
  },
  surgeBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  surgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  zoneReason: {
    fontSize: 12,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  navigateBtn: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 8,
  },
  disclaimerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
});
