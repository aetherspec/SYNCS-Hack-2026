import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { currentCoordinate, useAppState } from '@/components/app-state';
import { FIRST_NATIONS_PLACES } from '@/constants/first-nations';
import { Fonts, Palette } from '@/constants/theme';

export type FirstNationsMapHandle = {
  recenter: () => void;
  flyTo: (geo: [number, number]) => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

type Props = {
  selectedId?: string;
  onSelect: (id: string) => void;
};

const DEFAULT_DELTA = { latitudeDelta: 0.055, longitudeDelta: 0.055 };
const coord = (geo: [number, number]) => ({ latitude: geo[1], longitude: geo[0] });

export const FirstNationsMap = forwardRef<FirstNationsMapHandle, Props>(
  function FirstNationsMap({ selectedId, onSelect }, ref) {
    const mapRef = useRef<MapView>(null);
    const { location } = useAppState();
    const following = useRef(true);
    const region = useRef<Region>({
      ...currentCoordinate(location),
      ...DEFAULT_DELTA,
    });

    useEffect(() => {
      if (!location || !following.current) return;
      const next = { ...location, ...DEFAULT_DELTA };
      region.current = next;
      mapRef.current?.animateToRegion(next, 650);
    }, [location]);

    const scale = (factor: number) => {
      const next = {
        ...region.current,
        latitudeDelta: region.current.latitudeDelta * factor,
        longitudeDelta: region.current.longitudeDelta * factor,
      };
      region.current = next;
      mapRef.current?.animateToRegion(next, 280);
    };

    useImperativeHandle(ref, () => ({
      recenter: () => {
        following.current = true;
        const next = { ...currentCoordinate(location), ...DEFAULT_DELTA };
        region.current = next;
        mapRef.current?.animateToRegion(next, 700);
      },
      flyTo: (geo) => {
        following.current = false;
        const next = { ...coord(geo), latitudeDelta: 0.012, longitudeDelta: 0.012 };
        region.current = next;
        mapRef.current?.animateToRegion(next, 700);
      },
      zoomIn: () => scale(0.6),
      zoomOut: () => scale(1 / 0.6),
    }));

    if (!location) {
      return (
        <View style={styles.locating}>
          <View style={styles.userHalo}><View style={styles.userDot} /></View>
          <Text style={styles.locatingText}>Finding your location…</Text>
        </View>
      );
    }

    return (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...location, ...DEFAULT_DELTA }}
        showsCompass={false}
        showsPointsOfInterests
        onPanDrag={() => { following.current = false; }}
        onRegionChangeComplete={(next) => { region.current = next; }}
      >
        {FIRST_NATIONS_PLACES.map((place) => {
          const active = selectedId === place.id;
          return (
            <Marker
              key={place.id}
              coordinate={coord(place.geo)}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => onSelect(place.id)}
              zIndex={active ? 10 : 1}
            >
              <View style={styles.pin}>
                <View style={[styles.pill, active && styles.pillActive]}>
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {place.events[0]?.year}
                  </Text>
                </View>
                <View style={[styles.stem, active && styles.stemActive]} />
              </View>
            </Marker>
          );
        })}
        <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.userHalo}><View style={styles.userDot} /></View>
        </Marker>
      </MapView>
    );
  },
);

const styles = StyleSheet.create({
  locating: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F6EBDD',
  },
  locatingText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.inkSoft },
  pin: { alignItems: 'center' },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Palette.white,
    backgroundColor: '#B54A2D',
  },
  pillActive: { backgroundColor: Palette.lime, transform: [{ scale: 1.08 }] },
  pillText: { fontFamily: Fonts.displayBold, fontSize: 13, color: Palette.white },
  pillTextActive: { color: Palette.ink },
  stem: { width: 3, height: 10, backgroundColor: Palette.white },
  stemActive: { backgroundColor: Palette.lime },
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
