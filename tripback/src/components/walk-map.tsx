import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Fonts, Palette } from '@/constants/theme';

export type WalkMapHandle = {
  flyToNext: () => void;
  fitRoute: () => void;
};

// Native fallback for the walk-detail route map: the stylised SVG card.
// (Web renders live tiles — see walk-map.web.tsx.)
export const WalkMap = forwardRef<
  WalkMapHandle,
  { height?: number; label?: string }
>(function WalkMap({ height = 230, label = '4 portals opened' }, ref) {
    useImperativeHandle(ref, () => ({ flyToNext: () => {}, fitRoute: () => {} }));
    return (
      <View style={[styles.card, { height }]}>
        <Svg viewBox="0 0 350 190" style={{ width: '100%', height: '100%' }}>
          <Rect width={350} height={190} fill={Palette.lavender} />
          <Path
            d="M0 30 H350 V58 C260 78 180 48 90 66 C50 74 20 62 0 70 Z"
            fill={Palette.sky}
          />
          <Path
            d="M60 175 C80 130 60 100 120 92 C190 84 180 140 250 128 C300 120 300 90 320 60"
            stroke={Palette.purple}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="2 10"
            fill="none"
          />
          <Circle cx={60} cy={175} r={9} fill={Palette.lime} />
          <Circle cx={120} cy={92} r={9} fill={Palette.lime} />
          <Circle cx={250} cy={128} r={9} fill={Palette.lime} />
          <Circle cx={320} cy={60} r={9} fill={Palette.purple} />
        </Svg>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    marginTop: 6,
    marginHorizontal: 20,
    borderRadius: 26,
    backgroundColor: Palette.lavender,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Palette.ink,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Palette.lime },
});
