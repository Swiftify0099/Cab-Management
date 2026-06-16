import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AppText } from '../../src/components/ui';

const PROPERTY_TYPES = [
  {
    id: 'hotel',
    title: 'Hotels',
    subtitle: 'Premium stays and luxury suites',
    icon: 'building',
    iconFamily: 'FontAwesome5',
    color: '#3B82F6',
  },
  {
    id: 'resort',
    title: 'Resorts',
    subtitle: 'Vacations and relaxing getaways',
    icon: 'pool',
    iconFamily: 'MaterialIcons',
    color: '#10B981',
  },
  {
    id: 'lodge',
    title: 'Lodges',
    subtitle: 'Budget friendly short stays',
    icon: 'bed',
    iconFamily: 'Ionicons',
    color: '#F59E0B',
  },
  {
    id: 'room',
    title: 'Rooms',
    subtitle: 'Monthly or daily rental rooms',
    icon: 'home',
    iconFamily: 'Ionicons',
    color: '#8B5CF6',
  },
];

export default function PropertySelectionScreen() {
  const { theme, isDark } = useTheme();

  const handleSelect = (type: string) => {
    // Navigate to property search screen with the selected type
    router.push({ pathname: '/book/propertySearch', params: { type } });
  };

  const renderIcon = (item: typeof PROPERTY_TYPES[0]) => {
    if (item.iconFamily === 'FontAwesome5') {
      return <FontAwesome5 name={item.icon as any} size={32} color={item.color} />;
    }
    if (item.iconFamily === 'MaterialIcons') {
      return <MaterialIcons name={item.icon as any} size={34} color={item.color} />;
    }
    return <Ionicons name={item.icon as any} size={36} color={item.color} />;
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <AppText variant="h2" bold>Select Stay Type</AppText>
          <View style={styles.backButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            Choose what type of property you are looking for.
          </AppText>

          <View style={styles.grid}>
            {PROPERTY_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
                activeOpacity={0.8}
                onPress={() => handleSelect(item.id)}
              >
                <LinearGradient
                  colors={[`${item.color}15`, `${item.color}05`]}
                  style={styles.cardGradient}
                >
                  <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
                    {renderIcon(item)}
                  </View>
                  <View style={styles.textWrap}>
                    <AppText variant="title" bold>{item.title}</AppText>
                    <AppText variant="small" color="secondary" style={{ marginTop: 4 }}>
                      {item.subtitle}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  subtitle: {
    marginBottom: 24,
    marginTop: 8,
  },
  grid: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textWrap: {
    flex: 1,
  },
});
