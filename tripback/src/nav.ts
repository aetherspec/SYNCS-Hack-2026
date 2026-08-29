import { createContext, useContext, useEffect } from 'react';

export type RouteName =
  | 'onboarding'
  | 'map'
  | 'walks'
  | 'walk-detail'
  | 'passport'
  | 'settings'
  | 'site'
  | 'ar'
  | 'generating'
  | 'discover';

export type Route = {
  name: RouteName;
  params: Record<string, string>;
};

export type Href = string | { pathname: string; params?: Record<string, string | undefined> };

export type Router = {
  push: (href: Href) => void;
  replace: (href: Href) => void;
  back: () => void;
  canGoBack: () => boolean;
  canDismiss: () => boolean;
  dismissTo: (href: Href) => void;
};

export const RouterCtx = createContext<Router | null>(null);
export const ParamsCtx = createContext<Record<string, string>>({});

export const TAB_ROUTES = new Set<RouteName>(['map', 'walks', 'passport', 'settings']);

export function parseHref(href: Href): Route {
  if (typeof href !== 'string') {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(href.params ?? {})) {
      if (value != null) params[key] = value;
    }
    const parsed = parseHref(href.pathname);
    return { name: parsed.name, params: { ...parsed.params, ...params } };
  }

  const [rawPath, query = ''] = href.split('?');
  const params: Record<string, string> = {};
  if (query) {
    for (const part of query.split('&')) {
      const [key, value = ''] = part.split('=');
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  const segs = (rawPath ?? '').replace(/^\//, '').split('/').filter(Boolean);
  const head = (segs[0] ?? 'map') as RouteName;
  if (head === 'site' || head === 'ar' || head === 'generating' || head === 'discover') {
    params.id = decodeURIComponent(segs.slice(1).join('/'));
    return { name: head, params };
  }
  return { name: head, params };
}

export function sameRoute(a: Route, b: Route): boolean {
  if (a.name !== b.name) return false;
  if (a.params.id || b.params.id) return a.params.id === b.params.id;
  return true;
}

export function useRouter(): Router {
  const ctx = useContext(RouterCtx);
  if (!ctx) throw new Error('useRouter outside NavigationRoot');
  return ctx;
}

export function useLocalSearchParams<T extends Record<string, string | undefined>>(): T {
  return useContext(ParamsCtx) as T;
}

export function Redirect({ href }: { href: Href }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return null;
}
