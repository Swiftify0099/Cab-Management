import React from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../theme'
import { BlockingReason } from '../../services/availabilityService'

interface Props {
  visible: boolean
  reasons: BlockingReason[]
  onClose: () => void
}

export function OnlineBlockedModal({ visible, reasons, onClose }: Props) {
  const { theme, isDark } = useTheme()

  const handleAction = (route: string) => {
    onClose()
    if (route) {
      router.push(route as any)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.warningIconCircle}>
              <Feather name="alert-triangle" size={24} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                Cannot Go Online Yet
              </Text>
              <Text style={[styles.sheetSubtitle, { color: theme.colors.textSecondary }]}>
                Please resolve the following compliance items to start receiving trips
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List of Blocking Reasons */}
          <View style={styles.reasonsList}>
            {reasons.map((r, idx) => (
              <View
                key={r.id || idx}
                style={[
                  styles.reasonCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.reasonLeft}>
                  <Text style={[styles.reasonTitle, { color: theme.colors.text }]}>
                    {r.title}
                  </Text>
                  <Text
                    style={[
                      styles.reasonDesc,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {r.description}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleAction(r.actionRoute)}
                >
                  <Text style={styles.actionBtnText}>{r.actionLabel}</Text>
                  <Feather name="arrow-right" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Dismiss CTA */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>I'll Do This Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  warningIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  reasonsList: {
    gap: 12,
    marginBottom: 20,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  reasonLeft: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  reasonDesc: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
})
