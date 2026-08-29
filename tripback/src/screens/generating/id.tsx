import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Motion } from '@/components/motion';
import { useAppState } from '@/components/app-state';
import { PLACES } from '@/constants/places';
import { Fonts, Palette } from '@/constants/theme';
import { tripBackEngine } from '@/core/TripBackEngine';
import type { StoryCandidate } from '@/domain/types';
import { useLocalSearchParams, useRouter } from '@/nav';
import { createHistoricalPanorama } from '@/services/images/HistoricalImageClient';

export default function GeneratingScreen() {
  const router = useRouter();
  const { id, era, name, mode } = useLocalSearchParams<{
    id: string;
    era?: string;
    name?: string;
    mode?: string;
  }>();
  const place = PLACES.find((item) => item.id === id);
  const isPlace = !!place;
  const targetId = id;
  const displayName = typeof name === 'string' && name ? name : (place?.name ?? 'This place');
  const activeEra = era ?? place?.eras[0] ?? '1900';
  const {
    markOpened,
    recordStop,
    pendingCapture,
    setPendingCapture,
    rememberPortal,
    registerDiscovery,
    activeWalk,
    discovered,
    openPortalViewer,
  } = useAppState();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();

  const steps = [
    'Photo captured',
    `Archival plate matched · ${activeEra}`,
    'Reconstructing the scene…',
    'Saving to today’s walk',
  ];

  useEffect(() => {
    let cancelled = false;
    const capture = pendingCapture;
    const capturedSite = capture?.siteId;
    const sameSite =
      !!capture &&
      !!targetId &&
      (capturedSite === targetId ||
        (capturedSite != null && decodeURIComponent(capturedSite) === targetId) ||
        capturedSite === decodeURIComponent(targetId));
    if (!capture || !sameSite) {
      setError('No photo to reconstruct. Go back and take the photo again.');
      return;
    }

    const placeContext: StoryCandidate = {
      id: targetId,
      title: displayName,
      summary:
        place?.blurb ??
        discovered[targetId]?.blurb ??
        `${displayName} in Sydney, Australia.`,
      coordinate: capture.coordinate,
      distanceMetres: 0,
      citations: [],
    };

    void (async () => {
      try {
        setStep(1);
        setStep(2);
        const result = await createHistoricalPanorama({
          imageBase64: capture.base64,
          mimeType: capture.mimeType,
          coordinate: capture.coordinate,
          place: placeContext,
          year: activeEra,
        });
        if (cancelled) return;
        setStep(3);
        const portal = await tripBackEngine.savePortal({
          walkId: activeWalk?.walkId,
          placeTitle: displayName,
          year: activeEra,
          coordinate: capture.coordinate,
          originHeading: capture.heading,
          modernBase64: capture.base64,
          modernMimeType: capture.mimeType,
          generatedBase64: result.base64,
          generatedMimeType: result.mimeType,
        });
        if (cancelled) return;
        rememberPortal(targetId, {
          portalId: portal.id,
          year: activeEra,
          modernUri: capture.uri,
          thenUri: result.imageDataUri,
          placeTitle: displayName,
          coordinate: capture.coordinate,
          createdAt: portal.createdAt,
        });
        if (!isPlace) {
          registerDiscovery(targetId, {
            name: displayName,
            era: activeEra,
            blurb: placeContext.summary,
          });
        }
        markOpened(targetId);
        recordStop(targetId, activeEra, portal.id, displayName);
        setPendingCapture(undefined);
        setStep(4);
        const dest = isPlace
          ? `/site/${place.id}`
          : `/discover/${encodeURIComponent(targetId)}?name=${encodeURIComponent(displayName)}`;
        setTimeout(() => {
          if (cancelled) return;
          if (router.canDismiss()) router.dismissTo(dest);
          else router.replace(dest);
          if (mode === 'ar') void openPortalViewer(portal.id);
        }, 400);
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spinA = useSharedValue(0);
  const spinB = useSharedValue(0);
  useEffect(() => {
    spinA.value = withRepeat(
      withTiming(360, { duration: 9000, easing: Easing.linear }),
      -1,
    );
    spinB.value = withRepeat(
      withTiming(-360, { duration: 14000, easing: Easing.linear }),
      -1,
    );
  }, [spinA, spinB]);
  const ringAStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinA.value}deg` }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinB.value}deg` }],
  }));

  return (
    <View style={styles.root}>
      <Motion kind="pop" duration={500} style={styles.rings}>
        <Animated.View style={[StyleSheet.absoluteFill, ringAStyle]}>
          <Svg width={200} height={200} viewBox="0 0 200 200">
            <Circle
              cx={100}
              cy={100}
              r={98}
              stroke={Palette.lime}
              strokeWidth={4}
              strokeDasharray="14 12"
              fill="none"
            />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, ringBStyle]}>
          <Svg width={200} height={200} viewBox="0 0 200 200">
            <Circle
              cx={100}
              cy={100}
              r={76}
              stroke="rgba(108,59,255,0.7)"
              strokeWidth={3}
              strokeDasharray="30 22"
              fill="none"
            />
          </Svg>
        </Animated.View>
        <View style={styles.photo}>
          {pendingCapture?.uri ? (
            <Image
              source={{ uri: pendingCapture.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoEmpty} />
          )}
        </View>
      </Motion>

      <Motion kind="rise" delay={120} style={styles.copy}>
        <Text style={styles.h}>
          {error ? 'Couldn’t paint this view' : `Painting ${activeEra} from your angle`}
        </Text>
        <Text style={styles.sub}>
          {error ?? 'Blending the archival plates with the photo you just took.'}
        </Text>
      </Motion>

      {error ? (
        <Pressable onPress={() => router.back()} style={styles.retry}>
          <Text style={styles.retryText}>‹ Back to camera</Text>
        </Pressable>
      ) : (
        <Motion kind="rise" delay={200} style={styles.steps}>
          {steps.map((label, i) => {
            const done = step > i;
            const active = step === i;
            return (
              <View
                key={label}
                style={[styles.stepRow, { opacity: done || active ? 1 : 0.45 }]}
              >
                <View
                  style={[
                    styles.stepDot,
                    done
                      ? { backgroundColor: Palette.lime }
                      : active
                        ? { borderWidth: 3, borderStyle: 'dashed', borderColor: Palette.lime }
                        : { borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
                  ]}
                >
                  {done && <Text style={styles.stepTick}>✓</Text>}
                </View>
                <Text style={[styles.stepLabel, active && { color: Palette.lime }]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </Motion>
      )}

      <View style={styles.footer}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${18 + step * 20}%` }]} />
        </View>
        <Text style={styles.footNote}>Usually takes about 15 seconds</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.ink,
    alignItems: 'center',
  },
  rings: {
    marginTop: 100,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 26,
    overflow: 'hidden',
    transform: [{ rotate: '-5deg' }],
    boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
  },
  photoEmpty: {
    flex: 1,
    backgroundColor: Palette.purple,
  },
  copy: {
    marginTop: 38,
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 40,
  },
  h: {
    fontFamily: Fonts.display,
    fontSize: 27,
    lineHeight: 30,
    color: Palette.white,
    textAlign: 'center',
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  steps: {
    marginTop: 32,
    alignSelf: 'stretch',
    paddingHorizontal: 48,
    gap: 13,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTick: { fontFamily: Fonts.display, fontSize: 13, color: Palette.ink },
  stepLabel: { fontFamily: Fonts.bodySemi, fontSize: 14.5, color: Palette.white },
  retry: {
    marginTop: 28,
    backgroundColor: Palette.lime,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  retryText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Palette.ink },
  footer: {
    marginTop: 'auto',
    marginBottom: 44,
    alignSelf: 'stretch',
    paddingHorizontal: 48,
    alignItems: 'center',
    gap: 11,
  },
  barTrack: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Palette.lime,
  },
  footNote: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
});
