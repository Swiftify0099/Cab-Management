import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { SupportService } from '../../src/services/supportService';
import { SupportTicketDetail } from '../../src/types/support';
import { SupportDevSheet } from '../../src/components/support/SupportDevSheet';

export default function SupportChatScreen() {
  const { theme, isDark } = useTheme();
  const params = useLocalSearchParams<{ ticket_id: string }>();
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDevSheet, setShowDevSheet] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadTicket = useCallback(async () => {
    if (!params.ticket_id) return;
    try {
      setLoading(true);
      const res = await SupportService.getTicketDetails(params.ticket_id);
      setTicket(res);
    } finally {
      setLoading(false);
    }
  }, [params.ticket_id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleSend = async () => {
    if (!inputText.trim() || !ticket) return;
    const txt = inputText.trim();
    setInputText('');

    try {
      setSending(true);
      const success = await SupportService.sendMessage(ticket.id, txt);
      if (success) {
        await loadTicket();
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
      } else {
        Alert.alert('Send Failed', 'Could not transmit message to support server.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleReopen = async () => {
    Alert.prompt
      ? Alert.prompt(
          'Reopen Ticket',
          'Please state what further assistance is needed:',
          async (reason) => {
            if (reason && ticket) {
              await SupportService.reopenTicket(ticket.id, reason);
              await loadTicket();
            }
          }
        )
      : Alert.alert(
          'Reopen Ticket',
          'Are you sure you want to reopen this support request?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reopen',
              onPress: async () => {
                if (ticket) {
                  await SupportService.reopenTicket(ticket.id, 'Issue unresolved after initial review');
                  await loadTicket();
                }
              },
            },
          ]
        );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {ticket ? ticket.subject : 'Support Chat'}
          </Text>
          {ticket && (
            <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>
              Ticket #{ticket.id.slice(0, 8)} • Status: {ticket.status}
            </Text>
          )}
        </View>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.devIconBtn}
            onPress={() => setShowDevSheet(true)}
          >
            <MaterialCommunityIcons name="robot-outline" size={20} color="#F59E0B" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : !ticket ? (
          <View style={styles.emptyWrap}>
            <Text style={{ color: theme.colors.textSecondary }}>Ticket not found.</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {/* Ticket Metadata Card */}
            <View
              style={[
                styles.ticketInfoCard,
                {
                  backgroundColor: isDark ? '#131B2E' : '#F1F5F9',
                  borderColor: isDark ? '#1E293B' : '#E2E8F0',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[styles.infoCat, { color: '#6366F1' }]}>{ticket.category} • {ticket.subcategory}</Text>
                <Text style={[styles.infoStatus, { color: ticket.status === 'RESOLVED' ? '#10B981' : '#3B82F6' }]}>
                  {ticket.status}
                </Text>
              </View>
              <Text style={[styles.infoDesc, { color: theme.colors.text }]}>{ticket.description}</Text>
            </View>

            {/* Resolved Banner & Reopen CTA */}
            {ticket.status === 'RESOLVED' && (
              <View
                style={[
                  styles.resolvedBanner,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                    borderColor: '#10B981',
                  },
                ]}
              >
                <Feather name="check-circle" size={16} color="#10B981" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resolvedText, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                    This ticket has been marked as Resolved.
                  </Text>
                </View>
                <TouchableOpacity style={styles.reopenBtn} onPress={handleReopen}>
                  <Text style={styles.reopenBtnText}>Reopen</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Message Thread */}
            {ticket.messages.map((m) => {
              const isDriver = m.is_driver;
              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageRow,
                    isDriver ? styles.messageRowDriver : styles.messageRowAgent,
                  ]}
                >
                  {!isDriver && (
                    <View style={styles.agentAvatar}>
                      <Feather
                        name={m.sender_type === 'SYSTEM' ? 'cpu' : 'headphones'}
                        size={14}
                        color="#FFFFFF"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.bubble,
                      isDriver
                        ? [styles.bubbleDriver, { backgroundColor: '#4338CA' }]
                        : [
                            styles.bubbleAgent,
                            {
                              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: isDark ? '#334155' : '#E2E8F0',
                            },
                          ],
                    ]}
                  >
                    {!isDriver && (
                      <Text style={[styles.senderName, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>
                        {m.sender_name}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.messageBody,
                        { color: isDriver ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {m.message_text}
                    </Text>
                    <Text
                      style={[
                        styles.timeText,
                        { color: isDriver ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary },
                      ]}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Chat Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <TextInput
            style={[
              styles.chatInput,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                color: theme.colors.text,
              },
            ]}
            placeholder="Type your message to support..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || sending) && { opacity: 0.5 },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="send" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Developer Mode Sandbox Simulator */}
      <SupportDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        activeTicketId={ticket?.id}
        onSimulated={loadTicket}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 15, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 1 },
  devIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatContainer: { flex: 1 },
  ticketInfoCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoCat: { fontSize: 11, fontWeight: '800' },
  infoStatus: { fontSize: 11, fontWeight: '800' },
  infoDesc: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  resolvedText: { fontSize: 12, fontWeight: '700' },
  reopenBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reopenBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowDriver: { justifyContent: 'flex-end' },
  messageRowAgent: { justifyContent: 'flex-start' },
  agentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  bubbleDriver: {
    borderBottomRightRadius: 2,
  },
  bubbleAgent: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  senderName: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  messageBody: { fontSize: 13, lineHeight: 18 },
  timeText: { fontSize: 9, alignSelf: 'flex-end', marginTop: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxHeight: 90,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
