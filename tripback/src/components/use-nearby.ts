import { useEffect, useRef, useState } from 'react';

import { currentCoordinate, useAppState } from '@/components/app-state';
import { tripBackConfig } from '@/config';
import { PLACES } from '@/constants/places';
import { distanceMetres, roundedSearchCoordinate } from '@/domain/geo';
import type { Coordinate, StoryCandidate } from '@/domain/types';
import { listNearbyPlaces } from '@/services/discovery/DiscoveryService';

export type NearbyPlace = {
  id: string;
  title: string;
  description: string;
  thumb?: string;
  geo: [number, number];
  meters: number;
};

export const haversine = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
};

export const formatMeters = (m: number) =>
  m < 950 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;

function toNearby(candidate: StoryCandidate): NearbyPlace {
  return {
    id: candidate.id,
    title: candidate.title,
    description: candidate.summary.slice(0, 140) || 'Historical site',
    thumb: candidate.imageUrl,
    geo: [candidate.coordinate.longitude, candidate.coordinate.latitude],
    meters: Math.round(candidate.distanceMetres),
  };
}

function relativeTo(origin: Coordinate, items: NearbyPlace[]): NearbyPlace[] {
  return [...items]
    .map((item) => ({
      ...item,
      meters: haversine([origin.longitude, origin.latitude], item.geo),
    }))
    .sort((a, b) => a.meters - b.meters);
}

function fetchNearby(origin: Coordinate): Promise<NearbyPlace[]> {
  const seeded = new Set(PLACES.map((place) => place.name.toLowerCase()));
  return listNearbyPlaces(origin).then((candidates) =>
    candidates
      .filter(
        (candidate) =>
          !seeded.has(candidate.title.toLowerCase()) &&
          !PLACES.some((place) =>
            candidate.title.toLowerCase().includes(place.name.toLowerCase()),
          ),
      )
      .map(toNearby)
      .sort((a, b) => a.meters - b.meters)
      .slice(0, 8),
  );
}

/** Nearby Wikipedia / Heritage spots around GPS, or around a map-camera look-at. */
export function useNearby(lookAt?: [number, number] | null) {
  const { location } = useAppState();
  const [nearby, setNearby] = useState<NearbyPlace[] | null>(null);
  const lastSearch = useRef<Coordinate | null>(null);
  const loaded = useRef(false);
  const gps = currentCoordinate(location);
  const origin: Coordinate = lookAt
    ? { latitude: lookAt[1], longitude: lookAt[0] }
    : gps;

  useEffect(() => {
    const rounded = roundedSearchCoordinate(origin);
    setNearby((prev) => (prev ? relativeTo(rounded, prev) : prev));

    const previous = lastSearch.current;
    if (
      previous &&
      distanceMetres(previous, rounded) < tripBackConfig.minimumSearchMovementMetres
    ) {
      return;
    }

    let cancelled = false;
    const delay = previous ? 320 : 0;
    const timer = setTimeout(() => {
      void fetchNearby(rounded)
        .then((items) => {
          if (cancelled) return;
          lastSearch.current = rounded;
          loaded.current = true;
          setNearby(relativeTo(rounded, items));
        })
        .catch(() => {
          if (!cancelled && !loaded.current) setNearby([]);
        });
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [origin.latitude, origin.longitude]);

  return nearby;
}
