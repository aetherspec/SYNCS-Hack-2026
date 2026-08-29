import { describe, expect, it } from 'vitest';

import { distanceMetres, isValidCoordinate, roundedSearchCoordinate } from './geo';

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
