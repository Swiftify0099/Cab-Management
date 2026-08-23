/**
 * Customer App — My Support Tickets Screen
 * Route: /support/tickets
 * Feature 25: Track status of all opened tickets, unread agent replies, and view conversations.
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'

import { supportApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText,
  AppCard,
  AppBadge,
  AppButton,
} from '../../src/components/ui'

export default function MyTicketsScreen() {
  const { theme, isDark } = useTheme()

  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true)
      const res = await supportApi.getTickets(statusFilter === 'ALL' ? undefined : statusFilter)
      if (res.data?.data) {
        setTickets(res.data.data)
      }
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter])

  useFocusEffect(
    useCallback(() => {
      loadTickets()
    }, [loadTickets])
  )

  const getStatusBadge = (st: string) => {
    switch (st?.toLowerCase()) {
      case 'open':
        return <AppBadge label="Open" variant="info" size="sm" />
      case 'in_progress':
        return <AppBadge label="In Progress" variant="warning" size="sm" />
      case 'resolved':
        return <AppBadge label="Resolved" variant="success" size="sm" />
      case 'closed':
        return <AppBadge label="Closed" variant="default" size="sm" />
      default:
        return <AppBadge label={st || 'Active'} variant="info" size="sm" />
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="title" bold style={{ fontSize: 18 }}>
            My Support Tickets
          </AppText>
          <AppText variant="caption" color="secondary">
            Track support investigations & agent messages
          </AppText>
        </View>

        <TouchableOpacity
          style={[styles.newTicketBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/support/new-ticket' as any)}
        >
          <Feather name="plus" size={16} color="#FFF" style={{ marginRight: 4 }} />
          <AppText variant="caption" style={{ color: '#FFF' }} bold>
            New
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => {
          const isSelected = statusFilter === st
          return (
            <TouchableOpacity
              key={st}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setStatusFilter(st)}
            >
              <AppText
                variant="caption"
                style={{
                  color: isSelected ? '#FFF' : theme.colors.textPrimary,
                }}
                bold={isSelected}
              >
                {st.replace('_', ' ')}
              </AppText>
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText style={{ marginTop: 12 }} color="secondary">
            Loading tickets...
          </AppText>
        </View>
      ) : tickets.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTickets(); }} />}
        >
          <Feather name="inbox" size={48} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
          <AppText variant="h3">
            No tickets found
          </AppText>
          <AppText variant="caption" color="secondary" style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
            You have no active support requests in this category.
          </AppText>
          <View style={{ marginTop: 16 }}>
            <AppButton onPress={() => router.push('/support/new-ticket' as any)}>
              Open New Ticket
            </AppButton>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTickets(); }} />}
        >
          {tickets.map((t) => (
            <AppCard
              key={t.id}
              style={styles.ticketCard}
              onPress={() => router.push(`/support/ticket/${t.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText variant="caption" style={{ color: theme.colors.primary }} bold>
                    {t.ticket_number}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={{ marginLeft: 8 }}>
                    • {t.category}
                  </AppText>
                </View>
                {getStatusBadge(t.status)}
              </View>

              <AppText variant="body" bold style={{ fontSize: 15, marginTop: 6 }}>
                {t.subject}
              </AppText>
              <AppText variant="caption" color="secondary" numberOfLines={2} style={{ marginTop: 3 }}>
                {t.description}
              </AppText>

              <View style={styles.cardFooter}>
                <AppText variant="caption" style={{ color: '#94A3B8', fontSize: 11 }}>
                  Updated: {new Date(t.last_message_at).toLocaleDateString()}
                </AppText>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText variant="caption" style={{ color: theme.colors.primary, marginRight: 4 }} bold>
                    View Thread
                  </AppText>
                  <Feather name="chevron-right" size={14} color={theme.colors.primary} />
                </View>
              </View>
            </AppCard>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 14, padding: 4 },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 10,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scrollArea: { flex: 1 },
  ticketCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
})
