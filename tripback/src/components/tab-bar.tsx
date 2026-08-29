import { useRouter } from '@/nav';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Fonts, Palette } from '@/constants/theme';

const TABS = [
  { label: 'Map', href: '/map' },
  { label: 'Walks', href: '/walks' },
  { label: 'Passport', href: '/passport' },
  { label: 'Settings', href: '/settings' },
] as const;

export type TabName = (typeof TABS)[number]['label'];

// In the design the tab bar sits outside the screens: it plays its barup
// entrance once, when the tabbed area first appears, and stays put while
// you switch tabs. Each route renders its own TabBar here, so a module
// flag keeps later mounts (and refocuses) settled instead of replaying.
let hasEntered = false;
const bez = Easing.bezier(0.2, 0.75, 0.2, 1);

export function TabBar({ active }: { active: TabName }) {
  const router = useRouter();
  const t = useSharedValue(hasEntered ? 1 : 0);

  useEffect(() => {
    if (hasEntered) return;
    hasEntered = true;
    t.value = withDelay(160, withTiming(1, { duration: 500, easing: bez }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [
      { translateY: 80 * (1 - t.value) },
      { scale: 0.85 + 0.15 * t.value },
    ],
  }));

  return (
    <Animated.View style={[styles.bar, anim]}>
      {TABS.map(t => (
        <Pressable
          key={t.label}
          onPress={() => router.replace(t.href)}
          style={[styles.tab, active === t.label && styles.tabActive]}
        >
          <Text style={[styles.label, active === t.label && styles.labelActive]}>
            {t.label}
          </Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    gap: 4,
    padding: 8,
    borderRadius: 999,
    backgroundColor: Palette.ink,
    boxShadow: '0 10px 30px rgba(16,16,20,0.28)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Palette.lime,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: '#B9B9C4',
  },
  labelActive: {
    color: Palette.ink,
  },
});
