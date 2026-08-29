import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

import { tripBackEngine } from '@/core/TripBackEngine';
import { distanceMetres } from '@/domain/geo';
import type {
  Coordinate,
  EngineStatus,
  RealityPortal,
  RealityPortalPin,
  RoutePoint,
  WalkSession,
} from '@/domain/types';
import { PLACES } from '@/constants/places';
import { Palette } from '@/constants/theme';

export type WalkStop = {
  id: string;
  era: string;
  time: string;
  portalId?: string;
  coordinate?: Coordinate;
  name?: string;
};

export type Walk = {
  id: string;
  name: string;
  when: string;
  km: string;
  mins: number;
  portals: number;
  stops: WalkStop[];
  route: RoutePoint[];
  tints: string[];
};

export type ActiveWalk = { startedAt: number; stops: WalkStop[]; walkId: string };

export type Discovered = { name: string; era: string; blurb: string; thumb?: string };

export type PendingCapture = {
  siteId: string;
  era: string;
  name: string;
  uri: string;
  base64: string;
  mimeType: string;
  heading: number;
  coordinate: Coordinate;
};

export type SitePortal = {
  portalId: string;
  year: string;
  modernUri?: string;
  thenUri: string;
  placeTitle?: string;
  coordinate?: Coordinate;
  createdAt?: string;
};

const STOP_TINTS = [Palette.butter, Palette.blush, Palette.sky, Palette.lavender];
const sydneyCentre: Coordinate = { latitude: -33.8622, longitude: 151.2094 };

const fmtTime = (d: Date) =>
  d
    .toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(/\s/g, ' ');

function walkNameFromStart(startedAt: string): string {
  const hour = new Date(startedAt).getHours();
  if (hour < 12) return 'Morning walk';
  if (hour < 17) return 'Afternoon walk';
  return 'Evening walk';
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function siteIdForTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const lower = title.toLowerCase();
  const place = PLACES.find(
    (item) =>
      item.name.toLowerCase() === lower ||
      lower.includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(lower),
  );
  return place?.id;
}

function stopIdForPortal(pin: RealityPortalPin): string {
  return siteIdForTitle(pin.placeTitle) ?? pin.id;
}

function sessionToWalk(
  session: WalkSession,
  pins: RealityPortalPin[],
  route: RoutePoint[] = [],
): Walk {
  const walkPins = pins.filter((pin) => pin.walkId === session.id);
  const stops = walkPins.map((pin) => ({
    id: stopIdForPortal(pin),
    era: pin.year,
    time: fmtTime(new Date(pin.createdAt)),
    portalId: pin.id,
    coordinate: pin.coordinate,
    name: pin.placeTitle,
  }));
  const ended = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  const started = new Date(session.startedAt).getTime();
  return {
    id: session.id,
    name: walkNameFromStart(session.startedAt),
    when: formatWhen(session.startedAt),
    km: (session.distanceMetres / 1000).toFixed(1),
    mins: Math.max(1, Math.round((ended - started) / 60000)),
    portals: walkPins.length || session.generatedImageCount || 0,
    stops,
    route,
    tints: stops.map((_, index) => STOP_TINTS[index % STOP_TINTS.length]!),
  };
}

type AppState = {
  ready: boolean;
  location?: Coordinate;
  opened: Record<string, boolean>;
  markOpened: (id: string) => void;
  perms: Record<string, boolean>;
  togglePerm: (key: string) => void;
  radius: string;
  setRadius: (r: string) => void;
      quiet: boolean;
  toggleQuiet: () => void;
  track: boolean;
  toggleTrack: () => void;
  walks: Walk[];
  activeWalk: ActiveWalk | null;
  startWalk: () => Promise<void>;
  endWalk: () => Promise<void>;
  recordStop: (id: string, era: string, portalId?: string, name?: string) => void;
  discovered: Record<string, Discovered>;
  registerDiscovery: (id: string, d: Discovered) => void;
  resetLibrary: () => Promise<void>;
  pendingCapture?: PendingCapture;
  setPendingCapture: (capture?: PendingCapture) => void;
  sitePortals: Record<string, SitePortal>;
  rememberPortal: (siteId: string, portal: SitePortal) => void;
  loadPortalMedia: (siteId: string, portalId: string) => Promise<void>;
  viewingPortal?: RealityPortal;
  openPortalViewer: (portalId: string) => Promise<void>;
  closePortalViewer: () => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [location, setLocation] = useState<Coordinate>();
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [radius, setRadius] = useState('100 m');
  const [quiet, setQuiet] = useState(true);
  const [track, setTrack] = useState(true);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [activeWalk, setActiveWalk] = useState<ActiveWalk | null>(null);
  const [discovered, setDiscovered] = useState<Record<string, Discovered>>({});
  const [pendingCapture, setPendingCapture] = useState<PendingCapture>();
  const [sitePortals, setSitePortals] = useState<Record<string, SitePortal>>({});
  const [viewingPortal, setViewingPortal] = useState<RealityPortal>();

  const hydrate = useCallback(async (status?: EngineStatus) => {
    const [savedWalks, pins] = await Promise.all([
      tripBackEngine.listWalks(),
      tripBackEngine.listPortalPins(),
    ]);
    const realWalks = savedWalks.filter((walk) => !walk.isSimulated && walk.endedAt);
    const routes = await Promise.all(
      realWalks.map((walk) => tripBackEngine.listRoutePoints(walk.id)),
    );
    setWalks(
      realWalks.map((walk, index) => sessionToWalk(walk, pins, routes[index] ?? [])),
    );

    const nextOpened: Record<string, boolean> = {};
    const nextPortals: Record<string, SitePortal> = {};
    for (const pin of pins) {
      const siteId = stopIdForPortal(pin);
      nextOpened[siteId] = true;
      nextPortals[siteId] = {
        portalId: pin.id,
        year: pin.year,
        thenUri: '',
        placeTitle: pin.placeTitle,
        coordinate: pin.coordinate,
        createdAt: pin.createdAt,
      };
    }
    setOpened(nextOpened);
    setSitePortals((prev) => ({ ...nextPortals, ...prev }));

    const engineWalk = status?.activeWalk;
    if (engineWalk && !engineWalk.isSimulated) {
      const livePins = pins.filter((pin) => pin.walkId === engineWalk.id);
      setActiveWalk({
        startedAt: new Date(engineWalk.startedAt).getTime(),
        walkId: engineWalk.id,
        stops: livePins.map((pin) => ({
          id: stopIdForPortal(pin),
          era: pin.year,
          time: fmtTime(new Date(pin.createdAt)),
          portalId: pin.id,
          coordinate: pin.coordinate,
          name: pin.placeTitle,
        })),
      });
    } else if (!engineWalk) {
      setActiveWalk(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = tripBackEngine.subscribe((status) => {
      setReady(status.ready);
      if (status.ready) void hydrate(status);
    });
    void tripBackEngine.initialize().then(() => hydrate());
    return unsubscribe;
  }, [hydrate]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted || cancelled) return;
      setPerms((prev) => ({ ...prev, location: true }));
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 120_000,
        requiredAccuracy: 250,
      });
      if (lastKnown && !cancelled) {
        setLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelled) return;
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 8 },
        (next) => {
          setLocation({
            latitude: next.coords.latitude,
            longitude: next.coords.longitude,
          });
        },
      );
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  const loadPortalMedia = useCallback(async (siteId: string, portalId: string) => {
    const portal = await tripBackEngine.getPortal(portalId);
    if (!portal?.generatedImageDataUri) return;
    setSitePortals((prev) => {
      if (prev[siteId]?.thenUri) return prev;
      return {
        ...prev,
        [siteId]: {
          portalId: portal.id,
          year: portal.year,
          modernUri: portal.modernImageDataUri,
          thenUri: portal.generatedImageDataUri,
        },
      };
    });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      location,
      opened,
      markOpened: (id) => setOpened((prev) => ({ ...prev, [id]: true })),
      perms,
      togglePerm: (key) => setPerms((prev) => ({ ...prev, [key]: !prev[key] })),
      radius,
      setRadius,
      quiet,
      toggleQuiet: () => setQuiet((prev) => !prev),
      track,
      toggleTrack: () => setTrack((prev) => !prev),
      walks,
      activeWalk,
      startWalk: async () => {
        try {
          const walk = await tripBackEngine.startWalk();
          setActiveWalk({ startedAt: Date.now(), stops: [], walkId: walk.id });
        } catch (error) {
          Alert.alert('Couldn’t start a walk', String(error));
        }
      },
      endWalk: async () => {
        try {
          await tripBackEngine.stopWalk();
          setActiveWalk(null);
          await hydrate();
        } catch (error) {
          Alert.alert('Couldn’t end the walk', String(error));
        }
      },
      recordStop: (id, era, portalId, name) =>
        setActiveWalk((prev) => {
          if (!prev || prev.stops.some((stop) => stop.id === id)) return prev;
          return {
            ...prev,
            stops: [...prev.stops, { id, era, time: fmtTime(new Date()), portalId, name }],
          };
        }),
      discovered,
      registerDiscovery: (id, item) =>
        setDiscovered((prev) => ({ ...prev, [id]: item })),
      resetLibrary: async () => {
        await tripBackEngine.clearHistory();
        setOpened({});
        setWalks([]);
        setActiveWalk(null);
        setDiscovered({});
        setSitePortals({});
        setPendingCapture(undefined);
        setViewingPortal(undefined);
      },
      pendingCapture,
      setPendingCapture,
      sitePortals,
      rememberPortal: (siteId, portal) =>
        setSitePortals((prev) => ({ ...prev, [siteId]: portal })),
      loadPortalMedia,
      viewingPortal,
      openPortalViewer: async (portalId) => {
        const portal = await tripBackEngine.getPortal(portalId);
        if (portal) setViewingPortal(portal);
      },
      closePortalViewer: () => setViewingPortal(undefined),
    }),
    [
      ready,
      location,
      opened,
      perms,
      radius,
      quiet,
      track,
      walks,
      activeWalk,
      discovered,
      pendingCapture,
      sitePortals,
      viewingPortal,
      hydrate,
      loadPortalMedia,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState outside AppStateProvider');
  return ctx;
}

export function currentCoordinate(location?: Coordinate): Coordinate {
  return location ?? sydneyCentre;
}

export function metersFromUser(location: Coordinate | undefined, geo: [number, number]): number {
  return Math.round(
    distanceMetres(currentCoordinate(location), {
      longitude: geo[0],
      latitude: geo[1],
    }),
  );
}
