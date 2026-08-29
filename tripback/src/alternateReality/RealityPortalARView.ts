import { requireNativeView } from 'expo';
import { type ComponentType } from 'react';

type RealityPortalNativeProps = {
  imageBase64: string;
  originHeading: number;
  style?: object;
  onTrackingFailed?: () => void;
};

let NativeView: ComponentType<RealityPortalNativeProps> | null = null;
try {
  NativeView = requireNativeView('RealityPortal') as ComponentType<RealityPortalNativeProps>;
} catch {
  NativeView = null;
}

export const RealityPortalARView = NativeView;
export const isRealityPortalARAvailable = NativeView != null;
