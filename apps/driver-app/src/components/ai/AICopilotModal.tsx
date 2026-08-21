/**
 * Driver AI Copilot Chat Modal — OpenRouter API Powered
 * Real-time operational analysis, earnings optimization advice, and strict data isolation.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme'
import { AISmartDriverService } from '../../services/aiSmartDriverService'

interface AICopilotModalProps {
  visible: boolean
  onClose: () => void
  driverStats?: {
    name?: string
    rating?: number
    trips_today?: number
    earnings_today?: number
    city?: string
  }
}

interface ChatMessage {
  id: string
  sender: 'ai' | 'user'
  text: string
  timestamp: string
}

const QUICK_PROMPTS = [
  'Where should I drive right now for maximum earnings?',
  'What are the evening peak surge hours today?',
  'How can I maintain my 5-star customer rating?',
  'How many more rides to hit today’s bonus target?',
]

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  visible,
  onClose,
  driverStats,
}) => {
  const { theme, isDark } = useTheme()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${driverStats?.name || 'Partner'}! 👋 I am your CabBooking Driver AI Copilot. I can analyze your live driving stats, surge hotspots, and help you maximize today's earnings while keeping your data 100% private. How can I assist you?`,
      timestamp: 'Just now',
    },
  ])
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    }

    setMessages((prev) => [...prev, userMsg])
    setInputQuery('')
    setLoading(true)

    try {
      const reply = await AISmartDriverService.askDriverAICopilot(text, {
        driver_name: driverStats?.name,
        rating: driverStats?.rating,
        trips_today: driverStats?.trips_today,
        earnings_today: driverStats?.earnings_today,
        home_city: driverStats?.city || 'Pune',
      })

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: 'Just now',
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Unable to connect to AI engine right now. Please check your network and try again.',
        timestamp: 'Just now',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#0B0E1F' : '#FFFFFF' }]}>
          {/* Header */}
          <LinearGradient
            colors={['#1E1B4B', '#312E81']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.robotBadge}>
                <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Driver AI Copilot</Text>
                <Text style={styles.headerSubtitle}>Powered by OpenRouter • Privacy Guard Active</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Privacy Guarantee Pill */}
          <View style={[styles.privacyPill, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }]}>
            <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
            <Text style={styles.privacyText}>
              End-to-end data isolation: Only your personal operational records are analyzed.
            </Text>
          </View>

          {/* Chat Messages */}
          <ScrollView
            style={styles.messagesList}
            contentContainerStyle={{ padding: 14, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.msgBubble,
                  msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
                  {
                    backgroundColor:
                      msg.sender === 'user'
                        ? '#3B82F6'
                        : isDark
                        ? '#1E293B'
                        : '#F1F5F9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.msgText,
                    {
                      color:
                        msg.sender === 'user'
                          ? '#FFFFFF'
                          : isDark
                          ? '#F1F5F9'
                          : '#0F172A',
                    },
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            ))}

            {loading && (
              <View style={[styles.msgBubble, styles.aiBubble, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            )}
          </ScrollView>

          {/* Quick Prompts */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickPromptsRow}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          >
            {QUICK_PROMPTS.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickPromptBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                onPress={() => handleSend(prompt)}
              >
                <Text style={[styles.quickPromptText, { color: isDark ? '#A5B4FC' : '#4338CA' }]} numberOfLines={1}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input Bar */}
          <View style={[styles.inputBar, { backgroundColor: isDark ? '#131B2E' : '#FFFFFF', borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <TextInput
              style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#0F172A', backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              placeholder="Ask your AI Copilot anything..."
              placeholderTextColor="#94A3B8"
              value={inputQuery}
              onChangeText={setInputQuery}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputQuery.trim() || loading) && { opacity: 0.6 }]}
              onPress={() => handleSend()}
              disabled={!inputQuery.trim() || loading}
            >
              <Feather name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContainer: { height: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  robotBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  privacyPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, marginHorizontal: 12, marginTop: 8, borderRadius: 10 },
  privacyText: { color: '#10B981', fontSize: 11, fontWeight: '600', flex: 1 },
  messagesList: { flex: 1 },
  msgBubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 13, lineHeight: 19 },
  quickPromptsRow: { maxHeight: 44, paddingVertical: 4 },
  quickPromptBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  quickPromptText: { fontSize: 12, fontWeight: '700' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
})
