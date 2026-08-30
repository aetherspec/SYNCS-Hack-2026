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
import { EraPicker } from '@/components/era-picker';
import { HistoricalVideoAction } from '@/components/historical-video';
import { MediaSaveActions } from '@/components/media-save-actions';
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
  const [selectedEra, setSelectedEra] = useState(place.eras[0]!);
  const { opened, sitePortals, loadPortalMedia, openPortalViewer } = useAppState();
  const era = selectedEra;
  const event = place.events.find((item) => item.year === era) ?? place.events[0];
  const portal = sitePortals[place.id];
  const sliderW = Math.min(430, width) - 40;
  const { open, busy } = useOpenTimePortal(place.id, era, place.name);
  const photoUri = usePlacePhoto(place.name);

  useEffect(() => {
    setSelectedEra(place.eras[0]!);
  }, [place.id, place.eras]);

  useEffect(() => {
    if (portal?.portalId && !portal.thenUri) {
      void loadPortalMedia(place.id, portal.portalId);
    }
  }, [loadPortalMedia, place.id, portal?.portalId, portal?.thenUri]);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 190 }}>
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
          <MediaSaveActions
            modernUri={portal?.modernUri}
            historicalUri={portal?.thenUri}
            year={portal?.year ?? era}
          />
        </Motion>

        <View style={styles.body}>
          <Motion kind="rise" delay={80} style={{ gap: 2 }}>
            <Text style={styles.name}>{place.name}</Text>
            <Text style={styles.meta}>
              {place.est} · {place.dist}
            </Text>
          </Motion>

          <Motion kind="rise" delay={140}>
            <EraPicker value={era} options={place.eras} onChange={setSelectedEra} />
          </Motion>

          <Motion kind="rise" delay={200}>
            <View style={styles.eventCard}>
              <Text style={styles.eventEyebrow}>{era} · WHY THIS YEAR</Text>
              <Text style={styles.eventTitle}>
                {event?.title ?? 'Your chosen reconstruction year'}
              </Text>
              <Text style={styles.eventDetail}>
                {event?.detail ??
                  `TripBack will use the known history of ${place.name} to imagine this viewpoint in ${era}.`}
              </Text>
            </View>
          </Motion>

          <Motion kind="rise" delay={230}>
            <Text style={styles.blurb}>{place.blurb}</Text>
          </Motion>
          {portal?.portalId ? (
            <Motion kind="rise" delay={250}>
              <HistoricalVideoAction
                siteId={place.id}
                portalId={portal.portalId}
                title={place.name}
                year={portal.year}
                videoUri={portal.videoUri}
              />
            </Motion>
          ) : null}
        </View>
      </ScrollView>

      <Motion kind="rise" delay={280} style={styles.arBar}>
        {portal?.portalId ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => void openPortalViewer(portal.portalId)}
              style={styles.lookBtn}
            >
              <Text style={styles.lookBtnText}>Place in AR ✦</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void open()} style={styles.retakeBtn}>
              <Text style={styles.retakeBtnText}>
                {busy ? 'Opening camera…' : 'Take another photo 📷'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable accessibilityRole="button" onPress={() => void open('photo')} style={styles.arBtn}>
              <Text style={styles.arBtnText}>{busy ? 'Opening camera…' : 'Take a photo 📷'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void open('ar')} style={styles.lookBtn}>
              <Text style={styles.lookBtnText}>{busy ? 'Opening camera…' : 'Create AR view ✦'}</Text>
            </Pressable>
          </>
        )}
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
  body: { paddingHorizontal: 20, paddingTop: 26, gap: 12 },
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
  eventCard: {
    padding: 16,
    gap: 5,
    borderRadius: 20,
    backgroundColor: Palette.lavender,
  },
  eventEyebrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    color: Palette.purple,
  },
  eventTitle: { fontFamily: Fonts.displayBold, fontSize: 17, color: Palette.ink },
  eventDetail: { fontFamily: Fonts.body, fontSize: 13.5, lineHeight: 19, color: Palette.body },
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
    height: 58,
    borderRadius: 999,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 26px rgba(16,16,20,0.24)',
  },
  lookBtnText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Palette.ink },
  retakeBtn: {
    height: 46,
    borderRadius: 999,
    backgroundColor: Palette.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.white },
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
