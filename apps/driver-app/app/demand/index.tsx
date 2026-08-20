/**
 * Feature 19: Demand / Heatmap & Surge Screen
 * PostGIS-first hotspots discovery, surge zones, and predictive demand timeline.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { DemandAndHeatmapService } from '../../src/services/demandAndHeatmapService';
import { HeatmapPoint, HotspotZone, ExpectedDemandHour } from '../../src/types/demandAndHeatmap';
import {
  DemandOverlayMap,
  HighDemandZonesSheet,
  ExpectedDemandTimeline,
  DemandDevSheet,
} from '../../src/components/demand';

export default function DemandScreen() {
  const { theme, isDark } = useTheme();
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [hotspots, setHotspots] = useState<HotspotZone[]>([]);
  const [timeline, setTimeline] = useState<ExpectedDemandHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [devSheetVisible, setDevSheetVisible] = useState(false);

  // Pune coordinates
  const initialRegion = {
    latitude: 18.5500,
    longitude: 73.8567,
    latitudeDelta: 0.18,
    longitudeDelta: 0.18,
  };

  const loadData = useCallback(async () => {
    try {
      const [pData, hData, tData] = await Promise.all([
        DemandAndHeatmapService.getHeatmapPoints(),
        DemandAndHeatmapService.getActiveHotspots(),
        DemandAndHeatmapService.getExpectedDemandTimeline(),
      ]);
      setPoints(pData);
      setHotspots(hData);
      setTimeline(tData);
    } catch (e) {
      console.warn('[DemandScreen] Load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDevScenario = async (scenario: string) => {
    await DemandAndHeatmapService.devSimulate(scenario);
    await loadData();
  };

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? '#0B0E1F' : '#F8FAFC',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    devBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(234,179,8,0.15)' : '#FEF9C3',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(234,179,8,0.3)' : '#FEF08A',
    },
    devBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FDE047' : '#854D0E',
    },
    mapContainer: {
      height: 240,
      width: '100%',
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      position: 'relative',
    },
    map: {
      ...StyleSheet.absoluteFill,
    },
    mapControls: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    },
    controlLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0F172A' : '#FFFFFF'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Demand & Surge Hotspots</Text>
          </View>

          <TouchableOpacity style={styles.devBtn} onPress={() => setDevSheetVisible(true)}>
            <MaterialCommunityIcons name="developer-board" size={14} color="#EAB308" />
            <Text style={styles.devBtnText}>Dev Mode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Interactive Map with PostGIS Overlay */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsCompass={false}
        >
          {/* PostGIS Demand & Surge Overlay */}
          <DemandOverlayMap
            visible={showHeatmap}
            points={points}
            hotspots={hotspots}
          />

          {/* Hotspot Markers */}
          {hotspots.map((z) => (
            <Marker
              key={z.zone_id}
              coordinate={{ latitude: z.centroid_lat, longitude: z.centroid_lng }}
              title={`${z.name} (${z.surge_multiplier}x)`}
              description={`${z.distance_km} km • ${z.active_requests_count} waiting`}
            />
          ))}
        </MapView>

        {/* Floating Controls Bar */}
        <View style={styles.mapControls}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="layers" size={14} color="#3B82F6" />
            <Text style={styles.controlLabel}>Heatmap & Surge Layer</Text>
          </View>
          <Switch
            value={showHeatmap}
            onValueChange={setShowHeatmap}
            thumbColor={showHeatmap ? '#3B82F6' : '#94A3B8'}
            trackColor={{ false: '#64748B', true: '#93C5FD' }}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>
            Calculating PostGIS demand clusters...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* 1. High Demand Hotspots Nearby List */}
          <HighDemandZonesSheet hotspots={hotspots} />

          {/* 2. Predictive 6-Hour Demand Curve */}
          <ExpectedDemandTimeline timeline={timeline} />
        </ScrollView>
      )}

      {/* Developer Mode Sandbox Sheet */}
      <DemandDevSheet
        visible={devSheetVisible}
        onClose={() => setDevSheetVisible(false)}
        onSelectScenario={handleDevScenario}
      />
    </View>
  );
}
