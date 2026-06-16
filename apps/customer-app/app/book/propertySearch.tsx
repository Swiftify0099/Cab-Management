import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AppText } from '../../src/components/ui';

export default function PropertySearchScreen() {
  const { theme, isDark } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  
  const [city, setCity] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const getTitle = () => {
    switch (type) {
      case 'hotel': return 'Find Hotels';
      case 'resort': return 'Find Resorts';
      case 'lodge': return 'Find Lodges';
      case 'room': return 'Find Rooms';
      default: return 'Find Stays';
    }
  };

  const handleSearch = () => {
    if (!city) return;
    setIsSearching(true);
    // TODO: Connect to backend hotel-service /api/v1/properties/search
    setTimeout(() => {
      setIsSearching(false);
      // We will show search results here in the next iteration
    }, 1000);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <AppText variant="h2" bold>{getTitle()}</AppText>
          <View style={styles.backButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            <Ionicons name="location-outline" size={24} color={theme.colors.primary} />
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary }]}
              placeholder="Enter City (e.g. Mumbai)"
              placeholderTextColor={theme.colors.textMuted}
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity 
            style={[
              styles.searchButton, 
              { backgroundColor: city ? theme.colors.primary : theme.colors.surface }
            ]}
            disabled={!city || isSearching}
            onPress={handleSearch}
          >
            {isSearching ? (
              <ActivityIndicator color={city ? '#fff' : theme.colors.primary} />
            ) : (
              <AppText variant="body" bold style={{ color: city ? '#fff' : theme.colors.textMuted }}>
                Search
              </AppText>
            )}
          </TouchableOpacity>

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
    paddingTop: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  searchButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
