/**
 * Customer App — Unified Help & Support Center Hub
 * Route: /support
 * Feature 25: FAQ Search, AI Assistant, Popular Issues, Service-Linked Tickets, and Direct Support.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'

import { supportApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText,
  AppCard,
  AppBadge,
  AppDivider,
} from '../../src/components/ui'

const POPULAR_ISSUES = [
  { id: '1', title: 'Payment & Wallet Issue', icon: 'credit-card', color: '#16A34A', category: 'PAYMENT' },
  { id: '2', title: 'Driver or Vehicle Feedback', icon: 'user-x', color: '#0284C7', category: 'RIDE' },
  { id: '3', title: 'Lost Item in Cab', icon: 'briefcase', color: '#D97706', category: 'SAFETY' },
  { id: '4', title: 'Cancellation & Refund', icon: 'rotate-ccw', color: '#DC2626', category: 'PAYMENT' },
  { id: '5', title: 'Parcel Delivery Problem', icon: 'package', color: '#7C3AED', category: 'PARCEL' },
  { id: '6', title: 'Hotel / Room Issue', icon: 'home', color: '#EA580C', category: 'HOTEL' },
]

export default function HelpSupportHubScreen() {
  const { theme, isDark } = useTheme()

  const [faqs, setFaqs] = useState<any[]>([])
  const [ticketCount, setTicketCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [faqRes, ticketRes] = await Promise.all([
        supportApi.getFAQs({ query: searchQuery || undefined }),
        supportApi.getTickets(),
      ])
      if (faqRes.data?.data) {
        setFaqs(faqRes.data.data)
      }
      if (ticketRes.data?.data) {
        setTicketCount(ticketRes.data.data.length)
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const handleCallSupport = () => {
    Linking.openURL('tel:18001234567')
  }

  const handleVoteFaq = async (faqId: string, helpful: boolean) => {
    try {
      await supportApi.voteFAQ(faqId, helpful)
      Alert.alert('Feedback Recorded', 'Thank you for helping us improve our support!')
    } catch {
      // Ignored
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
          <AppText variant="title" bold style={{ fontSize: 20 }}>
            Help & Support
          </AppText>
          <AppText variant="caption" color="secondary">
            24x7 Customer Care & Instant Assistance
          </AppText>
        </View>

        {ticketCount > 0 && (
          <TouchableOpacity
            style={[styles.myTicketsBadgeBtn, { backgroundColor: theme.colors.primary + '15' }]}
            onPress={() => router.push('/support/tickets' as any)}
          >
            <Feather name="inbox" size={16} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <AppText variant="caption" style={{ color: theme.colors.primary }} bold>
              My Tickets ({ticketCount})
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search FAQs, issues, policies..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* AI Support Assistant Hero Card */}
        <TouchableOpacity
          style={[styles.aiHeroCard, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: theme.colors.primary }]}
          onPress={() => router.push('/support/ai' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.aiIconBox, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="sparkles" size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="body" bold style={{ fontSize: 16 }}>
                Ask AI Assistant
              </AppText>
              <View style={{ marginLeft: 8 }}>
                <AppBadge label="Instant Answers" variant="info" size="sm" />
              </View>
            </View>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              Get instant help with fares, cancellations, refunds & policies.
            </AppText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Popular Help Topics */}
        <AppText variant="h3" style={{ marginTop: 20, marginBottom: 12 }}>
          Popular Topics
        </AppText>
        <View style={styles.topicsGrid}>
          {POPULAR_ISSUES.map((issue) => (
            <TouchableOpacity
              key={issue.id}
              style={[styles.topicCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push(`/support/new-ticket?category=${issue.category}&subject=${encodeURIComponent(issue.title)}` as any)}
            >
              <View style={[styles.topicIconBox, { backgroundColor: issue.color + '15' }]}>
                <Feather name={issue.icon as any} size={18} color={issue.color} />
              </View>
              <AppText variant="caption" style={{ marginTop: 8, textAlign: 'center' }} bold numberOfLines={2}>
                {issue.title}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Frequently Asked Questions */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }}>
          <AppText variant="h3">
            Frequently Asked Questions
          </AppText>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : faqs.length === 0 ? (
          <AppText color="secondary" style={{ textAlign: 'center', marginVertical: 16 }}>
            No FAQs matching your search.
          </AppText>
        ) : (
          faqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id
            return (
              <AppCard key={faq.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                  activeOpacity={0.7}
                >
                  <AppText variant="body" bold style={{ flex: 1, marginRight: 8 }}>
                    {faq.title}
                  </AppText>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ marginBottom: 10 }}>
                      <AppDivider />
                    </View>
                    <AppText variant="body" color="secondary" style={{ lineHeight: 22, fontSize: 14 }}>
                      {faq.content}
                    </AppText>

                    <View style={styles.faqHelpfulRow}>
                      <AppText variant="caption" color="secondary">
                        Was this helpful?
                      </AppText>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={styles.voteBtn} onPress={() => handleVoteFaq(faq.id, true)}>
                          <Feather name="thumbs-up" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                          <AppText variant="caption" style={{ color: '#16A34A' }} bold>
                            Yes
                          </AppText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.voteBtn} onPress={() => handleVoteFaq(faq.id, false)}>
                          <Feather name="thumbs-down" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                          <AppText variant="caption" style={{ color: '#DC2626' }} bold>
                            No
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </AppCard>
            )
          })
        )}

        {/* Contact Support Direct Actions */}
        <AppText variant="h3" style={{ marginTop: 24, marginBottom: 12 }}>
          Need Further Assistance?
        </AppText>

        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={[styles.contactActionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.push('/support/new-ticket' as any)}
          >
            <View style={[styles.contactIconBox, { backgroundColor: '#0284C715' }]}>
              <Feather name="file-text" size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="body" bold>
                Open a Support Ticket
              </AppText>
              <AppText variant="caption" color="secondary">
                Submit details and track resolution with our dedicated agents.
              </AppText>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactActionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleCallSupport}
          >
            <View style={[styles.contactIconBox, { backgroundColor: '#16A34A15' }]}>
              <Feather name="phone-call" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="body" bold>
                Call Helpline (Toll-Free)
              </AppText>
              <AppText variant="caption" color="secondary">
                Speak directly with customer support: 1800-123-4567
              </AppText>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  myTicketsBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scrollArea: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14 },
  aiHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  aiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topicCard: {
    width: '31%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqHelpfulRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 8,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  contactActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  contactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
