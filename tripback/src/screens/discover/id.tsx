import { useLocalSearchParams, useRouter } from '@/nav';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { currentCoordinate, useAppState } from '@/components/app-state';
import { Motion } from '@/components/motion';
import { PlaceHero } from '@/components/time-slider';
import { useOpenTimePortal } from '@/components/use-open-time-portal';
import { usePlacePhoto } from '@/components/use-place-photo';
import { formatMeters, haversine } from '@/components/use-nearby';
import { Fonts, Palette } from '@/constants/theme';

// Detail page generated on the fly for a live-discovered Wikipedia place —
// the same shape the discovery engine produces: summary text, real photo,
// candidate eras extracted from the article, and a portal to open.

type WikiDetail = {
  extract: string;
  thumb?: string;
  description?: string;
  meters?: number;
};

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const wikiId = id ?? '';
  const title = typeof name === 'string' && name ? name : 'Discovered place';
  const { opened, registerDiscovery, location, sitePortals, loadPortalMedia } =
    useAppState();
  const [data, setData] = useState<WikiDetail | null>(null);
  const [eraIdx, setEraIdx] = useState(0);
  const origin = currentCoordinate(location);
  const pageId = id?.startsWith('wikipedia:') ? id.slice('wikipedia:'.length) : id;

  useEffect(() => {
    let cancelled = false;
    if (!pageId || id.startsWith('heritage-nsw:')) {
      setData({ extract: 'Heritage listing found nearby.' });
      return;
    }
    const url =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*' +
      `&pageids=${pageId}&prop=extracts%7Cpageimages%7Ccoordinates%7Cdescription` +
      '&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=640';
    fetch(url)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        const pg = j?.query?.pages?.[String(pageId)] ?? j?.query?.pages?.[pageId];
        if (!pg) {
          setData({ extract: 'No article details available.' });
          return;
        }
        const coord = pg.coordinates?.[0];
        setData({
          extract: (pg.extract ?? '').trim() || 'No article details available.',
          thumb: pg.thumbnail?.source,
          description: pg.description,
          meters: coord
            ? haversine(
                [origin.longitude, origin.latitude],
                [coord.lon, coord.lat],
              )
            : undefined,
        });
      })
      .catch(() => {
        if (!cancelled) setData({ extract: 'Couldn’t reach Wikipedia just now.' });
      });
    return () => {
      cancelled = true;
    };
  }, [id, origin.latitude, origin.longitude, pageId]);

  // Candidate eras: years mentioned in the article intro (earliest first).
  const eras = (() => {
    const found = [...new Set(data?.extract.match(/\b1[89]\d{2}\b/g) ?? [])]
      .map(Number)
      .sort((a, b) => a - b)
      .slice(0, 3)
      .map(String);
    return found.length ? found : ['1900'];
  })();
  const era = eras[Math.min(eraIdx, eras.length - 1)] ?? '1900';
  const blurb =
    (data?.extract ?? '').length > 460
      ? `${data!.extract.slice(0, 460).trim()}…`
      : (data?.extract ?? '');

  const portal = sitePortals[wikiId];
  const sliderW = Math.min(430, width) - 40;
  const { open, busy } = useOpenTimePortal(wikiId, era, title);
  const fetchedPhoto = usePlacePhoto(title);
  const photoUri = data?.thumb ?? fetchedPhoto;

  useEffect(() => {
    if (portal?.portalId && !portal.thenUri) {
      void loadPortalMedia(wikiId, portal.portalId);
    }
  }, [loadPortalMedia, portal?.portalId, portal?.thenUri, wikiId]);

  const openPortal = () => {
    registerDiscovery(wikiId, {
      name: title,
      era,
      blurb: blurb || title,
      thumb: data?.thumb,
    });
    void open();
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 104 }}>
        <Motion kind="drop" duration={400} style={styles.topRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/map'))}
            style={styles.back}
          >
            <Text style={styles.backText}>‹ Map</Text>
          </Pressable>
          {opened[wikiId] ? (
            <View style={styles.openedBadge}>
              <Text style={styles.openedBadgeText}>Portal opened ✨</Text>
            </View>
          ) : (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>Live discovery</Text>
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
            <Text style={styles.name}>{title}</Text>
            <Text style={styles.meta}>
              {data?.description ?? 'Historical site'}
              {data?.meters != null ? ` · ${formatMeters(data.meters)} away` : ''}
            </Text>
          </Motion>

          <Motion kind="rise" delay={140} style={styles.chips}>
            {eras.map((y, i) => (
              <Pressable
                key={y}
                onPress={() => setEraIdx(i)}
                style={[styles.chip, i === eraIdx && styles.chipActive]}
              >
                <Text style={[styles.chipText, i === eraIdx && styles.chipTextActive]}>
                  {y}
                </Text>
              </Pressable>
            ))}
          </Motion>

          <Motion kind="rise" delay={200}>
            <Text style={styles.blurb}>{blurb || 'Loading the story…'}</Text>
          </Motion>
        </View>
      </ScrollView>

      <Motion kind="rise" delay={280} style={styles.arBar}>
        <Pressable onPress={openPortal} style={styles.arBtn}>
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
  liveBadge: {
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  liveBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Palette.purple },
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
    borderRadius: 999,
    backgroundColor: Palette.purple,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 26px rgba(108,59,255,0.4)',
  },
  arBtnText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Palette.white },
});
