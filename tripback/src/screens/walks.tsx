import { useRouter } from '@/nav';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAppState } from '@/components/app-state';
import { Motion } from '@/components/motion';
import { TabBar } from '@/components/tab-bar';
import { PLACES } from '@/constants/places';
import { Fonts, Palette } from '@/constants/theme';

export default function WalksScreen() {
  const router = useRouter();
  const { walks, activeWalk, opened, discovered, sitePortals } = useAppState();

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeWalk) return;
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, [activeWalk]);

  const totalPortals =
    walks.reduce((n, w) => n + w.portals, 0) + (activeWalk?.stops.length ?? 0);
  const walkMins = activeWalk
    ? Math.max(1, Math.round((Date.now() - activeWalk.startedAt) / 60000))
    : 0;

  const heroWalk = activeWalk ? null : walks[0];
  const listWalks = activeWalk ? walks : walks.slice(1);

  const placesCount = Object.keys(opened).filter(k => opened[k]).length;
  const travelled = walks.reduce((n, w) => n + parseFloat(w.km), 0).toFixed(1);
  const walkedIds = new Set([
    ...walks.flatMap(w => w.stops.map(st => st.id)),
    ...(activeWalk?.stops.map(st => st.id) ?? []),
  ]);
  const otherPlaces = Object.keys(opened)
    .filter(k => opened[k] && !walkedIds.has(k))
    .map(k => {
      const pl = PLACES.find(x => x.id === k);
      if (pl)
        return {
          id: k,
          name: pl.name,
          era: pl.eras[0],
          stamp: pl.stamp,
          meta: 'Opened nearby',
          href: `/site/${k}`,
        };
      const d = discovered[k];
      if (!d) return null;
      return {
        id: k,
        name: d.name,
        era: d.era,
        stamp: Palette.lavender,
        meta: 'Opened nearby',
        href: `/discover/${encodeURIComponent(k)}?name=${encodeURIComponent(d.name)}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const openWalk = (id: string) =>
    router.push({ pathname: '/walk-detail', params: { id } });

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Motion kind="drop" style={{ gap: 2 }}>
          <Text style={styles.title}>Your walks</Text>
          <Text style={styles.subtitle}>
            {totalPortals} portals opened across {walks.length}{' '}
            {walks.length === 1 ? 'walk' : 'walks'}
          </Text>
        </Motion>

        <Motion kind="rise" delay={60} style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{placesCount}</Text>
            <Text style={styles.statLabel}>places</Text>
          </View>
          <View style={styles.statRule} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{walks.length}</Text>
            <Text style={styles.statLabel}>walks</Text>
          </View>
          <View style={styles.statRule} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{travelled} km</Text>
            <Text style={styles.statLabel}>travelled</Text>
          </View>
        </Motion>

        <Motion kind="pop" delay={80} duration={500}>
          {activeWalk ? (
            <Pressable style={styles.hero} onPress={() => router.replace('/map')}>
              <View style={styles.heroTop}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.heroName}>Walking now</Text>
                  <Text style={styles.heroMeta}>
                    Today · {activeWalk.stops.length}{' '}
                    {activeWalk.stops.length === 1 ? 'portal' : 'portals'} · {walkMins}{' '}
                    min
                  </Text>
                </View>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>in progress</Text>
                </View>
              </View>
              <View style={styles.heroBottom}>
                <RouteSquiggle />
                <View style={styles.heroThumbs}>
                  {activeWalk.stops.slice(0, 3).map((s, i) => {
                    const photo = sitePortals[s.id]?.thenUri ?? sitePortals[s.id]?.modernUri;
                    return (
                      <View
                        key={s.id}
                        style={[
                          styles.heroThumb,
                          styles.heroThumbMore,
                          {
                            backgroundColor: [Palette.butter, Palette.blush, Palette.sky][i],
                          },
                        ]}
                      >
                        {photo ? (
                          <Image
                            source={{ uri: photo }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.heroThumbMoreText}>{s.era}</Text>
                        )}
                      </View>
                    );
                  })}
                  {activeWalk.stops.length === 0 && (
                    <View style={[styles.heroThumb, styles.heroThumbMore]}>
                      <Text style={styles.heroThumbMoreText}>🔭</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ) : (
            heroWalk && (
              <Pressable style={styles.hero} onPress={() => openWalk(heroWalk.id)}>
                <View style={styles.heroTop}>
                  <View style={{ gap: 2 }}>
                    <Text style={styles.heroName}>{heroWalk.name}</Text>
                    <Text style={styles.heroMeta}>
                      {heroWalk.when} · {heroWalk.km} km · {heroWalk.portals} portals
                    </Text>
                  </View>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>latest</Text>
                  </View>
                </View>
                <View style={styles.heroBottom}>
                  <RouteSquiggle />
                  <View style={styles.heroThumbs}>
                    {heroWalk.stops.slice(0, 2).map((stop, i) => {
                      const photo =
                        sitePortals[stop.id]?.thenUri ?? sitePortals[stop.id]?.modernUri;
                      return (
                        <View
                          key={stop.id}
                          style={[
                            styles.heroThumb,
                            {
                              backgroundColor: [Palette.butter, Palette.blush][i],
                            },
                          ]}
                        >
                          {photo ? (
                            <Image
                              source={{ uri: photo }}
                              style={StyleSheet.absoluteFill}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={styles.heroThumbMoreText}>{stop.era}</Text>
                          )}
                        </View>
                      );
                    })}
                    {heroWalk.portals > 2 && (
                      <View style={[styles.heroThumb, styles.heroThumbMore]}>
                        <Text style={styles.heroThumbMoreText}>
                          +{heroWalk.portals - 2}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            )
          )}
        </Motion>

        {!activeWalk && walks.length === 0 && (
          <Motion kind="rise" delay={120} style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No walks stored yet</Text>
            <Text style={styles.emptyText}>
              Start a history walk from the Map — ending it saves the route and
              every portal you open along the way.
            </Text>
          </Motion>
        )}

        {listWalks.map(w => (
          <Motion kind="rise" delay={160} key={w.id}>
            <Pressable style={styles.pastCard} onPress={() => openWalk(w.id)}>
              <View style={styles.pastTop}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.pastName}>{w.name}</Text>
                  <Text style={styles.pastMeta}>
                    {w.when} · {w.km} km · {w.portals}{' '}
                    {w.portals === 1 ? 'portal' : 'portals'}
                  </Text>
                </View>
                <Text style={styles.pastGo}>›</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {w.tints.map((tint, i) => (
                  <View key={i} style={[styles.pastTint, { backgroundColor: tint }]} />
                ))}
              </View>
            </Pressable>
          </Motion>
        ))}
        {otherPlaces.length > 0 && (
          <Motion kind="rise" delay={200} style={{ gap: 10 }}>
            <Text style={styles.otherLabel}>OTHER PLACES</Text>
            {otherPlaces.map(pl => (
              <Pressable
                key={pl.id}
                style={styles.otherRow}
                onPress={() => router.push(pl.href)}
              >
                <View style={[styles.otherThumb, { backgroundColor: pl.stamp }]}>
                  <Text style={styles.otherThumbText}>{pl.era}</Text>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.otherName}>{pl.name}</Text>
                  <Text style={styles.otherMeta}>
                    Discovered outside a walk
                  </Text>
                </View>
                <Text style={styles.pastGo}>›</Text>
              </Pressable>
            ))}
          </Motion>
        )}
      </ScrollView>
      <TabBar active="Walks" />
    </View>
  );
}

function RouteSquiggle() {
  return (
    <Svg width={120} height={60} viewBox="0 0 120 64">
      <Path
        d="M8 52 C30 46 26 20 52 22 C80 24 74 50 108 40"
        stroke={Palette.ink}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="1 9"
        fill="none"
      />
      <Circle cx={8} cy={52} r={6} fill={Palette.purple} />
      <Circle cx={108} cy={40} r={6} fill={Palette.white} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.white },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 14,
  },
  title: { fontFamily: Fonts.display, fontSize: 34, color: Palette.ink },
  subtitle: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Palette.muted },
  hero: {
    backgroundColor: Palette.lime,
    borderRadius: 28,
    padding: 18,
    gap: 12,
    boxShadow: '0 10px 26px rgba(150,190,30,0.45)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroName: { fontFamily: Fonts.display, fontSize: 21, color: Palette.ink },
  heroMeta: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Palette.inkSoft },
  heroBadge: {
    backgroundColor: Palette.ink,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    transform: [{ rotate: '4deg' }],
  },
  heroBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Palette.lime },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroThumbs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  heroThumb: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroThumbMore: {
    backgroundColor: Palette.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroThumbMoreText: { fontFamily: Fonts.display, fontSize: 14, color: Palette.ink },
  pastCard: {
    backgroundColor: Palette.cloud,
    borderRadius: 28,
    padding: 18,
    gap: 12,
  },
  pastTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pastName: { fontFamily: Fonts.displayBold, fontSize: 19, color: Palette.ink },
  pastMeta: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Palette.body },
  pastGo: { fontFamily: Fonts.display, fontSize: 16, color: Palette.muted },
  pastTint: { width: 48, height: 48, borderRadius: 14 },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.cloud,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  statValue: { fontFamily: Fonts.display, fontSize: 20, color: Palette.ink },
  statLabel: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Palette.muted },
  statRule: { width: 2, height: 30, backgroundColor: Palette.white },
  emptyCard: {
    backgroundColor: Palette.cloud,
    borderRadius: 28,
    padding: 22,
    gap: 6,
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: Fonts.displayBold, fontSize: 18, color: Palette.ink },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.muted,
    textAlign: 'center',
  },
  otherLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    color: Palette.muted,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.cloud,
    borderRadius: 22,
    padding: 13,
  },
  otherThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '3deg' }],
  },
  otherThumbText: { fontFamily: Fonts.display, fontSize: 13, color: Palette.ink },
  otherName: { fontFamily: Fonts.displayBold, fontSize: 15, color: Palette.ink },
  otherMeta: { fontFamily: Fonts.body, fontSize: 11.5, color: Palette.muted },
});
