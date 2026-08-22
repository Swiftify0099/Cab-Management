import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import {
  VehicleType,
  VEHICLE_REQUIREMENT_CONFIG,
} from '../../services/vehicleService'

interface Props {
  selectedType: VehicleType
  onSelect: (type: VehicleType) => void
}

const TYPES: VehicleType[] = [
  'sedan',
  'hatchback',
  'suv',
  'tempo_traveller',
  'mini_bus',
  'bike',
]

export function VehicleTypeSelector({ selectedType, onSelect }: Props) {
  const { theme, isDark } = useTheme()

  return (
    <View style={styles.grid}>
      {TYPES.map(type => {
        const config = VEHICLE_REQUIREMENT_CONFIG[type]
        const isSelected = selectedType === type

        return (
          <TouchableOpacity
            key={type}
            activeOpacity={0.8}
            onPress={() => onSelect(type)}
            style={[
              styles.optionCard,
              {
                backgroundColor: isSelected
                  ? isDark
                    ? 'rgba(14, 165, 233, 0.15)'
                    : 'rgba(14, 165, 233, 0.08)'
                  : isDark
                  ? '#1E293B'
                  : '#FFFFFF',
                borderColor: isSelected
                  ? '#0EA5E9'
                  : isDark
                  ? '#334155'
                  : '#E2E8F0',
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
          >
            {/* Top Row: Icon + Seat Tag */}
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isSelected
                      ? '#0EA5E9'
                      : isDark
                      ? '#0F172A'
                      : '#F1F5F9',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={config.icon as any}
                  size={24}
                  color={isSelected ? '#FFFFFF' : theme.colors.text}
                />
              </View>

              <View
                style={[
                  styles.seatBadge,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                  },
                ]}
              >
                <Text style={[styles.seatText, { color: theme.colors.textSecondary }]}>
                  {config.seats} {config.seats === 1 ? 'Seat' : 'Seats'}
                </Text>
              </View>
            </View>

            {/* Label */}
            <Text
              style={[
                styles.title,
                {
                  color: isSelected ? '#0EA5E9' : theme.colors.text,
                  fontWeight: isSelected ? '700' : '600',
                },
              ]}
            >
              {config.label}
            </Text>

            {/* Inspection Tag */}
            <Text
              style={[
                styles.inspectTag,
                {
                  color: config.requires_inspection ? '#8B5CF6' : '#10B981',
                },
              ]}
            >
              {config.requires_inspection ? '• Inspection Needed' : '• Fast Verification'}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seatText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  inspectTag: {
    fontSize: 10,
    fontWeight: '700',
  },
})
