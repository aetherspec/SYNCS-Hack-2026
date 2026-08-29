// Heritage sites + map dataset (The Rocks / Circular Quay), mirrored from the
// "Trip Back App" design prototype and its map-data.js. Map coordinates are
// world-space px on an 1100×1100 canvas.

export type Place = {
  id: string;
  name: string;
  short: string;
  dist: string;
  est: string;
  eras: string[];
  stamp: string; // passport stamp tint
  tilt: string; // passport stamp rotation
  sources: string;
  blurb: string;
  map: { x: number; y: number };
  geo: [number, number]; // [lng, lat] — real position for the live map
  approach: string; // how the nudge describes the way there
};

export const PLACES: Place[] = [
  {
    id: 'customs',
    name: 'Old Customs House',
    short: 'Customs Hse',
    dist: '40 m away · Circular Quay',
    est: 'est. 1845',
    eras: ['1897', '1931', '1964'],
    stamp: '#FFF3C4',
    tilt: '-5deg',
    sources: 'Sources: Heritage NSW listing 00042 · Wikipedia',
    blurb:
      'In 1897 this sandstone landmark ran the busiest customs floor in the colony — clipper cargo declared under gas lamps while horse trams rattled down Loftus Street. The clock tower kept harbour time for every ship at anchor. Federation was proclaimed to crowds on this forecourt; the archival plates were shot within 80 m of where you’re standing.',
    map: { x: 560, y: 460 },
    geo: [151.211, -33.86245],
    approach: 'ahead on Loftus St',
  },
  {
    id: 'cadmans',
    name: 'Cadman’s Cottage',
    short: 'Cadman’s',
    dist: '220 m away · The Rocks',
    est: 'est. 1816',
    eras: ['1901', '1938'],
    stamp: '#FFE1EC',
    tilt: '4deg',
    sources: 'Sources: Heritage NSW listing 00043 · Wikipedia',
    blurb:
      'Sydney’s oldest surviving residence — the water once lapped its front steps. The 1901 plates show ferrymen’s skiffs beached where the road now runs.',
    map: { x: 300, y: 330 },
    geo: [151.20868, -33.8595],
    approach: 'ahead on George St',
  },
  {
    id: 'hero',
    name: 'The Hero of Waterloo',
    short: 'Hero of W’loo',
    dist: '450 m away · Millers Point',
    est: 'est. 1843',
    eras: ['1928', '1955'],
    stamp: '#DFF6FF',
    tilt: '-3deg',
    sources: 'Sources: Heritage NSW listing 00561 · Wikipedia',
    blurb:
      'Cut from sandstone quarried on site, this pub ran a rum tunnel to the harbour. The 1928 photographs catch the corner lamp and cellar hoist still working.',
    map: { x: 780, y: 300 },
    geo: [151.2054, -33.85762],
    approach: 'along Lower Fort St',
  },
  {
    id: 'observatory',
    name: 'Sydney Observatory',
    short: 'Observatory',
    dist: '650 m away · Observatory Hill',
    est: 'est. 1858',
    eras: ['1888', '1930'],
    stamp: '#EDEBFF',
    tilt: '6deg',
    sources: 'Sources: MAAS collection · Wikipedia',
    blurb:
      'The time-ball on the tower dropped at 1 pm sharp every day so ships could set their chronometers. The 1888 plates show the signal flags and the harbour before the Bridge.',
    map: { x: 180, y: 560 },
    geo: [151.20428, -33.85921],
    approach: 'up Argyle St',
  },
  {
    id: 'garrison',
    name: 'Garrison Church',
    short: 'Garrison Ch.',
    dist: '280 m away · Church Hill',
    est: 'est. 1840',
    eras: ['1902', '1946'],
    stamp: '#CDEFC4',
    tilt: '-4deg',
    sources: 'Sources: Heritage NSW listing 00035 · Wikipedia',
    blurb:
      'Australia’s first military church — redcoats marched to services here from the Dawes Point battery. The 1902 plates show the sandstone tower before the Argyle Cut was widened, with the parade ground still unpaved.',
    map: { x: 700, y: 700 },
    geo: [151.20522, -33.85856],
    approach: 'past the Argyle Cut',
  },
];

export const findPlace = (id?: string) =>
  PLACES.find((p) => p.id === id) ?? PLACES[0]!;

// Real-world framing for the live map (The Rocks / Circular Quay).
export const ROCKS_BOUNDS: [[number, number], [number, number]] = [
  [151.2032, -33.8636],
  [151.2124, -33.856],
];
export const USER_GEO: [number, number] = [151.2094, -33.8622];

export const MAP = {
  size: [1100, 1100] as const,
  center: [560, 500] as const,
  background: '#EDEBFF',
  water: [
    {
      d: 'M0 0 H1100 V150 C950 210 820 130 640 185 C460 240 300 160 140 215 C90 232 40 220 0 240 Z',
      fill: '#9BDCF5',
    },
    {
      d: 'M0 0 H1100 V120 C950 175 820 100 640 150 C460 205 300 130 140 180 C90 197 40 188 0 205 Z',
      fill: '#BFEAFF',
    },
  ],
  parks: [
    { x: 60, y: 640, w: 220, h: 180 },
    { x: 840, y: 140, w: 120, h: 70 },
  ],
  parkFill: '#CDEFC4',
  roads: [
    { d: 'M120 220 C160 400 140 700 190 1100', w: 26 },
    { d: 'M330 205 C350 420 310 760 360 1100', w: 34 },
    { d: 'M560 175 C540 420 600 760 560 1100', w: 26 },
    { d: 'M800 165 C820 420 770 740 830 1100', w: 30 },
    { d: 'M0 340 C240 310 520 370 1100 320', w: 26 },
    { d: 'M0 560 C280 520 640 590 1100 540', w: 30 },
    { d: 'M0 800 C300 760 700 830 1100 780', w: 26 },
    { d: 'M0 990 C340 950 760 1020 1100 970', w: 22 },
  ],
  roadFill: '#FFFFFF',
  buildings: [
    { x: 380, y: 370, w: 130, h: 110 },
    { x: 620, y: 350, w: 120, h: 130 },
    { x: 860, y: 360, w: 150, h: 110 },
    { x: 200, y: 400, w: 80, h: 100 },
    { x: 400, y: 610, w: 110, h: 130 },
    { x: 640, y: 600, w: 120, h: 120 },
    { x: 880, y: 610, w: 140, h: 120 },
    { x: 210, y: 850, w: 100, h: 100 },
    { x: 430, y: 850, w: 90, h: 100 },
    { x: 650, y: 840, w: 130, h: 100 },
    { x: 890, y: 850, w: 110, h: 90 },
  ],
  buildingFill: '#E4E2EE',
  labels: [
    { x: 345, y: 300, text: 'George St', size: 15, weight: '700', fill: '#8A8A96', rotate: 84 },
    { x: 575, y: 300, text: 'Loftus St', size: 15, weight: '700', fill: '#8A8A96', rotate: 87 },
    { x: 815, y: 290, text: 'Pitt St', size: 15, weight: '700', fill: '#8A8A96', rotate: 86 },
    { x: 440, y: 333, text: 'Argyle St', size: 15, weight: '700', fill: '#8A8A96', rotate: 0 },
    { x: 460, y: 552, text: 'Bridge St', size: 15, weight: '700', fill: '#8A8A96', rotate: 0 },
    { x: 440, y: 793, text: 'Hunter St', size: 15, weight: '700', fill: '#8A8A96', rotate: 0 },
    { x: 470, y: 80, text: 'Sydney Cove', size: 20, weight: '800', fill: '#4796B5', rotate: 0 },
    { x: 95, y: 745, text: 'First Fleet Park', size: 15, weight: '800', fill: '#6FA85B', rotate: 0 },
  ],
  user: { x: 506, y: 636 },
};
