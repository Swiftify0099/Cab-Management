import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Circle } from 'react-native-maps';
import { HeatmapPoint, HotspotZone } from '../../types/demandAndHeatmap';

interface DemandOverlayMapProps {
  visible: boolean;
  points: HeatmapPoint[];
  hotspots: HotspotZone[];
}

export const DemandOverlayMap: React.FC<DemandOverlayMapProps> = ({
  visible,
  points,
  hotspots,
}) => {
  if (!visible) return null;

  return (
    <>
      {/* 1. Hotspot Zone Large Outer Circles */}
      {hotspots.map((zone) => {
        const isCritical = zone.surge_multiplier >= 2.0;
        const color = isCritical
          ? 'rgba(239, 68, 68, 0.22)'
          : 'rgba(245, 158, 11, 0.18)';
        const strokeColor = isCritical
          ? 'rgba(239, 68, 68, 0.6)'
          : 'rgba(245, 158, 11, 0.5)';

        return (
          <Circle
            key={zone.zone_id}
            center={{
              latitude: zone.centroid_lat,
              longitude: zone.centroid_lng,
            }}
            radius={1400} // 1.4 km radius zone boundary
            fillColor={color}
            strokeColor={strokeColor}
            strokeWidth={1.5}
          />
        );
      })}

      {/* 2. Heatmap Density Point Circles */}
      {points.map((pt, idx) => {
        const isHigh = pt.surge_multiplier >= 1.8;
        const pointColor = isHigh
          ? 'rgba(239, 68, 68, 0.35)'
          : 'rgba(245, 158, 11, 0.25)';

        return (
          <Circle
            key={`hm_${idx}`}
            center={{
              latitude: pt.latitude,
              longitude: pt.longitude,
            }}
            radius={400}
            fillColor={pointColor}
            strokeColor="transparent"
          />
        );
      })}
    </>
  );
};
