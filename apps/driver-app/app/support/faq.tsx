import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { SupportService } from '../../src/services/supportService';
import { FAQArticleItem } from '../../src/types/support';

export default function FAQScreen() {
  const { theme, isDark } = useTheme();
  const params = useLocalSearchParams<{ category?: string; category_name?: string; query?: string }>();
  const [articles, setArticles] = useState<FAQArticleItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<FAQArticleItem | null>(null);
  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [loading, setLoading] = useState(false);
  const [votedMap, setVotedMap] = useState<Record<string, 'helpful' | 'unhelpful'>>({});

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      const cat = params.category && params.category !== 'ALL' ? params.category : undefined;
      const res = await SupportService.getFAQs(cat, searchQuery);
      setArticles(res);
      if (res.length === 1 && !selectedArticle) {
        setSelectedArticle(res[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [params.category, searchQuery]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleVote = async (faqId: string, isHelpful: boolean) => {
    if (votedMap[faqId]) {
      Alert.alert('Feedback Recorded', 'You have already voted on this article.');
      return;
    }
    await SupportService.voteFAQ(faqId, isHelpful);
    setVotedMap((prev) => ({ ...prev, [faqId]: isHelpful ? 'helpful' : 'unhelpful' }));
    Alert.alert('Thank You', 'Your feedback helps us improve driver support articles.');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (selectedArticle && articles.length > 1) {
              setSelectedArticle(null);
            } else {
              router.back();
            }
          }}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {selectedArticle ? 'Help Article' : params.category_name || 'FAQ Knowledgebase'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        {!selectedArticle && (
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <Feather name="search" size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search in this category..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : selectedArticle ? (
          /* Single Article Reader View */
          <View style={styles.articleView}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{selectedArticle.category}</Text>
            </View>

            <Text style={[styles.articleTitle, { color: theme.colors.text }]}>
              {selectedArticle.title}
            </Text>

            <View
              style={[
                styles.articleContentCard,
                {
                  backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                  borderColor: isDark ? '#1E293B' : '#E2E8F0',
                },
              ]}
            >
              <Text style={[styles.articleBody, { color: theme.colors.text }]}>
                {selectedArticle.content_markdown}
              </Text>
            </View>

            {/* Helpful Feedback Section */}
            <View
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <Text style={[styles.feedbackTitle, { color: theme.colors.text }]}>
                Was this article helpful?
              </Text>

              <View style={styles.feedbackButtons}>
                <TouchableOpacity
                  style={[
                    styles.voteBtn,
                    votedMap[selectedArticle.id] === 'helpful' && styles.votedBtn,
                  ]}
                  onPress={() => handleVote(selectedArticle.id, true)}
                >
                  <Feather name="thumbs-up" size={14} color={votedMap[selectedArticle.id] === 'helpful' ? '#10B981' : theme.colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.voteText, { color: theme.colors.text }]}>Yes ({selectedArticle.helpful_count})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.voteBtn,
                    votedMap[selectedArticle.id] === 'unhelpful' && styles.votedBtn,
                  ]}
                  onPress={() => handleVote(selectedArticle.id, false)}
                >
                  <Feather name="thumbs-down" size={14} color={votedMap[selectedArticle.id] === 'unhelpful' ? '#EF4444' : theme.colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.voteText, { color: theme.colors.text }]}>No</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Need More Help Footer */}
            <TouchableOpacity
              style={styles.raiseTicketFooterBtn}
              onPress={() => router.push('/support/new-ticket' as any)}
            >
              <Feather name="message-square" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.raiseTicketFooterText}>Still have questions? Raise a Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Articles List */
          <View style={styles.articlesList}>
            {articles.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Feather name="info" size={32} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No articles found matching "{searchQuery}".
                </Text>
                <TouchableOpacity
                  style={styles.emptyRaiseBtn}
                  onPress={() => router.push('/support/new-ticket' as any)}
                >
                  <Text style={styles.emptyRaiseBtnText}>Ask Support Team</Text>
                </TouchableOpacity>
              </View>
            ) : (
              articles.map((art) => (
                <TouchableOpacity
                  key={art.id}
                  style={[
                    styles.articleCard,
                    {
                      backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                      borderColor: isDark ? '#1E293B' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => setSelectedArticle(art)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{art.title}</Text>
                    <Text style={[styles.cardSnippet, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {art.content_markdown}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} style={{ marginLeft: 10 }} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  container: { flex: 1, paddingHorizontal: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  loadingWrap: { padding: 40, alignItems: 'center' },
  articlesList: { marginVertical: 8 },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardSnippet: { fontSize: 12, lineHeight: 16 },
  articleView: { paddingVertical: 12 },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryPillText: { fontSize: 11, fontWeight: '800', color: '#6366F1' },
  articleTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14, lineHeight: 24 },
  articleContentCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  articleBody: { fontSize: 14, lineHeight: 22 },
  feedbackBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  feedbackTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  feedbackButtons: { flexDirection: 'row', gap: 12 },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  votedBtn: { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.08)' },
  voteText: { fontSize: 12, fontWeight: '700' },
  raiseTicketFooterBtn: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  raiseTicketFooterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, marginTop: 10, textAlign: 'center' },
  emptyRaiseBtn: {
    marginTop: 14,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyRaiseBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
