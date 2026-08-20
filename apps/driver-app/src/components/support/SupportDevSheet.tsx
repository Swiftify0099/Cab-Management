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
import { SupportService } from '../../services/supportService';

interface SupportDevSheetProps {
  visible: boolean;
  onClose: () => void;
  activeTicketId?: string;
  onSimulated: () => void;
}

export const SupportDevSheet: React.FC<SupportDevSheetProps> = ({
  visible,
  onClose,
  activeTicketId,
  onSimulated,
}) => {
  const { theme, isDark } = useTheme();
  const [running, setRunning] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'AGENT_REPLY',
      title: 'Simulate Support Agent Reply',
      desc: 'Injects live response from senior support lead with fare credit adjustment.',
      icon: 'message-square',
      color: '#3B82F6',
      requiresTicket: true,
    },
    {
      id: 'RESOLVE_TICKET',
      title: 'Simulate Ticket Resolved',
      desc: 'Marks current active ticket as RESOLVED with resolution system message.',
      icon: 'check-circle',
      color: '#10B981',
      requiresTicket: true,
    },
    {
      id: 'CREATE_SAMPLE_TICKET',
      title: 'Create Sample Fare Dispute Ticket',
      desc: 'Generates a live HIGH priority trip fare dispute ticket for testing.',
      icon: 'plus-circle',
      color: '#8B5CF6',
      requiresTicket: false,
    },
  ];

  const handleRun = async (scenario: typeof scenarios[0]) => {
    if (scenario.requiresTicket && !activeTicketId) {
      Alert.alert('No Ticket Selected', 'Please open a specific support ticket first to run this simulation.');
      return;
    }

    try {
      setRunning(scenario.id);
      if (scenario.id === 'CREATE_SAMPLE_TICKET') {
        await SupportService.createTicket({
          category: 'PAYMENTS',
          subcategory: 'FARE_DISPUTE',
          subject: 'Customer Dispute: Toll not added to final fare',
          description: 'Passenger took Bandra-Worli Sealink route but toll of ₹85 was omitted from digital invoice.',
          priority: 'high',
        });
      } else {
        await SupportService.simulateDevScenario(scenario.id, activeTicketId);
      }
      onSimulated();
      Alert.alert('Sandbox Success', `Applied scenario: ${scenario.title}`);
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
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="robot-outline" size={22} color="#F59E0B" />
              <Text style={[styles.title, { color: theme.colors.text }]}>Support Dev Sandbox</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
            Test live ticket state transitions, agent replies, and reopen workflows.
          </Text>

          {activeTicketId && (
            <View style={styles.targetPill}>
              <Text style={styles.targetText}>Target Ticket: #{activeTicketId.slice(0, 8)}</Text>
            </View>
          )}

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
                onPress={() => handleRun(sc)}
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
  sub: { fontSize: 12, lineHeight: 16, marginBottom: 12 },
  targetPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  targetText: { color: '#6366F1', fontSize: 11, fontWeight: '800' },
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
