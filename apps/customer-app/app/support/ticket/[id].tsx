/**
 * Customer App — Support Ticket Conversation Thread & Chat Screen
 * Route: /support/ticket/[id]
 * Feature 25: Live message thread with support agents, resolution status, and supervisor escalation.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'

import { supportApi } from '../../../src/api/client'
import { useTheme } from '../../../src/contexts/ThemeContext'
import {
  AppText,
  AppBadge,
} from '../../../src/components/ui'

export default function TicketDetailScreen() {
  const { theme, isDark } = useTheme()
  const params = useLocalSearchParams()
  const { id } = params
  const scrollViewRef = useRef<ScrollView>(null)

  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [escalating, setEscalating] = useState(false)

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true)
      const res = await supportApi.getTicketDetail(String(id))
      if (res.data?.data) {
        setTicket(res.data.data)
        setMessages(res.data.data.messages || [])
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadTicket()
  }, [loadTicket])

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const tempMsg = {
      id: String(Date.now()),
      sender_type: 'CUSTOMER',
      sender_name: 'You',
      message_text: inputText.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempMsg])
    const toSend = inputText.trim()
    setInputText('')
    setSending(true)

    try {
      await supportApi.sendMessage(String(id), { message_text: toSend })
    } catch {
      Alert.alert('Error', 'Failed to send message.')
    } finally {
      setSending(false)
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  const handleEscalate = async () => {
    Alert.alert(
      'Escalate Ticket',
      'Would you like to escalate this ticket to Urgent Priority for immediate senior supervisor review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate Now',
          style: 'destructive',
          onPress: async () => {
            try {
              setEscalating(true)
              await supportApi.escalateTicket(String(id))
              Alert.alert('Escalated', 'Ticket has been marked Urgent and reassigned to a supervisor.')
              loadTicket()
            } catch {
              Alert.alert('Error', 'Failed to escalate ticket.')
            } finally {
              setEscalating(false)
            }
          },
        },
      ]
    )
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText variant="title" bold style={{ fontSize: 17 }}>
              {ticket?.ticket_number || `Ticket #${String(id).slice(0, 6)}`}
            </AppText>
            {ticket?.priority === 'urgent' && (
              <View style={{ marginLeft: 6 }}>
                <AppBadge label="URGENT" variant="error" size="sm" />
              </View>
            )}
          </View>
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {ticket?.subject || 'Support Conversation'}
          </AppText>
        </View>

        {ticket?.status !== 'resolved' && (
          <TouchableOpacity style={styles.escalateBtn} onPress={handleEscalate} disabled={escalating}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
            <AppText variant="caption" style={{ color: '#DC2626' }} bold>
              Escalate
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Linked Reference Banner */}
      {ticket?.reference_id ? (
        <View style={[styles.linkedBar, { backgroundColor: isDark ? '#1E293B' : '#F0F9FF', borderBottomColor: theme.colors.border }]}>
          <Ionicons name="link-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <AppText variant="caption" style={{ color: theme.colors.primary }} semibold>
            Associated with {ticket.reference_type} #{ticket.reference_id.slice(0, 10)}
          </AppText>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollArea}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          >
            {messages.map((m, idx) => {
              const isCustomer = m.sender_type === 'CUSTOMER'
              const isSystem = m.sender_type === 'SYSTEM'

              if (isSystem) {
                return (
                  <View key={idx} style={styles.systemNotice}>
                    <Ionicons name="shield-checkmark" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                    <AppText variant="caption" style={{ color: isDark ? '#94A3B8' : '#0369A1', fontSize: 11, textAlign: 'center' }}>
                      {m.message_text}
                    </AppText>
                  </View>
                )
              }

              return (
                <View
                  key={idx}
                  style={[
                    styles.msgWrapper,
                    { alignItems: isCustomer ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <AppText variant="caption" color="secondary" style={{ fontSize: 11, marginBottom: 2 }}>
                    {isCustomer ? 'You' : m.sender_name || 'Support Agent'}
                  </AppText>

                  <View
                    style={[
                      styles.msgBubble,
                      {
                        backgroundColor: isCustomer ? theme.colors.primary : theme.colors.surface,
                        borderColor: isCustomer ? theme.colors.primary : theme.colors.border,
                        borderTopRightRadius: isCustomer ? 2 : 16,
                        borderTopLeftRadius: isCustomer ? 16 : 2,
                      },
                    ]}
                  >
                    <AppText
                      variant="body"
                      style={{
                        color: isCustomer ? '#FFF' : theme.colors.textPrimary,
                        lineHeight: 20,
                        fontSize: 14,
                      }}
                    >
                      {m.message_text}
                    </AppText>

                    <AppText
                      variant="caption"
                      style={{
                        color: isCustomer ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                        fontSize: 10,
                        alignSelf: 'flex-end',
                        marginTop: 4,
                      }}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </AppText>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[styles.chatInput, { color: theme.colors.textPrimary, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: theme.colors.border }]}
            placeholder="Type your reply..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.colors.primary : '#94A3B8' }]}
            disabled={!inputText.trim() || sending}
            onPress={handleSendMessage}
          >
            <Feather name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 10, padding: 4 },
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  linkedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollArea: { flex: 1 },
  systemNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  msgWrapper: {
    marginVertical: 6,
    maxWidth: '82%',
  },
  msgBubble: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
})
