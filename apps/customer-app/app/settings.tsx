import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';

export default function SettingsScreen() {
  const { logout } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/phone');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F6" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color="#000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Advanced App Settings</Text>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.borderBottom]}>
            <View style={styles.rowLeft}>
              <Feather name="moon" size={20} color="#000" style={styles.icon} />
              <Text style={styles.rowText}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E5EA"
            />
          </View>
          <View style={[styles.row, styles.borderBottom]}>
            <View style={styles.rowLeft}>
              <Feather name="bell" size={20} color="#000" style={styles.icon} />
              <Text style={styles.rowText}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E5EA"
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="map-pin" size={20} color="#000" style={styles.icon} />
              <Text style={styles.rowText}>Location Sharing</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E5EA"
            />
          </View>
        </View>

        {/* Account & Data Section */}
        <Text style={styles.sectionTitleLarge}>Account & Data</Text>

        <Text style={styles.subSectionTitle}>Saved Addresses</Text>
        <View style={styles.card}>
          <View style={[styles.rowAddress, styles.borderBottom]}>
            <Feather name="home" size={22} color="#000" style={styles.addressIcon} />
            <View>
              <Text style={styles.addressTitle}>Home</Text>
              <Text style={styles.addressSub}>123 Maple Dr, Cityville</Text>
            </View>
          </View>
          <View style={styles.rowAddress}>
            <Feather name="briefcase" size={22} color="#000" style={styles.addressIcon} />
            <View>
              <Text style={styles.addressTitle}>Work</Text>
              <Text style={styles.addressSub}>456 Oak Ln, Tech Park</Text>
            </View>
          </View>
        </View>

        <Text style={styles.subSectionTitle}>Language Selection</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="globe" size={20} color="#000" style={styles.icon} />
              <Text style={styles.rowText}>English (US)</Text>
            </View>
            <Feather name="chevron-down" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Bottom Actions Section */}
        <View style={[styles.card, { marginTop: 16, marginBottom: 40 }]}>
          <TouchableOpacity style={[styles.row, styles.borderBottom]}>
            <View style={styles.rowLeft}>
              <Feather name="info" size={20} color="#000" style={styles.icon} />
              <Text style={styles.rowText}>About App</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <Feather name="power" size={20} color="#FF3B30" style={styles.icon} />
              <Text style={[styles.rowText, { color: '#FF3B30' }]}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 5,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 17,
    color: '#000',
    marginLeft: -4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginTop: 10,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionTitleLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 24,
    marginBottom: 16,
    marginLeft: 4,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  rowAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 14,
  },
  addressIcon: {
    marginRight: 16,
  },
  rowText: {
    fontSize: 17,
    color: '#000',
  },
  addressTitle: {
    fontSize: 17,
    color: '#000',
    marginBottom: 2,
  },
  addressSub: {
    fontSize: 15,
    color: '#3C3C43',
  },
});
