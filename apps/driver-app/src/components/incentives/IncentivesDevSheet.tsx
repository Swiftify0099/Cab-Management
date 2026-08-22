import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface IncentivesDevSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: string) => Promise<void>;
}

const SCENARIOS = [
  {
    id: 'PROGRESS_DAILY_QUEST',
    title: '🚗 Add +1 Trip to Daily Quest',
    desc: 'Simulate completing an eligible trip and updating quest progress counter.',
    color: '#3B82F6',
  },
  {
    id: 'COMPLETE_DAILY_QUEST',
    title: '🎯 Complete 10/10 Daily Target',
    desc: 'Instantly achieve daily quest target and credit ₹500 reward to ledger.',
    color: '#10B981',
  },
  {
    id: 'TRIGGER_GUARANTEE_TOPUP',
    title: '🛡️ Trigger Guarantee Top-Up (+₹380)',
    desc: 'Simulate 8 completed shift trips with ₹1,120 net fare, calculating ₹380 top-up.',
    color: '#F59E0B',
  },
  {
    id: 'SIMULATE_REFERRAL_QUALIFIED',
    title: '👥 Qualify Invited Driver (25 Rides)',
    desc: 'Simulate an invited partner finishing 25 trips and credit ₹1,000 referral bonus.',
    color: '#8B5CF6',
  },
  {
    id: 'RESET_DEFAULTS',
    title: '🔄 Reset All Sandbox Progress',
    desc: 'Restore original zero-progress active quest state.',
    color: '#64748B',
  },
];

export const IncentivesDevSheet: React.FC<IncentivesDevSheetProps> = ({
  visible,
  onClose,
  onSelectScenario,
}) => {
  const { theme, isDark } = useTheme();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApply = async (id: string) => {
    setLoadingId(id);
    await onSelectScenario(id);
    setLoadingId(null);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    devBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(234,179,8,0.15)' : '#FEF9C3',
      padding: 10,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(234,179,8,0.3)' : '#FEF08A',
    },
    devText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FDE047' : '#854D0E',
    },
    scenarioList: {
      gap: 10,
    },
    scenarioCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    },
    scenarioTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 4,
    },
    scenarioDesc: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 16,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Feature 18 Incentives Sandbox</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Feather name="x" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Badge */}
          <View style={styles.devBadge}>
            <MaterialCommunityIcons name="developer-board" size={18} color="#EAB308" />
            <Text style={styles.devText}>Simulate quest completions, guarantee top-ups, and referral credits.</Text>
          </View>

          {/* Scenario List */}
          <View style={styles.scenarioList}>
            {SCENARIOS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.scenarioCard}
                onPress={() => handleApply(item.id)}
                disabled={loadingId !== null}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.scenarioTitle}>{item.title}</Text>
                  {loadingId === item.id && <ActivityIndicator size="small" color={item.color} />}
                </View>
                <Text style={styles.scenarioDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
