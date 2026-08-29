import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Motion } from '@/components/motion';

import { useAppState } from '@/components/app-state';
import { TabBar } from '@/components/tab-bar';
import { PLACES } from '@/constants/places';
import { Fonts, Palette } from '@/constants/theme';

const PAGE = 12;
const TILTS = ['-5deg', '4deg', '-3deg', '6deg', '-4deg'] as const;
const STAMP_BG = [
  Palette.butter,
  Palette.blush,
  Palette.sky,
  Palette.lavender,
  Palette.lime,
];

export default function PassportScreen() {
  const { opened, discovered, sitePortals } = useAppState();
  const allStamps = Object.keys(opened)
    .filter((id) => opened[id])
    .map((id, index) => {
      const place = PLACES.find((item) => item.id === id);
      const item = discovered[id];
      const portal = sitePortals[id];
      return {
        id,
        year: portal?.year ?? item?.era ?? place?.eras[0] ?? '—',
        label: (place?.short ?? item?.name ?? 'Portal').slice(0, 14).toUpperCase(),
        bg: place?.stamp ?? STAMP_BG[index % STAMP_BG.length]!,
        tilt: place?.tilt ?? TILTS[index % TILTS.length]!,
      };
    });
  const total = allStamps.length;
  const rewards = Math.floor(total / PAGE);
  const pageCount = total === 0 ? 0 : total % PAGE === 0 ? PAGE : total % PAGE;
  const pageStart = total === 0 ? 0 : total % PAGE === 0 ? total - PAGE : total - (total % PAGE);
  const stamps = allStamps.slice(pageStart, pageStart + pageCount);
  const pct = Math.round((pageCount / PAGE) * 100);
  const lockedSlots = Math.max(0, PAGE - stamps.length);

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <Motion kind="drop" style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ gap: 3 }}>
              <Text style={styles.title}>Portal passport</Text>
              <Text style={styles.subtitle}>Every portal you open</Text>
            </View>
            <View style={styles.count}>
              <Text style={styles.countText}>{pageCount} / {PAGE}</Text>
            </View>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
        </Motion>

        <Motion kind="rise" delay={100} style={styles.sheet}>
          <View style={styles.grid}>
            {stamps.map((stamp) => (
              <View
                key={stamp.id}
                style={[
                  styles.stamp,
                  {
                    backgroundColor: stamp.bg,
                    transform: [{ rotate: stamp.tilt as `${number}deg` }],
                  },
                ]}
              >
                <Text style={styles.stampYear}>{stamp.year}</Text>
                <Text style={styles.stampLabel}>{stamp.label}</Text>
              </View>
            ))}
            {Array.from({ length: lockedSlots }, (_, i) => (
              <View key={`lk${i}`} style={styles.locked}>
                <Text style={{ fontSize: 20, opacity: 0.4 }}>🔒</Text>
              </View>
            ))}
          </View>
          <View style={styles.challenge}>
            <Text style={{ fontSize: 20 }}>🏆</Text>
            <Text style={styles.challengeText}>
              {rewards > 0 ? (
                <>
                  Keeper stamps earned:{' '}
                  <Text style={{ fontFamily: Fonts.bodyBold }}>{rewards}</Text>
                  {pageCount === PAGE
                    ? '. Next portal starts a new page.'
                    : '. Fill this page for another.'}
                </>
              ) : (
                <>Open 12 portals to earn a Keeper stamp.</>
              )}
            </Text>
          </View>
        </Motion>
      </ScrollView>
      <TabBar active="Passport" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.purple },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontFamily: Fonts.display, fontSize: 32, color: Palette.white },
  subtitle: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Palette.lavenderText },
  count: {
    backgroundColor: Palette.lime,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 999,
    transform: [{ rotate: '5deg' }],
  },
  countText: { fontFamily: Fonts.display, fontSize: 15, color: Palette.ink },
  barTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Palette.lime,
  },
  sheet: {
    flex: 1,
    backgroundColor: Palette.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 110,
    gap: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  stamp: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    boxShadow: '0 6px 16px rgba(16,16,20,0.15)',
  },
  stampYear: { fontFamily: Fonts.display, fontSize: 19, color: Palette.ink },
  stampLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: Palette.body,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  locked: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#C9C7D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challenge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.cloud,
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  challengeText: {
    flex: 1,
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.body,
  },
});
