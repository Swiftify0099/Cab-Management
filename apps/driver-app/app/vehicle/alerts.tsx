import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function MaintenanceAlertsScreen() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#151A24" />
      
      {/* Dark Map-like Background */}
      <ImageBackground
        source={{ uri: 'https://cdn.pixabay.com/photo/2019/11/07/20/48/map-4609809_1280.jpg' }}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: 0.1, tintColor: '#2B3C5A' }}
      >
        <LinearGradient
          colors={['rgba(21, 26, 36, 0.85)', 'rgba(30, 41, 59, 0.95)', '#0F172A']}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea}>
        {/* Header (Invisible but provides back navigation) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={28} color="#FFFFFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Floating Engine Image - positioned at the top center of the card */}
          <Image
            source={{ uri: 'https://www.freeiconspng.com/uploads/engine-png-17.png' }}
            style={styles.engineImage}
            resizeMode="contain"
          />

          {/* Glass Card */}
          <View style={styles.glassCard}>
            {/* Glass Background Gradient */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.02)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />

            {/* Title */}
            <Text style={styles.title}>VEHICLE SERVICE REMINDER</Text>

            {/* List Items */}
            <View style={styles.listContainer}>
              {/* Item 1: Oil */}
              <View style={styles.listItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="oil-can" size={26} color="#CBD5E1" />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemTitle}>OIL CHANGE DUE</Text>
                  <Text style={styles.itemSubtitle}>4,500 mi overdue</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Item 2: Brakes */}
              <View style={styles.listItem}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="car-brake-alert" size={32} color="#CBD5E1" />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemTitle}>BRAKE PAD CHECK</Text>
                  <Text style={styles.itemSubtitle}>8,000 mi due in 2 weeks</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Item 3: Tires */}
              <View style={styles.listItem}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="tire" size={32} color="#CBD5E1" />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemTitle}>TIRE ROTATION</Text>
                  <Text style={styles.itemSubtitle}>6,000 mi due in 1 month</Text>
                </View>
              </View>
              
              {/* Fake divider for spacing at bottom of list */}
              <View style={[styles.divider, { borderBottomColor: 'transparent', marginBottom: 30 }]} />
            </View>

          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Primary Orange Button */}
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.primaryBtnGradient, { borderRadius: 25 }]}
              >
                <Text style={styles.primaryBtnText}>BOOK SERVICE AT PARTNER GARAGE</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary Hollow Button */}
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>REMIND ME LATER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 10,
    paddingTop: 10,
    zIndex: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 17,
    marginLeft: -4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60, // Space for the engine image to pop out
    position: 'relative',
  },
  engineImage: {
    position: 'absolute',
    top: -40, // overlap the card top edge
    alignSelf: 'center',
    width: 180,
    height: 160,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  glassCard: {
    flex: 1,
    marginTop: 60, // Space for engine overlapping
    marginBottom: 160,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    paddingTop: 80,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 15 },
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 30,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  itemSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 10,
    marginVertical: 4,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 3,
  },
  primaryBtn: {
    width: '100%',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    marginBottom: 16,
  },
  primaryBtnGradient: {
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  secondaryBtnText: {
    color: '#60A5FA',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
