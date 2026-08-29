import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAppState } from '@/components/app-state';
import { Redirect, useLocalSearchParams, useRouter } from '@/nav';

import { Motion } from '@/components/motion';
import { HistoricalVideoAction } from '@/components/historical-video';
import { PlaceHero } from '@/components/time-slider';
import { WalkMap } from '@/components/walk-map';
import { PLACES } from '@/constants/places';
import { Fonts, Palette } from '@/constants/theme';

export default function WalkDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { walks, discovered, sitePortals, loadPortalMedia, openPortalViewer } = useAppState();
  const walk = walks.find((item) => item.id === id) ?? walks[0];
  const [portal, setPortal] = useState(-1);

  useEffect(() => {
    if (portal < 0) return;
    const stop = walk?.stops[portal];
    if (stop?.portalId) void loadPortalMedia(stop.id, stop.portalId);
  }, [loadPortalMedia, portal, walk]);

  if (!walk) return <Redirect href="/walks" />;

  const rows = walk.stops.map((st, i) => ({
    n: String(i + 1),
    id: st.id,
    name:
      st.name ??
      discovered[st.id]?.name ??
      PLACES.find((item) => item.id === st.id)?.name ??
      'Saved place',
    meta: `${st.time} · viewed ${st.era}`,
    tint: walk.tints[i] ?? Palette.butter,
    coordinate: st.coordinate,
  }));

  const st = walk.stops[Math.max(0, portal)] ?? walk.stops[0];
  const d = st ? discovered[st.id] : undefined;
  const pl = PLACES.find((item) => item.id === st?.id);
  const p = d
    ? {
        id: st!.id,
        name: d.name,
        meta: `Opened ${st!.time}`,
        eras: [st!.era],
        blurb: d.blurb,
        activeEra: st!.era,
        thumb: d.thumb,
      }
    : pl
      ? {
          id: pl.id,
          name: pl.name,
          meta: `${pl.est} · opened ${st?.time ?? ''}`,
          eras: pl.eras,
          blurb: pl.blurb,
          activeEra: st?.era ?? pl.eras[0],
          thumb: undefined as string | undefined,
        }
      : {
          id: st?.id ?? 'unknown',
          name: st?.name ?? 'Saved place',
          meta: `Opened ${st?.time ?? ''}`,
          eras: st?.era ? [st.era] : ['1900'],
          blurb: 'Saved from this walk.',
          activeEra: st?.era ?? '1900',
          thumb: undefined as string | undefined,
        };
  const sliderW = Math.min(430, width) - 40;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 24 }}>
        <Motion kind="drop" duration={400} style={styles.topRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/walks'))}
            style={styles.back}
          >
            <Text style={styles.backText}>‹ Walks</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>{walk.name}</Text>
            <Text style={styles.meta}>
              {walk.when} · {walk.km} km · {walk.mins} min
            </Text>
          </View>
        </Motion>

        <Motion kind="pop" delay={80} duration={500}>
          <WalkMap
            height={230}
            label={`${walk.portals} ${walk.portals === 1 ? 'portal' : 'portals'} opened`}
            route={walk.route}
            stops={rows.map((row) => ({
              id: row.id,
              name: row.name,
              coordinate: row.coordinate,
            }))}
          />
        </Motion>

        <Motion kind="rise" delay={140} style={styles.timeline}>
          {rows.length === 0 ? (
            <Text style={styles.stopMeta}>No portals on this walk.</Text>
          ) : (
            rows.map((ws, i) => (
              <View key={ws.n} style={styles.stopRow}>
                <View style={styles.stopRail}>
                  <View style={styles.stopDone}>
                    <Text style={styles.stopNum}>{ws.n}</Text>
                  </View>
                  {i < rows.length - 1 && <View style={styles.stopLine} />}
                </View>
                <View style={styles.stopBody}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.stopName}>{ws.name}</Text>
                    <Text style={styles.stopMeta}>{ws.meta}</Text>
                  </View>
                  <Pressable
                    onPress={() => setPortal(i)}
                    style={[styles.stopThumb, { backgroundColor: ws.tint }]}
                  >
                    <Text style={{ fontSize: 18 }}>🔭</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Motion>
      </ScrollView>

      {portal >= 0 && st && (
        <View style={styles.portalOverlay}>
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
            <Motion kind="drop" duration={400} style={styles.portalTop}>
              <Pressable onPress={() => setPortal(-1)} style={styles.back}>
                <Text style={styles.backText}>‹ Back</Text>
              </Pressable>
              <View style={styles.openedBadge}>
                <Text style={styles.openedBadgeText}>Portal opened ✨</Text>
              </View>
            </Motion>
            <Motion kind="pop" style={{ paddingHorizontal: 20 }}>
              <PlaceHero
                width={sliderW}
                height={300}
                era={p.activeEra ?? '1900'}
                thenUri={sitePortals[p.id]?.thenUri}
                nowUri={sitePortals[p.id]?.modernUri}
                photoUri={p.thumb}
              />
            </Motion>
            <View style={styles.portalBody}>
              <Motion kind="rise" delay={80} style={{ gap: 2 }}>
                <Text style={styles.portalName}>{p.name}</Text>
                <Text style={styles.meta}>{p.meta}</Text>
              </Motion>
              <Motion kind="rise" delay={140} style={{ flexDirection: 'row', gap: 8 }}>
                {(p.eras ?? []).map((year) => (
                  <View
                    key={year}
                    style={[
                      styles.eraChip,
                      year === p.activeEra && { backgroundColor: Palette.ink },
                    ]}
                  >
                    <Text
                      style={[
                        styles.eraChipText,
                        year === p.activeEra && { color: Palette.lime },
                      ]}
                    >
                      {year}
                    </Text>
                  </View>
                ))}
              </Motion>
              <Motion kind="rise" delay={200}>
                <Text style={styles.portalBlurb}>{p.blurb}</Text>
              </Motion>
              {st.portalId ? (
                <>
                  <Motion kind="rise" delay={230}>
                    <HistoricalVideoAction
                      siteId={st.id}
                      portalId={st.portalId}
                      title={p.name}
                      year={st.era}
                      videoUri={sitePortals[st.id]?.videoUri}
                    />
                  </Motion>
                  <Motion kind="rise" delay={260}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void openPortalViewer(st.portalId!)}
                      style={styles.placeArBtn}
                    >
                      <Text style={styles.placeArBtnText}>Place in AR ✦</Text>
                    </Pressable>
                  </Motion>
                </>
              ) : null}
            </View>
          </ScrollView>
        </View>
      )}
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
    alignItems: 'center',
    gap: 13,
  },
  back: {
    backgroundColor: Palette.cloud,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  backText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.ink },
  title: { fontFamily: Fonts.display, fontSize: 22, color: Palette.ink },
  meta: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Palette.muted },
  timeline: { paddingTop: 18, paddingHorizontal: 20 },
  stopRow: { flexDirection: 'row', gap: 14 },
  stopRail: { width: 44, alignItems: 'center' },
  stopDone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNum: { fontFamily: Fonts.display, fontSize: 16, color: Palette.ink },
  stopLine: { width: 3, flex: 1, backgroundColor: '#C9C7D4' },
  stopBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  stopName: { fontFamily: Fonts.displayBold, fontSize: 17, color: Palette.ink },
  stopMeta: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Palette.muted },
  stopThumb: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '3deg' }],
  },
  portalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    backgroundColor: Palette.white,
  },
  portalTop: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openedBadge: {
    backgroundColor: Palette.lime,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  openedBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Palette.ink },
  portalBody: { paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  portalName: {
    fontFamily: Fonts.display,
    fontSize: 25,
    lineHeight: 28,
    color: Palette.ink,
  },
  eraChip: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Palette.cloud,
  },
  eraChipText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.ink },
  portalBlurb: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
    color: Palette.body,
  },
  placeArBtn: {
    height: 58,
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 26px rgba(16,16,20,0.2)',
  },
  placeArBtnText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Palette.ink },
});
