import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api/client';

export default function RateTripScreen() {
  const { bookingId, driverId } = useLocalSearchParams<{ bookingId: string, driverId: string }>();
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!bookingId || !driverId) {
      router.replace('/(tabs)/trips' as any);
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/support/ratings', {
        booking_id: bookingId,
        to_user_id: driverId,
        score: rating,
        feedback: feedback.trim() || undefined
      });
      // Skip the alert and just go back to home
      router.replace('/(tabs)' as any);
    } catch (err) {
      console.error('Failed to submit rating', err);
      // Even if it fails, go to home
      router.replace('/(tabs)' as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={80} color="#22C55E" style={styles.icon} />
        <Text style={styles.title}>Trip Completed!</Text>
        <Text style={styles.subtitle}>How was your experience?</Text>

        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons 
                name={star <= rating ? "star" : "star-outline"} 
                size={48} 
                color={star <= rating ? "#F59E0B" : "#D1D5DB"} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Leave some feedback (optional)..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          value={feedback}
          onChangeText={setFeedback}
        />

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleSubmit} 
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Review</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipBtn} 
          onPress={() => router.replace('/(tabs)' as any)}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  icon: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  starsContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    marginBottom: 32,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  skipBtn: { padding: 8 },
  skipText: { color: '#6B7280', fontSize: 16, fontWeight: '500' }
});
