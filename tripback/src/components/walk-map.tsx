import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng, type Region } from 'react-native-maps';

import type { Coordinate } from '@/domain/types';
import { Fonts, Palette } from '@/constants/theme';

export type WalkMapHandle = {
  flyToNext: () => void;
  fitRoute: () => void;
};

type WalkMapStop = {
  id: string;
  name: string;
  coordinate?: Coordinate;
};

const fallbackRegion: Region = {
  latitude: -33.8688,
  longitude: 151.2093,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

function latLng(point: Coordinate): LatLng {
  return { latitude: point.latitude, longitude: point.longitude };
}

export const WalkMap = forwardRef<
  WalkMapHandle,
  { height?: number; label?: string; route?: Coordinate[]; stops?: WalkMapStop[] }
>(function WalkMap(
  { height = 230, label = 'Walk saved', route = [], stops = [] },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const routeCoordinates = useMemo(() => route.map(latLng), [route]);
  const stopCoordinates = useMemo(
    () => stops.flatMap((stop) => (stop.coordinate ? [latLng(stop.coordinate)] : [])),
    [stops],
  );
  const allCoordinates = useMemo(
    () => [...routeCoordinates, ...stopCoordinates],
    [routeCoordinates, stopCoordinates],
  );

  const fitRoute = () => {
    if (allCoordinates.length === 0) return;
    mapRef.current?.fitToCoordinates(allCoordinates, {
      animated: false,
      edgePadding: { top: 54, right: 42, bottom: 42, left: 42 },
    });
  };

  useImperativeHandle(ref, () => ({
    flyToNext: fitRoute,
    fitRoute,
  }));

  return (
    <View style={[styles.card, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={fallbackRegion}
        onMapReady={fitRoute}
        showsUserLocation={false}
        showsPointsOfInterests
        pitchEnabled={false}
      >
        {routeCoordinates.length > 1 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={Palette.purple}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {stops.map((stop, index) =>
          stop.coordinate ? (
            <Marker
              key={`${stop.id}:${index}`}
              coordinate={latLng(stop.coordinate)}
              title={stop.name}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.stopMarker}>
                <Text style={styles.stopMarkerText}>{index + 1}</Text>
              </View>
            </Marker>
          ) : null,
        )}
      </MapView>
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>{label}</Text>
      </View>
      {allCoordinates.length === 0 ? (
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyTitle}>No route points recorded</Text>
          <Text style={styles.emptyText}>Future walks will appear here as you move.</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 6,
    marginHorizontal: 20,
    borderRadius: 26,
    backgroundColor: Palette.lavender,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Palette.ink,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Palette.lime },
  stopMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.lime,
    boxShadow: '0 4px 10px rgba(16,16,20,0.25)',
  },
  stopMarkerText: { fontFamily: Fonts.displayBold, fontSize: 13, color: Palette.ink },
  empty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: Palette.lavender,
  },
  emptyTitle: { fontFamily: Fonts.displayBold, fontSize: 16, color: Palette.ink },
  emptyText: {
    marginTop: 4,
    fontFamily: Fonts.body,
    fontSize: 12.5,
    textAlign: 'center',
    color: Palette.muted,
  },
});
