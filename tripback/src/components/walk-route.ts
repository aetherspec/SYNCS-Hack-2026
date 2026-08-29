// The Rocks loop route: shared coordinates and road-snapping for the
// walk-detail map and the relive playback map (from the "Rocks Loop Walk"
// design). Coordinates are [lng, lat].

export type Pt = [number, number];

export const WALK_BOUNDS: [Pt, Pt] = [
  [151.2032, -33.8636],
  [151.2124, -33.856],
];
export const WALK_FIT = { padding: { top: 30, bottom: 26, left: 30, right: 30 } };
export const NEXT_STOP: Pt = [151.20522, -33.85856];

export const STOPS: Pt[] = [
  [151.211, -33.86245], // Customs House, Alfred St
  [151.20868, -33.8595], // George St (Cadman's stop)
  [151.2054, -33.85762], // Lower Fort St — Hero of Waterloo
  [151.20522, -33.85856], // Garrison Church (next)
];

// Hand-traced fallback along Alfred St → George St → Argyle St → Lower Fort St,
// used until/unless OSRM answers.
export const DONE_COORDS: Pt[] = [
  [151.211, -33.86245],
  [151.2095, -33.862],
  [151.2087, -33.86175],
  [151.20852, -33.8605],
  [151.20868, -33.8595],
  [151.20878, -33.8587],
  [151.20873, -33.8582],
  [151.20758, -33.85816],
  [151.2064, -33.85824],
  [151.20548, -33.85848],
  [151.2054, -33.85762],
];
export const AHEAD_COORDS: Pt[] = [
  [151.2054, -33.85762],
  [151.20532, -33.85812],
  [151.20522, -33.85856],
];

// Douglas-Peucker simplification — strips routing micro-jitter.
function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const sq = (v: number) => v * v;
  const dist2 = (p: Pt, a: Pt, b: Pt) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = sq(dx) + sq(dy);
    if (!l2) return sq(p[0] - a[0]) + sq(p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return sq(p[0] - (a[0] + t * dx)) + sq(p[1] - (a[1] + t * dy));
  };
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = dist2(pts[i]!, pts[s]!, pts[e]!);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol * tol) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// Chaikin corner-cutting — rounds corners so the dotted line reads cartoonish.
function smooth(pts: Pt[], iterations: number): Pt[] {
  for (let k = 0; k < iterations; k++) {
    const out: Pt[] = [pts[0]!];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(pts[pts.length - 1]!);
    pts = out;
  }
  return pts;
}

export const tidy = (coords: Pt[]) => smooth(simplify(coords, 0.00008), 2);

export const lineFeature = (coordinates: Pt[]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates },
});

export function nearestIdx(coords: Pt[], pt: Pt): number {
  let best = 0;
  let bd = Infinity;
  coords.forEach((c, i) => {
    const d = (c[0] - pt[0]) ** 2 + (c[1] - pt[1]) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

async function osrm(pts: Pt[]) {
  const path = pts.map(c => `${c[0]},${c[1]}`).join(';');
  for (const host of [
    'https://routing.openstreetmap.de/routed-foot/route/v1/foot/',
    'https://router.project-osrm.org/route/v1/driving/',
  ]) {
    try {
      const j = await fetch(`${host}${path}?geometries=geojson&overview=full`).then(
        r => r.json()
      );
      if (j.code === 'Ok') return j;
    } catch {}
  }
  return null;
}

export type SnappedRoute = { done: Pt[]; ahead: Pt[]; stops: Pt[] };

let snapPromise: Promise<SnappedRoute | null> | null = null;

// Snap to real road geometry via OSRM (foot profile, fallback car), then
// simplify + smooth. Memoized so the two maps share one fetch.
export function snapRoute(): Promise<SnappedRoute | null> {
  if (!snapPromise) {
    snapPromise = (async () => {
      const [done, ahead] = await Promise.all([
        osrm(STOPS.slice(0, 3)),
        osrm(STOPS.slice(2, 4)),
      ]);
      if (!done || !ahead) return null;
      const stops = STOPS.slice();
      done.waypoints.forEach((w: { location: Pt }, i: number) => {
        stops[i] = w.location;
      });
      stops[3] = ahead.waypoints[1].location;
      return {
        done: tidy(done.routes[0].geometry.coordinates),
        ahead: tidy(ahead.routes[0].geometry.coordinates),
        stops,
      };
    })();
  }
  return snapPromise;
}

export const stopsFeatureCollection = (stops: Pt[]) => ({
  type: 'FeatureCollection' as const,
  features: stops.map((c, i) => ({
    type: 'Feature' as const,
    properties: { n: String(i + 1), next: i === 3 },
    geometry: { type: 'Point' as const, coordinates: c },
  })),
});
