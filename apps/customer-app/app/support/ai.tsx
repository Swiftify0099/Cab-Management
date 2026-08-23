/**
 * Customer App — AI Support Assistant Screen
 * Route: /support/ai
 * Feature 25: Context-Bounded AI Assistant with Quick Questions, Policy Explanations & Ticket Handoff.
 */
import React, { useState, useRef } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'

import { supportApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText,
} from '../../src/components/ui'

interface ChatMessage {
  id: string
  sender: 'AI' | 'USER'
  text: string
  suggested_actions?: Array<{ label: string; action: string }>
  timestamp: string
}

const QUICK_QUESTIONS = [
  'How does wallet refund work?',
  'Why was I charged an extra fee on my rental?',
  'What is the cancellation policy?',
  'How do I report a forgotten item?',
]

export default function AIAssistantScreen() {
  const { theme, isDark } = useTheme()
  const params = useLocalSearchParams()
  const scrollViewRef = useRef<ScrollView>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'AI',
      text: 'Hello! I am your CabManagement AI Assistant. I can help explain fares, refunds, cancellations, and service guidelines. How may I assist you today?',
      suggested_actions: [
        { label: 'Refund Status', action: 'REFUND' },
        { label: 'Lost Item', action: 'LOST_ITEM' },
        { label: 'Raise a Ticket', action: 'CREATE_TICKET' },
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText
    if (!query.trim()) return

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'USER',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setLoading(true)

    try {
      const res = await supportApi.chatAI({
        message: query.trim(),
        reference_type: params.ref_type as string,
        reference_id: params.ref_id as string,
      })

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'AI',
        text: res.data?.data?.reply || 'I am here to help. Would you like to create a support ticket with our human team?',
        suggested_actions: res.data?.data?.suggested_actions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'AI',
          text: 'I apologize, I am temporarily having trouble connecting. You can open a support ticket or call our 24x7 support helpline anytime.',
          suggested_actions: [{ label: 'Create Ticket', action: 'CREATE_TICKET' }],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  const handleAction = (action: string) => {
    if (action === 'CREATE_TICKET') {
      router.push('/support/new-ticket' as any)
    } else if (action === 'VIEW_FAQ') {
      router.push('/support' as any)
    } else if (action === 'REFUND') {
      handleSendMessage('How long does a refund take to reflect in my wallet?')
    } else if (action === 'LOST_ITEM') {
      handleSendMessage('How do I contact driver for a lost item?')
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
        <View style={styles.aiHeaderIcon}>
          <Ionicons name="sparkles" size={18} color="#FFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText variant="title" bold style={{ fontSize: 17 }}>
            AI Support Assistant
          </AppText>
          <AppText variant="caption" style={{ color: '#16A34A' }} semibold>
            ● Always Online
          </AppText>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Messages Feed */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        >
          {/* AI Info Notice */}
          <View style={[styles.aiNotice, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="information-circle-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
            <AppText variant="caption" color="secondary" style={{ flex: 1, fontSize: 11 }}>
              AI Assistant provides policy guidance and answers questions. For financial adjustments or refunds, you can open a verified ticket anytime.
            </AppText>
          </View>

          {messages.map((msg) => {
            const isUser = msg.sender === 'USER'
            return (
              <View
                key={msg.id}
                style={[
                  styles.msgWrapper,
                  { alignItems: isUser ? 'flex-end' : 'flex-start' },
                ]}
              >
                <View
                  style={[
                    styles.msgBubble,
                    {
                      backgroundColor: isUser ? theme.colors.primary : theme.colors.surface,
                      borderColor: isUser ? theme.colors.primary : theme.colors.border,
                      borderTopRightRadius: isUser ? 2 : 16,
                      borderTopLeftRadius: isUser ? 16 : 2,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{
                      color: isUser ? '#FFF' : theme.colors.textPrimary,
                      lineHeight: 22,
                      fontSize: 14,
                    }}
                  >
                    {msg.text}
                  </AppText>

                  <AppText
                    variant="caption"
                    style={{
                      color: isUser ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                      fontSize: 10,
                      alignSelf: 'flex-end',
                      marginTop: 4,
                    }}
                  >
                    {msg.timestamp}
                  </AppText>
                </View>

                {/* Suggested Action Chips */}
                {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <View style={styles.actionChipsRow}>
                    {msg.suggested_actions.map((act, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}
                        onPress={() => handleAction(act.action)}
                      >
                        <AppText variant="caption" style={{ color: theme.colors.primary }} bold>
                          {act.label} →
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )
          })}

          {loading && (
            <View style={[styles.loadingBubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <AppText variant="caption" color="secondary" style={{ marginLeft: 8 }}>
                AI is thinking...
              </AppText>
            </View>
          )}
        </ScrollView>

        {/* Quick Questions Carousel */}
        <View style={{ maxHeight: 38, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {QUICK_QUESTIONS.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickQBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => handleSendMessage(q)}
              >
                <AppText variant="caption" color="secondary" semibold>
                  {q}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[styles.chatInput, { color: theme.colors.textPrimary, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: theme.colors.border }]}
            placeholder="Ask AI anything about your trip or policy..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.colors.primary : '#94A3B8' }]}
            disabled={!inputText.trim() || loading}
            onPress={() => handleSendMessage()}
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
  aiHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatScroll: { flex: 1 },
  aiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  msgWrapper: {
    marginVertical: 6,
    maxWidth: '84%',
  },
  msgBubble: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  quickQBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
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
