import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../theme';
import { NotificationItem } from '../../types/notifications';

interface NotificationCardProps {
  notification: NotificationItem;
  onPress: (item: NotificationItem) => void;
  onDelete: (id: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();

  const getCategoryConfig = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('TRIP') || t.includes('BOOKING')) {
      return { icon: 'navigation', color: '#3B82F6', label: 'TRIP' };
    }
    if (t.includes('PAYMENT') || t.includes('EARNING') || t.includes('PAYOUT')) {
      return { icon: 'dollar-sign', color: '#10B981', label: 'FINANCE' };
    }
    if (t.includes('PROMOTION')) {
      return { icon: 'award', color: '#F59E0B', label: 'PROMO' };
    }
    if (t.includes('SOS') || t.includes('SAFETY')) {
      return { icon: 'shield', color: '#EF4444', label: 'SAFETY' };
    }
    if (t.includes('DRIVER') || t.includes('ACCOUNT') || t.includes('KYC')) {
      return { icon: 'user-check', color: '#8B5CF6', label: 'ACCOUNT' };
    }
    return { icon: 'bell', color: '#64748B', label: 'SYSTEM' };
  };

  const config = getCategoryConfig(notification.notification_type || notification.category);
  const isUnread = !notification.is_read;

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return '';
    const now = new Date();
    const created = new Date(isoString);
    const diffSecs = Math.floor((now.getTime() - created.getTime()) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return created.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? isUnread
              ? 'rgba(99, 102, 241, 0.12)'
              : '#131B2E'
            : isUnread
            ? '#EEF2FF'
            : '#FFFFFF',
          borderColor: isDark
            ? isUnread
              ? '#6366F1'
              : '#1E293B'
            : isUnread
            ? '#C7D2FE'
            : '#E2E8F0',
        },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      {/* Category Icon */}
      <View style={[styles.iconWrap, { backgroundColor: `${config.color}20` }]}>
        <Feather name={config.icon as any} size={18} color={config.color} />
      </View>

      {/* Content */}
      <View style={styles.contentWrap}>
        <View style={styles.topRow}>
          <View style={[styles.categoryBadge, { backgroundColor: `${config.color}15` }]}>
            <Text style={[styles.categoryText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>

        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontWeight: isUnread ? '800' : '600' },
          ]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>

        <Text style={[styles.body, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {notification.body}
        </Text>

        {/* Action Link Indicator */}
        {notification.deep_link ? (
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>View details</Text>
            <Feather name="arrow-right" size={12} color="#6366F1" style={{ marginLeft: 3 }} />
          </View>
        ) : null}
      </View>

      {/* Unread dot or Dismiss action */}
      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentWrap: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: { fontSize: 9, fontWeight: '800' },
  timeText: { fontSize: 11 },
  title: { fontSize: 13, marginBottom: 3 },
  body: { fontSize: 12, lineHeight: 16 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  actionText: { fontSize: 11, fontWeight: '700', color: '#6366F1' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginLeft: 8,
    marginTop: 4,
  },
});
