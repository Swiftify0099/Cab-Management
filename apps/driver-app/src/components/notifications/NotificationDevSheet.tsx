import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { NotificationService } from '../../services/notificationService';

interface NotificationDevSheetProps {
  visible: boolean;
  onClose: () => void;
  onSimulated: () => void;
}

export const NotificationDevSheet: React.FC<NotificationDevSheetProps> = ({
  visible,
  onClose,
  onSimulated,
}) => {
  const { theme, isDark } = useTheme();
  const [running, setRunning] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'TRIP_ALERT',
      title: 'Dispatch Trip Assigned Alert',
      desc: 'Simulates high-priority airport pickup dispatch with deep link to ride HUD.',
      icon: 'navigation',
      color: '#3B82F6',
    },
    {
      id: 'PAYOUT_ALERT',
      title: 'Dispatch Instant Payout Credit',
      desc: 'Simulates ₹2,500 withdrawal credit alert with deep link to wallet statement.',
      icon: 'dollar-sign',
      color: '#10B981',
    },
    {
      id: 'SAFETY_ALERT',
      title: 'Dispatch Safety Route Anomaly',
      desc: 'Simulates passive route deviation warning with safety confirmation check.',
      icon: 'shield',
      color: '#EF4444',
    },
    {
      id: 'PROMOTION_ALERT',
      title: 'Dispatch Weekend Quest Bonus',
      desc: 'Simulates active quest alert: Complete 8 trips to earn +₹600 cash bonus.',
      icon: 'award',
      color: '#F59E0B',
    },
    {
      id: 'CLEAR_ALL',
      title: 'Clear All Notifications',
      desc: 'Flushes all notification feed items for this driver.',
      icon: 'trash-2',
      color: '#64748B',
    },
  ];

  const handleRun = async (scenarioId: string, title: string) => {
    try {
      setRunning(scenarioId);
      await NotificationService.simulateDevScenario(scenarioId);
      onSimulated();
      Alert.alert('Sandbox Success', `Simulated: ${title}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="robot-outline" size={22} color="#F59E0B" />
              <Text style={[styles.title, { color: theme.colors.text }]}>Notification Sandbox</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
            Simulate live in-app & push notification alerts across all 7 operational categories.
          </Text>

          <ScrollView style={styles.scenariosList}>
            {scenarios.map((sc) => (
              <TouchableOpacity
                key={sc.id}
                style={[
                  styles.scenarioCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
                onPress={() => handleRun(sc.id, sc.title)}
                disabled={running !== null}
              >
                <View style={[styles.scIconWrap, { backgroundColor: `${sc.color}20` }]}>
                  <Feather name={sc.icon as any} size={18} color={sc.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.scTitle, { color: theme.colors.text }]}>{sc.title}</Text>
                  <Text style={[styles.scDesc, { color: theme.colors.textSecondary }]}>{sc.desc}</Text>
                </View>

                {running === sc.id ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : (
                  <Feather name="play" size={16} color={sc.color} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: '80%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 16, fontWeight: '800' },
  closeBtn: { padding: 4 },
  sub: { fontSize: 12, lineHeight: 16, marginBottom: 14 },
  scenariosList: { maxHeight: 320 },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  scIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  scDesc: { fontSize: 11, lineHeight: 15 },
});
