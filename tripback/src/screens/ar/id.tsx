import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Motion } from '@/components/motion';
import { useOpenTimePortal } from '@/components/use-open-time-portal';
import { PLACES, findPlace } from '@/constants/places';
import { Fonts, Palette } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from '@/nav';

export default function ArCaptureScreen() {
  const router = useRouter();
  const { id, era, name } = useLocalSearchParams<{
    id: string;
    era?: string;
    name?: string;
  }>();
  const place = PLACES.find((item) => item.id === id);
  const displayName =
    typeof name === 'string' && name ? name : (place?.name ?? findPlace(id).name);
  const activeEra = era ?? place?.eras[0] ?? '1900';
  const { open, busy } = useOpenTimePortal(id, activeEra, displayName);

  return (
    <View style={styles.root}>
      <Motion kind="drop" duration={400} style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Text style={{ fontSize: 16 }}>✕</Text>
        </Pressable>
        <View style={styles.titlePill}>
          <Text style={styles.titlePillText}>
            {displayName} · {activeEra} ⏪
          </Text>
        </View>
      </Motion>

      <View style={styles.body}>
        <Text style={styles.hint}>
          Point the camera at the facade. TripBack will paint {activeEra} from that angle.
        </Text>
        <Pressable onPress={() => void open()} style={styles.shutter}>
          <Text style={styles.shutterText}>{busy ? 'Opening camera…' : 'Take photo'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.ink,
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePill: {
    backgroundColor: Palette.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  titlePillText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Palette.ink },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingHorizontal: 12,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
  },
  shutter: {
    backgroundColor: Palette.lime,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  shutterText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Palette.ink },
});
