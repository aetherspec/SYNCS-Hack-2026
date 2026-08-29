import { PropsWithChildren, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const bez = Easing.bezier(0.2, 0.75, 0.2, 1);

type Kind = 'rise' | 'drop' | 'pop' | 'barup';

const DURATION: Record<Kind, number> = {
  rise: 500,
  drop: 450,
  pop: 550,
  barup: 500,
};

export function Motion({
  kind = 'rise',
  delay = 0,
  duration,
  style,
  children,
}: PropsWithChildren<{
  kind?: Kind;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}>) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withTiming(1, { duration: duration ?? DURATION[kind], easing: bez }),
    );
  }, [delay, duration, kind, t]);

  const anim = useAnimatedStyle(() => {
    const v = t.value;
    switch (kind) {
      case 'drop':
        return { opacity: v, transform: [{ translateY: -16 * (1 - v) }] };
      case 'pop':
        return {
          opacity: v,
          transform: [{ scale: 0.92 + 0.08 * v }, { translateY: 16 * (1 - v) }],
        };
      case 'barup':
        return {
          opacity: v,
          transform: [{ translateY: 80 * (1 - v) }, { scale: 0.85 + 0.15 * v }],
        };
      default:
        return { opacity: v, transform: [{ translateY: 26 * (1 - v) }] };
    }
  });

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
