import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { HotspotZone } from '../../types/demandAndHeatmap';

interface HighDemandZonesSheetProps {
  hotspots: HotspotZone[];
  onSelectZone?: (zone: HotspotZone) => void;
}

export const HighDemandZonesSheet: React.FC<HighDemandZonesSheetProps> = ({
  hotspots,
  onSelectZone,
}) => {
  const { theme, isDark } = useTheme();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AIRPORT':
        return { name: 'airplane', color: '#EF4444' };
      case 'TECH_PARK':
        return { name: 'office-building', color: '#F59E0B' };
      case 'NIGHTLIFE':
        return { name: 'glass-cocktail', color: '#EC4899' };
      case 'SHOPPING_MALL':
        return { name: 'shopping', color: '#8B5CF6' };
      case 'TRANSIT_HUB':
        return { name: 'train', color: '#3B82F6' };
      default:
        return { name: 'map-marker-radius', color: '#10B981' };
    }
  };

  const handleNavigate = (zone: HotspotZone) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${zone.centroid_lat},${zone.centroid_lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Navigation', `Driving directions to ${zone.name} (${zone.centroid_lat}, ${zone.centroid_lng})`);
    });
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#161B33' : '#FFFFFF',
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    activeBadge: {
      backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : '#FEF2F2',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239,68,68,0.35)' : '#FECACA',
    },
    activeBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#EF4444',
    },
    zoneCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
    },
    zoneTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    zoneName: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      flex: 1,
      marginRight: 8,
    },
    surgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEF2F2',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239,68,68,0.4)' : '#FCA5A5',
    },
    surgeText: {
      fontSize: 12,
      fontWeight: '900',
      color: '#EF4444',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '600',
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
    },
    demandRatioText: {
      fontSize: 11,
      color: isDark ? '#CBD5E1' : '#475569',
      fontWeight: '600',
    },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#3B82F6',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    navBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Feather name="zap" size={18} color="#EF4444" />
          <Text style={styles.title}>High Demand Hotspots Nearby</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>{hotspots.length} Surge Zones</Text>
        </View>
      </View>

      {/* Hotspot Cards */}
      {hotspots.map((zone) => {
        const cat = getCategoryIcon(zone.category);
        const isCritical = zone.surge_multiplier >= 2.0;

        return (
          <TouchableOpacity
            key={zone.zone_id}
            style={styles.zoneCard}
            onPress={() => onSelectZone && onSelectZone(zone)}
            activeOpacity={0.85}
          >
            <View style={styles.zoneTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <MaterialCommunityIcons name={cat.name as any} size={16} color={cat.color} />
                <Text style={styles.zoneName} numberOfLines={1}>
                  {zone.name}
                </Text>
              </View>

              <View
                style={[
                  styles.surgePill,
                  !isCritical && {
                    backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#FFFBEB',
                    borderColor: isDark ? 'rgba(245,158,11,0.4)' : '#FDE68A',
                  },
                ]}
              >
                <Feather name="trending-up" size={11} color={isCritical ? '#EF4444' : '#D97706'} />
                <Text style={[styles.surgeText, !isCritical && { color: '#D97706' }]}>
                  {zone.surge_multiplier.toFixed(1)}x
                </Text>
              </View>
            </View>

            {/* Distance & Time */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="navigation" size={11} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={styles.metaText}>{zone.distance_km} km away</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="clock" size={11} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={styles.metaText}>~{zone.eta_minutes} min drive</Text>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomRow}>
              <Text style={styles.demandRatioText}>
                🔥 {zone.active_requests_count} waiting / {zone.available_drivers_count} drivers
              </Text>

              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => handleNavigate(zone)}
                activeOpacity={0.8}
              >
                <Feather name="corner-up-right" size={12} color="#FFFFFF" />
                <Text style={styles.navBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
