import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import {
  TripBackARView,
  type TripBackARPlacementOutcome,
  type TripBackARStatus,
} from '../../modules/tripback-ar';
import { Fonts, Palette } from '../constants/theme';
import {
  headingDeltaDegrees,
  isOutsidePortalLookRange,
  panoramaTranslateX,
  sideStepMetres,
} from '../domain/geo';
import type { Coordinate, RealityPortal } from '../domain/types';

type ViewerMode = 'ar' | 'panorama';

const AR_FAILURE_STATES = new Set<TripBackARStatus['state']>([
  'unavailable',
  'failure',
  'unsupported',
  'error',
]);

function instructionFor(
  status: TripBackARStatus,
  placement?: TripBackARPlacementOutcome,
) {
  if (placement?.outcome === 'placed' || placement?.outcome === 'replaced') {
    return 'Placed. Pinch to resize, twist to rotate, or tap another wall to move it.';
  }
  if (placement?.outcome === 'noRaycast') {
    return 'No wall found there. Move slowly, aim at a flat surface, and try again.';
  }
  if (status.state === 'ready') {
    return 'Surface found. Tap a wall or facade to place the past.';
  }
  if (status.state === 'limited') {
    return status.message ?? 'Keep moving slowly so TripBack can understand the space.';
  }
  if (status.state === 'interrupted' || status.state === 'paused') {
    return 'AR paused. Keep TripBack open and point the camera back at the scene.';
  }
  if (AR_FAILURE_STATES.has(status.state)) {
    return status.message ?? 'AR is unavailable on this device.';
  }
  return 'Move slowly and point the camera at a wall or facade.';
}

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
  const [mode, setMode] = useState<ViewerMode>(Platform.OS === 'ios' ? 'ar' : 'panorama');
  const [status, setStatus] = useState<TripBackARStatus>({ state: 'inactive' });
  const [placement, setPlacement] = useState<TripBackARPlacementOutcome>();
  const [heading, setHeading] = useState(portal.originHeading);
  const [imageWidth, setImageWidth] = useState(Dimensions.get('window').width * 2.4);
  const [drag, setDrag] = useState(0);
  const dragOrigin = useRef(0);
  const dragRef = useRef(0);
  dragRef.current = drag;
  const viewportWidth = Dimensions.get('window').width;
  const imageUri = portal.generatedImageDataUri;
  const arFailed = AR_FAILURE_STATES.has(status.state);

  useEffect(() => {
    if (!visible) return;
    setMode(Platform.OS === 'ios' ? 'ar' : 'panorama');
    setStatus({ state: 'inactive' });
    setPlacement(undefined);
    setDrag(0);
  }, [portal.id, visible]);

  useEffect(() => {
    if (!visible || mode !== 'panorama') return;
    let subscription: Location.LocationSubscription | undefined;
    void Location.watchHeadingAsync((next) => {
      const value = next.trueHeading >= 0 ? next.trueHeading : next.magHeading;
      if (Number.isFinite(value)) setHeading(value);
    }).then((sub) => {
      subscription = sub;
    });
    return () => subscription?.remove();
  }, [mode, visible]);

  const lookAround = useMemo(() => {
    const headingDelta = headingDeltaDegrees(portal.originHeading, heading);
    const sideStep = currentLocation
      ? sideStepMetres(portal.coordinate, currentLocation, portal.originHeading)
      : 0;
    return {
      translateX:
        panoramaTranslateX({ headingDelta, sideStep, imageWidth, viewportWidth }) + drag,
      pastLookRange: isOutsidePortalLookRange(headingDelta, sideStep),
    };
  }, [currentLocation, drag, heading, imageWidth, portal, viewportWidth]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => mode === 'panorama',
        onMoveShouldSetPanResponder: () => mode === 'panorama',
        onPanResponderGrant: () => {
          dragOrigin.current = dragRef.current;
        },
        onPanResponderMove: (_, gesture) => setDrag(dragOrigin.current + gesture.dx * 0.65),
      }),
    [mode],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.shell}>
        {mode === 'ar' ? (
          <TripBackARView
            imageUri={imageUri}
            active={visible}
            style={styles.viewer}
            onStatus={(event) => setStatus(event.nativeEvent)}
            onPlacement={(event) => setPlacement(event.nativeEvent)}
          />
        ) : (
          <View style={styles.fallback} {...panResponder.panHandlers}>
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.panorama,
                { width: imageWidth, transform: [{ translateX: lookAround.translateX }] },
              ]}
              resizeMode="cover"
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                if (width > 0 && height > 0) {
                  setImageWidth((width / height) * Dimensions.get('window').height);
                }
              }}
            />
          </View>
        )}

        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topRow}>
            <View style={styles.placePill}>
              <Text style={styles.year}>{portal.year}</Text>
              <Text numberOfLines={1} style={styles.placeTitle}>
                {portal.placeTitle ?? 'This viewpoint'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close portal viewer"
              onPress={onClose}
              style={styles.close}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <View style={[styles.modeDot, mode === 'panorama' && styles.modeDotFallback]} />
              <Text style={styles.modeLabel}>
                {mode === 'ar' ? 'PLACE THE PAST' : 'PANORAMA VIEW'}
              </Text>
            </View>
            <Text style={styles.guideText}>
              {mode === 'ar'
                ? instructionFor(status, placement)
                : lookAround.pastLookRange
                  ? 'Turn back toward the original viewpoint, or drag to explore.'
                  : 'Turn your phone or drag to look around the reconstructed scene.'}
            </Text>
            {mode === 'ar' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setMode('panorama')}
                style={[styles.modeButton, arFailed && styles.modeButtonPrimary]}
              >
                <Text style={[styles.modeButtonText, arFailed && styles.modeButtonTextPrimary]}>
                  {arFailed ? 'View panorama instead' : 'Switch to panorama'}
                </Text>
              </Pressable>
            ) : Platform.OS === 'ios' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setStatus({ state: 'inactive' });
                  setPlacement(undefined);
                  setMode('ar');
                }}
                style={[styles.modeButton, styles.modeButtonPrimary]}
              >
                <Text style={[styles.modeButtonText, styles.modeButtonTextPrimary]}>
                  Try wall placement
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Palette.ink },
  viewer: { flex: 1 },
  fallback: { flex: 1, overflow: 'hidden', justifyContent: 'center' },
  panorama: { height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(16,16,20,0.82)',
  },
  year: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Palette.lime },
  placeTitle: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.white },
  close: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
  },
  closeText: { fontFamily: Fonts.bodyBold, fontSize: 30, lineHeight: 32, color: Palette.ink },
  guideCard: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    backgroundColor: 'rgba(16,16,20,0.9)',
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Palette.lime },
  modeDotFallback: { backgroundColor: Palette.lavender },
  modeLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Palette.lime,
  },
  guideText: { fontFamily: Fonts.bodySemi, fontSize: 15, lineHeight: 21, color: Palette.white },
  modeButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
  },
  modeButtonPrimary: { borderColor: Palette.lime, backgroundColor: Palette.lime },
  modeButtonText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Palette.white },
  modeButtonTextPrimary: { color: Palette.ink },
});
