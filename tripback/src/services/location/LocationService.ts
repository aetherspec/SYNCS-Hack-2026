import * as Location from 'expo-location';

import { TRIPBACK_LOCATION_TASK } from './backgroundTask';

export async function requestWalkLocationPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return false;

  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {
    // A foreground-authorized, user-started walk can still run while the app
    // remains active. The UI can direct the user to Settings for full background use.
  }
  return true;
}

export async function startWalkLocationUpdates(): Promise<void> {
  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
    TRIPBACK_LOCATION_TASK,
  );
  if (alreadyRunning) return;

  await Location.startLocationUpdatesAsync(TRIPBACK_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    activityType: Location.ActivityType.Fitness,
    distanceInterval: 50,
    deferredUpdatesDistance: 100,
    deferredUpdatesInterval: 60_000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopWalkLocationUpdates(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(
    TRIPBACK_LOCATION_TASK,
  );
  if (running) await Location.stopLocationUpdatesAsync(TRIPBACK_LOCATION_TASK);
}
