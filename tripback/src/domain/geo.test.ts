import { describe, expect, it } from 'vitest';

import {
  distanceMetres,
  headingDeltaDegrees,
  isOutsidePortalLookRange,
  isValidCoordinate,
  panoramaTranslateX,
  roundedSearchCoordinate,
  sideStepMetres,
} from './geo';

describe('distanceMetres', () => {
  it('returns zero for the same coordinate', () => {
    const circularQuay = { latitude: -33.861, longitude: 151.211 };
    expect(distanceMetres(circularQuay, circularQuay)).toBe(0);
  });

  it('calculates a plausible Sydney walking distance', () => {
    const circularQuay = { latitude: -33.861, longitude: 151.211 };
    const operaHouse = { latitude: -33.8568, longitude: 151.2153 };
    expect(distanceMetres(circularQuay, operaHouse)).toBeGreaterThan(500);
    expect(distanceMetres(circularQuay, operaHouse)).toBeLessThan(700);
  });
});

describe('coordinate guards', () => {
  it('rejects coordinates outside the globe', () => {
    expect(isValidCoordinate({ latitude: 91, longitude: 151 })).toBe(false);
  });

  it('rounds coordinates for privacy-friendly search buckets', () => {
    expect(roundedSearchCoordinate({ latitude: -33.861234, longitude: 151.211987 })).toEqual({
      latitude: -33.8612,
      longitude: 151.212,
    });
  });
});

describe('panorama look-around', () => {
  it('wraps heading deltas across north', () => {
    expect(headingDeltaDegrees(350, 10)).toBe(20);
    expect(headingDeltaDegrees(10, 350)).toBe(-20);
  });

  it('clamps panorama pan to the image edges', () => {
    const pan = panoramaTranslateX({
      headingDelta: 90,
      sideStep: 0,
      imageWidth: 2000,
      viewportWidth: 400,
    });
    expect(pan).toBe(-800);
  });

  it('treats a step to the camera\'s right as a positive side-step', () => {
    const origin = { latitude: -33.86, longitude: 151.21 };
    const east = { latitude: -33.86, longitude: 151.2101 };
    expect(sideStepMetres(origin, east, 0)).toBeGreaterThan(5);
  });

  it('asks the walker to return once they look past the plate', () => {
    expect(isOutsidePortalLookRange(20, 2)).toBe(false);
    expect(isOutsidePortalLookRange(40, 0)).toBe(true);
    expect(isOutsidePortalLookRange(0, 10)).toBe(true);
  });
});
