import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Fonts, Palette } from '@/constants/theme';

const MIN = 0.06;
const MAX = 0.94;

export function PhotoPending({
  width,
  height,
  era,
  prompt = 'Take a photo of this facade to paint the year',
}: {
  width: number;
  height: number;
  era: string;
  prompt?: string;
}) {
  return (
    <View style={[styles.frame, styles.pending, { width, height }]}>
      <Text style={styles.pendingEra}>{era}</Text>
      <Text style={styles.pendingText}>{prompt}</Text>
    </View>
  );
}

export function PlaceHero({
  width,
  height,
  era,
  thenUri,
  nowUri,
  photoUri,
}: {
  width: number;
  height: number;
  era: string;
  thenUri?: string;
  nowUri?: string;
  photoUri?: string;
}) {
  if (thenUri) {
    return (
      <TimeSlider
        width={width}
        height={height}
        era={era}
        nowImage={nowUri ?? photoUri}
        thenImage={thenUri}
      />
    );
  }
  if (photoUri || nowUri) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <Image
          source={{ uri: nowUri ?? photoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </View>
    );
  }
  return <PhotoPending width={width} height={height} era={era} />;
}

export function TimeSlider({
  width,
  height,
  era,
  nowImage,
  thenImage,
}: {
  width: number;
  height: number;
  era: string;
  nowImage?: string;
  thenImage?: string;
}) {
  const pct = useSharedValue(0.58);
  const pan = Gesture.Pan()
    .onBegin((e) => {
      pct.value = Math.min(MAX, Math.max(MIN, e.x / width));
    })
    .onUpdate((e) => {
      pct.value = Math.min(MAX, Math.max(MIN, e.x / width));
    });
  const overlayStyle = useAnimatedStyle(() => ({ width: pct.value * width }));
  const handleStyle = useAnimatedStyle(() => ({ left: pct.value * width }));

  if (!thenImage) return null;

  if (!nowImage) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <Image source={{ uri: thenImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View pointerEvents="none" style={[styles.badge, styles.badgePast]}>
          <Text style={styles.badgePastText}>{era}</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.frame, { width, height }]}>
        <Image source={{ uri: nowImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Image source={{ uri: thenImage }} style={{ width, height }} resizeMode="cover" />
        </Animated.View>
        <View pointerEvents="none" style={[styles.badge, styles.badgePast]}>
          <Text style={styles.badgePastText}>{era}</Text>
        </View>
        <View pointerEvents="none" style={[styles.badge, styles.badgeNow]}>
          <Text style={styles.badgeNowText}>now</Text>
        </View>
        <Animated.View pointerEvents="none" style={[styles.handleCol, handleStyle]}>
          <View style={styles.divider} />
          <View style={styles.knob}>
            <Text style={styles.knobText}>‹ ›</Text>
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    backgroundColor: Palette.lavender,
    borderRadius: 28,
    overflow: 'hidden',
  },
  pending: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#C9C7D4',
    backgroundColor: Palette.cloud,
  },
  pendingEra: { fontFamily: Fonts.display, fontSize: 22, color: Palette.purple },
  pendingText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.muted,
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgePast: {
    left: 14,
    backgroundColor: Palette.ink,
  },
  badgePastText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Palette.lime,
  },
  badgeNow: {
    right: 14,
    backgroundColor: Palette.white,
  },
  badgeNowText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Palette.ink,
  },
  handleCol: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -1.5,
    width: 3,
    backgroundColor: Palette.white,
  },
  knob: {
    position: 'absolute',
    top: '50%',
    left: 0,
    marginLeft: -21,
    marginTop: -21,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(16,16,20,0.22)',
  },
  knobText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Palette.ink,
  },
});
