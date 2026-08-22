/**
 * Reroute Alert Banner Component — Feature 7
 * Displays subtle notification when automatic internal rerouting updates the route.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

interface Props {
  timeDiffMin?: number
  visible: boolean
}

export const RerouteAlertBanner: React.FC<Props> = ({ timeDiffMin = 0, visible }) => {
  if (!visible) return null

  return (
    <View style={styles.banner}>
      <Feather name="refresh-cw" size={14} color="#FFFFFF" />
      <Text style={styles.text}>
        Route updated • {timeDiffMin > 0 ? `+${timeDiffMin} min delay` : 'Faster route applied'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
})
