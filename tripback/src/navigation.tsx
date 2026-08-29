import { useEffect, useMemo, useState } from 'react';

import {
  ParamsCtx,
  RouterCtx,
  TAB_ROUTES,
  parseHref,
  sameRoute,
  type Route,
  type RouteName,
  type Router,
} from '@/nav';
import DiscoverScreen from '@/screens/discover/id';
import GeneratingScreen from '@/screens/generating/id';
import MapScreen from '@/screens/map';
import FirstNationsScreen from '@/screens/first-nations';
import OnboardingScreen from '@/screens/onboarding';
import PassportScreen from '@/screens/passport';
import SettingsScreen from '@/screens/settings';
import SiteDetailScreen from '@/screens/site/id';
import ArCaptureScreen from '@/screens/ar/id';
import WalkDetailScreen from '@/screens/walk-detail';
import WalksScreen from '@/screens/walks';
import { listenForNotificationDestinations } from '@/services/notifications/NotificationService';

export type { RouteName } from '@/nav';

export function NavigationRoot({ initialHref = '/onboarding' }: { initialHref?: string }) {
  const [stack, setStack] = useState<Route[]>(() => [parseHref(initialHref)]);
  const current = stack[stack.length - 1] ?? { name: 'map' as const, params: {} };

  const router = useMemo<Router>(
    () => ({
      push: (href) => {
        const next = parseHref(href);
        setStack((prev) => [...prev, next]);
      },
      replace: (href) => {
        const next = parseHref(href);
        setStack((prev) => {
          if (TAB_ROUTES.has(next.name)) return [next];
          if (prev.length === 0) return [next];
          return [...prev.slice(0, -1), next];
        });
      },
      back: () => {
        setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      },
      canGoBack: () => stack.length > 1,
      canDismiss: () => stack.length > 1,
      dismissTo: (href) => {
        const dest = parseHref(href);
        setStack((prev) => {
          const idx = prev.findIndex((route) => sameRoute(route, dest));
          if (idx >= 0) return [...prev.slice(0, idx), dest];
          const tabs = prev.filter((route) => TAB_ROUTES.has(route.name));
          return [
            ...(tabs.length ? [tabs[tabs.length - 1]!] : [{ name: 'map' as const, params: {} }]),
            dest,
          ];
        });
      },
    }),
    [stack.length],
  );

  useEffect(
    () =>
      listenForNotificationDestinations((href) => {
        const next = parseHref(href);
        setStack((prev) => {
          const active = prev[prev.length - 1];
          if (active && sameRoute(active, next)) return [...prev.slice(0, -1), next];
          return [...prev, next];
        });
      }),
    [],
  );

  return (
    <RouterCtx.Provider value={router}>
      <ParamsCtx.Provider value={current.params}>
        <Screen name={current.name} />
      </ParamsCtx.Provider>
    </RouterCtx.Provider>
  );
}

function Screen({ name }: { name: RouteName }) {
  switch (name) {
    case 'onboarding':
      return <OnboardingScreen />;
    case 'walks':
      return <WalksScreen />;
    case 'first-nations':
      return <FirstNationsScreen />;
    case 'walk-detail':
      return <WalkDetailScreen />;
    case 'passport':
      return <PassportScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'site':
      return <SiteDetailScreen />;
    case 'ar':
      return <ArCaptureScreen />;
    case 'generating':
      return <GeneratingScreen />;
    case 'discover':
      return <DiscoverScreen />;
    default:
      return <MapScreen />;
  }
}
