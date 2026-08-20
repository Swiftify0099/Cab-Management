import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { DriverRatingHistoryItem } from '../../types/ratingAndFeedback';
import { useTheme } from '../../theme';

interface DisputeRatingModalProps {
  visible: boolean;
  item: DriverRatingHistoryItem | null;
  onClose: () => void;
  onSubmitDispute: (ratingId: string, reason: string) => Promise<boolean>;
}

const DISPUTE_REASONS = [
  'Unavoidable Route / Traffic Closure',
  'False Passenger Statement or Misunderstanding',
  'Unfair Low Rating (Wrong Ride Feedback)',
  'App Navigation / GPS Telemetry Glitch',
  'Other Safety or Road Condition Factor',
];

export const DisputeRatingModal: React.FC<DisputeRatingModalProps> = ({
  visible,
  item,
  onClose,
  onSubmitDispute,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedReason, setSelectedReason] = useState(DISPUTE_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!item) return null;

  const handleSubmit = async () => {
    const fullReason = details.trim() ? `${selectedReason} - ${details.trim()}` : selectedReason;
    setSubmitting(true);
    const success = await onSubmitDispute(item.rating_id, fullReason);
    setSubmitting(false);
    if (success) {
      Alert.alert(
        'Dispute Submitted',
        'Your appeal has been received. Our partner moderation team will review the ride telemetry and update the status within 24 hours.'
      );
      onClose();
    }
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
    closeBtn: {
      padding: 4,
    },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
      borderRadius: 12,
      padding: 12,
      gap: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.25)' : '#BFDBFE',
    },
    infoText: {
      fontSize: 12,
      color: isDark ? '#CBD5E1' : '#1E40AF',
      lineHeight: 18,
      flex: 1,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#475569',
      marginBottom: 10,
    },
    reasonsContainer: {
      gap: 8,
      marginBottom: 16,
    },
    radioItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      gap: 10,
    },
    radioItemSelected: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
      borderColor: isDark ? '#3B82F6' : '#2563EB',
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: isDark ? '#64748B' : '#94A3B8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleSelected: {
      borderColor: '#3B82F6',
    },
    radioInnerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#3B82F6',
    },
    radioText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#334155',
      flex: 1,
    },
    input: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
      borderRadius: 12,
      padding: 12,
      fontSize: 13,
      color: isDark ? '#FFFFFF' : '#0F172A',
      minHeight: 70,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    submitBtn: {
      backgroundColor: '#EF4444',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Dispute Rating ({item.rating}★)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="shield-account" size={20} color={isDark ? '#93C5FD' : '#2563EB'} />
            <Text style={styles.infoText}>
              Drivers cannot delete customer ratings directly. Submitting a dispute routes this ride to moderation for telemetry and dispute review.
            </Text>
          </View>

          {/* Radio Reasons */}
          <Text style={styles.sectionLabel}>Select Reason for Dispute:</Text>
          <View style={styles.reasonsContainer}>
            {DISPUTE_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.radioItem, isSelected && styles.radioItemSelected]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInnerDot} />}
                  </View>
                  <Text style={styles.radioText}>{reason}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Details input */}
          <Text style={styles.sectionLabel}>Additional Details (Optional):</Text>
          <TextInput
            style={styles.input}
            placeholder="Explain context (e.g. detour ordered by traffic police)..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            multiline
            numberOfLines={3}
            value={details}
            onChangeText={setDetails}
          />

          {/* Submit CTA */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Submit Dispute for Review</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
