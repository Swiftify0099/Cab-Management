/**
 * AppModal — Themed bottom sheet modal with Reanimated slide-up.
 * Replaces all Modal + overlay patterns.
 *
 * Usage:
 *   <AppModal visible={show} onClose={() => setShow(false)} title="Cancel Booking">
 *     <View>...</View>
 *   </AppModal>
 */
import React, { memo, useEffect } from 'react'
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Pressable,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../contexts/ThemeContext'
import { Radius } from '../../theme/radius'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

interface AppModalProps {
  visible:   boolean
  onClose:   () => void
  title?:    string
  subtitle?: string
  children:  React.ReactNode
}

export const AppModal = memo(function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: AppModalProps) {
  const { theme } = useTheme()
  const translateY = useSharedValue(500)
  const overlayOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 250 })
      translateY.value     = withSpring(0, { damping: 25, stiffness: 200 })
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 })
      translateY.value     = withTiming(500, { duration: 200 })
    }
  }, [visible, overlayOpacity, translateY])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.isDark ? '#1E293B' : theme.colors.white,
            },
            sheetStyle,
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.colors.divider }]} />

          {/* Header */}
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {children}
        </Animated.View>
      </View>
    </Modal>
  )
})

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius:  Radius.xxxl,
    borderTopRightRadius: Radius.xxxl,
    padding:              Spacing.xxl,
    paddingTop:           Spacing.md,
    minHeight:            200,
  },
  handle: {
    width:        44,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    marginBottom:   Spacing.lg,
  },
  headerText:   { flex: 1 },
  title: {
    fontSize:   Typography.size.h4,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    fontSize:   Typography.size.caption,
    marginTop:  2,
  },
  closeBtn: {
    padding: 4,
    marginLeft: Spacing.md,
  },
})
