import { forwardRef } from 'react';

import { AppleMap } from '@/components/apple-map';
import type { SiteMapHandle, SiteMapViewProps } from '@/components/map-types';

export type { MapDiscovery, SiteMapHandle } from '@/components/map-types';

export const SiteMap = forwardRef<SiteMapHandle, SiteMapViewProps>(function SiteMap(props, ref) {
  return <AppleMap ref={ref} {...props} />;
});
