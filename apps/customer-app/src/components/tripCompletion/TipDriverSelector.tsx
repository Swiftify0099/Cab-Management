/**
 * Feature 10: Tip Driver Component
 * Quick preset tip selection (₹20, ₹50, ₹100) or custom amount.
 * Direct credit to driver wallet/ledger with 100% payout guarantee.
 */
import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppBadge } from '../ui'

const PRESET_TIPS = [20, 50, 100]

interface TipDriverSelectorProps {
  driverName?: string
  selectedTip: number
  onSelectTip: (amount: number) => void
}

export function TipDriverSelector({
  driverName = 'Driver Partner',
  selectedTip,
  onSelectTip,
}: TipDriverSelectorProps) {
  const { theme, isDark } = useTheme()
  const [customInputVisible, setCustomInputVisible] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const handleCustomSubmit = () => {
    const parsed = parseFloat(customValue)
    if (!isNaN(parsed) && parsed > 0) {
      onSelectTip(parsed)
      setCustomInputVisible(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.colors.card : '#FFFFFF' }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="hand-coin" size={22} color="#F59E0B" />
          <AppText variant="h3" style={styles.headerTitle}>Tip {driverName}</AppText>
        </View>
        <AppBadge label="100% TO DRIVER" variant="warning" size="sm" />
      </View>

      <AppText variant="caption" color="secondary" style={styles.subText}>
        Show appreciation with a tip. 100% of this amount goes directly to your driver.
      </AppText>

      {/* Preset Tip Buttons */}
      <View style={styles.presetsRow}>
        {PRESET_TIPS.map((amt) => {
          const isSelected = selectedTip === amt
          return (
            <TouchableOpacity
              key={amt}
              style={[
                styles.tipBtn,
                {
                  backgroundColor: isSelected
                    ? '#F59E0B'
                    : isDark ? theme.colors.surface : '#F8FAFC',
                  borderColor: isSelected ? '#D97706' : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
              onPress={() => {
                setCustomInputVisible(false)
                onSelectTip(isSelected ? 0 : amt)
              }}
              activeOpacity={0.7}
            >
              <AppText
                style={[
                  styles.tipBtnText,
                  { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary },
                ]}
              >
                +₹{amt}
              </AppText>
            </TouchableOpacity>
          )
        })}

        {/* Custom Tip Button */}
        <TouchableOpacity
          style={[
            styles.tipBtn,
            {
              backgroundColor: customInputVisible || (selectedTip > 0 && !PRESET_TIPS.includes(selectedTip))
                ? '#F59E0B'
                : isDark ? theme.colors.surface : '#F8FAFC',
              borderColor: customInputVisible ? '#D97706' : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            },
          ]}
          onPress={() => setCustomInputVisible(!customInputVisible)}
          activeOpacity={0.7}
        >
          <AppText
            style={[
              styles.tipBtnText,
              {
                color: customInputVisible || (selectedTip > 0 && !PRESET_TIPS.includes(selectedTip))
                  ? '#FFFFFF'
                  : theme.colors.textPrimary,
              },
            ]}
          >
            {selectedTip > 0 && !PRESET_TIPS.includes(selectedTip) ? `₹${selectedTip}` : 'Custom'}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Custom Tip Input */}
      {customInputVisible && (
        <View style={styles.customRow}>
          <TextInput
            style={[
              styles.customInput,
              {
                backgroundColor: isDark ? theme.colors.surface : '#F8FAFC',
                color: theme.colors.textPrimary,
                borderColor: '#F59E0B',
              },
            ]}
            placeholder="Enter tip (e.g. ₹75)"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            value={customValue}
            onChangeText={setCustomValue}
          />
          <TouchableOpacity style={styles.customApplyBtn} onPress={handleCustomSubmit}>
            <AppText style={styles.customApplyText}>Apply</AppText>
          </TouchableOpacity>
        </View>
      )}

      {selectedTip > 0 && (
        <View style={styles.tipAppliedRow}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <AppText variant="caption" style={{ color: '#10B981', fontWeight: '700', marginLeft: 4 }}>
            ₹{selectedTip} tip will be added to the final receipt
          </AppText>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 18,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
  },
  subText: {
    marginBottom: 14,
    lineHeight: 16,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
  },
  tipBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  customInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  customApplyBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customApplyText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tipAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
})
