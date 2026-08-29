import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import { headingDeltaDegrees, isOutsidePortalLookRange, panoramaTranslateX, sideStepMetres } from '../domain/geo';
import type { Coordinate, RealityPortal } from '../domain/types';
import { isRealityPortalARAvailable, RealityPortalARView } from './RealityPortalARView';

export function PortalViewerModal({
  visible,
  portal,
  currentLocation,
  onClose,
}: {
  visible: boolean;
  portal: RealityPortal;
  currentLocation?: Coordinate;
  onClose: () => void;
}) {
  const [useFallback, setUseFallback] = useState(!isRealityPortalARAvailable);
  const [heading, setHeading] = useState(portal.originHeading);
  const [imageWidth, setImageWidth] = useState(Dimensions.get('window').width * 2.4);
  const [drag, setDrag] = useState(0);
  const dragOrigin = useRef(0);
  const dragRef = useRef(0);
  dragRef.current = drag;
  const viewportWidth = Dimensions.get('window').width;
  const imageUri = portal.generatedImageDataUri;
  const base64 = portal.generatedBase64 ?? imageUri.split(',')[1] ?? '';

  useEffect(() => {
    if (!visible) return;
    setUseFallback(!isRealityPortalARAvailable);
    setDrag(0);
    let subscription: Location.LocationSubscription | undefined;
    void Location.watchHeadingAsync((next) => {
      const value = next.trueHeading >= 0 ? next.trueHeading : next.magHeading;
      if (Number.isFinite(value)) setHeading(value);
    }).then((sub) => {
      subscription = sub;
    });
    return () => subscription?.remove();
  }, [portal.id, visible]);

  const lookAround = useMemo(() => {
    const headingDelta = headingDeltaDegrees(portal.originHeading, heading);
    const sideStep = currentLocation
      ? sideStepMetres(portal.coordinate, currentLocation, portal.originHeading)
      : 0;
    return {
      headingDelta,
      sideStep,
      translateX:
        panoramaTranslateX({
          headingDelta,
          sideStep,
          imageWidth,
          viewportWidth,
        }) + drag,
      pastLookRange: isOutsidePortalLookRange(headingDelta, sideStep),
    };
  }, [currentLocation, drag, heading, imageWidth, portal, viewportWidth]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => useFallback,
        onMoveShouldSetPanResponder: () => useFallback,
        onPanResponderGrant: () => {
          dragOrigin.current = dragRef.current;
        },
        onPanResponderMove: (_, gesture) => setDrag(dragOrigin.current + gesture.dx * 0.65),
      }),
    [useFallback],
  );

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.shell}>
        {!useFallback && RealityPortalARView ? (
          <RealityPortalARView
            imageBase64={base64}
            originHeading={portal.originHeading}
            style={styles.ar}
            onTrackingFailed={() => setUseFallback(true)}
          />
        ) : (
          <View style={styles.fallback} {...panResponder.panHandlers}>
            <Image
              source={{ uri: imageUri }}
              style={[styles.panorama, { width: imageWidth, transform: [{ translateX: lookAround.translateX }] }]}
              resizeMode="cover"
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                if (width > 0 && height > 0) {
                  const screenHeight = Dimensions.get('window').height;
                  setImageWidth((width / height) * screenHeight);
                }
              }}
            />
          </View>
        )}

        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          <View style={styles.caption}>
            <Text style={styles.label}>{portal.year}</Text>
            <Text style={styles.title}>{portal.placeTitle ?? 'This viewpoint'}</Text>
            <Text style={styles.hint}>Drag to look around this streetscape.</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0e1612' },
  ar: { flex: 1 },
  fallback: { flex: 1, overflow: 'hidden', justifyContent: 'center' },
  panorama: { height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  close: {
    alignSelf: 'flex-end',
    marginTop: 54,
    marginRight: 18,
    backgroundColor: 'rgba(23,38,30,0.72)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeText: { color: '#fffaf0', fontSize: 15, fontWeight: '800' },
  caption: {
    margin: 18,
    marginBottom: 36,
    backgroundColor: 'rgba(23,38,30,0.82)',
    borderRadius: 18,
    padding: 16,
  },
  label: { color: '#f3c4b5', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#fffaf0', fontSize: 20, fontWeight: '900', marginTop: 4 },
  hint: { color: '#d5ddd6', fontSize: 13, lineHeight: 18, marginTop: 6 },
});
