import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { SupportService } from '../../src/services/supportService';
import { SupportCategory, SupportTicketSummary } from '../../src/types/support';
import { SupportDevSheet } from '../../src/components/support/SupportDevSheet';

export default function SupportHubScreen() {
  const { theme, isDark } = useTheme();
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [activeTickets, setActiveTickets] = useState<SupportTicketSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDevSheet, setShowDevSheet] = useState(false);

  const loadSupportData = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, tickets] = await Promise.all([
        SupportService.getCategories(),
        SupportService.getDriverTickets('OPEN'),
      ]);
      setCategories(cats);
      setActiveTickets(tickets);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSupportData();
  }, [loadSupportData]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/support/faq' as any,
        params: { query: searchQuery.trim(), category: 'ALL' },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Help & Support</Text>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.push('/support/tickets' as any)}
        >
          <Feather name="clock" size={20} color="#6366F1" />
          <Text style={styles.historyText}>My Tickets</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSupportData();
            }}
            tintColor="#6366F1"
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <Feather name="search" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search help articles (e.g. fare, cash, KYC)..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active Ticket Alert Banner (if any) */}
        {activeTickets.length > 0 && (
          <TouchableOpacity
            style={[
              styles.activeTicketBanner,
              {
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                borderColor: '#6366F1',
              },
            ]}
            onPress={() =>
              router.push({
                pathname: '/support/chat' as any,
                params: { ticket_id: activeTickets[0].id },
              })
            }
          >
            <View style={styles.activeTicketIconWrap}>
              <Feather name="message-square" size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.activeTicketTitle, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>
                  Active Ticket #{activeTickets[0].id.slice(0, 8)}
                </Text>
                <View style={styles.openPill}>
                  <Text style={styles.openPillText}>OPEN</Text>
                </View>
              </View>
              <Text style={[styles.activeTicketSub, { color: theme.colors.text }]} numberOfLines={1}>
                {activeTickets[0].subject}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#6366F1" />
          </TouchableOpacity>
        )}

        {/* Categories Grid */}
        <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Browse by Category</Text>

        <View style={styles.categoriesGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                  borderColor: isDark ? '#1E293B' : '#E2E8F0',
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/support/faq' as any,
                  params: { category: cat.id, category_name: cat.name },
                })
              }
              activeOpacity={0.7}
            >
              <View style={[styles.catIconWrap, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Feather name={cat.icon as any || 'help-circle'} size={20} color="#6366F1" />
              </View>
              <Text style={[styles.catName, { color: theme.colors.text }]} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={[styles.catDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {cat.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Direct Contact / Raise Ticket Section */}
        <View
          style={[
            styles.contactSupportCard,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.contactTextWrap}>
            <Text style={[styles.contactTitle, { color: theme.colors.text }]}>Still need assistance?</Text>
            <Text style={[styles.contactSub, { color: theme.colors.textSecondary }]}>
              Raise a support ticket or report an issue with a completed ride.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.raiseTicketBtn}
            onPress={() => router.push('/support/new-ticket' as any)}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.raiseTicketBtnText}>Raise a Ticket</Text>
          </TouchableOpacity>
        </View>

        {/* Developer Diagnostics Sandbox */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devBarBtn}
            onPress={() => setShowDevSheet(true)}
          >
            <MaterialCommunityIcons name="robot-outline" size={16} color="#F59E0B" />
            <Text style={styles.devBarText}>Support Sandbox Simulator (Feature 24)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Support Developer Simulator Sheet */}
      <SupportDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        activeTicketId={activeTickets[0]?.id}
        onSimulated={loadSupportData}
      />
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
  headerTitle: { fontSize: 18, fontWeight: '800' },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    gap: 4,
  },
  historyText: { fontSize: 12, fontWeight: '700', color: '#6366F1' },
  container: { flex: 1, paddingHorizontal: 16 },
  searchSection: { marginVertical: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  activeTicketBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeTicketIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTicketTitle: { fontSize: 13, fontWeight: '800' },
  activeTicketSub: { fontSize: 12, marginTop: 2 },
  openPill: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  openPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  sectionHeading: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  catName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  catDesc: { fontSize: 11, lineHeight: 15 },
  contactSupportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  contactTextWrap: { marginBottom: 12 },
  contactTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  contactSub: { fontSize: 12, lineHeight: 16 },
  raiseTicketBtn: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  raiseTicketBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  devBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    gap: 6,
    marginTop: 8,
  },
  devBarText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
});
