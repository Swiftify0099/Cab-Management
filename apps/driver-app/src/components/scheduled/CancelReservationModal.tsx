import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { UpcomingReservedTrip } from '../../types/scheduledTrips';

interface CancelReservationModalProps {
  visible: boolean;
  trip: UpcomingReservedTrip | null;
  onClose: () => void;
  onConfirmCancel: (tripId: string, reason: string) => Promise<void>;
}

export const CancelReservationModal: React.FC<CancelReservationModalProps> = ({
  visible,
  trip,
  onClose,
  onConfirmCancel,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedReason, setSelectedReason] = useState('Personal emergency');
  const [cancelling, setCancelling] = useState(false);

  if (!trip) return null;

  const isLate = trip.countdown_seconds < 7200; // < 2 hours

  const reasons = [
    'Vehicle breakdown / Maintenance',
    'Personal emergency',
    'Unavoidable traffic / Delay',
    'Other driver conflict',
  ];

  const handleConfirm = async () => {
    try {
      setCancelling(true);
      await onConfirmCancel(trip.id, selectedReason);
      onClose();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.header}>
            <Feather name="alert-triangle" size={24} color="#EF4444" />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Cancel Reservation?
            </Text>
          </View>

          {isLate ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ This trip starts in less than 2 hours. Late cancellations affect your reliability standing.
              </Text>
            </View>
          ) : (
            <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
              Early cancellation is free. The trip will be released to other drivers.
            </Text>
          )}

          <Text style={[styles.reasonTitle, { color: theme.colors.text }]}>Select Reason:</Text>
          {reasons.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.reasonRow,
                selectedReason === r && {
                  borderColor: '#6366F1',
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF',
                },
              ]}
              onPress={() => setSelectedReason(r)}
            >
              <View
                style={[
                  styles.radio,
                  selectedReason === r && { borderColor: '#6366F1' },
                ]}
              >
                {selectedReason === r && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.reasonText, { color: theme.colors.text }]}>{r}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.keepBtn} onPress={onClose} disabled={cancelling}>
              <Text style={[styles.keepText, { color: theme.colors.text }]}>Keep Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleConfirm}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.cancelBtnText}>Confirm Cancel</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '800' },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  warningText: { color: '#EF4444', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  sub: { fontSize: 13, marginBottom: 12 },
  reasonTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
    gap: 10,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
  reasonText: { fontSize: 13 },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  keepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  keepText: { fontSize: 13, fontWeight: '700' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
