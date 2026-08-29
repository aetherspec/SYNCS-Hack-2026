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

export type MapLookAt = [number, number] | null;

export type SiteMapViewProps = {
  zoom?: number;
  opened: Record<string, boolean>;
  onSelect: (id: string) => void;
  discoveries?: MapDiscovery[];
  onSelectDiscovery?: (id: string, title: string) => void;
  /** Map-camera centre while browsing. `null` means follow GPS again. */
  onLookAt?: (lngLat: MapLookAt) => void;
};
