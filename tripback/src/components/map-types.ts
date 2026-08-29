export type SiteMapHandle = {
  recenter: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setUser: (lngLat: [number, number], follow?: boolean) => void;
  flyTo: (lngLat: [number, number]) => void;
};

export type MapDiscovery = {
  id: string;
  title: string;
  geo: [number, number];
};

export type MapViewport = {
  center: [number, number];
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapLookAt = MapViewport | null;

export type SiteMapViewProps = {
  zoom?: number;
  opened: Record<string, boolean>;
  onSelect: (id: string) => void;
  discoveries?: MapDiscovery[];
  onSelectDiscovery?: (id: string, title: string) => void;
  /** Visible map area while browsing. `null` means follow GPS again. */
  onLookAt?: (viewport: MapLookAt) => void;
};
