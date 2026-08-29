import { requireNativeView } from 'expo';
import * as React from 'react';
import { Platform, View } from 'react-native';

import type { TripBackARViewProps } from './TripBackAR.types';

const NativeView: React.ComponentType<TripBackARViewProps> | null =
  Platform.OS === 'ios' ? requireNativeView('TripBackAR') : null;

export default function TripBackARView(props: TripBackARViewProps) {
  if (NativeView === null) {
    return <View style={props.style} />;
  }

  return <NativeView {...props} />;
}
