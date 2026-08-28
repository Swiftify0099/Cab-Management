/**
 * Global Error Boundary
 * ─────────────────────────────────────────────────────────────
 * Catches all React render errors and displays a recovery UI
 * instead of allowing the app to crash silently on Android.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null, errorInfo: null, showDetails: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ errorInfo: info })
    console.error('[ErrorBoundary] App crash caught:', error.message)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false })
  }

  handleClearCacheAndReset = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@driver_availability_state_v1',
        '@driver_bg_tracking_active',
        '@driver_battery_opt_configured_v2',
      ])
    } catch {}
    this.handleReset()
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app encountered an unexpected error. Please try again.
          </Text>

          {/* Collapsible Error Inspector */}
          {this.state.error && (
            <View style={{ width: '100%', marginBottom: 20 }}>
              <TouchableOpacity
                style={styles.toggleDetailsBtn}
                onPress={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
              >
                <Text style={styles.toggleDetailsText}>
                  {this.state.showDetails ? '▲ Hide Error Details' : '▼ View Error Diagnostics'}
                </Text>
              </TouchableOpacity>

              {this.state.showDetails && (
                <ScrollView style={styles.errorBox} showsVerticalScrollIndicator={false}>
                  <Text style={styles.errorText}>
                    {this.state.error.name}: {this.state.error.message}
                  </Text>
                  {this.state.errorInfo?.componentStack && (
                    <Text style={styles.stackText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
              <Text style={styles.btnText}>↺ Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={this.handleClearCacheAndReset}>
              <Text style={styles.btnSecondaryText}>🧹 Clear Cache & Restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  icon: { fontSize: 36 },
  title: {
    color: '#F1F5F9',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  toggleDetailsBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    marginBottom: 8,
  },
  toggleDetailsText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    padding: 12,
    maxHeight: 200,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  stackText: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  btnRow: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
  },
  btn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btnSecondaryText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
})
