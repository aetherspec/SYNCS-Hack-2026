import { tripBackConfig } from '../config';
import {
  distanceMetres,
  isValidCoordinate,
  roundedSearchCoordinate,
} from '../domain/geo';
import type { Coordinate } from '../domain/types';
import { tripBackDatabase } from '../services/database/TripBackDatabase';
import { discoverStory } from '../services/discovery/DiscoveryService';
import { notifyDiscovery } from '../services/notifications/NotificationService';
import { emitDiscovery } from './events';

type ProcessOptions = {
  accuracy?: number;
  capturedAt?: string;
  forceDiscovery?: boolean;
};

export async function processLocation(
  coordinate: Coordinate,
  options: ProcessOptions = {},
): Promise<void> {
  if (!isValidCoordinate(coordinate)) return;
  if (options.accuracy != null && options.accuracy > 100) return;

  const activeWalk = await tripBackDatabase.getActiveWalk();
  if (!activeWalk) return;

  const capturedAt = options.capturedAt ?? new Date().toISOString();
  const previousPoint = await tripBackDatabase.getLastRoutePoint(activeWalk.id);
  const movedSincePoint = previousPoint
    ? distanceMetres(previousPoint, coordinate)
    : Number.POSITIVE_INFINITY;

  if (movedSincePoint >= tripBackConfig.routeSampleDistanceMetres) {
    await tripBackDatabase.addRoutePoint({
      walkId: activeWalk.id,
      ...coordinate,
      capturedAt,
      accuracy: options.accuracy,
    });
  }

  const lastSearchCoordinateText = await tripBackDatabase.getState(
    'last_search_coordinate',
  );
  const lastSearchAtText = await tripBackDatabase.getState('last_search_at');
  const lastSearchCoordinate = lastSearchCoordinateText
    ? (JSON.parse(lastSearchCoordinateText) as Coordinate)
    : undefined;
  const lastSearchAt = lastSearchAtText ? Number(lastSearchAtText) : 0;
  const movedSinceSearch = lastSearchCoordinate
    ? distanceMetres(lastSearchCoordinate, coordinate)
    : Number.POSITIVE_INFINITY;
  const now = Date.now();

  const shouldSearch =
    options.forceDiscovery ||
    movedSinceSearch >= tripBackConfig.minimumSearchMovementMetres ||
    now - lastSearchAt >= tripBackConfig.maximumSearchIntervalMs;
  if (!shouldSearch) return;

  const lastNotificationAt = Number(
    (await tripBackDatabase.getState('last_notification_at')) ?? 0,
  );
  if (
    !options.forceDiscovery &&
    now - lastNotificationAt < tripBackConfig.notificationCooldownMs
  ) {
    return;
  }

  const searchCoordinate = roundedSearchCoordinate(coordinate);
  await tripBackDatabase.setState(
    'last_search_coordinate',
    JSON.stringify(searchCoordinate),
  );
  await tripBackDatabase.setState('last_search_at', String(now));

  const discovery = await discoverStory(
    searchCoordinate,
    (candidateId) => tripBackDatabase.hasSeenCandidate(candidateId),
    activeWalk.id,
  );
  if (!discovery) return;

  await tripBackDatabase.saveDiscovery(discovery);
  await tripBackDatabase.setState('last_notification_at', String(now));
  await notifyDiscovery(discovery);
  emitDiscovery({
    ...discovery,
    imageBase64: undefined,
    imageMimeType: undefined,
  });
}
