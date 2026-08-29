import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { currentCoordinate, useAppState } from '@/components/app-state';
import type { SiteMapHandle, SiteMapViewProps } from '@/components/map-types';
import { PLACES, ROCKS_BOUNDS, USER_GEO } from '@/constants/places';
import { Fonts, Palette } from '@/constants/theme';

const rocksRegion = boundsToRegion(ROCKS_BOUNDS);

function boundsToRegion(bounds: [[number, number], [number, number]]): Region {
  const [[west, south], [east, north]] = bounds;
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: Math.abs(north - south) * 1.15,
    longitudeDelta: Math.abs(east - west) * 1.15,
  };
}

function lngLatToCoord(lngLat: [number, number]) {
  return { latitude: lngLat[1], longitude: lngLat[0] };
}

export const AppleMap = forwardRef<SiteMapHandle, SiteMapViewProps>(function AppleMap(
  { opened, onSelect, discoveries, onSelectDiscovery, onLookAt },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const { location } = useAppState();
  const [user, setUserState] = useState<[number, number]>(USER_GEO);
  const following = useRef(true);
  const demoLocked = useRef(false);
  const regionRef = useRef<Region>(rocksRegion);
  const onLookAtRef = useRef(onLookAt);
  onLookAtRef.current = onLookAt;

  const visibleRegion = (region: Region) => ({
    center: [region.longitude, region.latitude] as [number, number],
    latitudeDelta: region.latitudeDelta,
    longitudeDelta: region.longitudeDelta,
  });

  const cameraDeltas = () => ({
    latitudeDelta: regionRef.current.latitudeDelta,
    longitudeDelta: regionRef.current.longitudeDelta,
  });

  useEffect(() => {
    if (demoLocked.current || !location) return;
    setUserState([location.longitude, location.latitude]);
    if (following.current) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          ...cameraDeltas(),
        },
        650,
      );
    }
  }, [location]);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      following.current = true;
      demoLocked.current = false;
      const coord = currentCoordinate(location);
      mapRef.current?.animateToRegion(
        {
          latitude: coord.latitude,
          longitude: coord.longitude,
          ...cameraDeltas(),
        },
        700,
      );
      onLookAtRef.current?.(null);
    },
    zoomIn: () => {
      const region = regionRef.current;
      const next = {
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta * 0.6,
        longitudeDelta: region.longitudeDelta * 0.6,
      };
      regionRef.current = next;
      mapRef.current?.animateToRegion(next, 280);
    },
    zoomOut: () => {
      const region = regionRef.current;
      const next = {
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta / 0.6,
        longitudeDelta: region.longitudeDelta / 0.6,
      };
      regionRef.current = next;
      mapRef.current?.animateToRegion(next, 280);
    },
    setUser: (lngLat, follow) => {
      demoLocked.current = true;
      setUserState(lngLat);
      if (follow) {
        following.current = true;
        mapRef.current?.animateToRegion({ ...lngLatToCoord(lngLat), ...cameraDeltas() }, 220);
        onLookAtRef.current?.(null);
      }
    },
    flyTo: (lngLat) => {
      following.current = false;
      mapRef.current?.animateToRegion(
        {
          ...lngLatToCoord(lngLat),
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        800,
      );
      onLookAtRef.current?.(
        visibleRegion({
          ...lngLatToCoord(lngLat),
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        }),
      );
    },
  }));

  if (!location && !demoLocked.current) {
    return (
      <View style={styles.locating}>
        <View style={styles.userHalo}>
          <View style={styles.userDot} />
        </View>
        <Text style={styles.locatingText}>Finding your location…</Text>
      </View>
    );
  }

  const start = currentCoordinate(location);
  const initialRegion: Region = {
    latitude: start.latitude,
    longitude: start.longitude,
    latitudeDelta: rocksRegion.latitudeDelta,
    longitudeDelta: rocksRegion.longitudeDelta,
  };

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsCompass={false}
      showsPointsOfInterests
      onPanDrag={() => {
        following.current = false;
      }}
      onRegionChangeComplete={(region) => {
        regionRef.current = region;
        onLookAtRef.current?.(visibleRegion(region));
      }}
    >
      {PLACES.map((place) => {
        const isOpened = !!opened[place.id];
        return (
          <Marker
            key={place.id}
            coordinate={lngLatToCoord(place.geo)}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => onSelect(place.id)}
          >
            <View style={styles.pin}>
              <View
                style={[
                  styles.pill,
                  { backgroundColor: isOpened ? Palette.lime : Palette.purple },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isOpened ? Palette.ink : Palette.white },
                  ]}
                >
                  {place.eras[0]}
                </Text>
              </View>
              <View style={styles.stem} />
            </View>
          </Marker>
        );
      })}
      {(discoveries ?? []).map((item) => (
        <Marker
          key={item.id}
          coordinate={lngLatToCoord(item.geo)}
          onPress={() => onSelectDiscovery?.(item.id, item.title)}
        >
          <View style={styles.mini} />
        </Marker>
      ))}
      <Marker coordinate={lngLatToCoord(user)} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={styles.userHalo}>
          <View style={styles.userDot} />
        </View>
      </Marker>
    </MapView>
  );
});

const styles = StyleSheet.create({
  locating: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Palette.lavender,
  },
  locatingText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.inkSoft },
  pin: { alignItems: 'center' },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Palette.white,
  },
  pillText: { fontFamily: Fonts.displayBold, fontSize: 14 },
  stem: {
    width: 3,
    height: 10,
    backgroundColor: Palette.white,
  },
  mini: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Palette.white,
    borderWidth: 4,
    borderColor: Palette.purple,
  },
  userHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108,59,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Palette.purple,
    borderWidth: 3,
    borderColor: Palette.white,
  },
});
