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
import { EraPicker } from '@/components/era-picker';
import { HistoricalVideoAction } from '@/components/historical-video';
import { PlaceHero } from '@/components/time-slider';
import { useOpenTimePortal } from '@/components/use-open-time-portal';
import { usePlacePhoto } from '@/components/use-place-photo';
import { formatMeters, haversine } from '@/components/use-nearby';
import { Fonts, Palette } from '@/constants/theme';
import { extractSignificantEraEvents, type EraEvent } from '@/domain/eras';
import { generateHeritageSummary } from '@/services/discovery/GeminiClient';

// Detail page generated on the fly for a live-discovered Wikipedia place —
// the same shape the discovery engine produces: summary text, real photo,
// candidate eras extracted from the article, and a portal to open.

type WikiDetail = {
  extract: string;
  thumb?: string;
  description?: string;
  meters?: number;
  events?: EraEvent[];
};

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const wikiId = id ?? '';
  const title = typeof name === 'string' && name ? name : 'Discovered place';
  const {
    opened,
    registerDiscovery,
    location,
    sitePortals,
    loadPortalMedia,
    openPortalViewer,
  } = useAppState();
  const [data, setData] = useState<WikiDetail | null>(null);
  const [selectedEra, setSelectedEra] = useState<string>();
  const origin = currentCoordinate(location);
  const pageId = id?.startsWith('wikipedia:') ? id.slice('wikipedia:'.length) : id;
  const isHeritagePlace = Boolean(id?.startsWith('heritage-nsw:'));

  useEffect(() => {
    setData(null);
  }, [wikiId]);

  useEffect(() => {
    let cancelled = false;
    if (!pageId) {
      setData({ extract: 'No article details available.' });
      return;
    }
    if (isHeritagePlace) {
      generateHeritageSummary(title, pageId, origin)
        .then(summary => {
          if (cancelled) return;
          setData({
            extract: summary.summary,
            description: summary.description,
            events: summary.events,
          });
        })
        .catch(() => {
          if (!cancelled) {
            setData({
              extract:
                'This place is recognised on the NSW State Heritage Register. Its full historical story could not be loaded just now.',
              description: 'NSW heritage place',
            });
          }
        });
      return () => {
        cancelled = true;
      };
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
  }, [id, isHeritagePlace, origin.latitude, origin.longitude, pageId, title]);

  const eraEvents = data?.events?.length
    ? data.events
    : extractSignificantEraEvents(data?.extract);
  const eras = eraEvents.length ? eraEvents.map((event) => event.year) : ['Historic'];
  const era = selectedEra ?? eras[0] ?? 'Historic';
  const selectedEvent = eraEvents.find((event) => event.year === era);
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
    setSelectedEra(undefined);
  }, [wikiId]);

  useEffect(() => {
    if (portal?.portalId && !portal.thenUri) {
      void loadPortalMedia(wikiId, portal.portalId);
    }
  }, [loadPortalMedia, portal?.portalId, portal?.thenUri, wikiId]);

  const openPortal = (mode: 'photo' | 'ar' = 'photo') => {
    registerDiscovery(wikiId, {
      name: title,
      era,
      blurb: blurb || title,
      thumb: data?.thumb,
    });
    void open(mode);
  };

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

          <Motion kind="rise" delay={140}>
            <EraPicker value={era} options={eras} onChange={setSelectedEra} />
          </Motion>

          <Motion kind="rise" delay={200}>
            {selectedEvent || /^\d{4}$/.test(era) ? (
              <View style={styles.eventCard}>
                <Text style={styles.eventEyebrow}>{era} · WHY THIS YEAR</Text>
                <Text style={styles.eventTitle}>
                  {selectedEvent?.title ?? 'Your chosen reconstruction year'}
                </Text>
                <Text style={styles.eventDetail}>
                  {selectedEvent?.detail ??
                    `TripBack will use the known history of ${title} to imagine this viewpoint in ${era}.`}
                </Text>
              </View>
            ) : (
              <Text style={styles.blurb}>{blurb || 'Loading the story…'}</Text>
            )}
          </Motion>
          {selectedEvent || /^\d{4}$/.test(era) ? (
            <Motion kind="rise" delay={230}>
              <Text style={styles.blurb}>{blurb}</Text>
            </Motion>
          ) : null}
          {portal?.portalId ? (
            <Motion kind="rise" delay={250}>
              <HistoricalVideoAction
                siteId={wikiId}
                portalId={portal.portalId}
                title={title}
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
            <Pressable accessibilityRole="button" onPress={() => openPortal('photo')} style={styles.retakeBtn}>
              <Text style={styles.retakeBtnText}>
                {busy ? 'Opening camera…' : 'Take another photo 📷'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable accessibilityRole="button" onPress={() => openPortal('photo')} style={styles.arBtn}>
              <Text style={styles.arBtnText}>{busy ? 'Opening camera…' : 'Take a photo 📷'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => openPortal('ar')}
              style={styles.lookBtn}
            >
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
  liveBadge: {
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  liveBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Palette.purple },
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
    borderRadius: 999,
    backgroundColor: Palette.purple,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 26px rgba(108,59,255,0.4)',
  },
  arBtnText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Palette.white },
});
