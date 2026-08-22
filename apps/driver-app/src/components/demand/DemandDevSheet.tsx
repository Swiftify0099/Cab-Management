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

interface DemandDevSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: string) => Promise<void>;
}

const SCENARIOS = [
  {
    id: 'INJECT_AIRPORT_SURGE',
    title: '✈️ Airport Surge Spike (2.5x)',
    desc: 'Simulate flight arrival rush at Pune Airport with 38 pickups waiting.',
    color: '#EF4444',
  },
  {
    id: 'HINJAWADI_EVENING_RUSH',
    title: '🏢 Hinjawadi Tech Park Rush (2.0x)',
    desc: 'Simulate evening shift closing surge in Hinjawadi IT Park.',
    color: '#F59E0B',
  },
  {
    id: 'RAIN_SPIKE_HEATMAP',
    title: '🌧️ Citywide Monsoon Demand Spike',
    desc: 'Boost all zones by +0.5x surge and generate high-density heatmap points.',
    color: '#3B82F6',
  },
  {
    id: 'RESET_DEFAULTS',
    title: '🔄 Reset Baseline Heatmap & Surge',
    desc: 'Restore standard normal demand levels across Pune metro.',
    color: '#64748B',
  },
];

export const DemandDevSheet: React.FC<DemandDevSheetProps> = ({
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
            <Text style={styles.title}>Feature 19 Demand Sandbox</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Feather name="x" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Badge */}
          <View style={styles.devBadge}>
            <MaterialCommunityIcons name="developer-board" size={18} color="#EAB308" />
            <Text style={styles.devText}>Simulate PostGIS hotspots, airport surge waves, and monsoon demand.</Text>
          </View>

          {/* Scenarios */}
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
