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

export function headingDeltaDegrees(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export function sideStepMetres(
  origin: Coordinate,
  current: Coordinate,
  originHeadingDegrees: number,
): number {
  const metresPerDegree = 111_320;
  const north = (current.latitude - origin.latitude) * metresPerDegree;
  const east =
    (current.longitude - origin.longitude) *
    metresPerDegree *
    Math.cos(radians(origin.latitude));
  const heading = radians(originHeadingDegrees);
  const rightNorth = -Math.sin(heading);
  const rightEast = Math.cos(heading);
  return north * rightNorth + east * rightEast;
}

export const PORTAL_HEADING_SPAN_DEGREES = 35;
export const PORTAL_SIDESTEP_SPAN_METRES = 8;
export const PORTAL_PROXIMITY_METRES = 25;

export function panoramaTranslateX({
  headingDelta,
  sideStep,
  imageWidth,
  viewportWidth,
}: {
  headingDelta: number;
  sideStep: number;
  imageWidth: number;
  viewportWidth: number;
}): number {
  const maxPan = Math.max(0, (imageWidth - viewportWidth) / 2);
  const headingPan = -(headingDelta / PORTAL_HEADING_SPAN_DEGREES) * maxPan;
  const stepPan = -(sideStep / PORTAL_SIDESTEP_SPAN_METRES) * maxPan * 0.35;
  return Math.max(-maxPan, Math.min(maxPan, headingPan + stepPan));
}

export function isOutsidePortalLookRange(headingDelta: number, sideStep: number): boolean {
  return (
    Math.abs(headingDelta) > PORTAL_HEADING_SPAN_DEGREES ||
    Math.abs(sideStep) > PORTAL_SIDESTEP_SPAN_METRES
  );
}
