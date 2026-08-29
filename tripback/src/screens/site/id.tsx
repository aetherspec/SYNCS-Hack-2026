import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Motion } from '@/components/motion';
import { useAppState } from '@/components/app-state';
import { PlaceHero } from '@/components/time-slider';
import { useOpenTimePortal } from '@/components/use-open-time-portal';
import { usePlacePhoto } from '@/components/use-place-photo';
import { findPlace } from '@/constants/places';
import { Fonts, Palette } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from '@/nav';

export default function SiteDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = findPlace(id);
  const [eraIdx, setEraIdx] = useState(0);
  const { opened, sitePortals, loadPortalMedia } = useAppState();
  const era = place.eras[Math.min(eraIdx, place.eras.length - 1)] ?? place.eras[0]!;
  const portal = sitePortals[place.id];
  const sliderW = Math.min(430, width) - 40;
  const { open, busy } = useOpenTimePortal(place.id, era, place.name);
  const photoUri = usePlacePhoto(place.name);

  useEffect(() => {
    if (portal?.portalId && !portal.thenUri) {
      void loadPortalMedia(place.id, portal.portalId);
    }
  }, [loadPortalMedia, place.id, portal?.portalId, portal?.thenUri]);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 168 }}>
        <Motion kind="drop" duration={400} style={styles.topRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/map'))}
            style={styles.back}
          >
            <Text style={styles.backText}>‹ Map</Text>
          </Pressable>
          {opened[place.id] && (
            <View style={styles.openedBadge}>
              <Text style={styles.openedBadgeText}>Portal opened ✨</Text>
            </View>
          )}
        </Motion>

        <Motion kind="pop" style={{ paddingHorizontal: 20 }}>
          <PlaceHero
            width={sliderW}
            height={300}
            era={portal?.year ?? era}
            thenUri={portal?.thenUri}
            nowUri={portal?.modernUri}
            photoUri={photoUri}
          />
        </Motion>

        <View style={styles.body}>
          <Motion kind="rise" delay={80} style={{ gap: 2 }}>
            <Text style={styles.name}>{place.name}</Text>
            <Text style={styles.meta}>
              {place.est} · {place.dist}
            </Text>
          </Motion>

          <Motion kind="rise" delay={140} style={styles.chips}>
            {place.eras.map((year, i) => (
              <Pressable
                key={year}
                onPress={() => setEraIdx(i)}
                style={[styles.chip, i === eraIdx && styles.chipActive]}
              >
                <Text style={[styles.chipText, i === eraIdx && styles.chipTextActive]}>
                  {year}
                </Text>
              </Pressable>
            ))}
          </Motion>

          <Motion kind="rise" delay={200}>
            <Text style={styles.blurb}>{place.blurb}</Text>
          </Motion>
        </View>
      </ScrollView>

      <Motion kind="rise" delay={280} style={styles.arBar}>
        <Pressable
          onPress={() => void open()}
          style={styles.arBtn}
        >
          <Text style={styles.arBtnText}>
            {busy
              ? 'Opening camera…'
              : portal
                ? 'Take another photo 📷'
                : 'Take a photo 📷'}
          </Text>
        </Pressable>
      </Motion>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.white },
  topRow: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: {
    backgroundColor: Palette.cloud,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  backText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.ink },
  openedBadge: {
    backgroundColor: Palette.lime,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  openedBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Palette.ink },
  body: { paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  name: {
    fontFamily: Fonts.display,
    fontSize: 25,
    lineHeight: 28,
    color: Palette.ink,
  },
  meta: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Palette.muted },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Palette.cloud,
  },
  chipActive: { backgroundColor: Palette.ink },
  chipText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#55555F' },
  chipTextActive: { color: Palette.lime },
  blurb: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
    color: Palette.body,
  },
  sources: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.lavender,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  sourcesText: {
    flex: 1,
    fontFamily: Fonts.bodySemi,
    fontSize: 12.5,
    lineHeight: 17,
    color: Palette.inkSoft,
  },
  arBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    gap: 8,
  },
  lookBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: Palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Palette.lime },
  arBtn: {
    height: 58,
    boxShadow: '0 10px 26px rgba(108,59,255,0.4)',
    borderRadius: 999,
    backgroundColor: Palette.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arBtnText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Palette.white },
});
