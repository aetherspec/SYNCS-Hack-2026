import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRouter } from '@/nav';

import { useAppState } from '@/components/app-state';
import { Motion } from '@/components/motion';
import { SiteMap, SiteMapHandle } from '@/components/site-map';
import type { MapViewport } from '@/components/map-types';
import { TabBar } from '@/components/tab-bar';
import { formatMeters, haversine, useNearby } from '@/components/use-nearby';
import { AHEAD_COORDS, DONE_COORDS, tidy } from '@/components/walk-route';
import { PLACES, USER_GEO, findPlace } from '@/constants/places';
import { Fonts, Palette } from '@/constants/theme';

export default function MapScreen() {
  const router = useRouter();
  const { opened, activeWalk, startWalk, endWalk, location } = useAppState();
  const mapCtl = useRef<SiteMapHandle>(null);
  const [lookAt, setLookAt] = useState<MapViewport | null>(null);
  const nearby = useNearby(lookAt);
  const browseGeo: [number, number] = lookAt?.center
    ?? (location ? [location.longitude, location.latitude] : USER_GEO);

  const openSite = (id: string) => {
    stopDemo();
    router.push(`/site/${id}`);
  };

  // Tick every 30 s while walking so the elapsed minutes stay fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeWalk) return;
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, [activeWalk]);

  const walkMins = activeWalk
    ? Math.max(1, Math.round((Date.now() - activeWalk.startedAt) / 60000))
    : 0;
  const finishWalk = () => {
    const hadStops = !!activeWalk && activeWalk.stops.length > 0;
    void endWalk().then(() => {
      if (hadStops) router.replace('/walks');
    });
  };

  // Demo mode: replay the Rocks-loop route — the dot walks the real streets
  // and the nudge fires as it passes each site (like the native demo).
  const demoRoute = useMemo(() => {
    const pts = [...tidy(DONE_COORDS), ...tidy(AHEAD_COORDS)];
    // Densify so the dot glides (~150 samples ≈ an 18 s replay).
    const out: [number, number][] = [];
    const per = Math.max(2, Math.ceil(150 / pts.length));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const [ax, ay] = a;
      const [bx, by] = b;
      for (let k = 0; k < per; k++) {
        const t = k / per;
        out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      }
    }
    out.push(pts[pts.length - 1]!);
    return out;
  }, []);
  const [demoOn, setDemoOn] = useState(false);
  const [demoSite, setDemoSite] = useState<string | null>(null);
  const demoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoIdx = useRef(0);

  const stopDemo = () => {
    if (demoTimer.current) clearInterval(demoTimer.current);
    demoTimer.current = null;
    setDemoOn(false);
    setDemoSite(null);
    mapCtl.current?.setUser(USER_GEO);
    mapCtl.current?.recenter();
  };
  const startDemo = () => {
    if (demoTimer.current) return;
    setDemoOn(true);
    demoIdx.current = 0;
    demoTimer.current = setInterval(() => {
      const i = demoIdx.current;
      if (i >= demoRoute.length) {
        stopDemo();
        return;
      }
      const pos = demoRoute[i];
      if (!pos) {
        stopDemo();
        return;
      }
      mapCtl.current?.setUser(pos, true);
      const near = PLACES.find(pl => haversine(pos, pl.geo) < 90);
      setDemoSite(near ? near.id : null);
      demoIdx.current = i + 1;
    }, 120);
  };
  useEffect(() => stopDemo, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The nudge points at the nearest portal you haven't opened yet — or, in
  // demo mode, at whichever site the dot is walking past right now.
  const closestCurated = [...PLACES]
    .filter((place) => !opened[place.id])
    .sort((a, b) => haversine(browseGeo, a.geo) - haversine(browseGeo, b.geo))[0];
  const target = demoSite
    ? findPlace(demoSite)
    : closestCurated && haversine(browseGeo, closestCurated.geo) <= 3_000
      ? closestCurated
      : undefined;
  const targetMeters = target ? formatMeters(haversine(browseGeo, target.geo)) : '';
  const targetArea = target ? target.dist.split(' · ')[1] : '';
  const targetRange = target
    ? `${target.eras[0]} – ${target.eras[target.eras.length - 1]}`
    : '';
  const bannerSub = demoSite
    ? `${target?.name} · just ahead ${target?.approach}`
    : `${target?.name} · ${targetMeters} ${target?.approach}`;

  return (
    <View style={styles.root}>
      <SiteMap
        ref={mapCtl}
        opened={opened}
        onSelect={openSite}
        discoveries={nearby ?? []}
        onLookAt={setLookAt}
        onSelectDiscovery={(wid, wtitle) => {
          stopDemo();
          router.push(
            `/discover/${encodeURIComponent(wid)}?name=${encodeURIComponent(wtitle)}`,
          );
        }}
      />

      {target && (
        <Motion kind="drop" style={styles.banner}>
          <Pressable style={styles.bannerInner} onPress={() => openSite(target.id)}>
            <View style={styles.bannerIcon}>
              <Text style={styles.bannerIconText}>!</Text>
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Something happened here 👀</Text>
              <Text style={styles.bannerSub}>{bannerSub}</Text>
            </View>
            <Text style={styles.bannerView}>View</Text>
          </Pressable>
        </Motion>
      )}

      <View style={styles.controls}>
        <Pressable style={styles.ctrlBtn} onPress={() => mapCtl.current?.zoomIn()}>
          <Text style={styles.ctrlText}>+</Text>
        </Pressable>
        <Pressable style={styles.ctrlBtn} onPress={() => mapCtl.current?.zoomOut()}>
          <Text style={styles.ctrlText}>−</Text>
        </Pressable>
        <Pressable
          style={[styles.ctrlBtn, { backgroundColor: Palette.purple }]}
          onPress={() => mapCtl.current?.recenter()}
        >
          <Text style={styles.ctrlText}>🧭</Text>
        </Pressable>
      </View>

      <View style={styles.walkChipWrap}>
        {activeWalk ? (
          <View style={styles.walkActive}>
            <View style={styles.recDot} />
            <Text style={styles.walkActiveText}>
              Walking · {activeWalk.stops.length}{' '}
              {activeWalk.stops.length === 1 ? 'portal' : 'portals'} · {walkMins} min
            </Text>
            <Pressable onPress={finishWalk} style={styles.endWalkBtn}>
              <Text style={styles.endWalkBtnText}>End walk</Text>
            </Pressable>
          </View>
        ) : demoOn ? (
          <View style={styles.walkActive}>
            <View style={[styles.recDot, { backgroundColor: Palette.purple }]} />
            <Text style={styles.walkActiveText}>Demo · replaying The Rocks loop</Text>
            <Pressable onPress={stopDemo} style={styles.endWalkBtn}>
              <Text style={styles.endWalkBtnText}>Stop</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => void startWalk()} style={styles.startWalkBtn}>
              <Text style={styles.startWalkBtnText}>▶ Start a walk</Text>
            </Pressable>
            <Pressable onPress={startDemo} style={styles.demoBtn}>
              <Text style={styles.demoBtnText}>Demo</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Motion kind="rise" delay={120} duration={550} style={styles.rail}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
        >
          {!demoSite && target ? (
            <Pressable
              style={[styles.cardInner, { width: 330 }]}
              onPress={() => openSite(target.id)}
            >
              <View style={[styles.cardThumb, styles.yearThumb]}>
                <Text style={styles.yearThumbText}>{target.eras[0]}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {target.name}
                </Text>
                <Text style={styles.cardMeta}>
                  {target.eras.length} eras · {targetRange}
                </Text>
                <View style={styles.cardChips}>
                  <View style={[styles.chip, { backgroundColor: Palette.lavender }]}>
                    <Text style={[styles.chipText, { color: Palette.purple }]}>
                      {targetMeters} · {targetArea}
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: Palette.lime }]}>
                    <Text style={[styles.chipText, { color: Palette.ink }]}>
                      new for you
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardGo}>
                <Text style={styles.cardGoText}>›</Text>
              </View>
            </Pressable>
          ) : !demoSite && nearby?.length === 0 ? (
            <View style={[styles.cardInner, { width: 330 }]}>
              <View style={[styles.cardThumb, styles.yearThumb]}>
                <Text style={styles.yearThumbText}>✓</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>All caught up 🎉</Text>
                <Text style={styles.cardMeta}>
                  You’ve opened every portal around here — but the city has more
                  stories. Keep browsing nearby.
                </Text>
              </View>
            </View>
          ) : null}

          {nearby === null && (
            <View style={[styles.cardInner, styles.wikiCard]}>
              <Text style={styles.cardMeta}>Looking for stories nearby…</Text>
            </View>
          )}
          {nearby?.map(np => (
            <Pressable
              key={np.id}
              style={[styles.cardInner, styles.wikiCard]}
              onPress={() => {
                mapCtl.current?.flyTo(np.geo);
                router.push(
                  `/discover/${encodeURIComponent(np.id)}?name=${encodeURIComponent(np.title)}`,
                );
              }}
            >
              {np.thumb ? (
                <Image source={{ uri: np.thumb }} style={styles.wikiThumb} />
              ) : (
                <View style={[styles.wikiThumb, styles.wikiThumbEmpty]}>
                  <Text style={{ fontSize: 22 }}>🏛️</Text>
                </View>
              )}
              <View style={styles.cardText}>
                <Text style={styles.wikiDist}>{formatMeters(np.meters)} away</Text>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {np.title}
                </Text>
                <Text style={styles.wikiDesc} numberOfLines={2}>
                  {np.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </Motion>

      <TabBar active="Map" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.lavender },
  banner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.ink,
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 16,
    boxShadow: '0 10px 24px rgba(16,16,20,0.28)',
  },
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconText: { fontFamily: Fonts.display, fontSize: 18, color: Palette.ink },
  bannerText: { flex: 1, gap: 1 },
  bannerTitle: { fontFamily: Fonts.displayBold, fontSize: 15, color: Palette.lime },
  bannerSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Palette.white },
  bannerView: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Palette.lime },
  controls: {
    position: 'absolute',
    right: 16,
    top: 140,
    gap: 8,
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(16,16,20,0.18)',
  },
  ctrlText: { fontFamily: Fonts.display, fontSize: 19, color: Palette.ink },
  walkChipWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 224,
    alignItems: 'center',
  },
  startWalkBtn: {
    backgroundColor: Palette.ink,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
    boxShadow: '0 8px 22px rgba(16,16,20,0.25)',
  },
  startWalkBtnText: { fontFamily: Fonts.displayBold, fontSize: 15, color: Palette.lime },
  demoBtn: {
    backgroundColor: Palette.white,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    boxShadow: '0 8px 22px rgba(16,16,20,0.18)',
  },
  demoBtnText: { fontFamily: Fonts.displayBold, fontSize: 15, color: Palette.purple },
  walkActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Palette.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    boxShadow: '0 8px 22px rgba(16,16,20,0.18)',
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.pink,
  },
  walkActiveText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Palette.ink },
  endWalkBtn: {
    backgroundColor: Palette.ink,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  endWalkBtnText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Palette.lime },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
  },
  railContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'stretch',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.white,
    borderRadius: 26,
    padding: 14,
    boxShadow: '0 14px 34px rgba(16,16,20,0.22)',
  },
  wikiCard: { width: 280 },
  cardThumb: {
    width: 70,
    height: 70,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Palette.lavender,
  },
  yearThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.lavender,
  },
  yearThumbText: { fontFamily: Fonts.display, fontSize: 16, color: Palette.purple },
  wikiThumb: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Palette.lavender,
  },
  wikiThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 3, minWidth: 0 },
  cardTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 16,
    lineHeight: 20,
    color: Palette.ink,
  },
  cardMeta: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Palette.body },
  wikiDist: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Palette.purple },
  wikiDesc: {
    fontFamily: Fonts.body,
    fontSize: 11.5,
    lineHeight: 15,
    color: Palette.muted,
  },
  cardChips: { flexDirection: 'row', gap: 6, marginTop: 2 },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: { fontFamily: Fonts.bodyBold, fontSize: 11 },
  cardGo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGoText: { fontFamily: Fonts.display, fontSize: 16, color: Palette.lime },
});
