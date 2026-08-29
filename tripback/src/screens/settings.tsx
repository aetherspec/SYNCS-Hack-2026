import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Motion } from '@/components/motion';

import { useAppState } from '@/components/app-state';
import { TabBar } from '@/components/tab-bar';
import { Fonts, Palette } from '@/constants/theme';

const RADII = ['50 m', '100 m', '250 m'];

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toggle, { backgroundColor: on ? Palette.purple : '#D6D4DE' }]}
    >
      <View style={[styles.toggleKnob, { left: on ? 25 : 3 }]} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const {
    radius,
    setRadius,
    quiet,
    toggleQuiet,
    track,
    toggleTrack,
    walks,
    activeWalk,
    resetLibrary,
  } = useAppState();
  const reconstructions =
    walks.reduce((n, w) => n + w.portals, 0) + (activeWalk?.stops.length ?? 0);
  const storageMb = Math.round(reconstructions * 1.2);

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
      >
        <Motion kind="drop"><Text style={styles.title}>
          Settings
        </Text></Motion>

        <Motion kind="rise" delay={80} style={styles.card}>
          <View style={{ gap: 2 }}>
            <Text style={styles.cardTitle}>Nudge me within</Text>
            <Text style={styles.cardSub}>
              How close a portal must be before we ping you
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {RADII.map(r => (
              <Pressable
                key={r}
                onPress={() => setRadius(r)}
                style={[
                  styles.radiusChip,
                  { backgroundColor: radius === r ? Palette.ink : Palette.white },
                ]}
              >
                <Text
                  style={[
                    styles.radiusText,
                    { color: radius === r ? Palette.lime : Palette.ink },
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
        </Motion>

        <Motion
          kind="rise" delay={160}
          style={[styles.card, { paddingVertical: 6, gap: 0 }]}
        >
          <View style={[styles.row, styles.rowBorder]}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={styles.rowTitle}>Quiet on repeat visits</Text>
              <Text style={styles.cardSub}>One nudge per site per week</Text>
            </View>
            <Toggle on={quiet} onPress={toggleQuiet} />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={styles.rowTitle}>Track my walks</Text>
              <Text style={styles.cardSub}>Route stays on this phone only</Text>
            </View>
            <Toggle on={track} onPress={toggleTrack} />
          </View>
        </Motion>

        <Motion
          kind="rise" delay={220}
          style={[styles.card, styles.library]}
        >
          <Text style={{ fontSize: 19 }}>🗄️</Text>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.rowTitle}>On-device library</Text>
            <Text style={[styles.cardSub, { color: Palette.body }]}>
              {reconstructions} reconstructions · {walks.length}{' '}
              {walks.length === 1 ? 'walk' : 'walks'} · {storageMb} MB
            </Text>
          </View>
          <Pressable onPress={() => void resetLibrary()}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        </Motion>

        <Motion kind="rise" delay={280}><Text style={styles.footnote}>
          Reconstructions are generated from archival photography. Sources:
          Heritage NSW, NSW State Archives, Wikipedia — always on. TripBack v0.1
        </Text></Motion>
      </ScrollView>
      <TabBar active="Settings" />
    </View>
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
  card: {
    backgroundColor: Palette.cloud,
    borderRadius: 24,
    padding: 18,
    gap: 13,
  },
  cardTitle: { fontFamily: Fonts.displayBold, fontSize: 17, color: Palette.ink },
  cardSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Palette.muted },
  radiusChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  radiusText: { fontFamily: Fonts.bodyBold, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 2, borderBottomColor: Palette.white },
  rowTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Palette.ink },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 999,
  },
  toggleKnob: {
    position: 'absolute',
    top: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.white,
  },
  library: {
    backgroundColor: Palette.lavender,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clear: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.purple },
  footnote: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Palette.muted,
    paddingHorizontal: 6,
  },
});
