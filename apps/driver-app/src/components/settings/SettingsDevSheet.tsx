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
import { DriverSettingsService } from '../../services/driverSettingsService';

interface SettingsDevSheetProps {
  visible: boolean;
  onClose: () => void;
  onSimulated: () => void;
}

export const SettingsDevSheet: React.FC<SettingsDevSheetProps> = ({
  visible,
  onClose,
  onSimulated,
}) => {
  if (!__DEV__) return null;
  const { theme, isDark } = useTheme();
  const [running, setRunning] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'RESET_SETTINGS_DEFAULTS',
      title: 'Reset Driver Preferences to Defaults',
      desc: 'Restores English language, in-app navigation, and default alerts.',
      icon: 'refresh-cw',
      color: '#0EA5E9',
    },
  ];

  const handleRun = async (scenarioId: string, title: string) => {
    try {
      setRunning(scenarioId);
      const res = await DriverSettingsService.simulateDevScenario(scenarioId);
      onSimulated();
      Alert.alert('Sandbox Success', res.message || `Simulated: ${title}`);
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
              <MaterialCommunityIcons name="robot-outline" size={22} color="#0EA5E9" />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Driver Settings Sandbox
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
            Test configuration defaults, diagnostics simulation, and local storage state.
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
                  <Text style={[styles.scDesc, { color: theme.colors.textSecondary }]}>
                    {sc.desc}
                  </Text>
                </View>

                {running === sc.id ? (
                  <ActivityIndicator size="small" color="#0EA5E9" />
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
    maxHeight: '70%',
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
  scenariosList: { maxHeight: 200 },
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
