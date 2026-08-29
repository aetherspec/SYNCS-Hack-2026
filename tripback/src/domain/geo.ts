import type { Coordinate } from './types';

const EARTH_RADIUS_METRES = 6_371_000;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceMetres(a: Coordinate, b: Coordinate): number {
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const startLatitude = radians(a.latitude);
  const endLatitude = radians(b.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(haversine));
}

export function isValidCoordinate(coordinate: Coordinate): boolean {
  return (
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    Math.abs(coordinate.latitude) <= 90 &&
    Math.abs(coordinate.longitude) <= 180
  );
}

export function roundedSearchCoordinate(coordinate: Coordinate): Coordinate {
  return {
    latitude: Number(coordinate.latitude.toFixed(4)),
    longitude: Number(coordinate.longitude.toFixed(4)),
  };
}
