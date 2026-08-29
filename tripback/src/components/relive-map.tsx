import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Palette } from '@/constants/theme';

export type ReliveMapHandle = {
  moveCamera: (i: number) => void;
};

// Native fallback for the relive playback map: static stylised route.
// (Web renders live tiles with a flying camera — see relive-map.web.tsx.)
export const ReliveMap = forwardRef<ReliveMapHandle, object>(
  function ReliveMap(_props, ref) {
    useImperativeHandle(ref, () => ({ moveCamera: () => {} }));
    return (
      <View style={styles.fill}>
        <Svg
          viewBox="0 0 350 190"
          preserveAspectRatio="xMidYMid slice"
          style={styles.fill}
        >
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
      </View>
    );
  }
);

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
