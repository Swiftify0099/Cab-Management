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

interface AIDevSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectScenario: (key: string) => void;
}

export const AIDevSheet: React.FC<AIDevSheetProps> = ({
  visible,
  onClose,
  onSelectScenario,
}) => {
  if (!__DEV__) return null;
  const { theme, isDark } = useTheme();

  const scenarios = [
    {
      key: 'HIGH_DEMAND_SURGE',
      title: '🔥 High Demand Surge (1.85x)',
      desc: 'Simulates citywide spike in passenger ride requests.',
      icon: 'trending-up',
    },
    {
      key: 'FATIGUE_WARNING',
      title: '☕ Trigger Fatigue Advisory (>6h)',
      desc: 'Clocks 6h 45m online session to trigger break banner.',
      icon: 'coffee',
    },
    {
      key: 'FAKE_GPS_SIGNAL',
      title: '🛡️ Simulate Fake GPS / Telemetry Risk',
      desc: 'Logs impossible speed / mock location internal risk signal.',
      icon: 'alert-triangle',
    },
    {
      key: 'BEST_ZONE_RECOMMENDATION',
      title: '📍 Top Zone Opportunity Boost',
      desc: 'Highlights Pune Airport Zone with 1.45x surge bonus.',
      icon: 'map-pin',
    },
    {
      key: 'RESET_ALL',
      title: '🔄 Reset All AI Parameters',
      desc: 'Restores baseline default surge and online timers.',
      icon: 'refresh-cw',
    },
  ];

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
                  <MaterialCommunityIcons name="code-tags" size={20} color="#6366F1" style={{ marginRight: 6 }} />
                  <Text style={[styles.title, { color: theme.colors.text }]}>AI Developer Sandbox</Text>
                </View>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  Feature 23 Test Scenarios (Advisory / Sandbox Only)
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
              {scenarios.map((sc) => (
                <TouchableOpacity
                  key={sc.key}
                  style={[
                    styles.scenarioBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => {
                    onSelectScenario(sc.key);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.scenarioInfo}>
                    <Text style={[styles.scenarioTitle, { color: theme.colors.text }]}>{sc.title}</Text>
                    <Text style={[styles.scenarioDesc, { color: theme.colors.textSecondary }]}>
                      {sc.desc}
                    </Text>
                  </View>
                  <Feather name="play" size={16} color="#6366F1" />
                </TouchableOpacity>
              ))}
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
    maxHeight: '75%',
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
    maxHeight: 380,
  },
  scenarioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  scenarioInfo: {
    flex: 1,
    marginRight: 10,
  },
  scenarioTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  scenarioDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
