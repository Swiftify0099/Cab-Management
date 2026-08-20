/**
 * PassengerChatModal — Feature 8: In-App Real-Time Chat Screen
 * Modern WhatsApp/Uber aesthetic with Quick Messages, Read Status & Call Integration.
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { CommunicationService } from '../../services/communicationService'
import { ChatMessage } from '../../types/communication'

interface PassengerChatModalProps {
  visible: boolean
  isDark: boolean
  rideId: string
  customerName?: string
  pickupAddress?: string
  onClose: () => void
  onOpenCall: () => void
}

const QUICK_MESSAGES = [
  'I have arrived at the pickup location.',
  'I am waiting at the main gate.',
  'Please come to the pickup point.',
  'Please check vehicle number & color.',
  'I cannot find you, please share landmark.',
  'Traffic on the way, arriving in 2 minutes.',
]

export function PassengerChatModal({
  visible,
  isDark,
  rideId,
  customerName = 'Rahul S.',
  pickupAddress = 'Koregaon Park North Main Rd, Pune',
  onClose,
  onOpenCall,
}: PassengerChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const flatListRef = useRef<FlatList | null>(null)

  // Load chat history & mark as read
  useEffect(() => {
    if (!visible) return

    let isMounted = true
    const loadChat = async () => {
      setLoading(true)
      try {
        const history = await CommunicationService.getMessages(rideId)
        if (isMounted) {
          if (history.length > 0) {
            setMessages(history)
          } else {
            // Default initial greeting if fresh
            setMessages([
              {
                id: 'sys-1',
                ride_id: rideId,
                sender_id: 'system',
                sender_type: 'system',
                content: 'Chat session started with your passenger.',
                message_type: 'system_message',
                created_at: new Date().toISOString(),
                is_delivered: true,
                is_read: true,
              },
            ])
          }
        }
        await CommunicationService.markMessagesRead(rideId)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadChat()

    return () => {
      isMounted = false
    }
  }, [visible, rideId])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || sending) return

    const isQuick = !!textToSend
    setInputText('')
    setSending(true)

    // Optimistic local update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      ride_id: rideId,
      sender_id: 'driver-self',
      sender_type: 'driver',
      content: text,
      message_type: isQuick ? 'quick_message' : 'text',
      created_at: new Date().toISOString(),
      is_delivered: true,
      is_read: false,
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const saved = await CommunicationService.sendMessage(
        rideId,
        text,
        isQuick ? 'quick_message' : 'text'
      )
      setMessages(prev => prev.map(m => (m.id === tempMsg.id ? saved : m)))
    } catch {
      // Keep optimistic message
    } finally {
      setSending(false)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const bgCard = isDark ? '#0F172A' : '#FFFFFF'
  const bgScreen = isDark ? '#020617' : '#F8FAFC'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const passengerBubbleBg = isDark ? '#1E293B' : '#E2E8F0'

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeRoot, { backgroundColor: bgScreen }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: bgCard, borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color={textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={[styles.headerName, { color: textPrimary }]}>{customerName}</Text>
              <Text style={[styles.headerPickup, { color: textSecondary }]} numberOfLines={1}>
                📍 {pickupAddress}
              </Text>
            </View>

            <TouchableOpacity style={styles.headerCallBtn} onPress={onOpenCall}>
              <Feather name="phone" size={18} color="#16A34A" />
              <Text style={styles.headerCallText}>Call</Text>
            </TouchableOpacity>
          </View>

          {/* Chat Messages */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0284C7" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                if (item.sender_type === 'system') {
                  return (
                    <View style={styles.systemBubble}>
                      <Text style={styles.systemText}>{item.content}</Text>
                    </View>
                  )
                }

                const isDriver = item.sender_type === 'driver'

                return (
                  <View style={[styles.messageRow, isDriver ? styles.messageRowRight : styles.messageRowLeft]}>
                    <View
                      style={[
                        styles.bubble,
                        isDriver
                          ? styles.driverBubble
                          : [styles.passengerBubble, { backgroundColor: passengerBubbleBg }],
                      ]}
                    >
                      <Text style={[styles.bubbleText, isDriver ? styles.driverText : { color: textPrimary }]}>
                        {item.content}
                      </Text>
                      <View style={styles.bubbleMeta}>
                        <Text style={[styles.timeText, isDriver ? styles.driverTime : { color: textSecondary }]}>
                          {formatTime(item.created_at)}
                        </Text>
                        {isDriver && (
                          <MaterialCommunityIcons
                            name={item.is_read ? 'check-all' : 'check'}
                            size={14}
                            color={item.is_read ? '#67E8F9' : '#CBD5E1'}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                )
              }}
            />
          )}

          {/* Quick Messages Carousel */}
          <View style={[styles.quickBar, { backgroundColor: bgCard }]}>
            <Text style={[styles.quickLabel, { color: textSecondary }]}>QUICK MESSAGES:</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={QUICK_MESSAGES}
              keyExtractor={(item, i) => `qm-${i}`}
              contentContainerStyle={styles.quickList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.quickChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                  onPress={() => handleSend(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.quickChipText, { color: textPrimary }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Bottom Text Input Bar */}
          <View style={[styles.inputBar, { backgroundColor: bgCard, borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  color: textPrimary,
                },
              ]}
              placeholder="Type a message to passenger..."
              placeholderTextColor={textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerPickup: {
    fontSize: 12,
    marginTop: 2,
  },
  headerCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerCallText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  driverBubble: {
    backgroundColor: '#0284C7',
    borderBottomRightRadius: 4,
  },
  passengerBubble: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  driverText: {
    color: '#FFFFFF',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
  },
  driverTime: {
    color: '#E0F2FE',
  },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginVertical: 4,
  },
  systemText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  quickBar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  quickList: {
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
})
