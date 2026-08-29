import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type TripBackARStatus = {
  state:
    | 'inactive'
    | 'ready'
    | 'limited'
    | 'unavailable'
    | 'interrupted'
    | 'failure'
    | 'paused'
    | 'unsupported'
    | 'error';
  reason?: string;
  message?: string;
};

export type TripBackARPlacementOutcome = {
  outcome: 'placed' | 'replaced' | 'noImage' | 'noRaycast';
  message?: string;
};

export type TripBackARViewProps = {
  style?: StyleProp<ViewStyle>;
  imageUri?: string | null;
  active: boolean;
  onStatus?: (event: NativeSyntheticEvent<TripBackARStatus>) => void;
  onPlacement?: (event: NativeSyntheticEvent<TripBackARPlacementOutcome>) => void;
};
